'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { useUserProfile } from '@/contexts/UserProfileContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { LogIn, Shield } from 'lucide-react'

function AdminLoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasCheckedLogin, setHasCheckedLogin] = useState(false)
  const { signIn, user, loading: authLoading } = useAuth()
  const { isAdmin, isLoading: profileLoading, profile } = useUserProfile()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get redirect path from query params
  const redirectPath = searchParams.get('redirect') || '/admin/dashboard'

  // Redirect if already logged in as admin
  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (user && isAdmin) {
        router.replace(redirectPath)
      }
    }
  }, [user, isAdmin, authLoading, profileLoading, router, redirectPath])

  // Handle post-login admin check (after profile loads)
  useEffect(() => {
    // Only check if we just logged in (hasCheckedLogin flag is set)
    // and profile has finished loading
    if (hasCheckedLogin && !profileLoading && user && profile !== null) {
      setHasCheckedLogin(false) // Reset flag
      setIsLoading(false) // Stop loading spinner
      
      if (isAdmin) {
        toast({
          title: 'Login successful',
          description: 'Welcome back!',
        })
        router.replace(redirectPath)
      } else {
        toast({
          title: 'Access denied',
          description: 'You do not have admin privileges.',
          variant: 'destructive',
        })
      }
    }
  }, [hasCheckedLogin, profileLoading, user, profile, isAdmin, router, redirectPath, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setHasCheckedLogin(false) // Reset flag before new login attempt

    try {
      await signIn(email, password)
      // Set flag to check admin status once profile loads
      // The useEffect will handle checking isAdmin after profile loads
      setHasCheckedLogin(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid email or password'
      toast({
        title: 'Login failed',
        description: errorMessage,
        variant: 'destructive',
      })
      setIsLoading(false)
      setHasCheckedLogin(false)
    }
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-indigo-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg border border-border p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-primary/10 p-3 rounded-full mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Admin Login</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Enter your credentials to access the admin dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@stoq.com"
                required
                disabled={isLoading}
                className="bg-background"
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
                disabled={isLoading}
                className="bg-background"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Default credentials: admin@stoq.com / admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-indigo-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <AdminLoginContent />
    </Suspense>
  )
}
