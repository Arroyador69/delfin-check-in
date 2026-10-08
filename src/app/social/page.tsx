import Link from 'next/link'

/**
 * Buffer de publicación social (Postiz + APIs).
 * Privado: middleware solo deja entrar a contacto@delfincheckin.com.
 */
export default function SocialHubPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        margin: 0,
        padding: '48px 22px 80px',
        color: '#E8EEFF',
        fontFamily: '"Segoe UI", "Avenir Next", "Trebuchet MS", sans-serif',
        background:
          'radial-gradient(1200px 600px at 10% -10%, rgba(39,180,198,.28), transparent 55%), radial-gradient(900px 500px at 100% 0%, rgba(255,212,0,.16), transparent 50%), linear-gradient(160deg,#071018 0%,#0B1220 45%,#121a2c 100%)',
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <p style={{ color: '#9AA8C7', margin: '0 0 8px' }}>Delfín Check-in · privado</p>
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
        <p style={{ color: '#9AA8C7', maxWidth: '36em', lineHeight: 1.5 }}>
          Hub para programar y subir el pack diario (Instagram, Facebook, TikTok, YouTube)
          vía Postiz + APIs. Solo{' '}
          <strong style={{ color: '#FFD400' }}>contacto@delfincheckin.com</strong>.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
          <Link
            href="/social/tiktok"
            style={{
              background: '#FFD400',
              color: '#0B1220',
              fontWeight: 700,
              textDecoration: 'none',
              borderRadius: 12,
              padding: '12px 18px',
            }}
          >
            TikTok (Login Kit)
          </Link>
          <a
            href="https://admin.delfincheckin.com"
            style={{ color: '#27B4C6', fontWeight: 600, alignSelf: 'center' }}
          >
            Volver al admin
          </a>
        </div>

        <section
          style={{
            marginTop: 28,
            background: 'rgba(20,28,46,.86)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 18,
            padding: 22,
          }}
        >
          <h2 style={{ margin: '0 0 10px', fontSize: '1.1rem', color: '#FFD400' }}>
            Listo ahora (sin Mac Mini)
          </h2>
          <ul style={{ color: '#9AA8C7', lineHeight: 1.55, margin: 0, paddingLeft: '1.2em' }}>
            <li>
              Dominio <code style={{ color: '#c7f3ff' }}>social.delfincheckin.com</code> en el
              mismo Vercel que admin / tap / clean / g
            </li>
            <li>Login obligatorio con tu cuenta de plataforma</li>
            <li>
              Redirect OAuth TikTok:{' '}
              <code style={{ color: '#c7f3ff' }}>
                https://social.delfincheckin.com/oauth/tiktok
              </code>
            </li>
            <li>Pantalla TikTok lista para cuando el Mac Mini sirva la API local (:8765)</li>
          </ul>
        </section>

        <section
          style={{
            marginTop: 16,
            background: 'rgba(20,28,46,.86)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 18,
            padding: 22,
          }}
        >
          <h2 style={{ margin: '0 0 10px', fontSize: '1.1rem', color: '#FFD400' }}>
            Cuando tengas el Mac Mini (Postiz = buffer)
          </h2>
          <ul style={{ color: '#9AA8C7', lineHeight: 1.55, margin: 0, paddingLeft: '1.2em' }}>
            <li>
              Instalar Postiz self-hosted (
              <code style={{ color: '#c7f3ff' }}>gitroomhq/postiz-app</code>) con
              FRONTEND_URL = este dominio
            </li>
            <li>
              Conectar canales: Instagram + Facebook (Meta), YouTube, TikTok
            </li>
            <li>
              El CLI <code style={{ color: '#c7f3ff' }}>delfin_media day</code> genera el pack;
              Postiz lo programa / publica por API
            </li>
            <li>
              En TikTok Developers: Redirect URI ={' '}
              <code style={{ color: '#c7f3ff' }}>
                https://social.delfincheckin.com/oauth/tiktok
              </code>{' '}
              (y la de Postiz si usas su Login Kit)
            </li>
          </ul>
        </section>

        <section
          style={{
            marginTop: 16,
            background: 'rgba(20,28,46,.86)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 18,
            padding: 22,
          }}
        >
          <h2 style={{ margin: '0 0 10px', fontSize: '1.1rem', color: '#FFD400' }}>
            Checklist Mac Mini
          </h2>
          <ul style={{ color: '#9AA8C7', lineHeight: 1.55, margin: 0, paddingLeft: '1.2em' }}>
            <li>
              <code style={{ color: '#c7f3ff' }}>python -m delfin_media day</code>
            </li>
            <li>
              <code style={{ color: '#c7f3ff' }}>python -m delfin_media tiktok serve</code>
            </li>
            <li>
              <code style={{ color: '#c7f3ff' }}>
                TIKTOK_REDIRECT_URI=https://social.delfincheckin.com/oauth/tiktok
              </code>
            </li>
            <li>Docker Postiz + claves Meta / YouTube / TikTok en .env</li>
          </ul>
        </section>
      </div>
    </main>
  )
}
