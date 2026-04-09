"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import LocalizedDateInput from '@/components/LocalizedDateInput';

export default function PartesPage() {
  const t = useTranslations('partes');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(false);

  const generarDia = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ministerio/partes-dia?date=${date}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || t('errorGenerate'));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `partes_viajeros_${date}.xml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('title')}</h1>
        <div className="bg-white rounded-lg shadow p-6 flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('date')}</label>
            <LocalizedDateInput className="px-3 py-2 border border-gray-300 rounded-md" value={date} onChange={(e)=>setDate(e.target.value)} />
          </div>
          <button onClick={generarDia} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">{loading ? t('generating') : t('generate')}</button>
        </div>
      </div>
    </div>
  );
}


