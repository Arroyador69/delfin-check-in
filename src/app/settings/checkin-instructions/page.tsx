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
      if (data.success) setMessage('Guardado correctamente')
      else setMessage(data.error || 'Error guardando')
    } catch (e: any) {
      setMessage(e.message || 'Error guardando')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="text-3xl mb-2">🧭</div>
            <h1 className="text-2xl font-bold">Instrucciones de Check‑in</h1>
            <p className="text-sm text-gray-600">Configura el contenido que enviaremos al huésped tras confirmar su reserva</p>
          </div>

          <div className="bg-white rounded-xl shadow p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Habitación/slot</label>
              <select
                value={selectedRoomId}
                onChange={(e) => { setSelectedRoomId(e.target.value); loadForRoom(e.target.value) }}
                className="w-full border rounded-lg px-3 py-2"
              >
                {slots.map((s) => (
                  <option key={s.id} value={s.room_id || ''}>{s.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Si eliges "Por defecto", se aplicará a todas las habitaciones sin configuración específica.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título (opcional)</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contenido (HTML permitido)</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="w-full border rounded-lg px-3 py-2 font-mono text-sm" placeholder="Ej.: Código de la puerta, instrucciones de llegada, aparcamiento, etc..." />
              <p className="text-xs text-gray-500 mt-1">Puedes usar variables: {'{{reservation_code}}'}, {'{{guest_name}}'}, {'{{check_in_date}}'}, {'{{check_out_date}}'}.</p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300">{saving ? 'Guardando...' : 'Guardar'}</button>
              {message && <span className="text-sm text-gray-700">{message}</span>}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}


