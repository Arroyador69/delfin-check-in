'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useClientTranslations } from '@/hooks/useClientTranslations';

interface OutboxItem {
  id: string;
  url?: string;
  method?: string;
  body?: any;
  ts?: number;
}

export default function OfflineQueuePage() {
  const t = useClientTranslations('offlineQueue');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6">
      {/* Header con emoji y gradiente */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 flex items-center gap-3">
          <span className="text-4xl sm:text-5xl md:text-6xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📦</span>
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Cola Offline
          </span>
        </h1>
        <p className="text-gray-700 text-base sm:text-lg mb-4">
          Gestiona las peticiones pendientes cuando la conexión se restablezca
        </p>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="sr-only">Cola offline</h1>
        <button 
          onClick={() => (window as any).__requestOutboxList?.()} 
          className="px-5 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
        >
          <span>🔄</span>
          Actualizar
        </button>
        <button 
          onClick={flushAll} 
          disabled={loading} 
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Reintentando...
            </>
          ) : (
            <>
              <span>⚡</span>
              Reintentar Todo
            </>
          )}
        </button>
        <Link 
          href="/" 
          className="px-5 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:border-blue-500 hover:text-blue-600 font-semibold transition-all duration-200 flex items-center gap-2"
        >
          <span>🏠</span>
          Volver
        </Link>
      </div>

      {/* Contenido de la cola */}
      <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>✅</div>
            <p className="text-xl text-gray-700 font-semibold">No hay elementos en la cola</p>
            <p className="text-gray-600 mt-2">La cola está vacía. ¡Todo sincronizado!</p>
          </div>
        ) : (
          <>
            {/* Header de la tabla */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-200">
              <div className="flex items-center gap-2">
                <span className="text-2xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📋</span>
                <h2 className="text-lg font-bold text-gray-900">
                  {items.length} elemento{items.length !== 1 ? 's' : ''} en la cola
                </h2>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      🆔 ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      🔗 URL
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      📤 Método
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      📅 Fecha
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      ⚙️ Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((it) => (
                    <tr key={it.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{it.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{it.url || '/api/partes'}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          {it.method || 'POST'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{it.ts ? new Date(it.ts).toLocaleString() : '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => resendOne(it.id)} 
                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 font-semibold text-xs shadow-md transition-all duration-200 transform hover:scale-105 flex items-center gap-1"
                          >
                            <span>📤</span>
                            Reenviar
                          </button>
                          <button 
                            onClick={() => deleteOne(it.id)} 
                            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 font-semibold text-xs shadow-md transition-all duration-200 transform hover:scale-105 flex items-center gap-1"
                          >
                            <span>🗑️</span>
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
