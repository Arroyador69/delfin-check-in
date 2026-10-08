import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Social · Delfín Check-in',
  robots: { index: false, follow: false },
}

export default function SocialLayout({ children }: { children: ReactNode }) {
  return children
}
