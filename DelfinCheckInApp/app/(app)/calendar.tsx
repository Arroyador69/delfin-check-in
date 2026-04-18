// =====================================================
// CALENDARIO - Vista de calendario móvil con detalles
// =====================================================

import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowDownCircle, ArrowUpCircle, Users, Info } from 'lucide-react-native';
import { getLocaleTag, t } from '@/lib/i18n';
import { FixedBannerAd } from '@/components/FixedBannerAd';

interface Availability {
  property_id: number;
  date: string;
  available: boolean;
  blocked_reason: string | null;
}

interface CalendarEvent {
  tenant_id: string;
  property_id: number;
  event_title: string;
  event_description: string | null;
  start_date: string;
  end_date: string;
  is_blocked: boolean;
  event_type: string;
  guest_name?: string;
  room_id?: string;
  room_name?: string | null;
  reservation_id?: number;
  channel?: string | null;
  guest_count?: number | null;
}

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Fechas API (ISO) → día local YYYY-MM-DD (alineado con celdas del calendario). */
function ymdFromApiDateString(iso: string): string {
  const d = new Date(iso);
  return ymdLocal(d);
}

function parseLocalYmd(ymd: string): Date {
  const [y, mo, d] = ymd.split('-').map((x) => parseInt(x, 10));
  return new Date(y, mo - 1, d);
}

function translateChannelLabel(channel: string | null | undefined): string {
  const raw = String(channel || '').toLowerCase();
  if (!raw) return '';
  if (raw === 'airbnb') return t('reservations.channelAirbnb');
  if (raw === 'booking') return t('reservations.channelBooking');
  if (raw === 'vrbo') return t('reservations.channelVrbo');
  if (raw === 'expedia') return t('reservations.channelExpedia');
  if (raw === 'tripadvisor') return t('reservations.channelTripadvisor');
  if (raw === 'manual') return t('reservations.channelManual');
  if (raw === 'checkin_form') return t('reservations.channelCheckinForm');
  return String(channel || '');
}

