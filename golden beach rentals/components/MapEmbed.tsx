'use client';
import React from 'react';

type MapEmbedProps = { lat?: number; lng?: number; title?: string };

export function MapEmbed({ lat, lng, title }: MapEmbedProps) {
  if (lat == null || lng == null) return null;
  const src = `https://www.google.com/maps?q=${lat},${lng}&hl=es;z=14&output=embed`;
  return (
    <div className="w-full aspect-video rounded-lg overflow-hidden border">
      <iframe title={title ?? 'Mapa'} src={src} className="w-full h-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
    </div>
  );
}
