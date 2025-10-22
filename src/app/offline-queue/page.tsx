'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface OutboxItem {
  id: string;
  url?: string;
  method?: string;
  body?: any;
  ts?: number;
}

export default function OfflineQueuePage() {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<MessagePort | null>(null);

  useEffect(() => {
    let unreg = () => {};
    (async () => {
      if (!('serviceWorker' in navigator)) return;
      const reg = await navigator.serviceWorker.ready;
      const sw = reg.active || reg.waiting || reg.installing;
      if (!sw) return;

      const mc = new MessageChannel();
      channelRef.current = mc.port1;
      mc.port1.onmessage = (ev) => {
        const data = ev.data || {};
        if (data.type === 'OUTBOX_LIST_RESULT') {
          setItems((data.items || []) as OutboxItem[]);
        }
        if (data.type === 'OUTBOX_DELETE_OK') {
          setItems((prev) => prev.filter((i) => i.id !== data.id));
        }
        if (data.type === 'OUTBOX_RESEND_OK') {
          setItems((prev) => prev.filter((i) => i.id !== data.id));
        }
        if (data.type === 'OUTBOX_FLUSH_DONE') {
          // Tras flush, pedir lista
          requestList();
        }
      };

      const requestList = () => {
        sw.postMessage({ type: 'OUTBOX_LIST' }, [mc.port2]);
      };

      (requestList as any).ref = requestList;
      (window as any).__requestOutboxList = requestList;

      // pedir lista al cargar
      requestList();

      unreg = () => {
        try { mc.port1.close(); } catch {}
      };
    })();

    return () => { unreg(); };
  }, []);

  const postToSW = async (msg: any) => {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sw = reg.active || reg.waiting || reg.installing;
    if (!sw) return;
    const mc = new MessageChannel();
    mc.port1.onmessage = (ev) => {
      const data = ev.data || {};
      if (data.type === 'OUTBOX_LIST_RESULT') setItems(data.items || []);
      if (data.type === 'OUTBOX_DELETE_OK') setItems((prev) => prev.filter((i) => i.id !== data.id));
      if (data.type === 'OUTBOX_RESEND_OK') setItems((prev) => prev.filter((i) => i.id !== data.id));
      if (data.type === 'OUTBOX_FLUSH_DONE') {
        setLoading(false);
        (window as any).__requestOutboxList?.();
      }
    };
    sw.postMessage(msg, [mc.port2]);
  };

  const flushAll = async () => {
    setLoading(true);
    await postToSW({ type: 'OUTBOX_FLUSH' });
  };

  const deleteOne = async (id: string) => {
    await postToSW({ type: 'OUTBOX_DELETE', id });
  };

  const resendOne = async (id: string) => {
    await postToSW({ type: 'OUTBOX_RESEND_ONE', id });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header compacto */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">📦 Cola offline</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="sr-only">Cola offline</h1>
        <div className="flex gap-2">
          <button onClick={() => (window as any).__requestOutboxList?.()} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium">Actualizar</button>
          <button onClick={flushAll} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium">{loading ? 'Reintentando...' : 'Reintentar todo'}</button>
          <Link href="/" className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium">Volver</Link>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-600">No hay elementos en la cola.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">{it.id}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{it.url || '/api/partes'}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{it.method || 'POST'}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{it.ts ? new Date(it.ts).toLocaleString() : '-'}</td>
                  <td className="px-4 py-2 text-sm">
                    <div className="flex gap-2">
                      <button onClick={() => resendOne(it.id)} className="px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-xs">Reenviar</button>
                      <button onClick={() => deleteOne(it.id)} className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs">Borrar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            {/* Delfín Check-in */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delfín Check-in</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Software de gestión hotelera y auto check-in para hostales y apartamentos.
              </p>
            </div>

            {/* Contacto */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Contacto</h3>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  contacto@delfincheckin.com
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Lun-Dom: 9:00-22:00
                </div>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Legal</h3>
              <div className="space-y-1">
                <a href="/legal/privacy" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Política de Privacidad
                </a>
                <a href="/legal/cookies" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Política de Cookies
                </a>
                <a href="/legal/terms" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Términos de Servicio
                </a>
                <a href="/legal/notice" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Aviso Legal
                </a>
                <a href="/legal/cookies" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Gestionar Cookies
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-gray-200 pt-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                © 2025 Delfín Check-in ·{' '}
                <a href="https://delfincheckin.com" className="text-blue-600 hover:text-blue-800 underline">
                  Ver precios
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
