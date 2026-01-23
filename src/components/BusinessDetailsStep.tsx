'use client'

import { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form'
import { GoogleAddressAutocomplete } from '@/components/GoogleAddressAutocomplete'
import { SignupFormData } from '@/lib/validations/signup'

interface BusinessDetailsStepProps {
  form: UseFormReturn<SignupFormData>
}

export function BusinessDetailsStep({ form }: BusinessDetailsStepProps) {
  const addressValue = form.watch('businessAddress') || ''
  const addressError = form.formState.errors.businessAddress?.message

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Business Information</h3>
        <p className="text-sm text-muted-foreground">
          Tell us about your business
        </p>
      </div>

      <FormField
        control={form.control}
        name="businessName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Business Name</FormLabel>
            <FormControl>
              <Input placeholder="Acme Corporation" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="businessAddress"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <GoogleAddressAutocomplete
                value={addressValue}
                onChange={(address, components) => {
                  field.onChange(address)
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
                label="Postal Address"
                placeholder="Enter your business address"
                required
                error={addressError}
              />
            </FormControl>
            <FormDescription>
              {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                ? 'Start typing to see address suggestions'
                : 'Enter your complete business address'}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="businessYears"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Years in Business</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="5"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="businessEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="contact@business.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="businessWebsite"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Business Website (Optional)</FormLabel>
            <FormControl>
              <Input
                type="url"
                placeholder="https://www.business.com"
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <FormDescription>
              Include https:// or http:// in the URL
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
