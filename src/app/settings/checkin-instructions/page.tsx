'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'

interface SlotOption {
  id: string
  label: string
  room_id?: string
}

export default function CheckinInstructionsPage() {
  const [slots, setSlots] = useState<SlotOption[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [templates, setTemplates] = useState<Array<{ id:number; room_id:string|null; title:string|null; body_html:string; updated_at:string }>>([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/tenant/property-slots')
        const data = await res.json()
        if (data.success && Array.isArray(data.slots)) {
          const opts: SlotOption[] = data.slots.map((s: any) => ({
            id: String(s.room_id || s.property_id || s.id),
            label: s.room_name || s.label || s.name || (s.room_id ? `Habitación ${s.room_id}` : `Habitación ${s.id}`),
            room_id: s.room_id || s.id || null
          }))
          // opción por defecto del tenant (sin room)
          setSlots([{ id: '', label: 'Por defecto (todas las habitaciones)' }, ...opts])
        }
      } catch (e) {}

      // cargar instrucciones existentes
      try {
        const res = await fetch('/api/settings/checkin-instructions')
        const data = await res.json()
        if (data.success && Array.isArray(data.items) && data.items.length > 0) {
          setTemplates(data.items)
          // si hay una por defecto, precargar
          const def = data.items.find((it: any) => !it.room_id)
          if (def) {
            setSelectedRoomId('')
            setTitle(def.title || '')
            setBody(def.body_html || '')
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
        const item = roomId ? (data.items?.[0] || null) : (data.items?.find((it: any) => !it.room_id) || null)
        setTitle(item?.title || '')
        setBody(item?.body_html || '')
      }
    } catch (e) {}
  }

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/settings/checkin-instructions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: selectedRoomId || null, title, body_html: body })
      })
      const data = await res.json()
      if (data.success) {
        setMessage('Guardado correctamente')
        // refrescar lista
        try {
          const r = await fetch('/api/settings/checkin-instructions')
          const d = await r.json()
          if (d.success) setTemplates(d.items)
        } catch {}
      }
      else setMessage(data.error || 'Error guardando')
    } catch (e: any) {
      setMessage(e.message || 'Error guardando')
    } finally {
      setSaving(false)
    }
  }

  const templateForRoom = (roomId: string) => templates.find(t => (t.room_id || '') === (roomId || ''))
  const hasTemplateSelected = !!templateForRoom(selectedRoomId)

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-md border border-indigo-100 p-6 mb-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="text-3xl">🧭</div>
              <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Instrucciones de Check‑in</h1>
            </div>
            <p className="text-gray-600">Configura el contenido que enviaremos al huésped tras confirmar su reserva.</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-6 space-y-5 border border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Habitación/slot</label>
              <select
                value={selectedRoomId}
                onChange={(e) => { setSelectedRoomId(e.target.value); loadForRoom(e.target.value) }}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {slots.map((s) => (
                  <option key={s.id} value={s.room_id || ''}>{s.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Si eliges "Por defecto", se aplicará a todas las habitaciones sin configuración específica.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título (opcional)</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contenido (HTML permitido)</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="w-full border rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Ej.: Código de la puerta, instrucciones de llegada, aparcamiento, etc..." />
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                <div className="font-semibold">Variables disponibles:</div>
                <div><code className="px-1 py-0.5 bg-gray-100 rounded">{'{{guest_name}}'}</code> → nombre del huésped (ej.: Juan Pérez)</div>
                <div><code className="px-1 py-0.5 bg-gray-100 rounded">{'{{check_in_date}}'}</code> → fecha de entrada formateada (ej.: 5 de noviembre de 2025)</div>
                <div><code className="px-1 py-0.5 bg-gray-100 rounded">{'{{check_out_date}}'}</code> → fecha de salida formateada (ej.: 8 de noviembre de 2025)</div>
                <div className="text-[11px] text-gray-500">Estas variables se sustituyen automáticamente cuando se envía el email al huésped.</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 shadow-md">{saving ? 'Guardando...' : (hasTemplateSelected ? 'Actualizar' : 'Guardar')}</button>
              {message && <span className="text-sm text-gray-700">{message}</span>}
            </div>
          </div>

          {/* Lista de plantillas existentes */}
          <div className="mt-6 bg-white rounded-2xl shadow p-4 border border-gray-100">
            <h2 className="text-lg font-semibold mb-2">Plantillas guardadas</h2>
            <p className="text-xs text-gray-500 mb-3">Máximo por tu plan: {Math.max(1, slots.filter(s=>s.id!=='' ).length)} plantillas (1 por habitación/slot). Puedes actualizar una plantilla existente desde aquí.</p>
            <div className="divide-y">
              {templates.length === 0 && (
                <div className="text-sm text-gray-500">Aún no has guardado ninguna plantilla.</div>
              )}
              {templates.map((tpl) => {
                const roomLabel = tpl.room_id ? (slots.find(s=> (s.room_id||'') === tpl.room_id)?.label || `Habitación ${tpl.room_id}`) : 'Por defecto'
                return (
                  <details key={tpl.id} className="py-2 group">
                    <summary className="cursor-pointer text-sm flex items-center justify-between">
                      <span className="font-medium text-gray-800">{roomLabel}</span>
                      <span className="text-xs text-gray-500">Actualizado {new Date(tpl.updated_at).toLocaleDateString('es-ES')}</span>
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded">
                      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: tpl.body_html.substring(0, 800) + (tpl.body_html.length>800?'…':'') }} />
                      <div className="mt-2">
                        <button onClick={() => { setSelectedRoomId(tpl.room_id || ''); setTitle(tpl.title || ''); setBody(tpl.body_html || ''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="text-indigo-600 text-sm font-medium hover:underline">Editar esta plantilla</button>
                      </div>
                    </div>
                  </details>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}


