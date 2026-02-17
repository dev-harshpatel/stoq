"use client";

// Force dynamic rendering to prevent static generation issues
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth/context";
import { updateUserProfileDetails } from "@/lib/supabase/utils";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { UserProfile } from "@/types/user";
import {
  getFieldsBySection,
  type ProfileFieldConfig,
} from "@/lib/types/profile";
import {
  personalDetailsSchema,
  businessDetailsSchema,
} from "@/lib/validations/signup";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Loader } from "@/components/Loader";
import { UserLayout } from "@/components/UserLayout";
import { toast } from "sonner";
import {
  User,
  Edit2,
  Save,
  X,
  MapPin,
  Building2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Mail,
  Lock,
} from "lucide-react";
import { ShippingBillingCard } from "@/components/ShippingBillingCard";
import { cn } from "@/lib/utils";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Combined schema for profile update
// Make businessCity and businessCountry optional since they're read-only
const profileUpdateSchema = z.object({
  ...personalDetailsSchema.shape,
  businessName: businessDetailsSchema.shape.businessName,
  businessAddress: businessDetailsSchema.shape.businessAddress,
  businessAddressComponents:
    businessDetailsSchema.shape.businessAddressComponents,
  businessState: businessDetailsSchema.shape.businessState,
  businessCity: z.string().min(2).max(100).optional(),
  businessCountry: z.enum(["Canada", "USA"]).optional(),
  businessYears: businessDetailsSchema.shape.businessYears,
  businessWebsite: businessDetailsSchema.shape.businessWebsite,
  businessEmail: businessDetailsSchema.shape.businessEmail,
});

type ProfileFormData = z.infer<typeof profileUpdateSchema>;

