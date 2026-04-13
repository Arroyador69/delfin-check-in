'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useTenant, isProPlanTenant } from '@/hooks/useTenant';
import { Star, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ReputationGuestLocale } from '@/lib/reputation-google';

export default function ReputationGooglePage() {
  const t = useTranslations('reputationGoogle');
  const locale = useLocale();
  const { tenant, loading: tenantLoading } = useTenant();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [meLoaded, setMeLoaded] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [reviewUrl, setReviewUrl] = useState('');
  const [guestLocale, setGuestLocale] = useState<ReputationGuestLocale>('es');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.isPlatformAdmin) {
          setIsPlatformAdmin(true);
        }
      })
      .catch(() => {})
      .finally(() => setMeLoaded(true));
  }, []);

  const loading = tenantLoading || !meLoaded;
  const unlocked = Boolean(tenant && (isProPlanTenant(tenant) || isPlatformAdmin));

  const loadSettings = useCallback(async () => {
    if (!unlocked) return;
    setError(null);
    try {
      const r = await fetch('/api/tenant/reputation-google', { credentials: 'include' });
      const data = await r.json();
      if (!data.success) {
        setError(t('errLoad'));
        return;
      }
      const s = data.settings;
      setEnabled(Boolean(s.enabled));
      setReviewUrl(String(s.reviewUrl || ''));
      setGuestLocale(s.guestEmailLocale === 'en' ? 'en' : 'es');
    } catch {
      setError(t('errLoad'));
    } finally {
      setSettingsLoaded(true);
    }
  }, [unlocked, t]);

  useEffect(() => {
    if (unlocked) loadSettings();
  }, [unlocked, loadSettings]);

  const save = async () => {
    if (!unlocked) return;
    setSaveBusy(true);
    setMessage(null);
    setError(null);
    try {
      const r = await fetch('/api/tenant/reputation-google', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          reviewUrl,
          guestEmailLocale: guestLocale,
        }),
      });
      const data = await r.json();
      if (!data.success) {
        setError(data.error || t('errSave'));
        return;
      }
      setMessage(t('saved'));
      setTimeout(() => setMessage(null), 3500);
    } catch {
      setError(t('errSave'));
    } finally {
      setSaveBusy(false);
    }
  };

  const sendTest = async () => {
    if (!unlocked) return;
    setTestBusy(true);
    setMessage(null);
    setError(null);
    try {
      const r = await fetch('/api/tenant/reputation-google/test-email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewUrl: reviewUrl.trim(),
          guestEmailLocale: guestLocale,
        }),
      });
      const data = await r.json();
      if (!data.success) {
        setError(data.error || t('toastTestFail'));
        return;
      }
      setMessage(t('toastTestOk'));
      setTimeout(() => setMessage(null), 5000);
    } catch {
      setError(t('toastTestFail'));
    } finally {
      setTestBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-20">
      <div className="flex items-start gap-3 mb-6">
        <div className="rounded-lg bg-amber-50 p-2 border border-amber-200">
          <Star className="h-7 w-7 text-amber-600" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base leading-relaxed">{t('subtitle')}</p>
        </div>
      </div>

      {!loading && unlocked && <p className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">{t('bannerPro')}</p>}

      {!loading && !unlocked && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">{t('bannerLockedTitle')}</p>
          <p className="mt-1 text-amber-900/90 leading-relaxed">{t('bannerLockedBody')}</p>
          <Link
            href={`/${locale}/plans`}
            className="inline-flex mt-3 text-sm font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
          >
            {t('ctaUpgrade')}
          </Link>
        </div>
      )}

      {(message || error) && (
        <div
          className={`mb-4 rounded-lg px-4 py-2 text-sm ${error ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-blue-50 text-blue-900 border border-blue-200'}`}
          role="status"
        >
          {error || message}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('formTitle')}</h2>
            <p className="text-sm text-gray-600 mb-4">{t('formSubtitle')}</p>

            {unlocked && settingsLoaded ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="rg-enabled" className="text-sm font-medium text-gray-800">
                    {t('labelEnabled')}
                  </Label>
                  <input
                    id="rg-enabled"
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <Label htmlFor="rg-url" className="text-sm font-medium text-gray-800">
                    {t('labelUrl')}
                  </Label>
                  <Input
                    id="rg-url"
                    type="url"
                    className="mt-1.5"
                    placeholder="https://g.page/…"
                    value={reviewUrl}
                    onChange={(e) => setReviewUrl(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('hintUrl')}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-800">{t('labelLocale')}</span>
                  <div className="flex gap-4 mt-2">
                    <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="guestLocale"
                        checked={guestLocale === 'es'}
                        onChange={() => setGuestLocale('es')}
                        className="text-blue-600"
                      />
                      {t('localeEs')}
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="guestLocale"
                        checked={guestLocale === 'en'}
                        onChange={() => setGuestLocale('en')}
                        className="text-blue-600"
                      />
                      {t('localeEn')}
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 pt-1">
                  <Button type="button" onClick={save} disabled={saveBusy}>
                    {saveBusy ? t('saving') : t('save')}
                  </Button>
                  <Button type="button" variant="outline" onClick={sendTest} disabled={testBusy || !reviewUrl.trim()}>
                    {testBusy ? t('testEmailBusy') : t('testEmail')}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">{t('automationNote')}</p>
              </div>
            ) : null}

            {unlocked && !settingsLoaded ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : null}

            {!unlocked && (
              <>
                <div className="space-y-4 opacity-40 pointer-events-none select-none">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('labelEnabled')}</span>
                    <div className="h-6 w-11 rounded-full bg-gray-200" />
                  </div>
                  <div>
                    <span className="text-sm font-medium">{t('labelUrl')}</span>
                    <div className="mt-1.5 h-10 bg-gray-100 rounded-md border" />
                  </div>
                </div>
                <div
                  className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-[1px] px-4"
                  aria-hidden
                >
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm text-sm font-medium text-gray-700">
                    <Lock className="h-4 w-4" />
                    {t('cardLockedLabel')}
                  </div>
                </div>
              </>
            )}
          </div>

          <article className="prose prose-gray max-w-none text-gray-800 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-900">{t('sectionBenefitsTitle')}</h2>
              <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionBenefitsP1')}</p>
              <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionBenefitsP2')}</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900">{t('sectionHowTitle')}</h2>
              <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionHowP')}</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900">{t('sectionMicroTitle')}</h2>
              <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionMicroP')}</p>
            </section>
            <p className="text-sm text-gray-600">{t('sectionNote')}</p>
          </article>
        </>
      )}
    </div>
  );
}
