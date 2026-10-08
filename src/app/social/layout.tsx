import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Social · Delfín Check-in',
  robots: { index: false, follow: false },
}

/**
 * Layout aislado del PMS: sin Navigation/AdminLayout.
 * Solo marca + enlace al hub Social.
 */
export default function SocialLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0B1220',
        color: '#E8EEFF',
        fontFamily: '"Segoe UI", "Avenir Next", "Trebuchet MS", sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '16px 22px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Link
          href="/social"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: '#d8f4f8',
              display: 'grid',
              placeItems: 'center',
              fontSize: '1.25rem',
            }}
            aria-hidden
          >
            🐬
          </span>
          <span>
            <strong style={{ display: 'block', letterSpacing: '0.02em' }}>
              Delfín Check-in
            </strong>
            <span style={{ color: '#9AA8C7', fontSize: '0.85rem' }}>
              social.delfincheckin.com
            </span>
          </span>
        </Link>
        <a
          href="https://admin.delfincheckin.com"
          style={{ color: '#27B4C6', fontWeight: 600, textDecoration: 'none' }}
        >
          Panel admin →
        </a>
      </header>
      {children}
    </div>
  )
}
