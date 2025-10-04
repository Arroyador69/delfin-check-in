'use client';
import React, { useState } from 'react';
import { z } from 'zod';

const BookingSchema = z.object({
  roomId: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  guests: z.coerce.number().int().min(1).max(8),
});

export function BookingWidget({ roomId }: { roomId: string }) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parse = BookingSchema.safeParse({ roomId, checkIn, checkOut, guests });
    if (!parse.success) return alert('Revisa las fechas y número de huéspedes');
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, checkIn, checkOut, guests }),
      });
      const data = await res.json();
      if (data?.url) window.location.href = data.url;
      else alert('No se pudo crear la sesión de pago');
    } catch (_err) {
      alert('Error iniciando el pago');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="border rounded px-2 py-2 text-black" required />
        <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="border rounded px-2 py-2 text-black" required />
      </div>
      <input type="number" min={1} max={8} value={guests} onChange={(e) => setGuests(parseInt(e.target.value || '1'))} className="border rounded px-2 py-2 text-black" />
      <button disabled={loading} className="bg-black text-white rounded px-4 py-2 disabled:opacity-50">{loading ? 'Procesando…' : 'Reservar ahora'}</button>
    </form>
  );
}
