'use client'

import { UserLayout } from '@/components/UserLayout'
import UserProducts from '@/page-components/UserProducts'

export default function HomePage() {
  return (
    <UserLayout>
      <UserProducts />
    </UserLayout>
  )
}

