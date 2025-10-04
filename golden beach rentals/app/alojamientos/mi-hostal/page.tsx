import Image from 'next/image';
import { prisma } from '@/lib/db';
import { RoomCard } from '@/components/RoomCard';
import { MapEmbed } from '@/components/MapEmbed';

export const revalidate = 30;

export default async function MyHostalPage() {
  const lodging = await prisma.lodging.findFirst({ where: { isOwned: true }, include: { rooms: true } });
  if (!lodging) return <div className="max-w-5xl mx-auto p-6">No hay hostal configurado.</div>;
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div className="grid md:grid-cols-2 gap-6 items-start">
        <div className="relative w-full h-72 rounded overflow-hidden bg-gray-100">
          <Image src={(lodging.images?.[0]) ?? '/images/hostal/room1.svg'} alt={lodging.title} fill className="object-cover" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-black">{lodging.title}</h1>
          <p className="text-black/80">{lodging.description}</p>
          <div className="flex flex-wrap gap-2">
            {(lodging.amenities || []).map((a) => (
              <span key={a} className="text-xs px-2 py-1 rounded border text-black">{a}</span>
            ))}
          </div>
        </div>
      </div>

      <MapEmbed lat={lodging.lat ?? undefined} lng={lodging.lng ?? undefined} title={lodging.title} />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-black">Habitaciones</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {lodging.rooms.map((r) => (
            <RoomCard key={r.id} room={r} lodging={lodging} />
          ))}
        </div>
      </section>
    </div>
  );
}
