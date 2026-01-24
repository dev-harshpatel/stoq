'use client'

import { AppLayout } from '@/components/AppLayout'
import { AuthGuard } from '@/lib/auth/AuthGuard'
import { usePathname } from 'next/navigation'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // All admin routes require ADMIN role (not just authentication)
  // Regular users will be redirected to /user page
  // Unauthenticated users will be redirected to home page where they can use the login modal
  return (
    <AuthGuard requireAuth={true} requireAdmin={true} redirectTo="/">
      <AppLayout>{children}</AppLayout>
    </AuthGuard>
  )
}

