'use client'

import { useEffect, useState } from 'react'

/**
 * Callback OAuth TikTok. Tras autorizar, intercambia el code con el Mac Mini
 * (python -m delfin_media tiktok serve en :8765).
 */
export default function SocialTikTokOAuthPage() {
  const [msg, setMsg] = useState('Conectando con TikTok…')

  useEffect(() => {
    const q = window.location.search || ''
    const api = 'http://127.0.0.1:8765'

    if (!q) {
      window.location.replace('/tiktok')
      return
    }

    fetch(`${api}/api/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: window.location.href }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('exchange')
        window.location.replace('/tiktok')
      })
      .catch(() => {
        setMsg(
          'No pude hablar con el Mac (python -m delfin_media tiktok serve). Copia esta URL y en el Mac: python -m delfin_media tiktok login --code …'
        )
      })
  }, [])

  return (
    <main
      style={{
        minHeight: '100vh',
        margin: 0,
        padding: '48px 24px',
        color: '#E8EEFF',
        fontFamily: '"Segoe UI", "Avenir Next", "Trebuchet MS", sans-serif',
        background: 'linear-gradient(160deg,#071018,#0B1220 50%,#121a2c)',
      }}
    >
      <h1 style={{ fontSize: '1.4rem', margin: '0 0 12px' }}>Delfín Check-in</h1>
      <p style={{ color: '#9AA8C7', maxWidth: '36em', lineHeight: 1.45 }}>{msg}</p>
    </main>
  )
}
