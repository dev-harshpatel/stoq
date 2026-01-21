import type { Metadata } from 'next'
import { Providers } from '@/components/Providers'
import '@/index.css'

export const metadata: Metadata = {
  title: 'Stock Flow - Inventory Management',
  description: 'Modern inventory management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

