'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

type Slot = { startAt: string; endAt: string; timeLabel: string };
type Day = { dateKey: string; dateLabel: string; slots: Slot[] };

type Props = {
  initialEmail?: string;
  source?: string;
};

export function SalesCallBookingClient({ initialEmail = '', source }: Props) {
  const [days, setDays] = useState<Day[]>([]);
  const [meta, setMeta] = useState({ windows: '', note: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState('');
  const [comments, setComments] = useState('');
  const [done, setDone] = useState<{
    dateLabel: string;
    timeLabel: string;
    meetingUrl: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/public/sales-calls/availability', {
          cache: 'no-store',
        });
        const j = await res.json();
        if (!res.ok || !j.success) {
          throw new Error(j.error || 'Error al cargar');
        }
        if (cancelled) return;
        const list = (j.days || []) as Day[];
        setDays(list);
        setMeta({ windows: j.windows || '', note: j.note || '' });
        if (list[0]) setSelectedDay(list[0].dateKey);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Error al cargar');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const daySlots = useMemo(() => {
    return days.find((d) => d.dateKey === selectedDay)?.slots || [];
  }, [days, selectedDay]);

  const submit = () => {
    if (!selectedSlot) {
      setError('Elige un horario.');
      return;
    }
    setError('');
    startTransition(async () => {
      try {
        const res = await fetch('/api/public/sales-calls/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startAt: selectedSlot.startAt,
            name,
            email,
            phone,
            comments,
            source: source || 'web_reserva_llamada',
          }),
        });
        const j = await res.json();
        if (!res.ok || !j.success) {
          throw new Error(j.error || 'No se pudo reservar');
        }
        setDone({
          dateLabel: j.booking.dateLabel,
          timeLabel: j.booking.timeLabel,
          meetingUrl: j.booking.meetingUrl,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al reservar');
      }
    });
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-sky-100 bg-white p-6 sm:p-8 shadow-sm space-y-4">
        <p className="text-sm font-semibold text-sky-700">Reserva confirmada</p>
        <h1 className="text-2xl font-bold text-slate-900 leading-snug">
          {done.dateLabel} · {done.timeLabel}
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Llamada de <strong>15 minutos</strong> (hora de Madrid). Es puntual:
          empezamos a la hora en punto porque el día va lleno de citas.
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">
          Te hemos enviado un <strong>email de confirmación</strong> con el
          enlace Zoom y cómo <strong>cambiar de hora o cancelar</strong>. Una
          hora antes recibirás un recordatorio.
        </p>
        {done.meetingUrl && !done.meetingUrl.startsWith('Te enviaremos') ? (
          <a
            href={done.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-4"
          >
            Abrir videollamada
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-sky-700">Equipo comercial</p>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Reserva una llamada de 15 min
        </h1>
        <p className="text-slate-600 leading-relaxed max-w-xl">
          Te enseñamos Delfín Check-in en una videollamada corta. Horario:{' '}
          <strong>lunes a viernes</strong>, {meta.windows || '09:00–14:00 y 16:00–19:00'}{' '}
          (Madrid). Entre citas dejamos 30 min de margen.
        </p>
        {meta.note && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            {meta.note}
          </p>
        )}
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando huecos…</p>
      ) : days.length === 0 ? (
        <p className="text-sm text-slate-600">
          Ahora mismo no hay huecos libres. Escríbenos a{' '}
          <a className="text-sky-700 underline" href="mailto:soporte@delfincheckin.com">
            soporte@delfincheckin.com
          </a>
          .
        </p>
      ) : (
        <>
          <div>
            <p className="text-sm font-semibold text-slate-800 mb-2">Día</p>
            <div className="flex flex-wrap gap-2">
              {days.map((d) => (
                <button
                  key={d.dateKey}
                  type="button"
                  onClick={() => {
                    setSelectedDay(d.dateKey);
                    setSelectedSlot(null);
                  }}
                  className={`rounded-xl px-3 py-2 text-sm border transition ${
                    selectedDay === d.dateKey
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300'
                  }`}
                >
                  {d.dateLabel}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800 mb-2">
              Hora (15 min · puntual)
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {daySlots.map((s) => (
                <button
                  key={s.startAt}
                  type="button"
                  onClick={() => setSelectedSlot(s)}
                  className={`rounded-xl py-2.5 text-sm font-semibold border transition ${
                    selectedSlot?.startAt === s.startAt
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-sky-300'
                  }`}
                >
                  {s.timeLabel}
                </button>
              ))}
              {daySlots.length === 0 && (
                <p className="col-span-full text-sm text-slate-500">
                  Sin huecos este día.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <p className="text-sm font-semibold text-slate-900">Tus datos</p>
            <label className="block text-sm">
              <span className="text-slate-600">Nombre</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Email</span>
              <input
                type="email"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Teléfono (opcional)</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">
                Comentarios para la llamada (opcional)
              </span>
              <textarea
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 min-h-[88px]"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Nº de viviendas, si usáis Airbnb/Booking, dudas SES Hospedajes…"
              />
            </label>
            <button
              type="button"
              disabled={pending || !selectedSlot}
              onClick={submit}
              className="w-full rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold py-3"
            >
              {pending ? 'Reservando…' : 'Confirmar llamada de 15 min'}
            </button>
            <p className="text-xs text-slate-500 leading-relaxed">
              Importante: la hora es fija. Si llegas tarde puede que hayamos
              pasado a la siguiente cita.
            </p>
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
