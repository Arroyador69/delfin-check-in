// =====================================================
// DASHBOARD - Pantalla principal
// =====================================================

import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable, Linking } from 'react-native';
import { FixedBannerAd } from '@/components/FixedBannerAd';
import { AffiliateRecommendationCard } from '@/components/AffiliateRecommendationCard';
import { useAuth } from '@/lib/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useMemo } from 'react';
import type { AxiosError } from 'axios';

function apiErrorMessage(err: unknown): string {
  const ax = err as AxiosError<{ error?: string; message?: string }>;
  const d = ax.response?.data;
  return (d?.error || d?.message || ax.message || '').trim() || 'Error de red';
}
import { Users, ArrowDownCircle, ArrowUpCircle, Calendar, BellRing } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getLocale, getLocaleTag, hasPersistedAppLocale, t, useLocaleListener } from '@/lib/i18n';
import { getAppCountryCode } from '@/lib/country-preference';
import { getWebOnboardingUrl, isWebOnboardingIncomplete } from '@/lib/web-onboarding';

import {
  PendingReservationItem,
  Reservation,
  getReservationCheckIn,
  getReservationCheckOut,
  getReservationPrice,
} from '@/lib/reservations';

export default function DashboardScreen() {
  useLocaleListener();
  const { session } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: mirData } = useQuery({
    queryKey: ['settings-mir'],
    queryFn: async () => {
      const res = await api.get('/api/settings/mir');
      return res.data as { mir?: any };
    },
  });

  const { data: limitsData } = useQuery({
    queryKey: ['tenant-limits'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/limits');
      return res.data as { currentRooms?: any[] };
    },
  });

  const { data: propsData } = useQuery({
    queryKey: ['tenant-properties-onboarding'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/properties');
      return res.data as { properties?: any[] };
    },
  });

  const { data: repData } = useQuery({
    queryKey: ['reputation-google'],
    queryFn: async () => {
      const res = await api.get('/api/reputation-google');
      return res.data as any;
    },
  });

  const { data: regionPrefs } = useQuery({
    queryKey: ['app-region-prefs'],
    queryFn: async () => {
      const [country, hasLocale] = await Promise.all([getAppCountryCode(), hasPersistedAppLocale()]);
      return { country, hasLocale };
    },
  });

  const { data: tenantCountryData } = useQuery({
    queryKey: ['tenant-country-code'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/country-code');
      return res.data as { country_code?: string | null };
    },
  });

  const onboardingTasks = useMemo(() => {
    const mir = mirData?.mir || {};
    const mirReady = Boolean(
      mir?.enabled &&
        String(mir?.codigoEstablecimiento || '').trim() &&
        String(mir?.denominacion || '').trim() &&
        String(mir?.direccionCompleta || '').trim()
    );
    const roomsReady = Array.isArray(limitsData?.currentRooms) && limitsData!.currentRooms!.length > 0;
    const propertiesReady = Array.isArray(propsData?.properties) && propsData!.properties!.length > 0;
    const googleReady = Boolean(repData?.enabled);

    const effectiveCountry =
      (regionPrefs?.country || tenantCountryData?.country_code || '').toString().toUpperCase() || null;
    const countryDone = Boolean(effectiveCountry);
    const languageDone = Boolean(regionPrefs?.hasLocale);
    const isSpain = effectiveCountry === 'ES';

    const tasks: { key: string; label: string; done: boolean; href: string }[] = [
      { key: 'country', label: t('mobile.onboarding.tasks.country'), done: countryDone, href: '/(app)/settings/country' },
      { key: 'language', label: t('mobile.onboarding.tasks.language'), done: languageDone, href: '/(app)/settings/language' },
    ];
    if (isSpain) {
      tasks.push({
        key: 'mir',
        label: t('mobile.onboarding.tasks.mir'),
        done: mirReady,
        href: '/(app)/settings/mir',
      });
    }
    tasks.push(
      { key: 'rooms', label: t('mobile.onboarding.tasks.rooms'), done: roomsReady, href: '/(app)/settings/general' },
      {
        key: 'properties',
        label: t('mobile.onboarding.tasks.properties'),
        done: propertiesReady,
        href: '/(app)/settings/properties',
      },
      { key: 'google', label: t('mobile.onboarding.tasks.google'), done: googleReady, href: '/(app)/settings/reputation' }
    );

    const doneCount = tasks.filter((x) => x.done).length;
    return { tasks, doneCount, total: tasks.length };
  }, [mirData, limitsData, propsData, repData, regionPrefs, tenantCountryData]);

  // Obtener reservas normales
  const {
    data: reservations,
    isLoading,
    isError: reservationsError,
    error: reservationsErr,
    refetch: refetchReservations,
  } = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const response = await api.get('/api/reservations');
      return response.data || [];
    },
    retry: 1,
  });

  const allReservations = (reservations || []) as Reservation[];

  const { data: pendingData } = useQuery({
    queryKey: ['pending-reservations-review'],
    queryFn: async () => {
      const response = await api.get('/api/tenant/pending-reservations-review');
      return response.data as { count?: number; items?: PendingReservationItem[] };
    },
  });

  const pendingCount = typeof pendingData?.count === 'number' ? pendingData.count : 0;
  const pendingItems = Array.isArray(pendingData?.items) ? pendingData.items : [];

  const { data: tenantWebOnboarding } = useQuery({
    queryKey: ['tenant-web-onboarding'],
    queryFn: async () => {
      const response = await api.get('/api/tenant');
      const tenant = (response.data as { tenant?: { onboarding_status?: string } })?.tenant;
      return tenant?.onboarding_status ?? null;
    },
    staleTime: 60 * 1000,
  });

  const showWebOnboardingBanner = isWebOnboardingIncomplete(tenantWebOnboarding ?? undefined);

  // Filtrar reservas por estado
  const { stayingToday, arrivingToday, leavingToday, upcomingReservations } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Usar substring en lugar de split para evitar crash en Hermes
    const todayStr = today.toISOString().substring(0, 10);

    const staying: Reservation[] = [];
    const arriving: Reservation[] = [];
    const leaving: Reservation[] = [];
    const upcoming: Reservation[] = [];

    allReservations.forEach((r) => {
      const status = r.reservation_status || r.status || '';
      if (status !== 'confirmed' && status !== 'completed') return;

      const checkIn = getReservationCheckIn(r);
      const checkOut = getReservationCheckOut(r);

      if (!checkIn || !checkOut) return;

      const checkInDate = new Date(checkIn);
      checkInDate.setHours(0, 0, 0, 0);
      const checkOutDate = new Date(checkOut);
      checkOutDate.setHours(0, 0, 0, 0);

      // Usar substring en lugar de split para evitar crash en Hermes
      const checkInStr = checkInDate.toISOString().substring(0, 10);
      const checkOutStr = checkOutDate.toISOString().substring(0, 10);

      // Quién llega hoy
      if (checkInStr === todayStr) {
        arriving.push(r);
      }

      // Quién se va hoy
      if (checkOutStr === todayStr) {
        leaving.push(r);
      }

      // Quién hay hoy: ocupación en la fecha de hoy, pero sin quienes solo salen hoy (van solo a «Quién se va hoy»)
      const checkoutIsToday = checkOutStr === todayStr;
      if (checkInDate <= today && checkOutDate >= today && !checkoutIsToday) {
        staying.push(r);
      }

      // Próximas reservas (check-in > hoy)
      if (checkInDate > today) {
        upcoming.push(r);
      }
    });

    // Ordenar próximas reservas por fecha de check-in
    upcoming.sort((a, b) => {
      const dateA = new Date(a.check_in_date || a.check_in || '');
      const dateB = new Date(b.check_in_date || b.check_in || '');
      return dateA.getTime() - dateB.getTime();
    });

    return {
      stayingToday: staying,
      arrivingToday: arriving,
      leavingToday: leaving,
      upcomingReservations: upcoming.slice(0, 5), // Solo las próximas 5
    };
  }, [allReservations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({ queryKey: ['reservations'] });
    await queryClient.refetchQueries({ queryKey: ['tenant-web-onboarding'] });
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(getLocaleTag(), {
      day: 'numeric',
      month: 'short',
    });
  };

  const ReservationCard = ({ reservation, showDates = true }: { reservation: Reservation; showDates?: boolean }) => {
    const checkIn = getReservationCheckIn(reservation);
    const checkOut = getReservationCheckOut(reservation);
    const price = getReservationPrice(reservation);

    return (
      <View style={styles.reservationCard}>
        <View style={styles.reservationHeader}>
          <Text style={styles.reservationGuestName}>{reservation.guest_name}</Text>
          {price > 0 && !isNaN(price) && <Text style={styles.reservationPrice}>{price.toFixed(2)} €</Text>}
        </View>
        <Text style={styles.reservationProperty}>
          {reservation.property_name || reservation.room_id || 'N/A'}
        </Text>
        {showDates && checkIn && checkOut && (
          <Text style={styles.reservationDates}>
            {formatDate(checkIn)} - {formatDate(checkOut)}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {t('mobile.dashboard.greeting', { name: session?.user.fullName || session?.user.email || '' })}
        </Text>
        <Text style={styles.tenantName}>{session?.user.tenant.name}</Text>
      </View>

      {showWebOnboardingBanner ? (
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            padding: 14,
            borderRadius: 14,
            backgroundColor: '#fff7ed',
            borderWidth: 1,
            borderColor: '#fed7aa',
          }}
        >
          <Text style={{ fontWeight: '900', color: '#9a3412', fontSize: 15, marginBottom: 6 }}>
            {t('mobile.onboarding.webOnboardingBannerTitle')}
          </Text>
          <Text style={{ color: '#7c2d12', fontSize: 14, lineHeight: 20, marginBottom: 12 }}>
            {t('mobile.onboarding.webOnboardingBannerBody')}
          </Text>
          <Pressable
            onPress={() => void Linking.openURL(getWebOnboardingUrl(getLocale()))}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: '#ea580c',
            }}
          >
            <Text style={{ color: 'white', fontWeight: '800', textAlign: 'center', fontSize: 15 }}>
              {t('mobile.onboarding.webOnboardingBannerCta')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <AffiliateRecommendationCard placement="mobile_dashboard" />

      {reservationsError ? (
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            padding: 12,
            borderRadius: 12,
            backgroundColor: '#fef2f2',
            borderWidth: 1,
            borderColor: '#fecaca',
          }}
        >
          <Text style={{ fontWeight: '800', color: '#991b1b', marginBottom: 4 }}>
            {t('common.error')}: {apiErrorMessage(reservationsErr)}
          </Text>
          <Pressable onPress={() => refetchReservations()} style={{ marginTop: 8 }}>
            <Text style={{ color: '#2563eb', fontWeight: '700' }}>{t('common.refresh')}</Text>
          </Pressable>
        </View>
      ) : null}

      {onboardingTasks.doneCount < onboardingTasks.total ? (
        <View style={[styles.card, { borderWidth: 1, borderColor: '#e0e7ff', backgroundColor: '#f8fafc' }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e3a8a' }}>
                {t('mobile.onboarding.checklist.title')}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{onboardingTasks.doneCount}/{onboardingTasks.total}</Text>
            </View>
          </View>
          <Text style={[styles.emptyText, { color: '#475569', fontStyle: 'normal' }]}>
            {t('mobile.onboarding.checklist.subtitle')}
          </Text>

          <View style={{ marginTop: 10, gap: 8 }}>
            {onboardingTasks.tasks.map((task) => (
              <Pressable
                key={task.key}
                onPress={() => router.push(task.href as any)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
                  {task.done ? '✅ ' : '⬜ '} {task.label}
                </Text>
                <Text style={{ color: '#2563eb', fontWeight: '800' }}>{t('mobile.onboarding.checklist.open')}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <BellRing size={20} color="#b45309" />
            <Text style={styles.cardTitle}>{t('mobile.dashboard.pendingReviewTitle')}</Text>
          </View>
          <View style={[styles.badge, styles.badgePending]}>
            <Text style={styles.badgeTextPending}>{pendingCount}</Text>
          </View>
        </View>
        {pendingCount === 0 ? (
          <Text style={styles.emptyText}>{t('mobile.dashboard.noPending')}</Text>
        ) : (
          <>
            {pendingItems.slice(0, 3).map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/reservations',
                    params: { filter: 'pending', reservationId: item.id },
                  })
                }
                style={styles.pendingItem}
              >
                <Text style={styles.pendingGuest}>{item.guest_name}</Text>
                <Text style={styles.pendingMeta}>
                  {t('mobile.dashboard.checkinLabel')}:{' '}
                  {item.check_in
                    ? new Date(item.check_in).toLocaleDateString(getLocaleTag(), {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : t('mobile.dashboard.noDate')}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.pendingButton}
              onPress={() =>
                router.push({
                  pathname: '/(app)/reservations',
                  params: { filter: 'pending' },
                })
              }
            >
              <Text style={styles.pendingButtonText}>{t('mobile.dashboard.viewPending')}</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Quién hay hoy */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Users size={20} color="#2563eb" />
            <Text style={styles.cardTitle}>{t('mobile.dashboard.stayingTodayTitle')}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{stayingToday.length}</Text>
          </View>
        </View>
        {isLoading ? (
          <Text style={styles.emptyText}>{t('common.loading')}</Text>
        ) : stayingToday.length === 0 ? (
          <Text style={styles.emptyText}>{t('mobile.dashboard.stayingTodayEmpty')}</Text>
        ) : (
          stayingToday.map((reservation, index) => (
            <ReservationCard key={reservation.id || index} reservation={reservation} />
          ))
        )}
      </View>

      {/* Quién llega hoy */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <ArrowDownCircle size={20} color="#10b981" />
            <Text style={styles.cardTitle}>{t('mobile.dashboard.arrivingTodayTitle')}</Text>
          </View>
          <View style={[styles.badge, styles.badgeSuccess]}>
            <Text style={styles.badgeText}>{arrivingToday.length}</Text>
          </View>
        </View>
        {isLoading ? (
          <Text style={styles.emptyText}>{t('common.loading')}</Text>
        ) : arrivingToday.length === 0 ? (
          <Text style={styles.emptyText}>{t('mobile.dashboard.arrivingTodayEmpty')}</Text>
        ) : (
          arrivingToday.map((reservation, index) => (
            <ReservationCard key={reservation.id || index} reservation={reservation} />
          ))
        )}
      </View>

      {/* Quién se va hoy */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <ArrowUpCircle size={20} color="#f59e0b" />
            <Text style={styles.cardTitle}>{t('mobile.dashboard.leavingTodayTitle')}</Text>
          </View>
          <View style={[styles.badge, styles.badgeWarning]}>
            <Text style={styles.badgeText}>{leavingToday.length}</Text>
          </View>
        </View>
        {isLoading ? (
          <Text style={styles.emptyText}>{t('common.loading')}</Text>
        ) : leavingToday.length === 0 ? (
          <Text style={styles.emptyText}>{t('mobile.dashboard.leavingTodayEmpty')}</Text>
        ) : (
          leavingToday.map((reservation, index) => (
            <ReservationCard key={reservation.id || index} reservation={reservation} />
          ))
        )}
      </View>

      {/* Próximas reservas */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Calendar size={20} color="#8b5cf6" />
            <Text style={styles.cardTitle}>{t('mobile.dashboard.upcomingTitle')}</Text>
          </View>
        </View>
        {isLoading ? (
          <Text style={styles.emptyText}>{t('common.loading')}</Text>
        ) : upcomingReservations.length === 0 ? (
          <Text style={styles.emptyText}>{t('mobile.dashboard.upcomingEmpty')}</Text>
        ) : (
          upcomingReservations.map((reservation, index) => (
            <ReservationCard key={reservation.id || index} reservation={reservation} />
          ))
        )}
      </View>
    </ScrollView>
    <FixedBannerAd />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  tenantName: {
    fontSize: 16,
    color: '#6b7280',
  },
  card: {
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  badge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  badgeSuccess: {
    backgroundColor: '#d1fae5',
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
  },
  badgePending: {
    backgroundColor: '#fef3c7',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  badgeTextPending: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#b45309',
  },
  pendingItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pendingGuest: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  pendingMeta: {
    fontSize: 13,
    color: '#6b7280',
  },
  pendingButton: {
    marginTop: 12,
    backgroundColor: '#f59e0b20',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pendingButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b45309',
  },
  reservationCard: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 8,
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  reservationGuestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  reservationPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
    marginLeft: 8,
  },
  reservationProperty: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  reservationDates: {
    fontSize: 14,
    color: '#2563eb',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
});
