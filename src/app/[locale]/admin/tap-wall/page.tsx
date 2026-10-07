'use client';

/**
 * En el admin solo informamos del producto y anunciamos la contratación.
 * No hay configuración NFC/WiFi aquí (eso irá en tap.delfincheckin.com).
 * La compra del producto físico aún no está abierta.
 */
export default function AdminTapWallInfoPage() {
  return (
    <div className="container mx-auto max-w-3xl p-6 pb-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Nuevo producto</p>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">Tap Wall (NFC de pared)</h1>
      <p className="mt-3 text-gray-600">
        Suscripción independiente de tu plan Check-in. El huésped acerca el móvil al chip o a la
        placa y ve la WiFi, las instrucciones del alojamiento y puede avisarte. Tú gestionas el
        contenido; nosotros enlazamos cada chip a tu página pública.
      </p>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <strong>Próximamente:</strong> la contratación y el envío del producto físico se abrirán
        en breve. Desde este admin solo puedes ver cómo funciona. Cuando esté listo, contratarás
        aquí o en{' '}
        <a className="font-semibold underline" href="https://tap.delfincheckin.com">
          tap.delfincheckin.com
        </a>
        ; la configuración del chip nunca se hace en este panel.
      </div>

      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Cómo funciona</h2>
        <ol className="list-decimal space-y-3 pl-5 text-gray-700">
          <li>
            <strong>Contrata Tap Wall</strong> (cuando esté disponible): eliges chip de
            instrucciones, placa WiFi o kit, indicas dirección de envío y pagas la suscripción.
          </li>
          <li>
            <strong>Configuras en tap.delfincheckin.com</strong> la red WiFi, las normas y el
            teléfono de contacto. Cada alojamiento tiene una URL pública única.
          </li>
          <li>
            <strong>Programamos el chip NFC</strong> con{' '}
            <code className="rounded bg-slate-100 px-1 text-sm">g.delfincheckin.com/tu-codigo</code>
            . El huésped no necesita cuenta ni app.
          </li>
          <li>
            Si el huésped necesita ayuda, puede enviarte un aviso desde esa misma página (no
            sustituye al 112).
          </li>
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-gray-900">Qué incluye</h2>
        <ul className="mt-3 space-y-2 text-gray-700">
          <li>· Chip NFC de instrucciones, placa WiFi de pared o kit (placa + chip extra)</li>
          <li>· Panel en tap.delfincheckin.com (aparte de este admin)</li>
          <li>· Página pública del huésped en g.delfincheckin.com</li>
          <li>· Avisos de emergencia al propietario</li>
        </ul>
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold text-gray-900">Precio previsto</h2>
        <p className="mt-2 text-gray-700">
          <strong>10 €/mes</strong> por la primera propiedad · <strong>2 €/mes</strong> por cada
          propiedad adicional. Independiente del plan Check-in / Standard / Pro.
        </p>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          {
            title: 'Chip NFC instrucciones',
            body: 'Normas, llegada y contacto en un toque.',
          },
          {
            title: 'Placa WiFi de pared',
            body: 'Red y clave al instante, sin papeles.',
          },
          {
            title: 'Kit pared',
            body: 'Placa WiFi + chip extra para otra zona.',
          },
        ].map((p) => (
          <div key={p.title} className="rounded-xl border border-sky-100 bg-sky-50/50 p-4">
            <h3 className="font-semibold text-gray-900">{p.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{p.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
        <h2 className="font-bold text-slate-900">Dónde se usa cada dominio</h2>
        <ul className="mt-2 space-y-1">
          <li>
            <strong>admin.delfincheckin.com</strong> — tu panel habitual (esta página informativa).
          </li>
          <li>
            <strong>tap.delfincheckin.com</strong> — contratar y configurar Tap Wall (próximamente /
            panel).
          </li>
          <li>
            <strong>g.delfincheckin.com</strong> — lo que ve el huésped al tocar el chip.
          </li>
        </ul>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-lg bg-slate-300 px-5 py-3 font-semibold text-slate-600"
        >
          Contratar — próximamente
        </button>
        <a
          href="https://tap.delfincheckin.com"
          className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50"
        >
          Ver tap.delfincheckin.com
        </a>
      </div>
    </div>
  );
}
