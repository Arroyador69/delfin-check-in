import React from 'react';
import Image from 'next/image';
import { BookingWidget } from './BookingWidget';

export function RoomCard({ room, lodging }: { room: any; lodging: any }) {
  const img = room.images?.[0] ?? '/images/hostal/room1.svg';
  return (
    <div className="border rounded-lg p-4 flex flex-col gap-3">
      <div className="relative w-full h-48 rounded overflow-hidden bg-gray-100">
        <Image src={img} alt={room.name} fill className="object-cover" />
      </div>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-black">{room.name}</h3>
          <p className="text-sm text-black/80">Capacidad: {room.capacity} personas</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-black">€{(room.basePriceCents / 100).toFixed(0)} / noche</p>
        </div>
      </div>
      <BookingWidget roomId={room.id} />
    </div>
  );
}
