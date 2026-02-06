'use client'

import { useState, useEffect } from 'react'
import { UserProfile } from '@/types/user'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { AlertCircle, Truck, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AddressSelection = 'business' | 'saved' | 'none'

export interface SelectedAddresses {
  shipping: {
    selection: AddressSelection
    address: string | null
  }
  billing: {
    selection: AddressSelection
    address: string | null
  }
}

interface CheckoutAddressSectionProps {
  profile: UserProfile | null
  onAddressChange: (addresses: SelectedAddresses) => void
  showErrors?: boolean
}

export function CheckoutAddressSection({
  profile,
  onAddressChange,
  showErrors = false,
}: CheckoutAddressSectionProps) {
  const [shippingSelection, setShippingSelection] = useState<AddressSelection>('none')
  const [billingSelection, setBillingSelection] = useState<AddressSelection>('none')

  // Initialize selections based on profile
  useEffect(() => {
    if (!profile) return

    // Auto-select based on profile settings
    if (profile.shippingSameAsBusiness && profile.businessAddress) {
      setShippingSelection('business')
    } else if (profile.shippingAddress) {
      setShippingSelection('saved')
    }

    if (profile.billingSameAsBusiness && profile.businessAddress) {
      setBillingSelection('business')
    } else if (profile.billingAddress) {
      setBillingSelection('saved')
    }
  }, [profile])

  // Notify parent of changes
  useEffect(() => {
    if (!profile) {
      onAddressChange({
        shipping: { selection: 'none', address: null },
        billing: { selection: 'none', address: null },
      })
      return
    }

    const getShippingAddress = () => {
      if (shippingSelection === 'business') {
        return {
          selection: 'business' as const,
          address: profile.businessAddress,
        }
      } else if (shippingSelection === 'saved') {
        return {
          selection: 'saved' as const,
          address: profile.shippingAddress,
        }
      }
      return { selection: 'none' as const, address: null }
    }

    const getBillingAddress = () => {
      if (billingSelection === 'business') {
        return {
          selection: 'business' as const,
          address: profile.businessAddress,
        }
      } else if (billingSelection === 'saved') {
        return {
          selection: 'saved' as const,
          address: profile.billingAddress,
        }
      }
      return { selection: 'none' as const, address: null }
    }

    onAddressChange({
      shipping: getShippingAddress(),
      billing: getBillingAddress(),
    })
  }, [profile, shippingSelection, billingSelection, onAddressChange])

  if (!profile) {
    return null
  }

  const hasBusinessAddress = !!profile.businessAddress
  const hasSavedShippingAddress = !!profile.shippingAddress
  const hasSavedBillingAddress = !!profile.billingAddress

  const hasAnyShippingOption = hasBusinessAddress || hasSavedShippingAddress
  const hasAnyBillingOption = hasBusinessAddress || hasSavedBillingAddress

  const shippingError = showErrors && shippingSelection === 'none'
  const billingError = showErrors && billingSelection === 'none'

  return (
    <div className="space-y-4 border-t border-border pt-4">
      {/* Shipping Address Selection */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Shipping Address</Label>
          {shippingError && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Required
            </span>
          )}
        </div>

        {!hasAnyShippingOption ? (
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              No shipping address found. Please add one in your profile.
            </p>
          </div>
        ) : (
          <RadioGroup
            value={shippingSelection}
            onValueChange={(value) => setShippingSelection(value as AddressSelection)}
            className={cn(
              "space-y-2",
              shippingError && "ring-1 ring-destructive rounded-lg p-2"
            )}
          >
            {hasBusinessAddress && (
              <div className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="business" id="shipping-business" className="mt-1" />
                <Label htmlFor="shipping-business" className="flex-1 cursor-pointer">
                  <span className="font-medium text-sm">Use Business Address</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {profile.businessAddress}
                  </p>
                </Label>
              </div>
            )}
            {hasSavedShippingAddress && (
              <div className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="saved" id="shipping-saved" className="mt-1" />
                <Label htmlFor="shipping-saved" className="flex-1 cursor-pointer">
                  <span className="font-medium text-sm">Use Saved Shipping Address</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {profile.shippingAddress}
                  </p>
                </Label>
              </div>
            )}
          </RadioGroup>
        )}
      </div>

      {/* Billing Address Selection */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Billing Address</Label>
          {billingError && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Required
            </span>
          )}
        </div>

        {!hasAnyBillingOption ? (
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              No billing address found. Please add one in your profile.
            </p>
          </div>
        ) : (
          <RadioGroup
            value={billingSelection}
            onValueChange={(value) => setBillingSelection(value as AddressSelection)}
            className={cn(
              "space-y-2",
              billingError && "ring-1 ring-destructive rounded-lg p-2"
            )}
          >
            {hasBusinessAddress && (
              <div className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="business" id="billing-business" className="mt-1" />
                <Label htmlFor="billing-business" className="flex-1 cursor-pointer">
                  <span className="font-medium text-sm">Use Business Address</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {profile.businessAddress}
                  </p>
                </Label>
              </div>
            )}
            {hasSavedBillingAddress && (
              <div className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="saved" id="billing-saved" className="mt-1" />
                <Label htmlFor="billing-saved" className="flex-1 cursor-pointer">
                  <span className="font-medium text-sm">Use Saved Billing Address</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {profile.billingAddress}
                  </p>
                </Label>
              </div>
            )}
          </RadioGroup>
        )}
      </div>
    </div>
  )
}

// Helper function to check if addresses are complete
export function hasCompleteAddresses(profile: UserProfile | null): boolean {
  if (!profile) return false

  const hasShipping = profile.shippingSameAsBusiness
    ? !!profile.businessAddress
    : !!profile.shippingAddress

  const hasBilling = profile.billingSameAsBusiness
    ? !!profile.businessAddress
    : !!profile.billingAddress

  return hasShipping && hasBilling
}
