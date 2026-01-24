'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import gsap from 'gsap'
import { useAuth } from '@/lib/auth/context'
import { createUserProfileWithDetails } from '@/lib/supabase/utils'
import {
  signupFormSchema,
  type SignupFormData,
} from '@/lib/validations/signup'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { StepIndicator } from '@/components/StepIndicator'
import { PersonalDetailsStep } from '@/components/PersonalDetailsStep'
import { BusinessDetailsStep } from '@/components/BusinessDetailsStep'
import { EmailConfirmationModal } from '@/components/EmailConfirmationModal'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, ArrowLeft, ArrowRight } from 'lucide-react'

interface SignupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STEPS = [
  { number: 1, label: 'Personal', component: 'personal' },
  { number: 2, label: 'Business', component: 'business' },
]

export function SignupModal({ open, onOpenChange }: SignupModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const stepRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { signUp } = useAuth()

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phone: '',
      businessName: '',
      businessAddress: '',
      businessAddressComponents: null,
      businessYears: 0,
      businessWebsite: '',
      businessEmail: '',
    },
  })
  

  // GSAP animation for step transitions
  useEffect(() => {
    if (stepRef.current && open) {
      gsap.fromTo(
        stepRef.current,
        { opacity: 0, x: 50 },
        { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
      )
    }
  }, [currentStep, open])

  const validateCurrentStep = async (): Promise<boolean> => {
    let isValid = false

    if (currentStep === 1) {
      // Validate auth fields AND personal details for step 1
      const step1Fields = ['email', 'password', 'confirmPassword', 'firstName', 'lastName', 'phone'] as const

      // Trigger validation for all step 1 fields
      const validationResults = await form.trigger(step1Fields)

      if (validationResults) {
        // Also check password match
        const password = form.getValues('password')
        const confirmPassword = form.getValues('confirmPassword')

        if (password !== confirmPassword) {
          form.setError('confirmPassword', {
            message: "Passwords don't match",
          })
          isValid = false
        } else {
          isValid = true
        }
      }
    } else if (currentStep === 2) {
      // Validate business details for step 2
      const step2Fields = ['businessName', 'businessAddress', 'businessYears', 'businessEmail', 'businessWebsite'] as const

      // Trigger validation for all step 2 fields
      isValid = await form.trigger(step2Fields)
    }

    return isValid
  }

  const handleNext = async () => {
    const isValid = await validateCurrentStep()
    if (isValid && currentStep < STEPS.length) {
      // Animate out current step
      if (stepRef.current) {
        gsap.to(stepRef.current, {
          opacity: 0,
          x: -50,
          duration: 0.2,
          ease: 'power2.in',
          onComplete: () => {
            setCurrentStep(currentStep + 1)
          },
        })
      } else {
        setCurrentStep(currentStep + 1)
      }
    } else if (!isValid) {
      // Show specific error message for current step
      const errors = form.formState.errors

      if (currentStep === 1) {
        const fieldLabels: Record<string, string> = {
          email: 'Email',
          password: 'Password',
          confirmPassword: 'Confirm Password',
          firstName: 'First Name',
          lastName: 'Last Name',
          phone: 'Phone'
        }
        const step1Fields = ['email', 'password', 'confirmPassword', 'firstName', 'lastName', 'phone'] as const
        const errorFields = step1Fields
          .filter(field => errors[field])
          .map(field => fieldLabels[field])

        if (errorFields.length > 0) {
          toast.error('Please fix the following fields', {
            description: errorFields.join(', '),
            duration: 4000,
          })
        }
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      // Animate out current step
      if (stepRef.current) {
        gsap.to(stepRef.current, {
          opacity: 0,
          x: 50,
          duration: 0.2,
          ease: 'power2.in',
          onComplete: () => {
            setCurrentStep(currentStep - 1)
          },
        })
      } else {
        setCurrentStep(currentStep - 1)
      }
    }
  }

  const handleSubmit = useCallback(async (data: SignupFormData) => {
    if (currentStep < STEPS.length) {
      await handleNext()
      return
    }

    // Prevent multiple submissions
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setAttemptCount((prev) => prev + 1)

    try {
      // Create auth user - get user directly from signUp response
      let user, session
      
      try {
        const result = await signUp(data.email, data.password)
        user = result.user
        session = result.session
      } catch (signUpError: any) {
        // Check if error is session-related
        const isSessionError = signUpError.message?.includes('session') || 
                              signUpError.message?.includes('Auth session') ||
                              signUpError.message?.includes('session missing')
        
        if (isSessionError) {
          // Session error - but user was likely created (emails are being sent)
          // Wait a bit and try to get the user
          await new Promise(resolve => setTimeout(resolve, 1500))
          
          const { supabase } = await import('@/lib/supabase/client')
          const { data: { user: currentUser } } = await supabase.auth.getUser()
          
          if (currentUser && currentUser.email === data.email) {
            // User was created! Use it and continue with profile creation
            user = currentUser
            session = null
          } else {
            // Can't get user immediately, but since emails are being sent, user exists
            // Show email confirmation modal - profile will be created after email confirmation
            // OR we can try to create it now using admin client if available
            setUserEmail(data.email)
            onOpenChange(false)
            form.reset()
            setCurrentStep(1)
            setShowEmailConfirmation(true)
            setIsSubmitting(false)
            return // Exit - don't show error
          }
        } else {
          // Not a session error - real failure, rethrow
          throw signUpError
        }
      }
      
      // User should exist at this point
      if (!user) {
        throw new Error('Failed to create user account. Please try again.')
      }

      const userId = user.id

      // Create user profile with all details
      // This works even if email confirmation is required (session is null)
      let profile
      try {
        profile = await createUserProfileWithDetails(userId, {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          businessName: data.businessName,
          businessAddress: data.businessAddress,
          businessAddressComponents: data.businessAddressComponents,
          businessYears: data.businessYears,
          businessWebsite: data.businessWebsite || null,
          businessEmail: data.businessEmail,
          role: 'user',
        })
      } catch (profileError: any) {
        throw new Error('Failed to create user profile. Please try again.')
      }

      // Check if profile creation failed or was blocked by RLS
      const isRLSError = profile && (profile as any).__isRLSError === true;
      const profileCreationFailed = !profile || isRLSError;

      if (profileCreationFailed) {
        // If RLS error or no session (email confirmation required), show email confirmation modal
        // Profile will be created after email confirmation via UserProfileContext
        // This is expected behavior - RLS blocks inserts when user is not authenticated
        if (isRLSError || !session) {
          setUserEmail(data.email)
          onOpenChange(false)
          form.reset()
          setCurrentStep(1)
          setShowEmailConfirmation(true)
          setIsSubmitting(false)
          return // Exit - don't show error toast
        }
        
        throw new Error('Failed to create user profile. Please contact support.')
      }

      // Reset attempt count on success
      setAttemptCount(0)

      // Success animation
      if (stepRef.current) {
        gsap.to(stepRef.current, {
          scale: 0.95,
          opacity: 0,
          duration: 0.2,
        })
      }

      // Check if email confirmation is required
      const requiresEmailConfirmation = !session

      // Always show email confirmation modal if no session (even if profile was created)
      // This ensures user knows to check their email
      if (requiresEmailConfirmation) {
        // Store email and show confirmation modal
        setUserEmail(data.email)
        setIsSubmitting(false)
        // Close signup modal first, then show email confirmation
        onOpenChange(false)
        form.reset()
        setCurrentStep(1)
        // Use setTimeout to ensure modal state updates properly
        setTimeout(() => {
          setShowEmailConfirmation(true)
        }, 100)
      } else {
        // User is immediately authenticated
        toast.success('Welcome to Stoq! 🎉', {
          description: `Hi ${data.firstName}! Your account has been created successfully.`,
          duration: 5000,
        })

        setIsSubmitting(false)
        // Close modal and redirect
        onOpenChange(false)
        form.reset()
        setCurrentStep(1)
        
        setTimeout(() => {
          router.push('/')
          router.refresh()
        }, 300)
      }
    } catch (error: any) {
      // More specific error messages
      let errorMessage = 'An error occurred during signup. Please try again.'
      let showRetryMessage = false
      let shouldShowToast = true

      if (error?.message) {
        const errorMsg = error.message.toLowerCase()
        
        // Handle rate limiting errors
        if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests') || errorMsg.includes('security purposes') || errorMsg.includes('try again after')) {
          // Rate limiting - show appropriate message
          if (attemptCount >= 3) {
            errorMessage = 'Too many signup attempts. Please wait 15-30 minutes before trying again.'
          } else {
            errorMessage = 'Too many requests. Please wait a moment and try again.'
            showRetryMessage = true
          }
        } 
        // Handle email already exists
        else if (errorMsg.includes('email') && (errorMsg.includes('already') || errorMsg.includes('exists') || errorMsg.includes('registered'))) {
          errorMessage = 'This email is already registered. Please try logging in instead.'
        } 
        // Handle password errors
        else if (errorMsg.includes('password')) {
          errorMessage = 'Password does not meet requirements. Please check and try again.'
        } 
        // Handle invalid email format
        else if (errorMsg.includes('invalid email') || errorMsg.includes('email format')) {
          errorMessage = 'Please enter a valid email address.'
        }
        // Handle network/connection errors
        else if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection')) {
          errorMessage = 'Network error. Please check your internet connection and try again.'
        }
        // Handle session-related errors (user created but no session)
        else if (errorMsg.includes('auth session') || errorMsg.includes('session missing') || errorMsg.includes('session')) {
          // Session-related error - but user was likely created (since emails are being sent)
          // Don't show error, just show email confirmation modal
          // The user exists, they just need to confirm email
          setUserEmail(data.email)
          onOpenChange(false)
          form.reset()
          setCurrentStep(1)
          setShowEmailConfirmation(true)
          setIsSubmitting(false)
          return // Exit early, don't show error toast
        } 
        // Handle profile creation errors
        else if (errorMsg.includes('profile') && errorMsg.includes('failed to create')) {
          // Profile creation failed - likely due to RLS (no session during email confirmation)
          // Show email confirmation modal instead of error
          // Profile will be created after email confirmation via UserProfileContext
          setUserEmail(data.email)
          onOpenChange(false)
          form.reset()
          setCurrentStep(1)
          setShowEmailConfirmation(true)
          setIsSubmitting(false)
          return // Exit early, don't show error toast
        } 
        // Use the actual error message for other cases
        else {
          errorMessage = error.message
        }
      }
      
      toast.error('Signup failed', {
        description: errorMessage,
        duration: attemptCount >= 3 ? 8000 : 5000,
      })

      // If rate limited after 3 attempts, show additional info
      if (attemptCount >= 3 && error?.message?.toLowerCase().includes('security purposes')) {
        setTimeout(() => {
          toast.info('Rate limit active', {
            description: 'For security, please wait 15-30 minutes before trying again. This limit resets automatically.',
            duration: 8000,
          })
        }, 2000)
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [currentStep, isSubmitting, signUp, router, onOpenChange, setUserEmail, setShowEmailConfirmation, form])

  const handleClose = () => {
    if (isSubmitting) return
    form.reset()
    setCurrentStep(1)
    setAttemptCount(0)
    onOpenChange(false)
  }

  // Reset attempt count when modal opens
  useEffect(() => {
    if (open) {
      setAttemptCount(0)
    }
  }, [open])

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Your Account</DialogTitle>
            <DialogDescription>
              Join Stoq to start managing your inventory
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form 
            onSubmit={form.handleSubmit((data) => {
              if (!isSubmitting) {
                handleSubmit(data)
              }
            })} 
            className="space-y-6"
          >
            {/* Step Indicator */}
            <StepIndicator
              currentStep={currentStep}
              totalSteps={STEPS.length}
              stepLabels={STEPS.map((s) => s.label)}
            />

            {/* Step Content */}
            <div ref={stepRef} className="min-h-[400px]">
              {currentStep === 1 && (
                <div className="space-y-6">
                  {/* Auth Fields */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">Account Information</h3>
                      <p className="text-sm text-muted-foreground">
                        Create your login credentials
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Personal Details */}
                  <PersonalDetailsStep form={form} />
                </div>
              )}

              {currentStep === 2 && <BusinessDetailsStep form={form} />}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1 || isSubmitting}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isSubmitting}
                  className="gap-2"
                  onClick={async (e) => {
                    e.preventDefault()

                    // Prevent double submission
                    if (isSubmitting) {
                      return
                    }

                    // Validate ALL fields across both steps
                    const allFields = [
                      'email', 'password', 'confirmPassword',
                      'firstName', 'lastName', 'phone',
                      'businessName', 'businessAddress', 'businessYears', 'businessEmail', 'businessWebsite'
                    ] as const

                    const isValid = await form.trigger(allFields)

                    if (!isValid) {
                      // Find which step has errors and provide specific feedback
                      const errors = form.formState.errors
                      const step1AuthFields = ['email', 'password', 'confirmPassword'] as const
                      const step1PersonalFields = ['firstName', 'lastName', 'phone'] as const
                      const step2Fields = ['businessName', 'businessAddress', 'businessYears', 'businessEmail', 'businessWebsite'] as const

                      // Get specific error messages for each step
                      const step1AuthErrors = step1AuthFields
                        .filter(field => errors[field])
                        .map(field => {
                          const labels: Record<string, string> = {
                            email: 'Email',
                            password: 'Password',
                            confirmPassword: 'Confirm Password'
                          }
                          return labels[field]
                        })

                      const step1PersonalErrors = step1PersonalFields
                        .filter(field => errors[field])
                        .map(field => {
                          const labels: Record<string, string> = {
                            firstName: 'First Name',
                            lastName: 'Last Name',
                            phone: 'Phone'
                          }
                          return labels[field]
                        })

                      const step1Errors = [...step1AuthErrors, ...step1PersonalErrors]
                      const hasStep1Errors = step1Errors.length > 0

                      const step2Errors = step2Fields
                        .filter(field => errors[field])
                        .map(field => {
                          const labels: Record<string, string> = {
                            businessName: 'Business Name',
                            businessAddress: 'Business Address',
                            businessYears: 'Years in Business',
                            businessEmail: 'Business Email',
                            businessWebsite: 'Website'
                          }
                          return labels[field]
                        })

                      if (hasStep1Errors && currentStep === 2) {
                        // Navigate back to step 1 with animation
                        if (stepRef.current) {
                          gsap.to(stepRef.current, {
                            opacity: 0,
                            x: 50,
                            duration: 0.2,
                            ease: 'power2.in',
                            onComplete: () => {
                              setCurrentStep(1)
                            },
                          })
                        } else {
                          setCurrentStep(1)
                        }

                        toast.error('Please fix errors in Step 1', {
                          description: `The following fields need attention: ${step1Errors.join(', ')}`,
                          duration: 5000,
                        })
                      } else if (step2Errors.length > 0) {
                        toast.error('Please fix errors in this step', {
                          description: `The following fields need attention: ${step2Errors.join(', ')}`,
                          duration: 5000,
                        })
                      }
                      return
                    }

                    // All valid - submit the form
                    const data = form.getValues()
                    handleSubmit(data)
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Create Account
                    </>
                  )}
                </Button>
              )}
            </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Email Confirmation Modal - rendered outside Dialog to ensure it shows when signup dialog closes */}
      <EmailConfirmationModal
        open={showEmailConfirmation}
        onOpenChange={(open) => {
          setShowEmailConfirmation(open)
          if (!open) {
            // When confirmation modal closes, also close signup modal if it's still open
            onOpenChange(false)
          }
        }}
        email={userEmail}
      />
    </>
  )
}
