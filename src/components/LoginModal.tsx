"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { getUserProfile } from "@/lib/supabase/utils";
import { supabase } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TOAST_MESSAGES } from "@/lib/constants/toast-messages";
import { Loader2, Mail } from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignupClick?: () => void;
}

export const LoginModal = ({
  open,
  onOpenChange,
  onSignupClick,
}: LoginModalProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailNotConfirmed, setShowEmailNotConfirmed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { signIn, signOut } = useAuth();
  const router = useRouter();

  const isEmailNotConfirmedError = (message: string) => {
    const lower = message.toLowerCase();
    return (
      lower.includes("email not confirmed") ||
      lower.includes("email_not_confirmed")
    );
  };

  const handleResendConfirmation = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      toast.success("Confirmation email sent! Please check your inbox.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to resend email";
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLogin = () => {
    setShowEmailNotConfirmed(false);
    setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { user } = await signIn(email, password);

      if (user) {
        const profile = await getUserProfile(user.id);

        // Block admin login from the storefront — admins must use /admin/login
        if (profile?.role === "admin") {
          await signOut();
          toast.error(TOAST_MESSAGES.LOGIN_FAILED);
          setPassword("");
          return;
        }

        toast.success(TOAST_MESSAGES.LOGIN_SUCCESS);

        setEmail("");
        setPassword("");
        setShowEmailNotConfirmed(false);
        onOpenChange(false);

        // Regular users stay on the current page
        router.refresh();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : TOAST_MESSAGES.LOGIN_FAILED;

      if (error instanceof Error && isEmailNotConfirmedError(error.message)) {
        setShowEmailNotConfirmed(true);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state when modal closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setShowEmailNotConfirmed(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {showEmailNotConfirmed ? (
          <>
            <DialogHeader>
              <div className="flex items-center justify-center mb-2">
                <div className="rounded-full bg-warning/10 p-3">
                  <Mail className="h-6 w-6 text-warning" />
                </div>
              </div>
              <DialogTitle className="text-center">
                Email Not Verified
              </DialogTitle>
              <DialogDescription className="text-center">
                Your email address hasn't been confirmed yet
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">
                  We need to verify your email before you can log in:
                </p>
                <p className="text-sm font-medium text-foreground break-all">
                  {email}
                </p>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Check your inbox and spam folder for the confirmation link, or
                click below to receive a new one.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleResendConfirmation}
                  disabled={isResending}
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Resend Confirmation Email"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBackToLogin}
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Login</DialogTitle>
              <DialogDescription>
                Enter your credentials to access your account
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </div>
                <div className="text-center text-sm">
                  <span className="text-muted-foreground">
                    Don't have an account?{" "}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenChange(false);
                      onSignupClick?.();
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
