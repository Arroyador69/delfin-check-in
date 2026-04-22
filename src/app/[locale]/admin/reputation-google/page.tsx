'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useTenant, isProPlanTenant } from '@/hooks/useTenant';
import { Star, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isPlausibleGoogleReviewUrl, type ReputationGuestLocale } from '@/lib/reputation-google';

function isValidEmailAddress(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function ReputationGooglePage() {
  const t = useTranslations('reputationGoogle');
  const locale = useLocale();
  const { tenant, loading: tenantLoading } = useTenant();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [meLoaded, setMeLoaded] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [reviewUrl, setReviewUrl] = useState('');
  const [guestLocale, setGuestLocale] = useState<ReputationGuestLocale>('es');
  const [messageEs, setMessageEs] = useState('');
  const [messageEn, setMessageEn] = useState('');
  const [properties, setProperties] = useState<Array<{ id: number; name: string; url: string }>>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [propertyUrl, setPropertyUrl] = useState('');
  const [propertyBusy, setPropertyBusy] = useState(false);
  const [slots, setSlots] = useState<Array<{ room_id: string; room_name: string; property_id: number | null }>>([]);
  const [slotReviewUrls, setSlotReviewUrls] = useState<Record<string, string>>({});
  const [slotSaveBusyRoomId, setSlotSaveBusyRoomId] = useState<string | null>(null);
  const [limits, setLimits] = useState<{ maxRooms: number; currentRooms: number } | null>(null);
  const [createBusyRoomId, setCreateBusyRoomId] = useState<string | null>(null);
  const [recommended, setRecommended] = useState<{ es: string; en: string }>({ es: '', en: '' });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testEmailTo, setTestEmailTo] = useState('');
  const testEmailInitializedRef = useRef(false);

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
      const rec = data.recommendedGuestMessages || { es: '', en: '' };
      setRecommended(rec);
      setEnabled(Boolean(s.enabled));
      setReviewUrl(String(s.reviewUrl || ''));
      setGuestLocale(s.guestEmailLocale === 'en' ? 'en' : 'es');
      setMessageEs((s.guestMessageEs ?? '').trim() ? String(s.guestMessageEs) : rec.es);
      setMessageEn((s.guestMessageEn ?? '').trim() ? String(s.guestMessageEn) : rec.en);
    } catch {
      setError(t('errLoad'));
    } finally {
      setSettingsLoaded(true);
    }
  }, [unlocked, t]);

  const loadProperties = useCallback(async () => {
    if (!unlocked) return;
    try {
      const r = await fetch('/api/tenant/reputation-google/properties', { credentials: 'include' });
      const data = await r.json();
      if (!data.success) return;
      const list = Array.isArray(data.properties) ? data.properties : [];
      const mapped = list
        .map((p: any) => ({
          id: Number(p.id),
          name: String(p.property_name || ''),
          url: String(p.google_review_url || ''),
        }))
        .filter((p: any) => Number.isFinite(p.id) && p.id > 0);
      setProperties(mapped);
      if (mapped.length > 0) {
        const initialId = selectedPropertyId && mapped.some((x) => x.id === selectedPropertyId)
          ? selectedPropertyId
          : mapped[0].id;
        setSelectedPropertyId(initialId);
        const found = mapped.find((x) => x.id === initialId);
        setPropertyUrl(found?.url || '');
      } else {
        setSelectedPropertyId(null);
        setPropertyUrl('');
      }
    } catch {
      // no-op
    }
  }, [unlocked, selectedPropertyId]);

  const loadSlots = useCallback(async () => {
    if (!unlocked) return;
    try {
      const r = await fetch('/api/tenant/property-slots', { credentials: 'include' });
      const data = await r.json();
      if (!data.success) return;
      const list = Array.isArray(data.slots) ? data.slots : [];
      setSlots(
        list
          .map((s: any) => ({
            room_id: String(s.room_id),
            room_name: String(s.room_name || ''),
            property_id: s.property_id != null ? Number(s.property_id) : null,
          }))
          .filter((s: any) => s.room_id)
      );
    } catch {
      // no-op
    }
  }, [unlocked]);

  useEffect(() => {
    // Mantener un input por unidad (room_id) para su enlace de reseña.
    // El enlace vive realmente en la propiedad mapeada (property_id).
    if (!unlocked) return;
    if (slots.length === 0) return;

    const urlByPropertyId = new Map<number, string>();
    for (const p of properties) urlByPropertyId.set(p.id, p.url || '');

    setSlotReviewUrls((prev) => {
      const next: Record<string, string> = { ...prev };
      for (const s of slots) {
        const current = next[s.room_id];
        if (typeof current === 'string' && current.trim() !== '') continue;
        if (s.property_id == null) continue;
        next[s.room_id] = urlByPropertyId.get(s.property_id) || '';
      }
      return next;
    });
  }, [unlocked, slots, properties]);

  const loadLimits = useCallback(async () => {
    if (!unlocked) return;
    try {
      const r = await fetch('/api/tenant/limits', { credentials: 'include' });
      const data = await r.json();
      if (!data.success) return;
      const maxRooms = Number(data?.tenant?.limits?.maxRooms);
      const currentRooms = Array.isArray(data?.currentRooms) ? data.currentRooms.length : 0;
      if (!Number.isFinite(maxRooms)) return;
      setLimits({ maxRooms, currentRooms });
    } catch {
      // no-op
    }
  }, [unlocked]);

  useEffect(() => {
    if (unlocked) {
      loadSettings();
      loadProperties();
      loadSlots();
      loadLimits();
    }
  }, [unlocked, loadSettings, loadProperties, loadSlots, loadLimits]);

  useEffect(() => {
    if (unlocked && settingsLoaded && tenant?.email && !testEmailInitializedRef.current) {
      setTestEmailTo(tenant.email);
      testEmailInitializedRef.current = true;
    }
  }, [unlocked, settingsLoaded, tenant?.email]);

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
          guestMessageEs: messageEs,
          guestMessageEn: messageEn,
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
    setMessage(null);
    setError(null);

    const url = (propertyUrl.trim() || reviewUrl.trim());
    if (!url) {
      setError(t('testEmailNeedUrl'));
      return;
    }
    if (!isPlausibleGoogleReviewUrl(url)) {
      setError(t('testEmailInvalidUrl'));
      return;
    }

    const to = testEmailTo.trim() || tenant?.email?.trim() || '';
    if (!to || !isValidEmailAddress(to)) {
      setError(t('testEmailInvalidAddress'));
      return;
    }

    setTestBusy(true);
    try {
      const r = await fetch('/api/tenant/reputation-google/test-email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewUrl: url,
          propertyId: selectedPropertyId,
          guestEmailLocale: guestLocale,
          guestMessageEs: messageEs,
          guestMessageEn: messageEn,
          to,
        }),
      });
      const data = await r.json();
      if (!data.success) {
        setError(data.error || t('toastTestFail'));
        return;
      }
      setMessage(t('toastTestOk', { email: data.sentTo || to }));
      setTimeout(() => setMessage(null), 6000);
    } catch {
      setError(t('toastTestFail'));
    } finally {
      setTestBusy(false);
    }
  };

  const saveSlotUrl = async (roomId: string) => {
    if (!unlocked) return;
    const slot = slots.find((s) => s.room_id === roomId);
    const propertyId = slot?.property_id ?? null;
    if (!propertyId) {
      setError(t('slotsNeedCreate'));
      return;
    }

    const url = String(slotReviewUrls[roomId] || '').trim();
    if (url && !isPlausibleGoogleReviewUrl(url)) {
      setError(t('testEmailInvalidUrl'));
      return;
    }

    setSlotSaveBusyRoomId(roomId);
    setMessage(null);
    setError(null);
    try {
      const r = await fetch('/api/tenant/reputation-google/properties', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          googleReviewUrl: url,
        }),
      });
      const data = await r.json();
      if (!data.success) {
        setError(data.error || t('errSave'));
        return;
      }
      setMessage(t('propertySaved'));
      setTimeout(() => setMessage(null), 3500);
      await loadProperties();
    } catch {
      setError(t('errSave'));
    } finally {
      setSlotSaveBusyRoomId(null);
    }
  };

  const savePropertyUrl = async () => {
    if (!unlocked) return;
    if (!selectedPropertyId) return;
    setPropertyBusy(true);
    setMessage(null);
    setError(null);
    try {
      const r = await fetch('/api/tenant/reputation-google/properties', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          googleReviewUrl: propertyUrl,
        }),
      });
      const data = await r.json();
      if (!data.success) {
        setError(data.error || t('errSave'));
        return;
      }
      setMessage(t('propertySaved'));
      setTimeout(() => setMessage(null), 3500);
      await loadProperties();
    } catch {
      setError(t('errSave'));
    } finally {
      setPropertyBusy(false);
    }
  };

  // Ojo: aquí "Crear" no crea una habitación nueva, sino una "propiedad" mapeada
  // para un slot (Room) que ya existe. Por tanto, no debe bloquearse por límites.
  const canCreateMoreUnits = true;

  const createPropertyForSlot = async (roomId: string, roomName: string) => {
    if (!unlocked) return;
    setCreateBusyRoomId(roomId);
    setMessage(null);
    setError(null);
    try {
      const r = await fetch('/api/tenant/properties', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: Number.isFinite(Number(roomId)) ? Number(roomId) : roomId,
          property_name: roomName || `Unidad ${roomId}`,
          description: '',
          photos: [],
          max_guests: 2,
          bedrooms: 1,
          bathrooms: 1,
          amenities: [],
          base_price: 50,
          cleaning_fee: 0,
          security_deposit: 0,
          minimum_nights: 1,
          maximum_nights: 30,
          availability_rules: {},
          is_active: true,
        }),
      });
      const data = await r.json();
      if (!data.success) {
        setError(data.error || t('errSave'));
        return;
      }
      setMessage(t('slotCreated'));
      setTimeout(() => setMessage(null), 3500);
      await Promise.all([loadSlots(), loadProperties(), loadLimits()]);
    } catch {
      setError(t('errSave'));
    } finally {
      setCreateBusyRoomId(null);
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

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t('propertyLinksTitle')}</p>
                      <p className="text-xs text-gray-600 mt-1">{t('propertyLinksSubtitle')}</p>
                    </div>
                  </div>

                  {properties.length === 0 ? (
                    <p className="text-xs text-gray-600">{t('propertyLinksEmpty')}</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1">
                        <Label htmlFor="rg-prop" className="text-sm font-medium text-gray-800">
                          {t('propertyLinksSelect')}
                        </Label>
                        <select
                          id="rg-prop"
                          className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
                          value={selectedPropertyId ?? ''}
                          onChange={(e) => {
                            const id = Number(e.target.value);
                            const nextId = Number.isFinite(id) ? id : null;
                            setSelectedPropertyId(nextId);
                            const found = properties.find((p) => p.id === nextId);
                            setPropertyUrl(found?.url || '');
                          }}
                        >
                          {properties.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name || `#${p.id}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor="rg-prop-url" className="text-sm font-medium text-gray-800">
                          {t('propertyLinksUrl')}
                        </Label>
                        <Input
                          id="rg-prop-url"
                          type="url"
                          className="mt-1.5"
                          placeholder="https://g.page/…"
                          value={propertyUrl}
                          onChange={(e) => setPropertyUrl(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">{t('propertyLinksHint')}</p>
                      </div>
                      <div className="sm:col-span-3 flex flex-wrap gap-3">
                        <Button type="button" variant="outline" onClick={savePropertyUrl} disabled={propertyBusy}>
                          {propertyBusy ? t('saving') : t('propertyLinksSave')}
                        </Button>
                        <p className="text-xs text-gray-500 self-center">{t('propertyLinksFallback')}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t('slotsTitle')}</p>
                      <p className="text-xs text-gray-600 mt-1">{t('slotsSubtitle')}</p>
                      {limits ? (
                        <p className="text-xs text-gray-500 mt-1">
                          {t('slotsUsage', {
                            used: limits.currentRooms,
                            max: limits.maxRooms === -1 ? '∞' : limits.maxRooms,
                          })}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {slots.length === 0 ? (
                    <p className="text-xs text-gray-600">{t('slotsEmpty')}</p>
                  ) : (
                    <div className="space-y-2">
                      {slots.map((s) => {
                        const mapped = s.property_id != null;
                        return (
                          <div
                            key={s.room_id}
                            className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {s.room_name || `#${s.room_id}`}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {mapped ? t('slotMapped') : t('slotUnmapped')}
                                </p>
                              </div>
                              {!mapped ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                disabled={createBusyRoomId === s.room_id}
                                  onClick={() => void createPropertyForSlot(s.room_id, s.room_name)}
                                >
                                  {createBusyRoomId === s.room_id ? t('creating') : t('slotCreate')}
                                </Button>
                              ) : (
                                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                                  {t('slotReady')}
                                </span>
                              )}
                            </div>

                            {mapped ? (
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                                <div className="sm:col-span-2">
                                  <Label
                                    htmlFor={`rg-slot-url-${s.room_id}`}
                                    className="text-xs font-medium text-gray-700"
                                  >
                                    {t('slotReviewUrlLabel')}
                                  </Label>
                                  <Input
                                    id={`rg-slot-url-${s.room_id}`}
                                    type="url"
                                    className="mt-1"
                                    placeholder="https://g.page/…"
                                    value={slotReviewUrls[s.room_id] ?? ''}
                                    onChange={(e) =>
                                      setSlotReviewUrls((prev) => ({ ...prev, [s.room_id]: e.target.value }))
                                    }
                                  />
                                </div>
                                <div className="sm:col-span-1 flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    disabled={slotSaveBusyRoomId === s.room_id}
                                    onClick={() => void saveSlotUrl(s.room_id)}
                                  >
                                    {slotSaveBusyRoomId === s.room_id ? t('saving') : t('slotSaveUrl')}
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      {!canCreateMoreUnits ? (
                        <p className="text-xs text-amber-900/90 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                          {t('slotsLimitReached')}
                        </p>
                      ) : null}
                    </div>
                  )}
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
                  <p className="text-xs text-amber-900/90 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2 mt-2">
                    {t('guestEmailLanguagesNote')}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">{t('testEmailHint')}</p>
                </div>

                <p className="text-xs text-gray-600 border-t border-gray-100 pt-4">{t('hintSaludo')}</p>
                <p className="text-xs text-gray-500">{t('hintPlaceholders')}</p>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor="rg-msg-es" className="text-sm font-medium text-gray-800">
                      {t('labelMessageEs')}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setMessageEs(recommended.es)}
                    >
                      {t('restoreEs')}
                    </Button>
                  </div>
                  <textarea
                    id="rg-msg-es"
                    className="mt-1.5 flex min-h-[128px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={messageEs}
                    onChange={(e) => setMessageEs(e.target.value)}
                    spellCheck
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor="rg-msg-en" className="text-sm font-medium text-gray-800">
                      {t('labelMessageEn')}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setMessageEn(recommended.en)}
                    >
                      {t('restoreEn')}
                    </Button>
                  </div>
                  <textarea
                    id="rg-msg-en"
                    className="mt-1.5 flex min-h-[128px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={messageEn}
                    onChange={(e) => setMessageEn(e.target.value)}
                    spellCheck
                  />
                </div>

                <div className="rounded-xl border-2 border-dashed border-blue-300 bg-gradient-to-br from-sky-50 to-blue-50/80 p-4 sm:p-5 space-y-3 shadow-sm">
                  <p className="text-sm font-semibold text-gray-900">{t('testSectionTitle')}</p>
                  <p className="text-xs text-gray-600">
                    {guestLocale === 'en' ? t('localeEn') : t('localeEs')} · {t('testEmailHint')}
                  </p>
                  <div>
                    <Label htmlFor="rg-test-email" className="text-sm font-medium text-gray-800">
                      {t('labelTestEmail')}
                    </Label>
                    <Input
                      id="rg-test-email"
                      type="email"
                      autoComplete="email"
                      className="mt-1.5 bg-white"
                      value={testEmailTo}
                      onChange={(e) => setTestEmailTo(e.target.value)}
                      placeholder={tenant?.email || 'email@ejemplo.com'}
                    />
                    <p className="text-xs text-gray-600 mt-1">{t('hintTestEmail')}</p>
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md"
                    onClick={sendTest}
                    disabled={testBusy}
                  >
                    {testBusy ? t('testEmailBusy') : t('testEmail')}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                  <Button type="button" variant="outline" onClick={save} disabled={saveBusy}>
                    {saveBusy ? t('saving') : t('save')}
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
                  <div className="h-24 bg-gray-100 rounded-md border" />
                  <div className="h-24 bg-gray-100 rounded-md border" />
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
            <section>
              <h2 className="text-lg font-semibold text-gray-900">{t('sectionAutomationTitle')}</h2>
              <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionAutomationP1')}</p>
              <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionAutomationP2')}</p>
              <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionAutomationP3')}</p>
            </section>
          </article>
        </>
      )}
    </div>
  );
}
