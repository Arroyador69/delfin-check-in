'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  CalendarDays,
  Clock,
  Users,
  MapPin,
  MessageSquare,
  RefreshCw,
  LayoutList,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Task {
  id: string;
  type: string;
  summary: string;
  room_name: string;
  property_name: string | null;
  guest_name: string;
  guest_count: number;
  date: string;
  start_iso: string;
  end_iso: string;
  same_day_turnover: boolean;
  next_guest_name: string | null;
  next_guest_count: number | null;
  owner_note: string | null;
  note_url: string;
}

const WEEKDAYS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toISODate(y: number, m: number, d: number) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

export default function LimpiezaPublicPage() {
  const routeParams = useParams();
  const token = typeof routeParams?.token === 'string' ? routeParams.token : null;
  const [label, setLabel] = useState('');
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cleaning/public-view/${token}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Enlace no válido');
        setTasks([]);
        return;
      }
      setLabel(data.label || '');
      setTenantName(data.tenant_name);
      setTasks(data.tasks || []);
    } catch {
      setError('No se pudo cargar el calendario');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const tasksByDate = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!m.has(t.date)) m.set(t.date, []);
      m.get(t.date)!.push(t);
    }
    return m;
  }, [tasks]);

  const byDate = useMemo(() => {
    const keys = Array.from(tasksByDate.keys()).sort();
    return keys.map(d => ({ date: d, items: tasksByDate.get(d)! }));
  }, [tasksByDate]);

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  /** Lunes = 0 … Domingo = 6 */
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;

  const goMonth = (delta: number) => {
    setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  };

  useEffect(() => {
    if (viewMode !== 'calendar' || tasks.length === 0) return;
    const prefix = `${year}-${pad2(month + 1)}`;
    const inMonth = tasks.filter(t => t.date.startsWith(prefix)).map(t => t.date);
    if (inMonth.length === 0) {
      setSelectedDate(null);
      return;
    }
    const sorted = [...new Set(inMonth)].sort();
    setSelectedDate(prev => {
      if (prev && sorted.includes(prev)) return prev;
      const today = new Date();
      const todayStr = toISODate(today.getFullYear(), today.getMonth(), today.getDate());
      if (sorted.includes(todayStr) && today.getFullYear() === year && today.getMonth() === month) {
        return todayStr;
      }
      return sorted[0];
    });
  }, [viewMode, year, month, tasks]);

  const formatRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} – ${e.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const formatDayTitle = (isoDate: string) =>
    new Date(isoDate + 'T12:00:00').toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

  const monthTitle = calendarMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const renderTaskCard = (task: Task) => (
    <li
      key={task.id}
      className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="p-4">
        <p className="font-semibold text-slate-900 text-base leading-snug">{task.summary}</p>
        <div className="mt-2 space-y-1.5 text-sm text-slate-700">
          <p className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              {task.property_name ? (
                <>
                  <span className="font-medium">{task.property_name}</span>
                  <span className="text-slate-500"> · </span>
                </>
              ) : null}
              {task.room_name}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500 shrink-0" />
            {formatRange(task.start_iso, task.end_iso)}
          </p>
          <p className="flex items-center gap-2 flex-wrap">
            <Users className="w-4 h-4 text-slate-500 shrink-0" />
            {task.guest_count} {task.guest_count === 1 ? 'persona' : 'personas'}
            {task.guest_name ? <span className="text-slate-500">· {task.guest_name}</span> : null}
          </p>
          {task.same_day_turnover && task.next_guest_name && (
            <p className="text-amber-800 bg-amber-50 rounded-lg px-2 py-1.5 text-xs">
              Turnover el mismo día: siguiente entrada · {task.next_guest_count ?? '?'} pers.
            </p>
          )}
          {task.owner_note && (
            <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
              <span className="font-medium text-slate-700">Nota del propietario:</span> {task.owner_note}
            </p>
          )}
        </div>
        <a
          href={task.note_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-700"
        >
          <MessageSquare className="w-4 h-4" />
          Dejar nota para el propietario
        </a>
      </div>
    </li>
  );

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const selectedTasks = selectedDate ? tasksByDate.get(selectedDate) || [] : [];

  return (
    <div
      className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-blue-50/40 pb-10"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
    >
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">
                Calendario de limpieza
              </p>
              <h1 className="text-lg font-bold text-slate-900 leading-snug break-words">{label || 'Tu calendario'}</h1>
              {tenantName && <p className="text-sm text-slate-600 mt-0.5">{tenantName}</p>}
            </div>
            <button
              type="button"
              onClick={() => load()}
              className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0"
              aria-label="Actualizar"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div
            className="flex rounded-xl bg-slate-100 p-1 gap-1"
            role="tablist"
            aria-label="Vista"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'list'}
              onClick={() => setViewMode('list')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              <LayoutList className="w-4 h-4 shrink-0" />
              Lista
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'calendar'}
              onClick={() => setViewMode('calendar')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              <CalendarIcon className="w-4 h-4 shrink-0" />
              Calendario
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4">
        {loading && tasks.length === 0 && (
          <div className="flex justify-center py-16">
            <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && tasks.length === 0 && (
          <div className="text-center py-16 text-slate-600">
            <CalendarDays className="w-14 h-14 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No hay tareas en el rango mostrado. Vuelve más tarde o pulsa actualizar.</p>
          </div>
        )}

        {viewMode === 'list' &&
          byDate.map(({ date, items }) => (
            <section key={date} className="mb-8">
              <h2 className="text-sm font-semibold text-slate-500 capitalize mb-3 px-1">
                {formatDayTitle(date)}
              </h2>
              <ul className="space-y-3">{items.map(task => renderTaskCard(task))}</ul>
            </section>
          ))}

        {viewMode === 'calendar' && !loading && !error && tasks.length > 0 && (
          <div className="space-y-4 pb-4">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => goMonth(-1)}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <p className="text-base font-semibold text-slate-800 capitalize flex-1 text-center">
                {monthTitle}
              </p>
              <button
                type="button"
                onClick={() => goMonth(1)}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 font-medium mb-1">
              {WEEKDAYS_ES.map(d => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = toISODate(year, month, day);
                const dayTasks = tasksByDate.get(dateStr) || [];
                const n = dayTasks.length;
                const isSelected = selectedDate === dateStr;
                const isToday =
                  (() => {
                    const t = new Date();
                    return (
                      t.getFullYear() === year &&
                      t.getMonth() === month &&
                      t.getDate() === day
                    );
                  })();

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-colors border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : n > 0
                          ? 'bg-blue-50 border-blue-200 text-blue-900'
                          : 'bg-white border-slate-100 text-slate-700'
                    } ${isToday && !isSelected ? 'ring-2 ring-blue-300 ring-offset-1' : ''}`}
                  >
                    <span>{day}</span>
                    {n > 0 && (
                      <span
                        className={`text-[10px] leading-none mt-0.5 ${
                          isSelected ? 'text-blue-100' : 'text-blue-600'
                        }`}
                      >
                        {n} tarea{n !== 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedDate && (
              <div className="pt-2 border-t border-slate-200">
                <h2 className="text-sm font-semibold text-slate-600 capitalize mb-3">
                  {formatDayTitle(selectedDate)}
                </h2>
                {selectedTasks.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">Sin tareas este día.</p>
                ) : (
                  <ul className="space-y-3">{selectedTasks.map(task => renderTaskCard(task))}</ul>
                )}
              </div>
            )}

            {!selectedDate && (
              <p className="text-sm text-slate-500 text-center py-2">
                Toca un día con marca para ver las tareas.
              </p>
            )}
          </div>
        )}
      </main>

      <p className="text-center text-xs text-slate-400 px-6 mt-6 pb-[env(safe-area-inset-bottom)]">
        Delfín Check-in · vista solo lectura para limpieza
      </p>
    </div>
  );
}
