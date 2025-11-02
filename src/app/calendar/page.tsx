'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar as CalendarIcon, CalendarDays, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
  room_id?: string
  room_name?: string | null
  reservation_id?: number
  guest_name?: string
  channel?: string | null
  guest_count?: number | null
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
  const router = useRouter()
  const [viewEvent, setViewEvent] = useState<CalendarEvent | null>(null)

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
      } catch (e) {
        console.error('Error inicializando calendario:', e)
      }
    }
    bootstrap()
  }, [])

  const load = async () => {
    if (!tenantId || !start || !end) return
    setLoading(true)
    try {
      const base = `/api/calendar?tenant_id=${tenantId}`
      const url = `${base}${propertyId ? `&property_id=${propertyId}` : ''}&from=${start}&to=${end}`
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
    
    // Calcular offset: convertir getDay() (domingo=0) a offset de lunes (lunes=0)
    const firstDayOfMonth = new Date(s.getFullYear(), s.getMonth(), 1)
    const startWeekday = (firstDayOfMonth.getDay() + 6) % 7 // lunes=0
    
    // Añadir celdas vacías al inicio si el mes no empieza en lunes
    for (let i = 0; i < startWeekday; i++) {
      out.push('')
    }
    
    // Añadir los días del mes
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

  const checkoutByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    events.forEach(ev => {
      const key = formatDate(new Date(ev.end_date))
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <input 
              type="date" 
              value={start} 
              onChange={e=>setStart(e.target.value)} 
              className="border-2 border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold text-gray-800 placeholder-gray-500" 
            />
            <input 
              type="date" 
              value={end} 
              onChange={e=>setEnd(e.target.value)} 
              className="border-2 border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold text-gray-800 placeholder-gray-500" 
            />
            <button 
              onClick={load} 
              disabled={loading || !tenantId} 
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
        <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-2 sm:p-4 lg:p-6">
          {/* Contenedor con scroll horizontal en móvil */}
          <div className="overflow-x-auto -mx-2 sm:mx-0 -my-2 sm:my-0 lg:overflow-x-visible">
            <div className="inline-grid grid-cols-7 gap-2 sm:gap-3 min-w-full sm:min-w-0 w-max sm:w-full">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="text-center font-bold text-gray-700 py-2 text-sm sm:text-base px-1">
                  {day}
                </div>
              ))}
              {days.map((day, idx) => {
                // Si el día está vacío (celda de padding), renderizar celda vacía
                if (!day) {
                  return <div key={`empty-${idx}`} className="border-2 rounded-xl p-2 sm:p-3 min-h-[112px] w-[100px] sm:w-auto bg-gray-50 border-gray-100"></div>
                }
                
                const a = availabilityByDate.get(day)
                const evs = eventsByDate.get(day) || []
                const blocked = a && a.available === false
                const dayNum = new Date(day).getDate()
                const isToday = formatDate(new Date()) === day
                return (
                  <div 
                    key={day} 
                    className={`border-2 rounded-xl p-2 sm:p-3 min-h-[112px] transition-all hover:shadow-md w-[100px] sm:w-auto ${
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
                    onClick={()=> ev.event_type === 'reservation' ? setViewEvent(ev) : undefined}
                    className={`cursor-pointer text-[9px] sm:text-[11px] mt-1 rounded px-1 py-0.5 font-medium truncate ${
                          ev.event_type === 'reservation' 
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200' 
                            : 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200'
                        } ${formatDate(new Date(ev.start_date)) === day ? 'border-l-4 border-green-600' : ''}`}
                    title={`${ev.room_name ? ev.room_name + ' · ' : ''}${ev.event_title?.replace(/^Reserva\s+/,'')}`}
                      >
                        {ev.event_type === 'reservation' ? '✅' : '📝'} {ev.room_name ? `${ev.room_name} · ` : ''}{ev.event_title?.replace(/^Reserva\s+/,'')}
                      </div>
                    ))}
                    {(checkoutByDate.get(day) || []).map((ev, j) => (
                      <div key={`co-${j}`} className="text-[9px] sm:text-[10px] mt-1 rounded px-1 bg-amber-100 text-amber-800 truncate">
                    {ev.room_name ? `${ev.room_name} · ` : ''}{ev.event_title?.replace(/^Reserva\s+/,'')}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
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
              <span className="text-sm font-medium text-gray-700">✅ Reservas (borde izq = check-in)</span>
            </div>
            <div className="flex items-center">
              <div className="inline-block w-4 h-4 mr-2 align-middle bg-amber-200 border-2 border-amber-300 rounded"></div>
              <span className="text-sm font-medium text-gray-700">🚪 Checkout (día de salida)</span>
            </div>
            <div className="flex items-center">
              <div className="inline-block w-4 h-4 mr-2 align-middle bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded"></div>
              <span className="text-sm font-medium text-gray-700">🚫 Bloqueo/Indisponibilidad</span>
            </div>
            <div className="flex items-center">
              <div className="inline-block w-4 h-4 mr-2 align-middle bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 rounded"></div>
              <span className="text-sm font-medium text-gray-700">📅 Hoy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal ver reserva */}
      {viewEvent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-blue-200">
            {/* Header del modal */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-3xl sm:text-4xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>👁️</span>
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Ver Reserva
                  </span>
                </h3>
                <button onClick={()=>setViewEvent(null)} className="text-gray-400 hover:text-gray-600 transition-all hover:scale-110">
                  <span className="text-2xl" style={{fontFamily: 'Arial, sans-serif'}}>✕</span>
                </button>
              </div>
            </div>
            
            {/* Contenido del modal */}
            <div className="p-6">
              {/* Información de la habitación */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200 mb-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🏠</span>
                  Información de la Reserva
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Habitación</p>
                    <p className="text-base font-bold text-gray-900">{viewEvent.room_name || viewEvent.room_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Huésped</p>
                    <p className="text-base font-bold text-gray-900">{viewEvent.guest_name || viewEvent.event_title?.replace(/^Reserva\s+/,'')}</p>
                  </div>
                </div>
              </div>

              {/* Fechas */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-xl border border-green-200 mb-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📅</span>
                  Fechas de Estancia
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Check-in</p>
                    <p className="text-base font-bold text-gray-900">{new Date(viewEvent.start_date).toLocaleDateString('es-ES')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Check-out</p>
                    <p className="text-base font-bold text-gray-900">{new Date(viewEvent.end_date).toLocaleDateString('es-ES')}</p>
                  </div>
                </div>
              </div>

              {/* Información adicional */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-5 rounded-xl border border-purple-200 mb-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>ℹ️</span>
                  Detalles Adicionales
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Personas</p>
                    <p className="text-base font-bold text-gray-900">{viewEvent.guest_count ?? '-'}</p>
                  </div>
                  {viewEvent.channel && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Canal</p>
                      <p className="text-base font-bold text-gray-900">{viewEvent.channel}</p>
                    </div>
                  )}
                  {viewEvent.reservation_id && (
                    <div className="sm:col-span-2">
                      <p className="text-sm text-gray-600 mb-1">ID Reserva</p>
                      <p className="text-xs text-gray-600 font-mono bg-white px-3 py-2 rounded-lg border border-gray-200 break-all">{viewEvent.reservation_id}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Botón de cerrar */}
              <div className="flex justify-end pt-4">
                <button 
                  onClick={()=>setViewEvent(null)} 
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                >
                  ✨ Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
