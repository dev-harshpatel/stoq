'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AlertsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard since alerts page is no longer available
    router.replace('/admin/dashboard')
  }, [router])

  return null
}

