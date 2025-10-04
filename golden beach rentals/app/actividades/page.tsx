import Link from 'next/link';
import { prisma } from '@/lib/db';

export const revalidate = 120;

export default async function ActivitiesPage() {
  const activities = await prisma.activity.findMany({ orderBy: { title: 'asc' } });
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-3xl font-bold text-black">Actividades</h1>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
        {activities.map((a) => (
          <Link key={a.id} href={`/actividades/${a.slug}`} className="border rounded p-4 hover:bg-gray-50">
            <div className="text-lg font-semibold text-black">{a.title}</div>
            <div className="text-sm text-black/70">{a.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
