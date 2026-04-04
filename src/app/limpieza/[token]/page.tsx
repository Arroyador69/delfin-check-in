'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { CalendarDays, Clock, Users, MapPin, MessageSquare, RefreshCw } from 'lucide-react';

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

export default function LimpiezaPublicPage() {
  const routeParams = useParams();
  const token = typeof routeParams?.token === 'string' ? routeParams.token : null;
  const [label, setLabel] = useState('');
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
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
  };

  useEffect(() => {
    load();
  }, [token]);

  const byDate = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      const d = t.date;
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(t);
    }
    const keys = Array.from(m.keys()).sort();
    return keys.map(d => ({ date: d, items: m.get(d)! }));
  }, [tasks]);

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

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/40 pb-12">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-4 shadow-sm">
        <div className="max-w-lg mx-auto flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Calendario de limpieza</p>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">{label || 'Tu calendario'}</h1>
            {tenantName && <p className="text-sm text-slate-600 mt-0.5">{tenantName}</p>}
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="p-2 rounded-xl bg-blue-600 text-white shrink-0"
            aria-label="Actualizar"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6">
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

        {byDate.map(({ date, items }) => (
          <section key={date} className="mb-8">
            <h2 className="text-sm font-semibold text-slate-500 capitalize mb-3 px-1">{formatDayTitle(date)}</h2>
            <ul className="space-y-3">
              {items.map(task => (
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
                      <p className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-500 shrink-0" />
                        {task.guest_count} {task.guest_count === 1 ? 'persona' : 'personas'}
                        {task.guest_name ? (
                          <span className="text-slate-500">· {task.guest_name}</span>
                        ) : null}
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
              ))}
            </ul>
          </section>
        ))}
      </main>

      <p className="text-center text-xs text-slate-400 px-6 mt-4">Delfín Check-in · vista solo lectura para limpieza</p>
    </div>
  );
}
