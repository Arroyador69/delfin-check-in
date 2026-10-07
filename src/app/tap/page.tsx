import Link from 'next/link';

export const metadata = {
  title: 'Delfín Tap Wall · NFC y WiFi para tu alojamiento',
  description:
    'Configura chips NFC de pared: WiFi, instrucciones y emergencias. 10€/mes + 2€ por propiedad extra.',
};

export default function TapHomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-14">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Delfín Tap Wall</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
          El huésped toca el chip y ve WiFi, normas y cómo pedirte ayuda
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Suscripción aparte de Delfín Check-in: <strong>10 €/mes</strong> (1 propiedad) +{' '}
          <strong>2 €/mes</strong> por cada propiedad extra. Tú configuras el contenido; nosotros
          enlazamos cada chip NFC a tu página pública.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/contratar"
            className="rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Contratar Tap Wall
          </Link>
          <Link
            href="/app"
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            Ir al panel
          </Link>
          <a
            href="https://admin.delfincheckin.com/admin-login"
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            Entrar con cuenta Delfín
          </a>
        </div>
        <ul className="mt-10 space-y-3 text-slate-700">
          <li>· Chip NFC de instrucciones o placa WiFi de pared</li>
          <li>· Página pública en g.delfincheckin.com (sin login para el huésped)</li>
          <li>· Aviso de emergencia al propietario</li>
          <li>· Pago con Polar, independiente del plan Check-in</li>
        </ul>
      </div>
    </main>
  );
}
