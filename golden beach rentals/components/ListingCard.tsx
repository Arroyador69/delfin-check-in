import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { buildAffiliateLink } from '@/lib/affiliates';

export function ListingCard({ lodging }: { lodging: any }) {
  const img = lodging.images?.[0] ?? '/images/aff/sol1.svg';
  const href = lodging.isOwned ? `/alojamientos/mi-hostal` : `/alojamientos/${lodging.slug}`;
  return (
    <div className="border rounded-lg p-4 flex flex-col gap-3">
      <div className="relative w-full h-48 rounded overflow-hidden bg-gray-100">
        <Image src={img} alt={lodging.title} fill className="object-cover" />
      </div>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-black">{lodging.title}</h3>
          {lodging.city && <p className="text-sm text-black/80">{lodging.city}</p>}
        </div>
        {typeof lodging.rating === 'number' && (
          <div className="text-right">
            <p className="text-sm text-black">{lodging.rating.toFixed(1)} ⭐</p>
            {lodging.reviewCount && <p className="text-xs text-black/70">{lodging.reviewCount} reseñas</p>}
          </div>
        )}
      </div>
      {lodging.isOwned ? (
        <Link className="bg-black text-white rounded px-4 py-2 text-center" href={href}>Ver habitaciones</Link>
      ) : (
        <a className="bg-black text-white rounded px-4 py-2 text-center" href={buildAffiliateLink(lodging.affiliateLink, lodging.slug)} target="_blank" rel="nofollow noopener noreferrer">Reservar en Expedia</a>
      )}
    </div>
  );
}
