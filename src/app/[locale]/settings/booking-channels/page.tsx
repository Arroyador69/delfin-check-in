'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import BookingChannelsEditor from '@/components/BookingChannelsEditor';
import {
  normalizeBookingChannels,
  defaultBookingChannelsConfig,
  type BookingChannelsConfig,
} from '@/lib/booking-channels';

export default function BookingChannelsSettingsPage() {
  const t = useTranslations('settings.bookingChannels');
  const tCommon = useTranslations('common');
  const [cfg, setCfg] = useState<BookingChannelsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/tenant/booking-channels', { credentials: 'include' });
        const d = await r.json();
        if (cancelled) return;
        if (d.success && d.bookingChannels) {
          setCfg(normalizeBookingChannels(d.bookingChannels));
        } else {
          setCfg(defaultBookingChannelsConfig());
        }
      } catch {
        if (!cancelled) {
          setCfg(defaultBookingChannelsConfig());
          setMessage({ type: 'err', text: t('loadError') });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    setMessage(null);
    try {
      const r = await fetch('/api/tenant/booking-channels', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingChannels: cfg }),
      });
      const d = await r.json();
      if (!r.ok || !d.success) {
        setMessage({ type: 'err', text: d.error || t('saveError') });
        return;
      }
      setCfg(normalizeBookingChannels(d.bookingChannels));
      setMessage({ type: 'ok', text: t('saved') });
    } catch {
      setMessage({ type: 'err', text: t('saveError') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('pageTitle')}</h1>
        <p className="text-gray-600 mt-1">{t('pageSubtitle')}</p>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'ok' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {loading || !cfg ? (
        <p className="text-gray-500">{tCommon('loading')}</p>
      ) : (
        <>
          <BookingChannelsEditor value={cfg} onChange={setCfg} disabled={saving} />
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:bg-gray-300"
          >
            {saving ? t('saving') : t('save')}
          </button>
        </>
      )}
    </div>
  );
}
