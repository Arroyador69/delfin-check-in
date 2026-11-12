'use client';

import { useEffect, useState, useTransition } from 'react';

type Booking = {
  status: string;
  name: string;
  email: string;
  dateLabel: string;
  timeLabel: string;
  meetingUrl: string;
  rescheduleUrl: string;
};

export function SalesCallManageClient({ token }: { token: string }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!token) {
      setError('Falta el enlace de gestión.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/public/sales-calls/manage?token=${encodeURIComponent(token)}`,
          { cache: 'no-store' }
        );
        const j = await res.json();
        if (!res.ok || !j.success) {
          throw new Error(j.error || 'No encontrada');
        }
        if (!cancelled) setBooking(j.booking as Booking);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const cancel = (thenReschedule = false) => {
    startTransition(async () => {
      setError('');
      try {
        const res = await fetch('/api/public/sales-calls/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, action: 'cancel' }),
        });
        const j = await res.json();
        if (!res.ok || !j.success) {
          throw new Error(j.error || 'No se pudo cancelar');
        }
        const rescheduleUrl =
          j.booking.rescheduleUrl || booking?.rescheduleUrl || '';
        setBooking((prev) =>
          prev
            ? {
                ...prev,
                status: 'cancelled',
                rescheduleUrl: rescheduleUrl || prev.rescheduleUrl,
              }
            : prev
        );
        if (thenReschedule && rescheduleUrl) {
          window.location.href = rescheduleUrl;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cancelar');
      }
    });
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Cargando reserva…</p>;
  }

  if (error && !booking) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-white p-6 space-y-2">
        <h1 className="text-xl font-bold text-slate-900">No encontramos la reserva</h1>
        <p className="text-sm text-slate-600">{error}</p>
      </div>
    );
  }

  if (!booking) return null;

  const cancelled = booking.status !== 'confirmed';

  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-6 sm:p-8 shadow-sm space-y-5">
      <p className="text-sm font-semibold text-sky-700">
        {cancelled ? 'Reserva cancelada' : 'Tu llamada'}
      </p>
      <h1 className="text-2xl font-bold text-slate-900 leading-snug">
        {booking.dateLabel} · {booking.timeLabel}
      </h1>
      <p className="text-sm text-slate-600 leading-relaxed">
        15 minutos · hora de Madrid · puntualidad estricta.
      </p>

      {!cancelled && booking.meetingUrl && !booking.meetingUrl.startsWith('Te enviaremos') && (
        <a
          href={booking.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-full rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-4"
        >
          Abrir videollamada
        </a>
      )}

      {!cancelled ? (
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <p className="text-sm text-slate-600 leading-relaxed">
            Si no puedes venir, cancela o cambia la hora. Así liberamos el hueco
            para otra persona (invertimos tiempo en cada llamada).
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => cancel(true)}
            className="w-full rounded-xl border border-sky-200 text-sky-800 font-semibold py-3 px-4 hover:bg-sky-50 disabled:opacity-50"
          >
            {pending ? 'Un momento…' : 'Cambiar de hora'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => cancel(false)}
            className="w-full rounded-xl border border-slate-200 text-slate-700 font-semibold py-3 hover:bg-slate-50 disabled:opacity-50"
          >
            {pending ? 'Cancelando…' : 'Cancelar llamada'}
          </button>
        </div>
      ) : (
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <p className="text-sm text-slate-600">Hueco liberado. Si quieres, elige otra hora:</p>
          <a
            href={booking.rescheduleUrl}
            className="inline-flex items-center justify-center w-full rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-4"
          >
            Reservar otra hora
          </a>
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
