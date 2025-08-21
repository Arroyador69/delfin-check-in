import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para TypeScript
export interface Room {
  id: string;
  name: string;
  ical_in_airbnb_url?: string;
  ical_in_booking_url?: string;
  ical_out_url?: string;
  base_price: number;
  created_at: string;
  updated_at: string;
}

// Schema para validación de formularios
export interface RoomFormData {
  name: string;
  ical_in_airbnb_url?: string;
  ical_in_booking_url?: string;
  base_price: number;
}

// Schema de validación simple (sin Zod por ahora)
export const roomSchema = {
  parse: (data: RoomFormData) => {
    if (!data.name || data.name.trim() === '') {
      throw new Error('El nombre de la habitación es requerido');
    }
    if (data.base_price < 0) {
      throw new Error('El precio debe ser mayor o igual a 0');
    }
    return data;
  }
};

export interface Reservation {
  id: string;
  external_id: string;
  room_id: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  channel: 'airbnb' | 'booking' | 'manual';
  total_price: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface Guest {
  id: string;
  reservation_id: string;
  name: string;
  document_type: string;
  document_number: string;
  birth_date: string;
  country: string;
  signature_url?: string;
  accepts_rules: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  trigger: string;
  channel: 'email' | 'telegram' | 'whatsapp';
  template: string;
  language: 'es' | 'en';
  is_active: boolean;
  created_at: string;
}

export interface CleaningTask {
  id: string;
  room_id: string;
  date: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
  created_at: string;
}

export interface PricingRule {
  id: string;
  room_id: string;
  rule_type: 'advance' | 'occupancy' | 'weekend' | 'event';
  parameter: string;
  is_active: boolean;
  created_at: string;
}
