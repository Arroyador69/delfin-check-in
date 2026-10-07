'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Product = { sku: string; name: string; blurb: string; priceHint: string };

export default function TapContratarPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sku, setSku] = useState('instructions_nfc');
  const [propertiesCount, setPropertiesCount] = useState(1);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shipping, setShipping] = useState({
    name: '',
    line1: '',
    line2: '',
    city: '',
    postal: '',
    country: 'ES',
    phone: '',
  });

  useEffect(() => {
    fetch('/api/tap/status', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.products)) setProducts(d.products);
      })
      .catch(() => {});
  }, []);

  const monthly = useMemo(() => 10 + Math.max(0, propertiesCount - 1) * 2, [propertiesCount]);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/tap/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_sku: sku,
          properties_count: propertiesCount,
          accept_terms: acceptTerms,
          shipping_name: shipping.name,
          shipping_line1: shipping.line1,
          shipping_line2: shipping.line2,
          shipping_city: shipping.city,
          shipping_postal: shipping.postal,
          shipping_country: shipping.country,
          shipping_phone: shipping.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      if (data.url) window.location.href = data.url;
      else throw new Error('No se recibió URL de pago');
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link href="/" className="text-sm font-medium text-sky-700 hover:underline">
          ← Tap Wall
        </Link>
        <h1 className="mt-3 text-3xl font-extrabold">Contratar Tap Wall</h1>
        <p className="mt-2 text-slate-600">
          {monthly} €/mes ({propertiesCount} propiedad{propertiesCount > 1 ? 'es' : ''}). Debes
          haber iniciado sesión en Delfín Check-in.
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="font-bold">Producto físico</h2>
          {(products.length ? products : [
            { sku: 'instructions_nfc', name: 'Chip NFC de instrucciones', blurb: '', priceHint: '' },
            { sku: 'wifi_wall', name: 'Placa WiFi de pared', blurb: '', priceHint: '' },
            { sku: 'kit_wall', name: 'Kit pared', blurb: '', priceHint: '' },
          ]).map((p) => (
            <label
              key={p.sku}
              className={`flex cursor-pointer gap-3 rounded-xl border bg-white p-4 ${
                sku === p.sku ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="sku"
                checked={sku === p.sku}
                onChange={() => setSku(p.sku)}
              />
              <span>
                <span className="font-semibold">{p.name}</span>
                {p.blurb ? <span className="mt-1 block text-sm text-slate-600">{p.blurb}</span> : null}
              </span>
            </label>
          ))}
        </section>

        <section className="mt-8">
          <label className="block text-sm font-semibold">Propiedades</label>
          <input
            type="number"
            min={1}
            max={50}
            value={propertiesCount}
            onChange={(e) => setPropertiesCount(Math.max(1, Number(e.target.value) || 1))}
            className="mt-1 w-32 rounded-lg border border-slate-300 px-3 py-2"
          />
          <p className="mt-1 text-sm text-slate-500">10 € la primera + 2 € cada una más.</p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-bold">Dirección de envío</h2>
          {(
            [
              ['name', 'Nombre completo'],
              ['line1', 'Calle y número'],
              ['line2', 'Piso / puerta (opcional)'],
              ['postal', 'Código postal'],
              ['city', 'Ciudad'],
              ['phone', 'Teléfono'],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="text-sm font-medium text-slate-700">{label}</label>
              <input
                value={shipping[key]}
                onChange={(e) => setShipping((s) => ({ ...s, [key]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <h2 className="font-bold text-slate-900">Términos del servicio (contrato)</h2>
          <p className="mt-2">
            Al aceptar, contratas la suscripción <strong>Delfín Tap Wall</strong> con Delfín Check-in:
            acceso al panel en tap.delfincheckin.com, página pública del huésped en
            g.delfincheckin.com y envío del producto físico elegido a la dirección indicada. La
            cuota es de 10 €/mes por la primera propiedad y 2 €/mes por cada propiedad adicional.
            Es independiente de cualquier plan Check-in/Standard/Pro. Puedes cancelar según la
            política de Polar/pago recurrente. El contenido del chip (WiFi, instrucciones) es
            responsabilidad del propietario. Los avisos de emergencia se muestran en tu panel; no
            sustituyen a los servicios de emergencia oficiales (112).
          </p>
          <label className="mt-4 flex items-start gap-2">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1"
            />
            <span>He leído y acepto estos términos como contrato de suscripción Tap Wall.</span>
          </label>
        </section>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={loading || !acceptTerms}
          onClick={submit}
          className="mt-6 w-full rounded-lg bg-sky-600 px-5 py-3 font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {loading ? 'Redirigiendo a Polar…' : `Pagar ${monthly} €/mes con Polar`}
        </button>
        <p className="mt-3 text-center text-xs text-slate-500">
          Si no tienes sesión,{' '}
          <a className="underline" href="https://admin.delfincheckin.com/admin-login">
            entra en el admin
          </a>{' '}
          y vuelve a esta página, o abre Contratar desde el menú Tap Wall del admin.
        </p>
      </div>
    </main>
  );
}
