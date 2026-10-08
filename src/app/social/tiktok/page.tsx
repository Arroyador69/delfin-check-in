'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

const API = 'http://127.0.0.1:8765'

const LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: 'Everyone',
  MUTUAL_FOLLOW_FRIENDS: 'Friends',
  FOLLOWER_OF_CREATOR: 'Followers',
  SELF_ONLY: 'Only me',
}

type PackItem = { id: string; label: string; caption: string; preview: string }
type Session = {
  connected?: boolean
  error?: string
  creator_nickname?: string
  creator_username?: string
  creator_avatar_url?: string
  privacy_level_options?: string[]
  comment_disabled?: boolean
  duet_disabled?: boolean
  stitch_disabled?: boolean
  pack?: { items?: PackItem[]; error?: string }
}

export default function SocialTikTokPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [bootError, setBootError] = useState('')
  const [reel, setReel] = useState('')
  const [title, setTitle] = useState('')
  const [preview, setPreview] = useState('')
  const [privacy, setPrivacy] = useState('')
  const [allowComment, setAllowComment] = useState(false)
  const [allowDuet, setAllowDuet] = useState(false)
  const [allowStitch, setAllowStitch] = useState(false)
  const [commercial, setCommercial] = useState(false)
  const [brandOrganic, setBrandOrganic] = useState(false)
  const [brandContent, setBrandContent] = useState(false)
  const [status, setStatus] = useState('')
  const [publishing, setPublishing] = useState(false)

  const consent = useMemo(() => {
    if (commercial && brandContent) {
      return "By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation"
    }
    return "By posting, you agree to TikTok's Music Usage Confirmation"
  }, [commercial, brandContent])

  const canPublish =
    !!session?.connected &&
    !!privacy &&
    !(commercial && !brandOrganic && !brandContent)

  const applyPack = useCallback((pack: Session['pack']) => {
    const items = pack?.items || []
    if (!items.length) return
    setReel(items[0].id)
    setTitle(items[0].caption || '')
    setPreview(API + (items[0].preview || ''))
  }, [])

  useEffect(() => {
    fetch(`${API}/api/session`)
      .then((r) => r.json())
      .then((data: Session) => {
        setSession(data)
        applyPack(data.pack)
      })
      .catch((err) => {
        setBootError(String(err))
      })
  }, [applyPack])

  async function publish() {
    setPublishing(true)
    setStatus('Enviando a TikTok. Puede tardar unos minutos en verse en el perfil.')
    const res = await fetch(`${API}/api/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reel,
        title,
        privacy_level: privacy,
        disable_comment: !allowComment,
        disable_duet: !allowDuet,
        disable_stitch: !allowStitch,
        commercial,
        brand_organic_toggle: commercial && brandOrganic,
        brand_content_toggle: commercial && brandContent,
      }),
    })
    const data = await res.json()
    if (data.error) {
      setStatus(data.error)
      setPublishing(false)
      return
    }
    const tick = setInterval(async () => {
      const job = await (await fetch(`${API}/api/job?id=${encodeURIComponent(data.job_id)}`)).json()
      setStatus(`Estado: ${job.status || ''}${job.error ? ` · ${job.error}` : ''}`)
      if (job.status === 'PUBLISH_COMPLETE' || job.status === 'FAILED') {
        clearInterval(tick)
        setPublishing(false)
      }
    }, 4000)
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        margin: 0,
        padding: '32px 20px 80px',
        maxWidth: 920,
        marginInline: 'auto',
        color: '#fff',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        background: '#0B1220',
      }}
    >
      <p style={{ color: '#b7c2e0' }}>
        <Link href="/social" style={{ color: '#27B4C6' }}>
          ← Buffer social
        </Link>
      </p>
      <h1 style={{ fontSize: '1.6rem', margin: '12px 0 8px' }}>Publicar en TikTok</h1>
      <p style={{ color: '#b7c2e0' }}>
        Requiere el Mac Mini con <code>python -m delfin_media tiktok serve</code>.
      </p>

      <div
        style={{
          background: '#141c2e',
          borderRadius: 16,
          padding: 20,
          margin: '16px 0',
        }}
      >
        {bootError ? (
          <p style={{ background: '#3a2a12', color: '#ffd9a0', padding: '10px 12px', borderRadius: 8 }}>
            Arranca en el Mac: python -m delfin_media tiktok serve
            <br />
            <pre style={{ whiteSpace: 'pre-wrap' }}>{bootError}</pre>
          </p>
        ) : !session ? (
          <p>Cargando…</p>
        ) : !session.connected ? (
          <>
            <p>Conecta la cuenta de TikTok de Delfín Check-in.</p>
            <p>
              <a
                href={`${API}/api/login`}
                style={{
                  background: '#FFD400',
                  color: '#0B1220',
                  fontWeight: 700,
                  textDecoration: 'none',
                  borderRadius: 10,
                  padding: '12px 18px',
                  display: 'inline-block',
                }}
              >
                Continue with TikTok
              </a>
            </p>
            {session.pack?.error ? (
              <p style={{ background: '#3a2a12', color: '#ffd9a0', padding: 10, borderRadius: 8 }}>
                {session.pack.error}
              </p>
            ) : null}
          </>
        ) : (
          <p style={{ color: '#9ff0c2' }}>Login Kit activo · Content Posting API lista</p>
        )}
      </div>

      {session?.connected ? (
        <div style={{ background: '#141c2e', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            {session.creator_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.creator_avatar_url}
                alt=""
                width={48}
                height={48}
                style={{ borderRadius: '50%' }}
              />
            ) : null}
            <div>
              <strong>{session.creator_nickname || 'TikTok'}</strong>
              <div style={{ color: '#b7c2e0' }}>
                @{session.creator_username} · se publica en esta cuenta
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <video
              src={preview}
              controls
              playsInline
              style={{ width: 220, maxWidth: '100%', background: '#000', borderRadius: 12 }}
            />
            <div style={{ flex: 1, minWidth: 260 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>
                Pieza
                <select
                  value={reel}
                  onChange={(e) => {
                    const id = e.target.value
                    setReel(id)
                    const item = session.pack?.items?.find((i) => i.id === id)
                    if (item) {
                      setTitle(item.caption || '')
                      setPreview(API + (item.preview || ''))
                    }
                  }}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: 0, marginTop: 4 }}
                >
                  {(session.pack?.items || []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'block', marginBottom: 8 }}>
                Título / caption
                <textarea
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: '100%', minHeight: 120, padding: 10, borderRadius: 8, border: 0, marginTop: 4 }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: 8 }}>
                Visibilidad
                <select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: 0, marginTop: 4 }}
                >
                  <option value="">Selecciona visibilidad</option>
                  {(session.privacy_level_options || []).map((key) => (
                    <option
                      key={key}
                      value={key}
                      disabled={key === 'SELF_ONLY' && commercial && brandContent}
                    >
                      {LABELS[key] || key}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset style={{ border: '1px solid #2a3550', borderRadius: 10, margin: '12px 0' }}>
                <legend>Interacciones</legend>
                <label>
                  <input
                    type="checkbox"
                    checked={allowComment}
                    disabled={!!session.comment_disabled}
                    onChange={(e) => setAllowComment(e.target.checked)}
                  />{' '}
                  Comentarios
                </label>
                <br />
                <label>
                  <input
                    type="checkbox"
                    checked={allowDuet}
                    disabled={!!session.duet_disabled}
                    onChange={(e) => setAllowDuet(e.target.checked)}
                  />{' '}
                  Duet
                </label>
                <br />
                <label>
                  <input
                    type="checkbox"
                    checked={allowStitch}
                    disabled={!!session.stitch_disabled}
                    onChange={(e) => setAllowStitch(e.target.checked)}
                  />{' '}
                  Stitch
                </label>
              </fieldset>

              <fieldset style={{ border: '1px solid #2a3550', borderRadius: 10, margin: '12px 0' }}>
                <legend>Contenido comercial</legend>
                <label>
                  <input
                    type="checkbox"
                    checked={commercial}
                    onChange={(e) => setCommercial(e.target.checked)}
                  />{' '}
                  Promociona una marca, producto o servicio
                </label>
                {commercial ? (
                  <div style={{ marginTop: 8 }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={brandOrganic}
                        onChange={(e) => setBrandOrganic(e.target.checked)}
                      />{' '}
                      Your brand
                    </label>
                    <br />
                    <label>
                      <input
                        type="checkbox"
                        checked={brandContent}
                        onChange={(e) => setBrandContent(e.target.checked)}
                      />{' '}
                      Branded content
                    </label>
                  </div>
                ) : null}
              </fieldset>

              <p style={{ color: '#b7c2e0' }}>{consent}</p>
              <button
                type="button"
                disabled={!canPublish || publishing}
                onClick={publish}
                style={{
                  background: '#FFD400',
                  color: '#0B1220',
                  border: 0,
                  borderRadius: 10,
                  padding: '12px 18px',
                  fontWeight: 700,
                  opacity: !canPublish || publishing ? 0.4 : 1,
                  cursor: !canPublish || publishing ? 'not-allowed' : 'pointer',
                }}
              >
                Publicar en TikTok
              </button>
              <p style={{ color: '#b7c2e0' }}>{status}</p>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
