import { prisma } from '@/lib/db';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lodgings = await prisma.lodging.findMany();
  const activities = await prisma.activity.findMany();

  const base = process.env.SITE_URL || 'http://localhost:3000';

  const urls: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/alojamientos`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/actividades`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/alojamientos/mi-hostal`, changeFrequency: 'weekly', priority: 0.9 },
    ...lodgings.filter(l => !l.isOwned).map(l => ({ url: `${base}/alojamientos/${l.slug}`, changeFrequency: 'monthly', priority: 0.5 as const })),
    ...activities.map(a => ({ url: `${base}/actividades/${a.slug}`, changeFrequency: 'monthly', priority: 0.4 as const })),
  ];

  return urls;
}
