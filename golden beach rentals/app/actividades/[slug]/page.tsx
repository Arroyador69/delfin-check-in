import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { MapEmbed } from '@/components/MapEmbed';

export const revalidate = 300;

export default async function ActivityPage({ params }: { params: { slug: string } }) {
  const activity = await prisma.activity.findFirst({ where: { slug: params.slug } });
  if (!activity) return notFound();
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-3xl font-bold text-black">{activity.title}</h1>
      <p className="text-black/80">{activity.description}</p>
      <MapEmbed lat={activity.lat ?? undefined} lng={activity.lng ?? undefined} title={activity.title} />
      {activity.externalLink && (
        <a className="inline-block bg-black text-white px-4 py-2 rounded" target="_blank" rel="nofollow noopener noreferrer" href={activity.externalLink}>Más info</a>
      )}
    </div>
  );
}
