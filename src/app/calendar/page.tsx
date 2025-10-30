'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar as CalendarIcon, CalendarDays, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

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
            headers: meData?.tenant?.id ? { 'x-tenant-id': meData.tenant.id } : undefined
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
          setPropertyId(first?.id ? String(first.id) : `room:${first.room_id}`)
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
      const isRoomOnly = propertyId.startsWith('room:')
      const base = `/api/calendar?tenant_id=${tenantId}`
      const url = `${base}${isRoomOnly ? '' : `&property_id=${propertyId}`}&from=${start}&to=${end}`
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

  const previousMonth = () => {
    const d = new Date(start)
    d.setMonth(d.getMonth() - 1)
    d.setDate(1)
    setStart(formatDate(d))
    const e = new Date(d)
    e.setMonth(e.getMonth() + 1)
    setEnd(formatDate(e))
  }

  const nextMonth = () => {
    const d = new Date(start)
    d.setMonth(d.getMonth() + 1)
    d.setDate(1)
    setStart(formatDate(d))
    const e = new Date(d)
    e.setMonth(e.getMonth() + 1)
    setEnd(formatDate(e))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-5xl font-bold mb-2 sm:mb-4">
            <span className="text-4xl sm:text-6xl mr-2 sm:mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📅</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Calendario de Disponibilidad
            </span>
          </h1>
          <p className="text-gray-600 text-sm sm:text-lg">Visualiza y gestiona la disponibilidad de tus propiedades</p>
        </div>

        {/* Controles */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
            <select 
              value={propertyId} 
              onChange={e=>setPropertyId(e.target.value)} 
              className="border-2 border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
            >
              <option value="">Selecciona propiedad</option>
              {properties.map((p, idx) => (
                <option key={p.id ?? `ph-${idx}`} value={p.id ? String(p.id) : `room:${p.room_id}`}>
                  {p.property_name}{p.id ? ` (#${p.id})` : ` (slot ${p.room_id})`}
                </option>
              ))}
            </select>
            <input 
              type="date" 
              value={start} 
              onChange={e=>setStart(e.target.value)} 
              className="border-2 border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium" 
            />
            <input 
              type="date" 
              value={end} 
              onChange={e=>setEnd(e.target.value)} 
              className="border-2 border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium" 
            />
            <button 
              onClick={load} 
              disabled={loading || !tenantId || !propertyId} 
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl px-6 py-3 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105 font-semibold shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Cargando...</span>
                </>
              ) : (
                <>
                  <CalendarIcon className="w-5 h-5" />
                  <span>Cargar</span>
                </>
              )}
            </button>
          </div>

          {/* Navegación de meses */}
          <div className="flex justify-center items-center gap-4 mt-4">
            <button
              onClick={previousMonth}
              className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-all transform hover:scale-110"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-lg font-bold text-gray-800">
              {new Date(start).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-600 rounded-lg hover:from-purple-100 hover:to-pink-100 transition-all transform hover:scale-110"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Calendario */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-4 sm:p-6">
          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div key={day} className="text-center font-bold text-gray-700 py-2 text-sm sm:text-base">
                {day}
              </div>
            ))}
            {days.map(day => {
              const a = availabilityByDate.get(day)
              const evs = eventsByDate.get(day) || []
              const blocked = a && a.available === false
              const dayNum = new Date(day).getDate()
              const isToday = formatDate(new Date()) === day
              return (
                <div 
                  key={day} 
                  className={`border-2 rounded-xl p-2 sm:p-3 min-h-[96px] transition-all hover:shadow-md ${
                    blocked 
                      ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-300' 
                      : isToday
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-bold mb-1 text-gray-600">
                    {dayNum}
                  </div>
                  {blocked && (
                    <div className="text-[11px] text-red-700 font-semibold bg-white px-1 py-0.5 rounded mb-1">
                      🚫 {a?.blocked_reason || 'Bloqueado'}
                    </div>
                  )}
                  {evs.map((ev, i) => (
                    <div 
                      key={i} 
                      className={`text-[10px] sm:text-[11px] mt-1 rounded px-1 py-0.5 font-medium ${
                        ev.event_type === 'reservation' 
                          ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200' 
                          : 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200'
                      }`}
                    >
                      {ev.event_type === 'reservation' ? '✅' : '📝'} {ev.event_title}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {/* Leyenda */}
        <div className="mt-6 bg-white rounded-xl shadow-lg border border-blue-200 p-4 sm:p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-600" />
            <span>Leyenda</span>
          </h3>
          <div className="flex flex-wrap gap-4 sm:gap-6">
            <div className="flex items-center">
              <div className="inline-block w-4 h-4 mr-2 align-middle bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded"></div>
              <span className="text-sm font-medium text-gray-700">✅ Reservas</span>
            </div>
            <div className="flex items-center">
              <div className="inline-block w-4 h-4 mr-2 align-middle bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded"></div>
              <span className="text-sm font-medium text-gray-700">🚫 Bloqueo/Indisponibilidad</span>
            </div>
            <div className="flex items-center">
              <div className="inline-block w-4 h-4 mr-2 align-middle bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 rounded"></div>
              <span className="text-sm font-medium text-gray-700">📅 Hoy</span>
            </div>
            <div className="flex items-center">
              <div className="inline-block w-4 h-4 mr-2 align-middle bg-gradient-to-r from-gray-100 to-slate-100 border-2 border-gray-300 rounded"></div>
              <span className="text-sm font-medium text-gray-700">📝 Otros eventos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