export default function ProfilePage() {
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const {
    isLoading: profileLoading,
    profile: contextProfile,
    refreshProfile,
  } = useUserProfile();
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileUpdateSchema),
    mode: "onChange",
    shouldUnregister: false,
  });

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return;
    }

    // Only redirect if auth has finished loading and user is still null
    if (!user) {
      router.push("/");
      return;
    }
  }, [user, authLoading, router]);

  const profile = localProfile ?? contextProfile;

  useEffect(() => {
    const storageKey = "stoq:user-profile:scrollTop";
    const el = scrollContainerRef.current;
    if (!el) {
      return;
    }

    const savedValue = sessionStorage.getItem(storageKey);
    const savedScrollTop = savedValue ? Number(savedValue) : 0;

    // Restore scroll after paint so layout is ready
    requestAnimationFrame(() => {
      el.scrollTop = Number.isFinite(savedScrollTop) ? savedScrollTop : 0;
    });

    return () => {
      sessionStorage.setItem(storageKey, String(el.scrollTop));
    };
  }, []);

  useEffect(() => {
    if (!contextProfile) {
      return;
    }

    // Keep local profile in sync unless user is actively editing
    if (isEditing) {
      return;
    }

    setLocalProfile(contextProfile);
  }, [contextProfile, isEditing]);

  useEffect(() => {
    if (!profile || isEditing) {
      return;
    }

    // Populate form with existing data
    form.reset({
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      phone:
        profile.phone && profile.phone.startsWith("+1")
          ? profile.phone
          : profile.phone
            ? "+1" + profile.phone.replace(/^\+1/, "")
            : "+1",
      businessName: profile.businessName || "",
      businessAddress: profile.businessAddress || "",
      businessAddressComponents: profile.businessAddressComponents,
      businessState: profile.businessState || "",
      businessCity: profile.businessCity || "",
      businessCountry:
        (profile.businessCountry as "Canada" | "USA") || "Canada",
      businessYears: profile.businessYears || 0,
      businessWebsite: profile.businessWebsite || "",
      businessEmail: profile.businessEmail || "",
    });
  }, [form, isEditing, profile]);

  const handleSave = async (data: ProfileFormData) => {
    if (!user) {
      toast.error("Error", {
        description: "You must be logged in to update your profile.",
      });
      return;
    }

    setIsSaving(true);
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
      });

      if (updatedProfile) {
        setLocalProfile(updatedProfile);
        setIsEditing(false);
        toast.success("Profile updated", {
          description: "Your profile has been updated successfully.",
        });
        // Sync shared profile state
        await refreshProfile();
      } else {
        throw new Error("Failed to update profile - no data returned");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update profile. Please try again.";
      toast.error("Update failed", {
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      form.reset({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        phone: profile.phone || "",
        businessName: profile.businessName || "",
        businessAddress: profile.businessAddress || "",
        businessAddressComponents: profile.businessAddressComponents,
        businessState: profile.businessState || "",
        businessCity: profile.businessCity || "",
        businessCountry:
          (profile.businessCountry as "Canada" | "USA") || "Canada",
        businessYears: profile.businessYears || 0,
        businessWebsite: profile.businessWebsite || "",
        businessEmail: profile.businessEmail || "",
      });
    }
    setIsEditing(false);
  };

  const renderField = (field: ProfileFieldConfig) => {
    const value = profile?.[field.key as keyof UserProfile] as
      | string
      | number
      | null
      | undefined;

    if (!isEditing) {
      // View mode
      return (
        <div key={field.key} className="space-y-1">
          <Label className="text-sm font-medium text-muted-foreground">
            {field.label}
          </Label>
          <p className="text-sm text-foreground">
            {value !== null && value !== undefined && value !== "" ? (
              field.type === "address" ? (
                <span className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{value}</span>
                </span>
              ) : field.key === "phone" ? (
                // Ensure phone number always shows with +1 prefix
                value.toString().startsWith("+1") ? (
                  value
                ) : (
                  "+1" + value.toString().replace(/^\+1/, "")
                )
              ) : field.key === "businessCountry" ||
                field.key === "businessCity" ? (
                <span className="flex items-center gap-2">
                  <span>{value}</span>
                  <span className="text-xs text-muted-foreground italic">
                    (Used for tax calculation)
                  </span>
                </span>
              ) : (
                value
              )
            ) : (
              <span className="text-muted-foreground italic">Not provided</span>
            )}
          </p>
        </div>
      );
    }

    // Edit mode
    // Business Name and Business Address are locked - only admin can change
    if (field.key === "businessName" || field.type === "address") {
      return (
        <FormField
          key={field.key}
          control={form.control}
          name={
            field.key === "businessName" ? "businessName" : "businessAddress"
          }
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                {field.label}
                <Lock className="h-3 w-3 text-muted-foreground" />
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  {...formField}
                  value={(formField.value as string) || ""}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </FormControl>
              <FormDescription className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span>
                  To update this field, please contact admin at{" "}
                  <a
                    href="mailto:support@stoq.com"
                    className="text-primary hover:underline"
                  >
                    support@stoq.com
                  </a>
                </span>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    // Country and City are read-only (used for tax calculation)
    if (field.key === "businessCountry" || field.key === "businessCity") {
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
                {field.required && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  {...formField}
                  value={(formField.value as string) || ""}
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
      );
    }

    // Special handling for phone field with +1 prefix
    if (field.key === "phone" && field.type === "tel") {
      return (
        <FormField
          key={field.key}
          control={form.control}
          name={field.key as keyof ProfileFormData}
          render={({ field: formField }) => {
            // Extract the number part (everything after +1)
            const displayValue =
              formField.value &&
              typeof formField.value === "string" &&
              formField.value.startsWith("+1")
                ? formField.value.slice(2).trim()
                : formField.value && typeof formField.value === "string"
                  ? formField.value.replace(/^\+1/, "").trim()
                  : "";

            return (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
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
                        const value = e.target.value;
                        // Always prepend +1 to the value
                        formField.onChange("+1" + value);
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
            );
          }}
        />
      );
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
              {field.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </FormLabel>
            <FormControl>
              <Input
                type={field.type}
                placeholder={field.placeholder}
                {...formField}
                value={
                  typeof formField.value === "string" ||
                  typeof formField.value === "number"
                    ? formField.value || ""
                    : ""
                }
                onChange={(e) => {
                  if (field.type === "number") {
                    formField.onChange(parseInt(e.target.value) || 0);
                  } else {
                    formField.onChange(e.target.value);
                  }
                }}
              />
            </FormControl>
            {field.description && (
              <FormDescription>{field.description}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  // Show loading while auth or profile is loading
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" text="Loading profile..." />
      </div>
    );
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
    );
  }

  const personalFields = getFieldsBySection("personal");
  const businessFields = getFieldsBySection("business");

  return (
    <UserLayout>
      <div className="flex flex-col h-full">
        {/* Sticky Header Section */}
        <div className="sticky top-0 z-10 bg-background pb-4 space-y-4 border-b border-border mb-4 -mx-4 lg:-mx-6 px-4 lg:px-6 pt-4 lg:pt-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Profile
              </h1>
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
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto min-h-0 -mx-4 lg:-mx-6 px-4 lg:px-6"
        >
          <div className="max-w-4xl mx-auto space-y-6 py-4">
            {/* Approval Status Banner */}
            {profile && (
              <Alert
                className={cn(
                  profile.approvalStatus === "pending" &&
                    "border-warning/50 bg-warning/10",
                  profile.approvalStatus === "approved" &&
                    "border-success/50 bg-success/10",
                  profile.approvalStatus === "rejected" &&
                    "border-destructive/50 bg-destructive/10",
                )}
              >
                {profile.approvalStatus === "pending" && (
                  <>
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <AlertTitle className="text-warning">
                      Profile Under Review
                    </AlertTitle>
                    <AlertDescription className="text-warning/90">
                      Your profile is under review. Please wait for admin
                      approval. You can explore products and add them to your
                      cart, but you won't be able to place orders until your
                      profile is approved.
                    </AlertDescription>
                  </>
                )}
                {profile.approvalStatus === "approved" && (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <AlertTitle className="text-success">
                      Profile Approved
                    </AlertTitle>
                    <AlertDescription className="text-success/90">
                      Your profile has been approved. You can now place orders.
                    </AlertDescription>
                  </>
                )}
                {profile.approvalStatus === "rejected" && (
                  <>
                    <XCircle className="h-4 w-4 text-destructive" />
                    <AlertTitle className="text-destructive">
                      Profile Rejected
                    </AlertTitle>
                    <AlertDescription className="text-destructive/90">
                      Your profile has been rejected. Please contact support for
                      assistance.
                    </AlertDescription>
                  </>
                )}
              </Alert>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSave)}
                className="space-y-6"
              >
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

                {/* Shipping & Billing Addresses Card */}
                {profile && user && (
                  <ShippingBillingCard
                    profile={profile}
                    userId={user.id}
                    onProfileUpdate={(updatedProfile) =>
                      setLocalProfile(updatedProfile)
                    }
                  />
                )}

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
  );
}
