'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/lib/auth/context'
import { getUserProfileWithDetails, updateUserProfileDetails } from '@/lib/supabase/utils'
import { UserProfile } from '@/types/user'
import { profileFields, getFieldsBySection, type ProfileFieldConfig } from '@/lib/profileFields'
import { personalDetailsSchema, businessDetailsSchema } from '@/lib/validations/signup'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form'
import { GoogleAddressAutocomplete } from '@/components/GoogleAddressAutocomplete'
import { Loader } from '@/components/Loader'
import { UserLayout } from '@/components/UserLayout'
import { toast } from 'sonner'
import { User, Edit2, Save, X, MapPin, Building2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Combined schema for profile update
const profileUpdateSchema = z.object({
  ...personalDetailsSchema.shape,
  ...businessDetailsSchema.shape,
})

type ProfileFormData = z.infer<typeof profileUpdateSchema>

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileUpdateSchema),
    mode: 'onChange',
  })

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router])

  const loadProfile = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const userProfile = await getUserProfileWithDetails(user.id)
      if (userProfile) {
        setProfile(userProfile)
        // Populate form with existing data
        form.reset({
          firstName: userProfile.firstName || '',
          lastName: userProfile.lastName || '',
          phone: userProfile.phone && userProfile.phone.startsWith('+1') 
            ? userProfile.phone 
            : userProfile.phone 
              ? '+1' + userProfile.phone.replace(/^\+1/, '')
              : '+1',
          businessName: userProfile.businessName || '',
          businessAddress: userProfile.businessAddress || '',
          businessAddressComponents: userProfile.businessAddressComponents,
          businessCity: userProfile.businessCity || '',
          businessCountry: (userProfile.businessCountry as 'Canada' | 'USA') || 'Canada',
          businessYears: userProfile.businessYears || 0,
          businessWebsite: userProfile.businessWebsite || '',
          businessEmail: userProfile.businessEmail || '',
        })
      }
    } catch (error) {
      toast.error('Failed to load profile', {
        description: 'Please try refreshing the page.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (data: ProfileFormData) => {
    if (!user) return

    setIsSaving(true)
    try {
      // Don't allow updating Country and City (used for tax calculation)
      const updatedProfile = await updateUserProfileDetails(user.id, {
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        phone: data.phone || null,
        businessName: data.businessName || null,
        businessAddress: data.businessAddress || null,
        businessAddressComponents: data.businessAddressComponents || null,
        // businessCity and businessCountry are intentionally omitted - they cannot be changed
        businessYears: data.businessYears || null,
        businessWebsite: data.businessWebsite || null,
        businessEmail: data.businessEmail || null,
      })

      if (updatedProfile) {
        setProfile(updatedProfile)
        setIsEditing(false)
        toast.success('Profile updated', {
          description: 'Your profile has been updated successfully.',
        })
        // Reload profile to get latest data
        await loadProfile()
      } else {
        throw new Error('Failed to update profile')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile. Please try again.';
      toast.error('Update failed', {
        description: errorMessage,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      form.reset({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        businessName: profile.businessName || '',
        businessAddress: profile.businessAddress || '',
        businessAddressComponents: profile.businessAddressComponents,
        businessCity: profile.businessCity || '',
        businessCountry: (profile.businessCountry as 'Canada' | 'USA') || 'Canada',
        businessYears: profile.businessYears || 0,
        businessWebsite: profile.businessWebsite || '',
        businessEmail: profile.businessEmail || '',
      })
    }
    setIsEditing(false)
  }

  const renderField = (field: ProfileFieldConfig) => {
    const value = profile?.[field.key as keyof UserProfile] as string | number | null | undefined

    if (!isEditing) {
      // View mode
      return (
        <div key={field.key} className="space-y-1">
          <Label className="text-sm font-medium text-muted-foreground">{field.label}</Label>
          <p className="text-sm text-foreground">
            {value !== null && value !== undefined && value !== '' ? (
              field.type === 'address' ? (
                <span className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{value}</span>
                </span>
              ) : field.key === 'phone' ? (
                // Ensure phone number always shows with +1 prefix
                value.toString().startsWith('+1') ? value : '+1' + value.toString().replace(/^\+1/, '')
              ) : (field.key === 'businessCountry' || field.key === 'businessCity') ? (
                <span className="flex items-center gap-2">
                  <span>{value}</span>
                  <span className="text-xs text-muted-foreground italic">(Used for tax calculation)</span>
                </span>
              ) : (
                value
              )
            ) : (
              <span className="text-muted-foreground italic">Not provided</span>
            )}
          </p>
        </div>
      )
    }

    // Edit mode
    if (field.type === 'address') {
      return (
        <FormField
          key={field.key}
          control={form.control}
          name="businessAddress"
          render={({ field: formField }) => {
            const addressValue = formField.value || ''
            const addressError = form.formState.errors.businessAddress?.message

            return (
              <FormItem>
                <FormControl>
                  <GoogleAddressAutocomplete
                    value={addressValue}
                    onChange={(address, components) => {
                      formField.onChange(address)
                      if (components) {
                        form.setValue('businessAddressComponents', components)
                      }
                    }}
                    onError={(error) => {
                      // Only set error if it's a validation error, not API configuration issues
                      if (error && !error.includes('not configured') && !error.includes('unavailable')) {
                        form.setError('businessAddress', { message: error })
                      }
                    }}
                    label={field.label}
                    placeholder={field.placeholder}
                    required={field.required}
                    error={addressError}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
      )
    }

    // Country and City are read-only (used for tax calculation)
    if (field.key === 'businessCountry' || field.key === 'businessCity') {
      // Show as read-only field in edit mode
      return (
        <FormField
          key={field.key}
          control={form.control}
          name={field.key as keyof ProfileFormData}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  value={formField.value as string || ''}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </FormControl>
              {field.description && (
                <FormDescription className="text-xs text-muted-foreground">
                  {field.description}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )
    }

    // Special handling for phone field with +1 prefix
    if (field.key === 'phone' && field.type === 'tel') {
      return (
        <FormField
          key={field.key}
          control={form.control}
          name={field.key as keyof ProfileFormData}
          render={({ field: formField }) => {
            // Extract the number part (everything after +1)
            const displayValue = formField.value && typeof formField.value === 'string' && formField.value.startsWith('+1')
              ? formField.value.slice(2).trim()
              : (formField.value && typeof formField.value === 'string' ? formField.value.replace(/^\+1/, '').trim() : '')
            
            return (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-muted border border-r-0 border-input rounded-l-md text-sm text-foreground font-medium">
                      +1
                    </span>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      className="rounded-l-none"
                      value={displayValue}
                      onChange={(e) => {
                        const value = e.target.value
                        // Always prepend +1 to the value
                        formField.onChange('+1' + value)
                      }}
                      onBlur={formField.onBlur}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Phone number for Canada/USA (country code +1 is included)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )
          }}
        />
      )
    }

    return (
      <FormField
        key={field.key}
        control={form.control}
        name={field.key as keyof ProfileFormData}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
            <FormControl>
              <Input
                type={field.type}
                placeholder={field.placeholder}
                {...formField}
                value={
                  typeof formField.value === 'string' || typeof formField.value === 'number'
                    ? formField.value || ''
                    : ''
                }
                onChange={(e) => {
                  if (field.type === 'number') {
                    formField.onChange(parseInt(e.target.value) || 0)
                  } else {
                    formField.onChange(e.target.value)
                  }
                }}
              />
            </FormControl>
            {field.description && <FormDescription>{field.description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" text="Loading profile..." />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">Profile not found</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const personalFields = getFieldsBySection('personal')
  const businessFields = getFieldsBySection('business')

  return (
    <UserLayout>
      <div className="flex flex-col h-full">
        {/* Sticky Header Section */}
        <div className="sticky top-0 z-10 bg-background pb-4 space-y-4 border-b border-border mb-4 -mx-4 lg:-mx-6 px-4 lg:px-6 pt-4 lg:pt-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your personal and business information
              </p>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} className="gap-2">
                <Edit2 className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0 -mx-4 lg:-mx-6 px-4 lg:px-6">
          <div className="max-w-4xl mx-auto space-y-6 py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                {/* Personal Details Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      <CardTitle>Personal Information</CardTitle>
                    </div>
                    <CardDescription>Your personal details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditing ? (
                      personalFields.map((field) => renderField(field))
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {personalFields.map((field) => renderField(field))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Business Details Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <CardTitle>Business Information</CardTitle>
                    </div>
                    <CardDescription>Your business details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditing ? (
                      businessFields.map((field) => renderField(field))
                    ) : (
                      <div className="space-y-4">
                        {businessFields.map((field) => renderField(field))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex flex-col sm:flex-row justify-end gap-4 pb-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving} className="gap-2">
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </div>
        </div>
      </div>
    </UserLayout>
  )
}
