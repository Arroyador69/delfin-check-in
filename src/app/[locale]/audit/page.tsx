'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

type Item = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  payload_hash: string;
  at: string;
  ip?: string;
  meta?: any;
};

export default function AuditPage() {
  const t = useTranslations('audit');
  const locale = useLocale();
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (action) params.set('action', action);
    if (entityType) params.set('entityType', entityType);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('limit', '200');
    const res = await fetch(`/api/audit?${params.toString()}`, { cache: 'no-store' });
    const json = await res.json();
    setItems(json.items || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6">
      {/* Header con emoji y gradiente */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 flex items-center gap-3">
          <span className="text-4xl sm:text-5xl md:text-6xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🛡️</span>
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t('title')}
          </span>
        </h1>
        <p className="text-gray-700 text-base sm:text-lg">
          {t('subtitle')}
        </p>
      </div>

      {/* Filtros en una card */}
      <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <input 
            value={q} 
            onChange={e=>setQ(e.target.value)} 
            placeholder={t('placeholderSearch')} 
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 placeholder-gray-500" 
          />
          <input 
            value={action} 
            onChange={e=>setAction(e.target.value)} 
            placeholder={t('placeholderAction')} 
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 placeholder-gray-500" 
          />
          <input 
            value={entityType} 
            onChange={e=>setEntityType(e.target.value)} 
            placeholder={t('placeholderType')} 
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 placeholder-gray-500" 
          />
          <input 
            type="date" 
            value={from} 
            onChange={e=>setFrom(e.target.value)} 
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900" 
          />
          <input 
            type="date" 
            value={to} 
            onChange={e=>setTo(e.target.value)} 
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900" 
          />
          <button 
            onClick={fetchData} 
            disabled={loading} 
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 shadow-lg font-semibold transform hover:scale-105 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {t('loading')}
              </>
            ) : (
              <>
                🔍 {t('btnFilter')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Contenedor con scroll independiente */}
      <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
        {/* Cabecera fija */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📋</span>
              <h2 className="text-lg font-bold text-gray-900">{t('tableTitle')}</h2>
            </div>
            <p className="text-sm text-gray-700 font-semibold">
              {items.length === 1 ? t('recordsFoundOne') : t('recordsFoundMany', { count: items.length })}
            </p>
          </div>
        </div>

        {/* Tabla con scroll vertical y horizontal independiente */}
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  📅 {t('colDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  ⚡ {t('colAction')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  🏷️ {t('colType')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  🔢 {t('colEntity')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  🔐 {t('colHash')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  📝 {t('colMeta')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-6xl mb-4" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🔍</div>
                    <p className="text-lg text-gray-700 font-semibold">{t('emptyTitle')}</p>
                    <p className="text-gray-600 mt-2">{t('emptyHint')}</p>
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="hover:bg-blue-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{new Date(it.at).toLocaleString(locale)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                        {it.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{it.entity_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{it.entity_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono max-w-xs truncate" title={it.payload_hash}>{it.payload_hash}</td>
                    <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate" title={it.meta ? JSON.stringify(it.meta) : '-'}>{it.meta ? JSON.stringify(it.meta) : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


