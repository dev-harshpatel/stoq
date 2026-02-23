"use client";

import { useState } from "react";
import { UserLayout } from "@/components/UserLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, HelpCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const CONTACT_EMAIL = "b2bmobilesca@gmail.com";

export default function ContactPage() {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopiedEmail(true);
      toast.success("Copied to clipboard", {
        description: `${CONTACT_EMAIL} has been copied.`,
      });
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      toast.error("Failed to copy", {
        description: "Please try again.",
      });
    }
  };

  return (
    <UserLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background pb-6 border-b border-border mb-6 -mx-4 lg:-mx-6 px-4 lg:px-6">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Contact Us
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reach out anytime. We typically respond within 24–48 hours.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 -mx-4 lg:-mx-6 px-4 lg:px-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Email Card */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl flex-shrink-0">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold text-foreground">
                      Email
                    </CardTitle>
                    <CardDescription className="text-sm mt-0.5">
                      Send us an email for inquiries, orders, or support
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border">
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-base font-medium text-primary hover:underline truncate flex-1"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={handleCopyEmail}
                    aria-label="Copy email address"
                  >
                    {copiedEmail ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* We're Here to Help */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl flex-shrink-0">
                    <HelpCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-foreground">
                      We're Here to Help
                    </CardTitle>
                    <CardDescription className="text-sm mt-0.5">
                      Have questions? We'd love to hear from you.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    Our team is available to assist with product information,
                    order status, and general inquiries. For faster service,
                    please include your order number when contacting us.
                  </p>
                  <p>
                    We respond to all inquiries within 24–48 hours during
                    business days.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
