/**
 * Tareas de limpieza derivadas de reservas + cleaning_config (misma lógica que el feed iCal).
 */

import { getYmdInTimeZone } from '@/lib/calendar-date';

const CLEANING_TZ = 'Europe/Madrid';

export type CleaningTrigger = 'on_checkout' | 'day_before_checkin' | 'both';

export interface RoomCleaningConfigInput {
  room_id: string;
  room_name: string;
  property_name: string | null;
  checkout_time: string; // HH:mm
  checkin_time: string;
  cleaning_duration_minutes: number;
  cleaning_trigger: CleaningTrigger;
  same_day_alert: boolean;
}

export interface ReservationRow {
  id: string;
  guest_name: string | null;
  check_in: Date | string;
  check_out: Date | string;
  guest_count: number | null;
  channel: string | null;
}

export interface CleaningTaskEvent {
  id: string;
  type: 'checkout_clean' | 'pre_checkin_clean';
  room_id: string;
  room_name: string;
  property_name: string | null;
  reservation_id: string;
  date: string;
  checkout_date?: string;
  start_iso: string;
  end_iso: string;
  summary: string;
  guest_name: string;
  guest_count: number;
  channel: string | null;
  same_day_turnover: boolean;
  next_guest_name: string | null;
  next_guest_count: number | null;
  owner_note: string | null;
  note_path: string;
}

/** Día calendario del check-in/out en la misma TZ que el filtro «hoy» del API (Madrid). */
function reservationYmd(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return getYmdInTimeZone(dt, CLEANING_TZ);
}

/** Misma lógica que formatIcalDate en api/ical/cleaning (hora local sobre el día de la reserva). */
function combineDateAndTime(date: Date, timeHHmm: string): Date {
  const [h, m] = timeHHmm.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function addMinutesToDate(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60_000);
}

export function buildCleaningTasksForRoom(
  config: RoomCleaningConfigInput,
  reservationsList: ReservationRow[],
  notesByDate: Map<string, string>,
  notePathForRoomAndDate: (roomId: string, date: string) => string
): CleaningTaskEvent[] {
  const checkoutTime = config.checkout_time?.slice(0, 5) || '11:00';
  const checkinTime = config.checkin_time?.slice(0, 5) || '16:00';
  const duration = config.cleaning_duration_minutes || 120;
  const trigger = config.cleaning_trigger || 'on_checkout';
  const roomName = config.room_name || `Habitación ${config.room_id}`;

  const tasks: CleaningTaskEvent[] = [];

  for (let i = 0; i < reservationsList.length; i++) {
    const res = reservationsList[i];
    const checkoutDate = new Date(res.check_out);
    const checkinDate = new Date(res.check_in);
    const guestName = res.guest_name || 'Huésped';
    const guestCount = res.guest_count || 1;
    const checkoutDateStr = reservationYmd(checkoutDate);

    const nextRes = reservationsList.find(r => {
      const nextIn = reservationYmd(new Date(r.check_in));
      return nextIn === checkoutDateStr && r.id !== res.id;
    });

    const isSameDayTurnover = !!nextRes;
    const ownerNote = notesByDate.get(checkoutDateStr) || null;

    const startCheckout = combineDateAndTime(checkoutDate, checkoutTime);
    const endCheckout = addMinutesToDate(startCheckout, duration);

    if (trigger === 'on_checkout' || trigger === 'both') {
      const urgent = isSameDayTurnover && config.same_day_alert;
      const summary = urgent ? `⚡ Urgente — Limpieza ${roomName}` : `🧹 Limpieza ${roomName}`;

      tasks.push({
        id: `co-${config.room_id}-${res.id}`,
        type: 'checkout_clean',
        room_id: config.room_id,
        room_name: roomName,
        property_name: config.property_name,
        reservation_id: res.id,
        date: checkoutDateStr,
        checkout_date: checkoutDateStr,
        start_iso: startCheckout.toISOString(),
        end_iso: endCheckout.toISOString(),
        summary,
        guest_name: guestName,
        guest_count: guestCount,
        channel: res.channel,
        same_day_turnover: isSameDayTurnover,
        next_guest_name: nextRes ? (nextRes.guest_name || 'Huésped') : null,
        next_guest_count: nextRes ? nextRes.guest_count || 1 : null,
        owner_note: ownerNote,
        note_path: notePathForRoomAndDate(config.room_id, checkoutDateStr),
      });
    }

    if (trigger === 'day_before_checkin' || trigger === 'both') {
      const dayBefore = new Date(checkinDate.getTime() - 86400000);
      const dayBeforeStr = reservationYmd(dayBefore);
      if (dayBeforeStr !== checkoutDateStr) {
        const startPre = combineDateAndTime(dayBefore, checkoutTime);
        const endPre = addMinutesToDate(startPre, duration);
        tasks.push({
          id: `pre-${config.room_id}-${res.id}`,
          type: 'pre_checkin_clean',
          room_id: config.room_id,
          room_name: roomName,
          property_name: config.property_name,
          reservation_id: res.id,
          date: dayBeforeStr,
          start_iso: startPre.toISOString(),
          end_iso: endPre.toISOString(),
          summary: `🧹 Pre-limpieza ${roomName}`,
          guest_name: guestName,
          guest_count: guestCount,
          channel: res.channel,
          same_day_turnover: false,
          next_guest_name: null,
          next_guest_count: null,
          owner_note: notesByDate.get(dayBeforeStr) || null,
          note_path: notePathForRoomAndDate(config.room_id, dayBeforeStr),
        });
      }
    }
  }

  tasks.sort((a, b) => new Date(a.start_iso).getTime() - new Date(b.start_iso).getTime());
  return tasks;
}
