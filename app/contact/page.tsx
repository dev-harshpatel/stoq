'use client'

import { UserLayout } from '@/components/UserLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, MapPin, Phone } from 'lucide-react';

export default function ContactPage() {
  return (
    <UserLayout>
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="space-y-6 pb-6">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contact Us</h1>
            <p className="text-muted-foreground mt-2">
              Get in touch with us. We're here to help!
            </p>
          </div>

          {/* Contact Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email Card */}
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Email Us</CardTitle>
                    <CardDescription>Send us an email anytime</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">General Inquiries</p>
                  <a
                    href="mailto:support@stoq.com"
                    className="text-lg font-semibold text-primary hover:underline"
                  >
                    support@stoq.com
                  </a>
                </div>
                <div className="space-y-2 mt-4">
                  <p className="text-sm text-muted-foreground">Business Inquiries</p>
                  <a
                    href="mailto:business@stoq.com"
                    className="text-lg font-semibold text-primary hover:underline"
                  >
                    business@stoq.com
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Address Card */}
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Visit Us</CardTitle>
                    <CardDescription>Our office location</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Address</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      123 Commerce Street<br />
                      Suite 400<br />
                      Toronto, ON M5H 2N2<br />
                      Canada
                    </p>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm font-medium text-foreground mb-1">Business Hours</p>
                    <p className="text-sm text-muted-foreground">
                      Monday - Friday: 9:00 AM - 5:00 PM EST<br />
                      Saturday: 10:00 AM - 2:00 PM EST<br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Phone Card */}
            <Card className="border-border md:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Call Us</CardTitle>
                    <CardDescription>Speak with our team</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Phone Number</p>
                  <a
                    href="tel:+14161234567"
                    className="text-lg font-semibold text-primary hover:underline"
                  >
                    +1 (416) 123-4567
                  </a>
                  <p className="text-xs text-muted-foreground mt-2">
                    Available during business hours
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Information */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>We're Here to Help</CardTitle>
              <CardDescription>
                Have questions about our products, orders, or services? We'd love to hear from you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Our customer support team is available to assist you with any questions or concerns 
                  you may have. Whether you need help with product information, order status, returns, 
                  or general inquiries, we're here to help.
                </p>
                <p>
                  For faster service, please include your order number (if applicable) when contacting us. 
                  We typically respond to all inquiries within 24-48 hours during business days.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </UserLayout>
  );
}
