import type { CSSProperties } from 'react'
import Link from 'next/link'

const networks = [
  {
    id: 'instagram',
    name: 'Instagram',
    api: 'Meta Graph API (ya tienes)',
    role: 'Reels + carrusel + stories',
    status: 'ready' as const,
    note: 'Se publica vía Postiz con tu app Meta.',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    api: 'Meta Graph API (ya tienes)',
    status: 'ready' as const,
    role: 'Reels / posts de página',
    note: 'Misma app Meta; página de Delfín Check-in.',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    api: 'YouTube Data API (ya tienes)',
    status: 'ready' as const,
    role: 'Shorts 9:16',
    note: 'Se publica vía Postiz / upload API.',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    api: 'Login Kit + Content Posting (pendiente)',
    status: 'pending' as const,
    role: 'Reels 9:16',
    note: 'Falta terminar la app en developers.tiktok.com (Sandbox → audit).',
  },
]

/**
 * Hub = panel de control del “buffer” de redes.
 * No es el PMS: aquí solo se orquesta la publicación del pack diario.
 */
export default function SocialHubPage() {
  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '36px 22px 80px' }}>
      <p style={{ color: '#9AA8C7', margin: '0 0 8px' }}>Privado · contacto@delfincheckin.com</p>
      <h1
        style={{
          fontSize: 'clamp(1.8rem,4vw,2.5rem)',
          letterSpacing: '-0.02em',
          margin: '0 0 12px',
          lineHeight: 1.15,
        }}
      >
        Buffer social
      </h1>
      <p style={{ color: '#9AA8C7', maxWidth: '40em', lineHeight: 1.55 }}>
        En lenguaje claro: este subdominio es la <strong style={{ color: '#FFD400' }}>puerta HTTPS</strong>{' '}
        para programar y subir el pack diario a las 4 redes. El Mac Mini generará los vídeos
        (<code style={{ color: '#c7f3ff' }}>delfin_media</code>) y Postiz (open source) hará de{' '}
        <strong style={{ color: '#E8EEFF' }}>cola / buffer</strong>: recibe el pack y lo publica en
        Instagram, Facebook, YouTube y TikTok por API.
      </p>

      <section style={card}>
        <h2 style={h2}>Las 4 redes</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {networks.map((n) => (
            <div
              key={n.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 8,
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div>
                <strong>{n.name}</strong>
                <div style={{ color: '#9AA8C7', fontSize: '0.92rem', marginTop: 4 }}>
                  {n.role} · {n.api}
                </div>
                <div style={{ color: '#9AA8C7', fontSize: '0.88rem', marginTop: 4 }}>{n.note}</div>
              </div>
              <span
                style={{
                  alignSelf: 'start',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  padding: '4px 8px',
                  borderRadius: 999,
                  background: n.status === 'ready' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(255, 212, 0, 0.18)',
                  color: n.status === 'ready' ? '#9ff0c2' : '#FFD400',
                }}
              >
                {n.status === 'ready' ? 'API lista' : 'Falta TikTok'}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 22 }}>
        <Link href="/social/tiktok" style={btn}>
          Conectar TikTok (cuando el Mac Mini esté)
        </Link>
      </div>

      <section style={{ ...card, marginTop: 16 }}>
        <h2 style={h2}>Arquitectura (para ir aprendiendo)</h2>
        <ol style={{ color: '#9AA8C7', lineHeight: 1.6, margin: 0, paddingLeft: '1.2em' }}>
          <li>
            <strong style={{ color: '#E8EEFF' }}>Generator</strong> — Mac Mini:{' '}
            <code style={{ color: '#c7f3ff' }}>python -m delfin_media day</code> crea Reels,
            carruseles y stories.
          </li>
          <li>
            <strong style={{ color: '#E8EEFF' }}>Buffer / scheduler</strong> — Postiz
            (self-hosted): cola de posts + OAuth de cada red.
          </li>
          <li>
            <strong style={{ color: '#E8EEFF' }}>Front door HTTPS</strong> — este dominio
            (<code style={{ color: '#c7f3ff' }}>social.delfincheckin.com</code>) en el mismo Vercel
            que admin: login tuyo + redirects OAuth (las APIs no aceptan localhost).
          </li>
          <li>
            <strong style={{ color: '#E8EEFF' }}>Publish</strong> — cada red recibe el vídeo por su
            API (Meta / YouTube / TikTok).
          </li>
        </ol>
      </section>

      <section style={{ ...card, marginTop: 16 }}>
        <h2 style={h2}>Qué puedes hacer ya (sin Mac Mini)</h2>
        <ul style={{ color: '#9AA8C7', lineHeight: 1.55, margin: 0, paddingLeft: '1.2em' }}>
          <li>Dominio + SSL + login solo contacto@ (hecho).</li>
          <li>
            En TikTok Developers: Redirect URI ={' '}
            <code style={{ color: '#c7f3ff' }}>
              https://social.delfincheckin.com/oauth/tiktok
            </code>
          </li>
          <li>
            Tener a mano Client ID/Secret de Meta y YouTube para pegarlos en Postiz el día del Mac
            Mini.
          </li>
        </ul>
      </section>

      <section style={{ ...card, marginTop: 16 }}>
        <h2 style={h2}>Qué verás en TikTok ahora</h2>
        <p style={{ color: '#9AA8C7', lineHeight: 1.5, margin: 0 }}>
          Si abres <code style={{ color: '#c7f3ff' }}>/tiktok</code> sin el Mac Mini, el error{' '}
          <code style={{ color: '#c7f3ff' }}>Failed to fetch 127.0.0.1:8765</code> es{' '}
          <strong style={{ color: '#E8EEFF' }}>normal</strong>: esa pantalla habla con un servicio
          local en el Mac. Hasta que arranques{' '}
          <code style={{ color: '#c7f3ff' }}>python -m delfin_media tiktok serve</code>, no hay API
          local que responder.
        </p>
      </section>
    </main>
  )
}

const card: CSSProperties = {
  marginTop: 28,
  background: 'rgba(20,28,46,.86)',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 18,
  padding: 22,
}

const h2: CSSProperties = {
  margin: '0 0 12px',
  fontSize: '1.1rem',
  color: '#FFD400',
}

const btn: CSSProperties = {
  background: '#FFD400',
  color: '#0B1220',
  fontWeight: 700,
  textDecoration: 'none',
  borderRadius: 12,
  padding: '12px 18px',
  display: 'inline-block',
}
