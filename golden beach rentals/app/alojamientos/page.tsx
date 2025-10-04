import Link from 'next/link';
import { prisma } from '@/lib/db';

export const revalidate = 120;

export default async function LodgingsPage({ searchParams }: { searchParams: { type?: string; city?: string } }) {
  const where: any = {};
  if (searchParams.type) where.type = searchParams.type;
  if (searchParams.city) where.city = searchParams.city;
  const lodgings = await prisma.lodging.findMany({ where, orderBy: { isOwned: 'desc' } });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-3xl font-bold text-black">Alojamientos</h1>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
        {lodgings.map((l) => (
          <Link key={l.id} href={l.isOwned ? '/alojamientos/mi-hostal' : `/alojamientos/${l.slug}`} className="border rounded p-4 hover:bg-gray-50">
            <div className="text-lg font-semibold text-black">{l.title}</div>
            {l.city && <div className="text-sm text-black/70">{l.city}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
