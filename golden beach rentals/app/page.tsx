import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-black">Golden Beach Rentals</h1>
      <p className="text-black/80">Tu hostal en Fuengirola y alojamientos recomendados.</p>
      <div className="flex gap-3">
        <Link href="/(public)/es" className="bg-black text-white px-4 py-2 rounded">Entrar</Link>
        <Link href="/alojamientos/mi-hostal" className="border px-4 py-2 rounded text-black">Reservar mi hostal</Link>
      </div>
    </main>
  );
}
