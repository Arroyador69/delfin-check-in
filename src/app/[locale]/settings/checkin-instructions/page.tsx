'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useTranslations, useLocale } from 'next-intl'
import { Trash2 } from 'lucide-react'
import { useTenant, hasCheckinInstructionsEmailAccess } from '@/hooks/useTenant'
import { PlanFreePreviewOverlay } from '@/components/PlanFreePreviewOverlay'
import { waMeUrlFromStoredPhone } from '@/lib/wa-me-url'

function pickWhatsappFromItems(
  items: Array<{ room_id?: string | null; locale?: string; whatsapp_e164?: string | null }>,
  roomKey: string
): string {
  const filtered = items.filter((it) => (it.room_id || '') === (roomKey || ''))
  const es = filtered.find((it) => it.locale === 'es')
  const en = filtered.find((it) => it.locale === 'en')
  const w = es?.whatsapp_e164 ?? en?.whatsapp_e164
  return w ? String(w) : ''
}

interface SlotOption {
  id: string
  label: string
  room_id?: string
}

export default function CheckinInstructionsPage() {
  const t = useTranslations('settings.checkinInstructions')
  const locale = useLocale()
  const { tenant } = useTenant()
  const canEditCheckinEmail = hasCheckinInstructionsEmailAccess(tenant)
  const [slots, setSlots] = useState<SlotOption[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [titleEs, setTitleEs] = useState('')
  const [bodyEs, setBodyEs] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [bodyEn, setBodyEn] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [templates, setTemplates] = useState<
    Array<{
      id: number
      room_id: string | null
      locale: string
      title: string | null
      body_html: string
      updated_at: string
      whatsapp_e164?: string | null
    }>
  >([])
  const [whatsappE164, setWhatsappE164] = useState('')
  const [deleteFlow, setDeleteFlow] = useState<null | { id: number; label: string; room_id: string | null; phase: 1 | 2 }>(null)
  const [deleteAck, setDeleteAck] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/tenant/property-slots')
        const data = await res.json()
        if (data.success && Array.isArray(data.slots)) {
          const opts: SlotOption[] = data.slots.map((s: any) => ({
            id: String(s.room_id || s.property_id || s.id),
            label: s.room_name || s.label || s.name || (s.room_id ? t('roomLabel', { id: s.room_id }) : t('roomLabel', { id: s.id })),
            room_id: s.room_id || s.id || null
          }))
          // opción por defecto del tenant (sin room)
          setSlots([{ id: '', label: t('defaultOption') }, ...opts])
        }
      } catch (e) {}

      // cargar instrucciones existentes
      try {
        const res = await fetch('/api/settings/checkin-instructions')
        const data = await res.json()
        if (data.success && Array.isArray(data.items) && data.items.length > 0) {
          setTemplates(data.items)
          // si hay una por defecto, precargar
          const defEs = data.items.find((it: any) => !it.room_id && it.locale === 'es')
          const defEn = data.items.find((it: any) => !it.room_id && it.locale === 'en')
          if (defEs || defEn) {
            setSelectedRoomId('')
            setTitleEs(defEs?.title || '')
            setBodyEs(defEs?.body_html || '')
            setTitleEn(defEn?.title || '')
            setBodyEn(defEn?.body_html || '')
            setWhatsappE164(pickWhatsappFromItems(data.items, ''))
          }
        }
      } catch (e) {}
    }
    load()
  }, [])

  const loadForRoom = async (roomId: string) => {
    try {
      const url = roomId ? `/api/settings/checkin-instructions?room_id=${encodeURIComponent(roomId)}` : '/api/settings/checkin-instructions'
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        const all = data.items || []
        const es = all.find((it: any) => it.locale === 'es') || null
        const en = all.find((it: any) => it.locale === 'en') || null
        setTitleEs(es?.title || '')
        setBodyEs(es?.body_html || '')
        setTitleEn(en?.title || '')
        setBodyEn(en?.body_html || '')
        setWhatsappE164(pickWhatsappFromItems(all, roomId))
      }
    } catch (e) {}
  }

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      const requests: Promise<Response>[] = []
      const waPayload = whatsappE164.trim() ? whatsappE164.trim() : null
      if (bodyEs.trim()) {
        requests.push(fetch('/api/settings/checkin-instructions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_id: selectedRoomId || null,
            locale: 'es',
            title: titleEs,
            body_html: bodyEs,
            whatsapp_e164: waPayload,
          })
        }))
      }
      if (bodyEn.trim()) {
        requests.push(fetch('/api/settings/checkin-instructions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_id: selectedRoomId || null,
            locale: 'en',
            title: titleEn,
            body_html: bodyEn,
            whatsapp_e164: waPayload,
          })
        }))
      }
      if (requests.length === 0) {
        setMessage(t('contentPlaceholder'))
        return
      }
      const responses = await Promise.all(requests)
      const payloads = await Promise.all(responses.map(r => r.json()))
      if (payloads.every((p) => p.success)) {
        setMessage(t('saved'))
        // refrescar lista
        try {
          const r = await fetch('/api/settings/checkin-instructions')
          const d = await r.json()
          if (d.success) {
            setTemplates(d.items)
            setWhatsappE164(pickWhatsappFromItems(d.items, selectedRoomId))
          }
        } catch {}
      }
      else setMessage(payloads.find((p) => !p.success)?.error || t('errorSaving'))
    } catch (e: any) {
      setMessage(e.message || t('errorSaving'))
    } finally {
      setSaving(false)
    }
  }

  const templateForRoom = (roomId: string) => templates.find(t => (t.room_id || '') === (roomId || ''))
  const hasTemplateSelected = !!templateForRoom(selectedRoomId)

  const requestDeleteTemplate = (tpl: { id: number; room_id: string | null }) => {
    const roomLabel = tpl.room_id
      ? (slots.find(s => (s.room_id || '') === tpl.room_id)?.label || t('roomLabel', { id: tpl.room_id }))
      : t('default')
    setDeleteAck(false)
    setDeleteFlow({ id: tpl.id, label: roomLabel, room_id: tpl.room_id, phase: 1 })
  }

  const executeDelete = async () => {
    if (!deleteFlow || deleteFlow.phase !== 2 || !deleteAck) return
    setDeleting(true)
    setMessage('')
    try {
      const res = await fetch(`/api/settings/checkin-instructions?id=${deleteFlow.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setMessage(t('deleteSuccess'))
        setDeleteFlow(null)
        setDeleteAck(false)
        const r = await fetch('/api/settings/checkin-instructions')
        const d = await r.json()
        if (d.success) {
          setTemplates(d.items)
          const sameSlot =
            (deleteFlow.room_id || '') === (selectedRoomId || '') ||
            (deleteFlow.room_id == null && selectedRoomId === '')
          if (sameSlot) {
            const remaining = d.items.filter((it: any) => (it.room_id || '') === (selectedRoomId || ''))
            setTitleEs(remaining.find((it: any) => it.locale === 'es')?.title || '')
            setBodyEs(remaining.find((it: any) => it.locale === 'es')?.body_html || '')
            setTitleEn(remaining.find((it: any) => it.locale === 'en')?.title || '')
            setBodyEn(remaining.find((it: any) => it.locale === 'en')?.body_html || '')
            setWhatsappE164(pickWhatsappFromItems(remaining, selectedRoomId))
          }
        }
      } else {
        setMessage(data.error || t('deleteError'))
      }
    } catch {
      setMessage(t('deleteError'))
    } finally {
      setDeleting(false)
    }
  }

  const showPaywall = Boolean(tenant && !canEditCheckinEmail)
  const waPreview = waMeUrlFromStoredPhone(whatsappE164)

  return (
    <AdminLayout>
      <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {showPaywall && (
          <PlanFreePreviewOverlay
            title={t('paywallTitle')}
            body={t('paywallBody')}
            ctaLabel={t('paywallCta')}
          />
        )}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-md border border-indigo-100 p-6 mb-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="text-3xl">🧭</div>
              <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{t('title')}</h1>
            </div>
            <p className="text-gray-600">{t('subtitle')}</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-6 space-y-5 border border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('roomSlot')}</label>
              <select
                value={selectedRoomId}
                onChange={(e) => { setSelectedRoomId(e.target.value); loadForRoom(e.target.value) }}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {slots.map((s) => (
                  <option key={s.id} value={s.room_id || ''}>{s.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">{t('roomHint')}</p>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-2">
              <label className="block text-sm font-medium text-gray-800">{t('whatsappLabel')}</label>
              <input
                value={whatsappE164}
                onChange={(e) => setWhatsappE164(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                placeholder={t('whatsappPlaceholder')}
                inputMode="tel"
                autoComplete="tel"
              />
              <p className="text-xs text-gray-600">{t('whatsappHint')}</p>
              {waPreview ? (
                <p className="text-xs text-gray-700">
                  <span className="font-medium">{t('whatsappLinkPreview')}:</span>{' '}
                  <a href={waPreview} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline break-all">
                    {waPreview}
                  </a>
                </p>
              ) : null}
            </div>

            <div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="font-semibold text-sm text-gray-900 mb-3">ES</div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('titleLabel')}</label>
                  <input value={titleEs} onChange={(e) => setTitleEs(e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-3" />
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('contentLabel')}</label>
                  <textarea value={bodyEs} onChange={(e) => setBodyEs(e.target.value)} rows={12} className="w-full border rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder={t('contentPlaceholder')} />
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="font-semibold text-sm text-gray-900 mb-3">EN</div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('titleLabel')}</label>
                  <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-3" />
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('contentLabel')}</label>
                  <textarea value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} rows={12} className="w-full border rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder={t('contentPlaceholder')} />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                <div className="font-semibold">{t('variablesTitle')}</div>
                <div><code className="px-1 py-0.5 bg-gray-100 rounded">{'{{guest_name}}'}</code> → {t('varGuest')}</div>
                <div><code className="px-1 py-0.5 bg-gray-100 rounded">{'{{check_in_date}}'}</code> → {t('varCheckIn')}</div>
                <div><code className="px-1 py-0.5 bg-gray-100 rounded">{'{{check_out_date}}'}</code> → {t('varCheckOut')}</div>
                <div className="text-[11px] text-gray-500">{t('variablesHint')}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 shadow-md">{saving ? t('saving') : (hasTemplateSelected ? t('update') : t('save'))}</button>
              {message && <span className="text-sm text-gray-700">{message}</span>}
            </div>
          </div>

          {/* Lista de plantillas existentes */}
          <div className="mt-6 bg-white rounded-2xl shadow p-4 border border-gray-100">
            <h2 className="text-lg font-semibold mb-2 text-gray-900">{t('savedTemplates')}</h2>
            <p className="text-xs text-gray-500 mb-3">{t('maxTemplates', { count: Math.max(1, slots.filter(s=>s.id!=='' ).length) })}</p>
            <div className="divide-y">
              {templates.length === 0 && (
                <div className="text-sm text-gray-500">{t('noTemplates')}</div>
              )}
              {templates.map((tpl) => {
                const roomLabel = tpl.room_id ? (slots.find(s=> (s.room_id||'') === tpl.room_id)?.label || t('roomLabel', { id: tpl.room_id })) : t('default')
                return (
                  <details key={tpl.id} className="py-2 group">
                    <summary className="cursor-pointer text-sm flex items-center justify-between">
                      <span className="font-medium text-gray-800">{roomLabel} · {(tpl.locale || 'es').toUpperCase()}</span>
                      <span className="text-xs text-gray-500">{t('updated')} {new Date(tpl.updated_at).toLocaleDateString(locale)}</span>
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded">
                      <div className="prose prose-sm max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: tpl.body_html.substring(0, 800) + (tpl.body_html.length>800?'…':'') }} />
                      <div className="mt-2 flex flex-wrap items-center gap-4">
                        <button type="button" onClick={() => { setSelectedRoomId(tpl.room_id || ''); loadForRoom(tpl.room_id || ''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="text-indigo-600 text-sm font-medium hover:underline">{t('editTemplate')}</button>
                        <button type="button" onClick={() => requestDeleteTemplate(tpl)} className="text-red-600 text-sm font-medium hover:underline inline-flex items-center gap-1">
                          <Trash2 className="w-4 h-4" aria-hidden />
                          {t('deleteTemplate')}
                        </button>
                      </div>
                    </div>
                  </details>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {deleteFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-200">
            {deleteFlow.phase === 1 ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900">{t('deleteStep1Title')}</h3>
                <p className="text-sm text-gray-600">{t('deleteStep1Body', { label: deleteFlow.label })}</p>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => { setDeleteFlow(null); setDeleteAck(false) }}>{t('deleteCancel')}</button>
                  <button type="button" className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700" onClick={() => { setDeleteAck(false); setDeleteFlow({ ...deleteFlow, phase: 2 }) }}>{t('deleteStep1Continue')}</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900">{t('deleteStep2Title')}</h3>
                <p className="text-sm text-gray-600">{t('deleteStep2Body')}</p>
                <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
                  <input type="checkbox" className="mt-1 rounded border-gray-300" checked={deleteAck} onChange={(e) => setDeleteAck(e.target.checked)} />
                  <span>{t('deleteStep2Checkbox')}</span>
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => { setDeleteFlow({ ...deleteFlow, phase: 1 }); setDeleteAck(false) }}>{t('deleteCancel')}</button>
                  <button type="button" disabled={!deleteAck || deleting} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed" onClick={executeDelete}>{deleting ? t('deleting') : t('deleteStep2Submit')}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}


