'use client'

import { AppLayout } from '@/components/AppLayout'
import { AuthGuard } from '@/lib/auth/AuthGuard'
import { usePathname } from 'next/navigation'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Login page should not be protected (it's public)
  const isLoginPage = pathname === '/admin/login'
  
  if (isLoginPage) {
    // Login page is public, no protection needed
    return <>{children}</>
  }
  
  // All other admin routes require ADMIN role (not just authentication)
  // Regular users will be redirected to /user page
  return (
    <AuthGuard requireAuth={true} requireAdmin={true} redirectTo="/admin/login">
      <AppLayout>{children}</AppLayout>
    </AuthGuard>
  )
}

