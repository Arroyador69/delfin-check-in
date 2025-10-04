import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { MapEmbed } from '@/components/MapEmbed';
import { buildAffiliateLink } from '@/lib/affiliates';

export const revalidate = 60;

export default async function LodgingSlugPage({ params }: { params: { slug: string } }) {
  const lodging = await prisma.lodging.findFirst({ where: { slug: params.slug } });
  if (!lodging) return notFound();

  const img = lodging.images?.[0] ?? '/images/aff/sol1.svg';

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div className="grid md:grid-cols-2 gap-6 items-start">
        <div className="relative w-full h-72 rounded overflow-hidden bg-gray-100">
          <Image src={img} alt={lodging.title} fill className="object-cover" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-black">{lodging.title}</h1>
          <p className="text-black/80">{lodging.description}</p>
          {lodging.city && <p className="text-sm text-black/70">{lodging.city}</p>}
          <div className="flex flex-wrap gap-2">
            {(lodging.amenities || []).map((a) => (
              <span key={a} className="text-xs px-2 py-1 rounded border text-black">{a}</span>
            ))}
          </div>
          {!lodging.isOwned && lodging.affiliateLink && (
            <a className="bg-black text-white rounded px-4 py-2 inline-block" href={buildAffiliateLink(lodging.affiliateLink, lodging.slug)} target="_blank" rel="nofollow noopener noreferrer">Reservar en Expedia</a>
          )}
          {lodging.isOwned && (
            <Link className="bg-black text-white rounded px-4 py-2 inline-block" href="/alojamientos/mi-hostal">Ver habitaciones</Link>
          )}
        </div>
      </div>

      <MapEmbed lat={lodging.lat ?? undefined} lng={lodging.lng ?? undefined} title={lodging.title} />
    </div>
  );
}
