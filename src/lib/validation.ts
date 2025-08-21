import { z } from 'zod';

// Esquema para habitaciones
export const roomSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  ical_in_airbnb_url: z.string().url('URL de Airbnb inválida').optional().or(z.literal('')),
  ical_in_booking_url: z.string().url('URL de Booking inválida').optional().or(z.literal('')),
  base_price: z.number().min(0, 'El precio debe ser mayor a 0'),
});

// Esquema para reservas
export const reservationSchema = z.object({
  external_id: z.string().min(1, 'ID externo requerido'),
  room_id: z.string().uuid('ID de habitación inválido'),
  guest_name: z.string().min(1, 'Nombre del huésped requerido'),
  guest_email: z.string().email('Email inválido'),
  check_in: z.string().datetime('Fecha de check-in inválida'),
  check_out: z.string().datetime('Fecha de check-out inválida'),
  channel: z.enum(['airbnb', 'booking', 'manual']),
  total_price: z.number().min(0, 'Precio debe ser mayor a 0'),
  status: z.enum(['confirmed', 'cancelled', 'completed']),
});

// Esquema para huéspedes (check-in digital)
export const guestSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  document_type: z.enum(['dni', 'passport', 'nie', 'other']),
  document_number: z.string().min(1, 'Número de documento requerido'),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de nacimiento inválida'),
  country: z.string().min(1, 'País requerido'),
  accepts_rules: z.boolean().refine(val => val === true, 'Debes aceptar las normas'),
});

// Esquema para múltiples huéspedes
export const guestsSchema = z.object({
  guests: z.array(guestSchema).min(1, 'Al menos un huésped es requerido'),
  arrival_time: z.string().min(1, 'Hora de llegada requerida'),
  special_requests: z.string().optional(),
});

// Esquema para mensajes automáticos
export const messageSchema = z.object({
  trigger: z.string().min(1, 'Trigger requerido'),
  channel: z.enum(['email', 'telegram', 'whatsapp']),
  template: z.string().min(1, 'Plantilla requerida'),
  language: z.enum(['es', 'en']),
  is_active: z.boolean(),
});

// Esquema para tareas de limpieza
export const cleaningTaskSchema = z.object({
  room_id: z.string().uuid('ID de habitación inválido'),
  date: z.string().datetime('Fecha inválida'),
  status: z.enum(['pending', 'in_progress', 'completed']),
  notes: z.string().optional(),
});

// Esquema para reglas de precios
export const pricingRuleSchema = z.object({
  room_id: z.string().uuid('ID de habitación inválido'),
  rule_type: z.enum(['advance', 'occupancy', 'weekend', 'event']),
  parameter: z.string().min(1, 'Parámetro requerido'),
  is_active: z.boolean(),
});

// Esquema para configuración de iCal
export const icalConfigSchema = z.object({
  room_id: z.string().uuid('ID de habitación inválido'),
  ical_in_airbnb_url: z.string().url('URL de Airbnb inválida').optional(),
  ical_in_booking_url: z.string().url('URL de Booking inválida').optional(),
  sync_interval: z.number().min(5).max(60).default(10), // minutos
});

// Esquema para configuración de Telegram
export const telegramConfigSchema = z.object({
  bot_token: z.string().min(1, 'Token del bot requerido'),
  chat_id: z.string().min(1, 'Chat ID requerido'),
  notifications_enabled: z.boolean().default(true),
});

// Esquema para filtros de búsqueda
export const searchFiltersSchema = z.object({
  room_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  status: z.enum(['confirmed', 'cancelled', 'completed']).optional(),
  channel: z.enum(['airbnb', 'booking', 'manual']).optional(),
});

// Esquema para exportación de datos
export const exportSchema = z.object({
  type: z.enum(['reservations', 'guests', 'cleaning', 'financial']),
  date_from: z.string().datetime(),
  date_to: z.string().datetime(),
  format: z.enum(['csv', 'pdf', 'json']).default('csv'),
});

// Tipos derivados de los esquemas
export type RoomFormData = z.infer<typeof roomSchema>;
export type ReservationFormData = z.infer<typeof reservationSchema>;
export type GuestFormData = z.infer<typeof guestSchema>;
export type GuestsFormData = z.infer<typeof guestsSchema>;
export type MessageFormData = z.infer<typeof messageSchema>;
export type CleaningTaskFormData = z.infer<typeof cleaningTaskSchema>;
export type PricingRuleFormData = z.infer<typeof pricingRuleSchema>;
export type ICalConfigFormData = z.infer<typeof icalConfigSchema>;
export type TelegramConfigFormData = z.infer<typeof telegramConfigSchema>;
export type SearchFilters = z.infer<typeof searchFiltersSchema>;
export type ExportRequest = z.infer<typeof exportSchema>;