export default function CalendarScreen() {
  const { session } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  const [start, setStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return ymdLocal(d);
  });
  
  const [end, setEnd] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    return ymdLocal(d);
  });

  const tenantId = session?.tenant_id || session?.user?.tenant?.id || '';

  // Cargar datos del calendario
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['calendar', tenantId, start, end],
    queryFn: async () => {
      if (!tenantId) return null;
      const response = await api.get(
        `/api/calendar?tenant_id=${tenantId}&from=${start}&to=${end}`
      );
      return response.data;
    },
    enabled: !!tenantId,
  });

  const availability: Availability[] = data?.availability || [];
  const events: CalendarEvent[] = data?.events || [];

  useEffect(() => {
    if (tenantId && start && end) {
      refetch();
    }
  }, [tenantId, start, end]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Calcular días del mes
  const days = useMemo(() => {
    const out: string[] = [];
    const s = parseLocalYmd(start);
    const e = parseLocalYmd(end);

    const firstDayOfMonth = new Date(s.getFullYear(), s.getMonth(), 1);
    const startWeekday = (firstDayOfMonth.getDay() + 6) % 7; // lunes=0

    if (startWeekday > 0) {
      const prevMonth = new Date(s.getFullYear(), s.getMonth(), 0);
      const prevMonthDays = prevMonth.getDate();
      const startFromDay = prevMonthDays - startWeekday + 1;
      for (let i = startFromDay; i <= prevMonthDays; i++) {
        const d = new Date(s.getFullYear(), s.getMonth() - 1, i);
        out.push(ymdLocal(d));
      }
    }

    for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) {
      out.push(ymdLocal(d));
    }

    return out;
  }, [start, end]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((ev) => {
      const s = new Date(ev.start_date);
      const e = new Date(ev.end_date);
      const start = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      const endDay = new Date(e.getFullYear(), e.getMonth(), e.getDate());
      for (let d = new Date(start); d < endDay; d.setDate(d.getDate() + 1)) {
        const key = ymdLocal(d);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
      }
    });
    return map;
  }, [events]);

  // Eventos del día seleccionado agrupados por habitación
  const dayEventsByRoom = useMemo(() => {
    if (!selectedDate) return new Map<string, CalendarEvent[]>();
    
    const dayEvents = eventsByDate.get(selectedDate) || [];
    const roomMap = new Map<string, CalendarEvent[]>();
    
    dayEvents.forEach(ev => {
      if (ev.event_type === 'reservation' && ev.room_id) {
        const roomKey = ev.room_id;
        if (!roomMap.has(roomKey)) roomMap.set(roomKey, []);
        roomMap.get(roomKey)!.push(ev);
      }
    });
    
    return roomMap;
  }, [selectedDate, eventsByDate]);

  // Clasificar eventos del día seleccionado
  const classifiedEvents = useMemo(() => {
    if (!selectedDate) return { arriving: [], leaving: [], staying: [] };
    
    const dayEvents = eventsByDate.get(selectedDate) || [];
    const arriving: CalendarEvent[] = [];
    const leaving: CalendarEvent[] = [];
    const staying: CalendarEvent[] = [];

    dayEvents.forEach((ev) => {
      if (ev.event_type !== 'reservation' || !ev.room_id) return;

      const checkInStr = ymdFromApiDateString(ev.start_date);
      const checkOutStr = ymdFromApiDateString(ev.end_date);

      if (checkInStr === selectedDate) {
        arriving.push(ev);
      } else if (checkOutStr === selectedDate) {
        leaving.push(ev);
      } else if (checkInStr < selectedDate && checkOutStr > selectedDate) {
        staying.push(ev);
      }
    });
    
    return { arriving, leaving, staying };
  }, [selectedDate, eventsByDate]);

  const currentMonth = useMemo(() => {
    const s = parseLocalYmd(start);
    return { year: s.getFullYear(), month: s.getMonth() };
  }, [start]);

  const previousMonth = () => {
    const d = parseLocalYmd(start);
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    setStart(ymdLocal(d));
    const e = new Date(d);
    e.setMonth(e.getMonth() + 1);
    setEnd(ymdLocal(e));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    const d = parseLocalYmd(start);
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    setStart(ymdLocal(d));
    const e = new Date(d);
    e.setMonth(e.getMonth() + 1);
    setEnd(ymdLocal(e));
    setSelectedDate(null);
  };

  const monthTitle = useMemo(() => {
    const d = new Date(currentMonth.year, currentMonth.month, 1);
    const name = d.toLocaleDateString(getLocaleTag(), { month: 'long' });
    return `${name} ${currentMonth.year}`;
  }, [currentMonth.month, currentMonth.year]);

  const weekDays = useMemo(() => {
    // Semana ISO: lunes → domingo.
    const baseMonday = new Date(2024, 0, 1); // 2024-01-01 fue lunes
    const fmt = new Intl.DateTimeFormat(getLocaleTag(), { weekday: 'narrow' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(baseMonday.getTime() + i * 86400000)));
  }, [start]);

  const isToday = (dateStr: string) => {
    return dateStr === ymdLocal(new Date());
  };

  const isCurrentMonth = (dateStr: string) => {
    const d = parseLocalYmd(dateStr);
    return d.getMonth() === currentMonth.month && d.getFullYear() === currentMonth.year;
  };

  const formatDisplayDate = (dateStr: string) => {
    return parseLocalYmd(dateStr).toLocaleDateString(getLocaleTag(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatShortRangeDate = (iso: string) =>
    new Date(iso).toLocaleDateString(getLocaleTag(), { day: 'numeric', month: 'short' });

  if (isLoading && !data) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header con navegación */}
        <View style={styles.header}>
          <Pressable onPress={previousMonth} style={styles.navButton}>
            <ChevronLeft size={24} color="#2563eb" />
          </Pressable>
          <Text style={styles.monthTitle}>
            {monthTitle}
          </Text>
          <Pressable onPress={nextMonth} style={styles.navButton}>
            <ChevronRight size={24} color="#2563eb" />
          </Pressable>
        </View>

        {/* Misma aclaración que en web: iCal bloquea micrositio/enlaces; aquí solo reservas en Delfín */}
        <View style={styles.icalNotice} accessible accessibilityLabel={t('calendar.icalScopeNotice')}>
          <Info size={20} color="#1d4ed8" style={styles.icalNoticeIcon} />
          <Text style={styles.icalNoticeText}>{t('calendar.icalScopeNotice')}</Text>
        </View>

        {/* Días de la semana */}
        <View style={styles.weekDays}>
          {weekDays.map((day, idx) => (
            <View key={idx} style={styles.weekDay}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendario */}
        <View style={styles.calendar}>
          {days.map((dateStr, idx) => {
            const dayEvents = eventsByDate.get(dateStr) || [];
            const today = isToday(dateStr);
            const currentMonthDay = isCurrentMonth(dateStr);
            const isSelected = selectedDate === dateStr;
            
            return (
              <Pressable
                key={idx}
                onPress={() => setSelectedDate(dateStr)}
                style={[
                  styles.dayCell,
                  today && styles.todayCell,
                  !currentMonthDay && styles.otherMonthCell,
                  isSelected && styles.selectedCell,
                ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    today && styles.todayNumber,
                    !currentMonthDay && styles.otherMonthText,
                    isSelected && styles.selectedNumber,
                  ]}
                >
                  {parseLocalYmd(dateStr).getDate()}
                </Text>
                {dayEvents.length > 0 && (() => {
                  // Filtrar solo reservas y determinar colores
                  const reservationEvents = dayEvents.filter(ev => ev.event_type === 'reservation');
                  let hasArriving = false;
                  let hasLeaving = false;
                  let hasStaying = false;

                  reservationEvents.forEach((ev) => {
                    const checkInStr = ymdFromApiDateString(ev.start_date);
                    const checkOutStr = ymdFromApiDateString(ev.end_date);

                    if (checkInStr === dateStr) {
                      hasArriving = true;
                    } else if (checkOutStr === dateStr) {
                      hasLeaving = true;
                    } else {
                      hasStaying = true;
                    }
                  });
                  
                  // Prioridad: salidas > llegadas > estancias
                  let color = '#10b981'; // Verde por defecto
                  let isArriving = false;
                  
                  if (hasLeaving) {
                    color = '#f59e0b'; // Ámbar (sale)
                  } else if (hasArriving) {
                    color = '#10b981'; // Verde (llega)
                    isArriving = true;
                  } else if (hasStaying) {
                    color = '#10b981'; // Verde (está)
                  }
                  
                  return (
                    <View style={styles.eventsIndicator}>
                      <View
                        style={[
                          styles.eventDot,
                          { backgroundColor: color },
                          isArriving && styles.eventDotArriving,
                        ]}
                      />
                      {reservationEvents.length > 1 && (
                        <Text style={styles.eventCount}>+{reservationEvents.length - 1}</Text>
                      )}
                    </View>
                  );
                })()}
              </Pressable>
            );
          })}
        </View>

        {/* Detalles del día seleccionado */}
        {selectedDate && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>
              {formatDisplayDate(selectedDate)}
            </Text>

            {/* Quién llega hoy */}
            {classifiedEvents.arriving.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ArrowDownCircle size={18} color="#10b981" />
                  <Text style={styles.sectionTitle}>{t('mobile.dashboard.arrivingTodayTitle')}</Text>
                </View>
                {classifiedEvents.arriving.map((ev, idx) => (
                  <View key={idx} style={[styles.roomCard, styles.roomCardArriving]}>
                    <View style={styles.roomCardLeftBar} />
                    <View style={styles.roomCardContent}>
                      <Text style={styles.roomName}>
                        {ev.room_name || t('mobile.calendar.roomFallback', { number: ev.room_id || '' })}
                      </Text>
                      <Text style={styles.guestName}>{ev.guest_name}</Text>
                      {ev.guest_count && (
                        <Text style={styles.guestInfo}>
                          {ev.guest_count}{' '}
                          {ev.guest_count > 1 ? t('mobile.calendar.guestsPlural') : t('mobile.calendar.guestSingular')}
                        </Text>
                      )}
                      {ev.channel && (
                        <Text style={styles.channelInfo}>
                          {t('mobile.calendar.channelLabel')}: {translateChannelLabel(ev.channel)}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Quién se va hoy */}
            {classifiedEvents.leaving.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ArrowUpCircle size={18} color="#f59e0b" />
                  <Text style={styles.sectionTitle}>{t('mobile.dashboard.leavingTodayTitle')}</Text>
                </View>
                {classifiedEvents.leaving.map((ev, idx) => (
                  <View key={idx} style={[styles.roomCard, styles.roomCardLeaving]}>
                    <View style={styles.roomCardContent}>
                      <Text style={styles.roomName}>
                        {ev.room_name || t('mobile.calendar.roomFallback', { number: ev.room_id || '' })}
                      </Text>
                      <Text style={styles.guestName}>{ev.guest_name}</Text>
                      <Text style={styles.datesInfo}>
                        {formatShortRangeDate(ev.start_date)} - {formatShortRangeDate(ev.end_date)}
                      </Text>
                      {ev.guest_count && (
                        <Text style={styles.guestInfo}>
                          {ev.guest_count}{' '}
                          {ev.guest_count > 1 ? t('mobile.calendar.guestsPlural') : t('mobile.calendar.guestSingular')}
                        </Text>
                      )}
                      {ev.channel && (
                        <Text style={styles.channelInfo}>
                          {t('mobile.calendar.channelLabel')}: {translateChannelLabel(ev.channel)}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Quién está hoy */}
            {classifiedEvents.staying.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Users size={18} color="#10b981" />
                  <Text style={styles.sectionTitle}>{t('mobile.dashboard.stayingTodayTitle')}</Text>
                </View>
                {classifiedEvents.staying.map((ev, idx) => (
                  <View key={idx} style={[styles.roomCard, styles.roomCardStaying]}>
                    <View style={styles.roomCardContent}>
                      <Text style={styles.roomName}>
                        {ev.room_name || t('mobile.calendar.roomFallback', { number: ev.room_id || '' })}
                      </Text>
                      <Text style={styles.guestName}>{ev.guest_name}</Text>
                      <Text style={styles.datesInfo}>
                        {formatShortRangeDate(ev.start_date)} - {formatShortRangeDate(ev.end_date)}
                      </Text>
                      {ev.guest_count && (
                        <Text style={styles.guestInfo}>
                          {ev.guest_count}{' '}
                          {ev.guest_count > 1 ? t('mobile.calendar.guestsPlural') : t('mobile.calendar.guestSingular')}
                        </Text>
                      )}
                      {ev.channel && (
                        <Text style={styles.channelInfo}>
                          {t('mobile.calendar.channelLabel')}: {translateChannelLabel(ev.channel)}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {classifiedEvents.arriving.length === 0 &&
              classifiedEvents.leaving.length === 0 &&
              classifiedEvents.staying.length === 0 && (
                <Text style={styles.emptyDetailsText}>
                  {t('mobile.calendar.noReservationsForDay')}
                </Text>
              )}
          </View>
        )}
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  icalNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  icalNoticeIcon: {
    marginTop: 2,
  },
  icalNoticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#1e3a8a',
  },
  weekDays: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  weekDay: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'white',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  todayCell: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  selectedCell: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  otherMonthCell: {
    backgroundColor: '#f9fafb',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  todayNumber: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
  selectedNumber: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
  otherMonthText: {
    color: '#9ca3af',
  },
  eventsIndicator: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 1,
    marginVertical: 1,
  },
  eventDotArriving: {
    borderLeftWidth: 2,
    borderLeftColor: '#10b981',
    width: 8,
  },
  eventCount: {
    fontSize: 8,
    color: '#6b7280',
    marginLeft: 2,
  },
  detailsContainer: {
    backgroundColor: 'white',
    marginTop: 8,
    padding: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  roomCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    borderWidth: 1,
  },
  roomCardArriving: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
    borderLeftWidth: 4,
  },
  roomCardLeaving: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    borderLeftWidth: 4,
  },
  roomCardStaying: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  roomCardLeftBar: {
    width: 4,
    backgroundColor: '#10b981',
    borderRadius: 2,
    marginRight: 12,
  },
  roomCardContent: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  guestName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  datesInfo: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  guestInfo: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  channelInfo: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  emptyDetailsText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 24,
    fontStyle: 'italic',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    color: '#6b7280',
  },
});
