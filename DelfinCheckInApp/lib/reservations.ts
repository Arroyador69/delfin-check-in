export interface Reservation {
  id: string;
  reservation_code?: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  property_name?: string;
  room_id?: string;
  check_in_date?: string;
  check_in?: string;
  check_out_date?: string;
  check_out?: string;
  reservation_status?: string;
  status?: string;
  total_amount?: number;
  total_price?: number;
  needs_review?: boolean;
  guest_count?: number;
  channel?: string;
  guest_paid?: number;
  platform_commission?: number;
  currency?: string;
}

export interface PendingReservationItem {
  id: string;
  guest_name: string;
  check_in: string | null;
}

export function getReservationStatus(reservation: Reservation): string {
  return reservation.reservation_status || reservation.status || 'unknown';
}

export function getReservationCheckIn(reservation: Reservation): string | undefined {
  return reservation.check_in_date || reservation.check_in;
}

export function getReservationCheckOut(reservation: Reservation): string | undefined {
  return reservation.check_out_date || reservation.check_out;
}

export function getReservationPrice(reservation: Reservation): number {
  const value = reservation.total_amount ?? reservation.total_price ?? 0;
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}
