'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import { UserLayout } from '@/components/UserLayout'
import UserProducts from '@/page-components/UserProducts'

export default function UserPage() {
  return (
    <UserLayout>
      <UserProducts />
    </UserLayout>
  )
}

