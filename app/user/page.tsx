'use client'

import { UserLayout } from '@/components/UserLayout'
import UserProducts from '@/pages/UserProducts'

export default function UserPage() {
  return (
    <UserLayout>
      <UserProducts />
    </UserLayout>
  )
}

