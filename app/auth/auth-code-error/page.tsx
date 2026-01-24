'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

function AuthCodeErrorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

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
          {reason === 'redirect_mismatch' ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Redirect URL Mismatch
              </p>
              <p className="text-sm text-muted-foreground">
                The email confirmation link was generated for a different URL. This usually happens when:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2 ml-2">
                <li>The Supabase Site URL is set to localhost instead of your production URL</li>
                <li>The redirect URL in the email doesn't match your allowed redirect URLs</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4">
                <strong>Solution:</strong> Please update your Supabase Dashboard settings:
              </p>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 ml-2">
                <li>Go to Supabase Dashboard → Authentication → URL Configuration</li>
                <li>Set Site URL to: <code className="bg-muted px-1 rounded">https://stoq-bice.vercel.app</code></li>
                <li>Add to Redirect URLs: <code className="bg-muted px-1 rounded">https://stoq-bice.vercel.app/auth/callback</code></li>
                <li>Try signing up again after updating the settings</li>
              </ol>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                The email verification link may have expired or is invalid. Please try the following:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li>Check if the link has expired (links expire after 24 hours)</li>
                <li>Request a new confirmation email</li>
                <li>Try logging in - your account may already be verified</li>
              </ul>
            </>
          )}
          <div className="flex gap-2 pt-4">
            <Button onClick={() => router.push('/')} variant="outline" className="flex-1">
              Go Home
            </Button>
            <Button onClick={() => router.push('/')} className="flex-1">
              Try Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AuthCodeErrorContent />
    </Suspense>
  )
}
