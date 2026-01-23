'use client'

import { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form'
import { SignupFormData } from '@/lib/validations/signup'

interface PersonalDetailsStepProps {
  form: UseFormReturn<SignupFormData>
}

export function PersonalDetailsStep({ form }: PersonalDetailsStepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
        <p className="text-sm text-muted-foreground">
          Let's start with your basic information
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input placeholder="John" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl>
                <Input placeholder="Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone Number</FormLabel>
            <FormControl>
              <Input type="tel" placeholder="+1 (555) 123-4567" {...field} />
            </FormControl>
            <FormDescription>
              Include country code for international numbers
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
