'use client'

import { useEffect, useMemo, useState } from 'react'

type Availability = {
  property_id: number
  date: string
  available: boolean
  blocked_reason: string | null
}

type CalendarEvent = {
  tenant_id: string
  property_id: number
  event_title: string
  event_description: string | null
  start_date: string
  end_date: string
  is_blocked: boolean
  event_type: string
  created_at: string
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function CalendarPage() {
  const [tenantId, setTenantId] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [start, setStart] = useState<string>(() => {
    const d = new Date(); d.setDate(1); return formatDate(d)
  })
  const [end, setEnd] = useState<string>(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(1); return formatDate(d)
  })
  const [loading, setLoading] = useState(false)
  const [availability, setAvailability] = useState<Availability[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [properties, setProperties] = useState<{ id: number | null; property_name: string; room_id?: number; is_placeholder?: boolean }[]>([])

  // Cargar tenant actual y propiedades del tenant (autenticado por JWT/middleware)
  useEffect(() => {
    const bootstrap = async () => {
      try {
        // Obtener tenant del contexto actual
        const me = await fetch('/api/tenants/me')
        const meData = await me.json()
        if (me.ok && meData?.tenant?.id) {
          setTenantId(meData.tenant.id)
        }

        // Usar SOLO slots unificados con cabecera x-tenant-id
        let list: any[] = []
        try {
          const slotsRes = await fetch('/api/tenant/property-slots', {
            headers: tenantId ? { 'x-tenant-id': tenantId } : undefined
          })
          const slotsData = await slotsRes.json()
          console.log('[Calendar] /api/tenant/property-slots status=', slotsRes.status, 'success=', slotsData?.success)
          if (!slotsRes.ok) {
            console.error('[Calendar] Error property-slots:', slotsData?.error || 'unknown')
          }
          if (slotsRes.ok && slotsData.success) {
            console.log('[Calendar] Usando /api/tenant/property-slots total=', slotsData.total)
            list = (slotsData.slots || []).map((s: any) => ({
              id: s.property_id,
              property_name: s.property_name || s.room_name,
              room_id: s.room_id,
              is_placeholder: s.is_placeholder
            }))
          }
        } catch (err) {
          console.error('[Calendar] Excepción property-slots', err)
        }

        setProperties(list)
        console.log('[Calendar] Props finales total=', list.length)
        if (!propertyId && list.length) {
          // Seleccionar la primera opción
          const first = list[0]
          if (first?.id) setPropertyId(String(first.id))
        }
      } catch (e) {
        console.error('Error inicializando calendario:', e)
      }
    }
    bootstrap()
  }, [])

  const load = async () => {
    if (!tenantId || !propertyId || !start || !end) return
    setLoading(true)
    try {
      const url = `/api/calendar/overview?tenant_id=${tenantId}&property_id=${propertyId}&start=${start}&end=${end}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setAvailability(data.availability)
        setEvents(data.events)
      }
    } finally {
      setLoading(false)
    }
  }

  const days = useMemo(() => {
    const out: string[] = []
    const s = new Date(start)
    const e = new Date(end)
    for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) {
      out.push(formatDate(d))
    }
    return out
  }, [start, end])

  const availabilityByDate = useMemo(() => {
    const map = new Map<string, Availability>()
    availability.forEach(a => map.set(a.date.slice(0,10), a))
    return map
  }, [availability])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    events.forEach(ev => {
      const s = new Date(ev.start_date)
      const e = new Date(ev.end_date)
      for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) {
        const key = formatDate(d)
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(ev)
      }
    })
    return map
  }, [events])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Calendario</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <select value={propertyId} onChange={e=>setPropertyId(e.target.value)} className="border p-2 rounded">
          <option value="">Selecciona propiedad</option>
          {properties.map((p, idx) => (
            <option key={p.id ?? `ph-${idx}`} value={p.id ?? ''}>
              {p.property_name}{p.id ? ` (#${p.id})` : ' (sin configurar)'}
            </option>
          ))}
        </select>
        <input type="date" value={start} onChange={e=>setStart(e.target.value)} className="border p-2 rounded" />
        <input type="date" value={end} onChange={e=>setEnd(e.target.value)} className="border p-2 rounded" />
        <button onClick={load} disabled={loading || !tenantId || !propertyId} className="bg-blue-600 text-white rounded px-4">Cargar</button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const a = availabilityByDate.get(day)
          const evs = eventsByDate.get(day) || []
          const blocked = a && a.available === false
          return (
            <div key={day} className={`border rounded p-2 min-h-[96px] ${blocked ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
              <div className="text-xs text-gray-600 mb-1">{day}</div>
              {blocked && (
                <div className="text-[11px] text-red-700">Bloqueado: {a?.blocked_reason || 'N/A'}</div>
              )}
              {evs.map((ev, i) => (
                <div key={i} className="text-[11px] mt-1 bg-gray-100 rounded px-1">
                  {ev.event_title}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <span className="inline-block w-3 h-3 mr-2 align-middle bg-red-200 border border-red-300"></span>
        Bloqueo/disponibilidad: property_availability · Eventos: calendar_events
      </div>
    </div>
  )
}


