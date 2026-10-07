'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * En el admin solo se muestra el producto y la contratación.
 * El uso (configurar NFC/WiFi) es en tap.delfincheckin.com/app.
 */
export default function AdminTapWallCatalogPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [sku, setSku] = useState('instructions_nfc');
  const [propertiesCount, setPropertiesCount] = useState(1);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
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
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e.message));
  }, []);

  const monthly = useMemo(() => 10 + Math.max(0, propertiesCount - 1) * 2, [propertiesCount]);
  const products = data?.products || [];
  const active = Boolean(data?.account?.active);

  const hire = async () => {
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
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      window.location.href = body.url;
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold text-gray-900">Tap Wall (NFC de pared)</h1>
      <p className="mt-2 text-gray-600">
        Producto aparte de tu plan Check-in: el huésped toca el chip y ve WiFi, instrucciones o
        puede avisarte. Aquí solo puedes <strong>verlo y contratarlo</strong>. La configuración se
        hace en{' '}
        <a className="font-semibold text-sky-700 underline" href="https://tap.delfincheckin.com/app">
          tap.delfincheckin.com
        </a>
        .
      </p>

      {active ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <p className="font-semibold">Suscripción activa</p>
          <p className="mt-1 text-sm">
            Para configurar WiFi, instrucciones y la URL del chip, usa el panel Tap Wall (no desde
            este admin).
          </p>
          <a
            href="https://tap.delfincheckin.com/app"
            className="mt-3 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Abrir panel Tap Wall
          </a>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3">
            {products.map((p: any) => (
              <label
                key={p.sku}
                className={`flex cursor-pointer gap-3 rounded-xl border bg-white p-4 ${
                  sku === p.sku ? 'border-sky-500' : 'border-gray-200'
                }`}
              >
                <input type="radio" checked={sku === p.sku} onChange={() => setSku(p.sku)} />
                <span>
                  <span className="font-semibold text-gray-900">{p.name}</span>
                  <span className="mt-1 block text-sm text-gray-600">{p.blurb}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-6">
            <label className="text-sm font-semibold">Propiedades</label>
            <input
              type="number"
              min={1}
              max={50}
              value={propertiesCount}
              onChange={(e) => setPropertiesCount(Math.max(1, Number(e.target.value) || 1))}
              className="ml-3 w-24 rounded border px-2 py-1"
            />
            <p className="mt-1 text-sm text-gray-500">
              Total: <strong>{monthly} €/mes</strong> (10 € + 2 € × {Math.max(0, propertiesCount - 1)}{' '}
              extras)
            </p>
          </div>

          <div className="mt-6 space-y-2 rounded-xl border bg-white p-4">
            <h2 className="font-bold">Dirección de envío del producto</h2>
            {(
              [
                ['name', 'Nombre'],
                ['line1', 'Calle'],
                ['line2', 'Piso (opcional)'],
                ['postal', 'CP'],
                ['city', 'Ciudad'],
                ['phone', 'Teléfono'],
              ] as const
            ).map(([k, label]) => (
              <input
                key={k}
                placeholder={label}
                className="w-full rounded border px-3 py-2 text-sm"
                value={shipping[k]}
                onChange={(e) => setShipping((s) => ({ ...s, [k]: e.target.value }))}
              />
            ))}
          </div>

          <div className="mt-6 rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-bold text-slate-900">Contrato Tap Wall</p>
            <p className="mt-2">
              Suscripción independiente: 10 €/mes (1 propiedad) + 2 €/mes por propiedad extra.
              Incluye panel en tap.delfincheckin.com, página pública en g.delfincheckin.com y envío
              del producto físico. No incluye el plan Check-in MIR. Cancelación según Polar. Las
              emergencias avisan al propietario; no sustituyen al 112.
            </p>
            <label className="mt-3 flex gap-2">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              Acepto los términos como contrato de suscripción.
            </label>
          </div>

          <button
            type="button"
            disabled={loading || !acceptTerms}
            onClick={hire}
            className="mt-6 rounded-lg bg-sky-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Abriendo Polar…' : `Contratar por ${monthly} €/mes`}
          </button>
        </>
      )}

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <p className="mt-8 text-sm text-gray-500">
        Más info:{' '}
        <a href="https://tap.delfincheckin.com" className="text-sky-700 underline">
          tap.delfincheckin.com
        </a>
      </p>
    </div>
  );
}
