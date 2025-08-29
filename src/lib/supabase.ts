// Sistema de almacenamiento local con archivos JSON
import * as storage from './storage';

// Exportar las funciones de almacenamiento como "supabase" para compatibilidad
export const supabase = {
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        single: async () => {
          const data = getTableData(table);
          const item = data.find((item: any) => item[column] === value);
          return { data: item || null, error: null };
        },
        order: (column: string) => ({
          async then(callback: any) {
            const data = getTableData(table);
            const sorted = data.sort((a: any, b: any) => a[column].localeCompare(b[column]));
            return callback({ data: sorted, error: null });
          }
        })
      }),
      order: (column: string) => ({
        async then(callback: any) {
          const data = getTableData(table);
          const sorted = data.sort((a: any, b: any) => a[column].localeCompare(b[column]));
          return callback({ data: sorted, error: null });
        }
      }),
      async then(callback: any) {
        const data = getTableData(table);
        return callback({ data, error: null });
      }
    }),
    insert: (data: any) => ({
      select: () => ({
        single: async () => {
          const newItem = Array.isArray(data) ? data[0] : data;
          const result = createTableItem(table, newItem);
          return { data: result, error: null };
        }
      }),
      async then(callback: any) {
        const newItem = Array.isArray(data) ? data[0] : data;
        const result = createTableItem(table, newItem);
        return callback({ data: result, error: null });
      }
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => ({
        async then(callback: any) {
          const result = updateTableItem(table, column, value, data);
          return callback({ data: result, error: null });
        }
      })
    }),
    delete: () => ({
      eq: (column: string, value: any) => ({
        async then(callback: any) {
          const result = deleteTableItem(table, column, value);
          return callback({ data: result, error: null });
        }
      })
    })
  })
};

// Funciones auxiliares para manejar los datos
function getTableData(table: string): any[] {
  switch (table) {
    case 'rooms':
      return storage.getRooms();
    case 'reservations':
      return storage.getReservations();
    case 'guests':
      return storage.getGuests();
    case 'messages':
      return storage.getMessages();
    case 'guest_registrations':
      return storage.getGuestRegistrations();
    default:
      return [];
  }
}

function createTableItem(table: string, data: any): any {
  switch (table) {
    case 'rooms':
      return storage.createRoom(data);
    case 'reservations':
      return storage.createReservation(data);
    case 'guests':
      return storage.createGuest(data);
    case 'messages':
      return storage.createMessage(data);
    case 'guest_registrations':
      return storage.createGuestRegistration(data);
    default:
      throw new Error(`Unknown table: ${table}`);
  }
}

function updateTableItem(table: string, column: string, value: any, data: any): any {
  switch (table) {
    case 'rooms':
      return storage.updateRoom(value, data);
    case 'messages':
      return storage.updateMessage(value, data);
    default:
      throw new Error(`Update not implemented for table: ${table}`);
  }
}

function deleteTableItem(table: string, column: string, value: any): any {
  switch (table) {
    case 'rooms':
      return storage.deleteRoom(value);
    case 'messages':
      return storage.deleteMessage(value);
    default:
      throw new Error(`Delete not implemented for table: ${table}`);
  }
}

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
