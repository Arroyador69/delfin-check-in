import Link from 'next/link';

export default function HomeES() {
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-black">Bienvenido</h1>
      <p className="text-black/80">Explora nuestro hostal y alojamientos recomendados.</p>
      <div className="flex gap-3">
        <Link href="/alojamientos/mi-hostal" className="bg-black text-white px-4 py-2 rounded">Mi hostal</Link>
        <Link href="/alojamientos" className="border px-4 py-2 rounded text-black">Todos los alojamientos</Link>
        <Link href="/actividades" className="border px-4 py-2 rounded text-black">Actividades</Link>
      </div>
    </main>
  );
}
