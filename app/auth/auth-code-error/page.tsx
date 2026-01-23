'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function AuthCodeErrorPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Authentication Error</CardTitle>
          </div>
          <CardDescription>
            There was a problem verifying your email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The email verification link may have expired or is invalid. Please try the following:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
            <li>Check if the link has expired (links expire after 24 hours)</li>
            <li>Request a new confirmation email</li>
            <li>Try logging in - your account may already be verified</li>
          </ul>
          <div className="flex gap-2 pt-4">
            <Button onClick={() => router.push('/')} variant="outline" className="flex-1">
              Go Home
            </Button>
            <Button onClick={() => router.push('/admin/login')} className="flex-1">
              Try Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
