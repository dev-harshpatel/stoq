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
import { Mail, MapPin, Phone, HelpCircle, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ContactPage() {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const copyToClipboard = async (text: string, email: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEmail(email);
      toast.success("Copied to clipboard", {
        description: `${text} has been copied.`,
      });
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch (error) {
      toast.error("Failed to copy", {
        description: "Please try again.",
      });
    }
  };

  return (
    <UserLayout>
      <div className="flex flex-col h-full">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background pb-4 space-y-4 border-b border-border mb-4 -mx-4 lg:-mx-6 px-2 lg:px-6 ">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Contact Us
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Get in touch with us. We're here to help!
            </p>
          </div>
        </div>

        {/* Scrollable Content - Bento Grid Layout */}
        <div className="flex-1 overflow-y-auto min-h-0 -mx-4 lg:-mx-6 px-4 lg:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 max-w-7xl mx-auto">
            {/* Top Left - Email Card (Wider on large screens) */}
            <Card
              className={cn(
                "border-border",
                "lg:col-span-8" // 2/3 width on large screens
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">Email Us</CardTitle>
                    <CardDescription className="text-xs">
                      Send us an email anytime
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    General Inquiries
                  </p>
                  <div className="flex items-center gap-2">
                    <a
                      href="mailto:support@stoq.com"
                      className="text-base font-semibold text-primary hover:underline flex-1"
                    >
                      support@stoq.com
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        copyToClipboard("support@stoq.com", "support")
                      }
                    >
                      {copiedEmail === "support" ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Business Inquiries
                  </p>
                  <div className="flex items-center gap-2">
                    <a
                      href="mailto:business@stoq.com"
                      className="text-base font-semibold text-primary hover:underline flex-1"
                    >
                      business@stoq.com
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        copyToClipboard("business@stoq.com", "business")
                      }
                    >
                      {copiedEmail === "business" ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Right - Phone Card (Narrower on large screens) */}
            <Card
              className={cn(
                "border-border",
                "lg:col-span-4" // 1/3 width on large screens
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">Call Us</CardTitle>
                    <CardDescription className="text-xs">
                      Speak with our team
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Phone Number</p>
                  <a
                    href="tel:+14161234567"
                    className="text-base font-semibold text-primary hover:underline block"
                  >
                    +1 (416) 123-4567
                  </a>
                  <p className="text-xs text-muted-foreground mt-2">
                    Available during business hours
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Bottom Left - Visit Us Card (Narrower on large screens) */}
            <Card
              className={cn(
                "border-border",
                "lg:col-span-4" // 1/3 width on large screens
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">Visit Us</CardTitle>
                    <CardDescription className="text-xs">
                      Our office location
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-foreground mb-1.5">
                    Address
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    123 Commerce Street
                    <br />
                    Suite 400
                    <br />
                    Toronto, ON M5H 2N2
                    <br />
                    Canada
                  </p>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-medium text-foreground mb-1.5">
                    Business Hours
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Monday - Friday: 9:00 AM - 5:00 PM EST
                    <br />
                    Saturday: 10:00 AM - 2:00 PM EST
                    <br />
                    Sunday: Closed
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Bottom Right - Help Card (Wider on large screens) */}
            <Card
              className={cn(
                "border-border",
                "lg:col-span-8" // 2/3 width on large screens
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <HelpCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">
                      We're Here to Help
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Have questions? We'd love to hear from you.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    Our customer support team is available to assist you with
                    any questions or concerns you may have. Whether you need
                    help with product information, order status, returns, or
                    general inquiries, we're here to help.
                  </p>
                  <p>
                    For faster service, please include your order number (if
                    applicable) when contacting us. We typically respond to all
                    inquiries within 24-48 hours during business days.
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
