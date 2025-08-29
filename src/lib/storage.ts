// Sistema de almacenamiento usando localStorage del navegador
// Esto funciona tanto en desarrollo como en producción

// Claves para localStorage
const STORAGE_KEYS = {
  ROOMS: 'delfin_rooms',
  RESERVATIONS: 'delfin_reservations',
  GUESTS: 'delfin_guests',
  MESSAGES: 'delfin_messages',
  CLEANING_TASKS: 'delfin_cleaning_tasks',
  GUEST_REGISTRATIONS: 'delfin_guest_registrations',
};

// Función genérica para leer datos del localStorage
function readStorageData<T>(key: string, defaultValue: T[]): T[] {
  try {
    if (typeof window === 'undefined') {
      // En el servidor, retornar datos por defecto
      return defaultValue;
    }
    
    const data = localStorage.getItem(key);
    if (!data) {
      // Si no hay datos, guardar los datos por defecto
      writeStorageData(key, defaultValue);
      return defaultValue;
    }
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return defaultValue;
  }
}

// Función genérica para escribir datos en localStorage
function writeStorageData<T>(key: string, data: T[]): void {
  try {
    if (typeof window === 'undefined') {
      // En el servidor, no hacer nada
      return;
    }
    
    localStorage.setItem(key, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing ${key}:`, error);
    throw error;
  }
}

// Tipos de datos
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
  // Datos financieros
  guest_paid: number; // Cuánto pagó el huésped
  platform_commission: number; // Comisión de Booking/Airbnb
  net_income: number; // Tu ganancia neta
  currency: string; // Moneda (EUR, USD, etc.)
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

export interface GuestRegistration {
  id: string;
  reservation_id: string;
  name: string;
  surname: string;
  birth_date: string;
  birth_place: string;
  nationality: string;
  document_type: 'dni' | 'passport' | 'nie' | 'other';
  document_number: string;
  document_issuing_country: string;
  document_expiry_date: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  arrival_date: string;
  departure_date: string;
  room_number: string;
  travel_purpose: 'tourism' | 'business' | 'family' | 'other';
  previous_accommodation?: string;
  next_destination?: string;
  vehicle_registration?: string;
  accepts_terms: boolean;
  accepts_data_processing: boolean;
  sent_to_spain_ministry: boolean;
  spain_ministry_response?: any;
  spain_ministry_error?: string;
  created_at: string;
  updated_at: string;
}

// Datos iniciales
const initialRooms: Room[] = [
  {
    id: '1',
    name: 'Habitación 1',
    base_price: 80.00,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Habitación 2',
    base_price: 85.00,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Habitación 3',
    base_price: 90.00,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Habitación 4',
    base_price: 95.00,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Habitación 5',
    base_price: 100.00,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    name: 'Habitación 6',
    base_price: 105.00,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const initialMessages: Message[] = [
  {
    id: '1',
    trigger: 'reservation_confirmed',
    channel: 'email',
    template: 'Hola {{guest_name}},\n\n¡Gracias por reservar con nosotros!\n\nDetalles de tu reserva:\n- Habitación: {{room_name}}\n- Check-in: {{check_in_date}}\n- Check-out: {{check_out_date}}\n\nEn breve recibirás el enlace para completar tu check-in digital.\n\n¡Nos vemos pronto!\n\nSaludos,\nEl equipo de Delfín Check-in',
    language: 'es',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    trigger: 't_minus_7_days',
    channel: 'email',
    template: 'Hola {{guest_name}},\n\nTu llegada está a solo 7 días.\n\nRecordatorio de tu reserva:\n- Habitación: {{room_name}}\n- Check-in: {{check_in_date}}\n- Check-out: {{check_out_date}}\n\n¿Cómo llegar?\n{{directions}}\n\n¡Nos vemos pronto!\n\nSaludos,\nEl equipo de Delfín Check-in',
    language: 'es',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

// Funciones para habitaciones
export function getRooms(): Room[] {
  return readStorageData(STORAGE_KEYS.ROOMS, initialRooms);
}

export function getRoomById(id: string): Room | null {
  const rooms = getRooms();
  return rooms.find(room => room.id === id) || null;
}

export function createRoom(roomData: Omit<Room, 'id' | 'created_at' | 'updated_at'>): Room {
  const rooms = getRooms();
  const newRoom: Room = {
    ...roomData,
    id: Date.now().toString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  rooms.push(newRoom);
  writeStorageData(STORAGE_KEYS.ROOMS, rooms);
  return newRoom;
}

export function updateRoom(id: string, roomData: Partial<Room>): Room | null {
  const rooms = getRooms();
  const index = rooms.findIndex(room => room.id === id);
  if (index === -1) return null;
  
  rooms[index] = {
    ...rooms[index],
    ...roomData,
    updated_at: new Date().toISOString(),
  };
  writeStorageData(STORAGE_KEYS.ROOMS, rooms);
  return rooms[index];
}

export function deleteRoom(id: string): boolean {
  const rooms = getRooms();
  const filteredRooms = rooms.filter(room => room.id !== id);
  if (filteredRooms.length === rooms.length) return false;
  
  writeStorageData(STORAGE_KEYS.ROOMS, filteredRooms);
  return true;
}

// Funciones para reservas
export function getReservations(): Reservation[] {
  return readStorageData(STORAGE_KEYS.RESERVATIONS, []);
}

export function createReservation(reservationData: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>): Reservation {
  const reservations = getReservations();
  
  // Calcular datos financieros si no se proporcionan
  const guest_paid = reservationData.guest_paid || reservationData.total_price || 0;
  const platform_commission = reservationData.platform_commission || calculateCommission(guest_paid, reservationData.channel);
  const net_income = reservationData.net_income || (guest_paid - platform_commission);
  
  const newReservation: Reservation = {
    ...reservationData,
    guest_paid,
    platform_commission,
    net_income,
    currency: reservationData.currency || 'EUR',
    id: Date.now().toString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  reservations.push(newReservation);
  writeStorageData(STORAGE_KEYS.RESERVATIONS, reservations);
  return newReservation;
}

// Función para calcular comisiones
function calculateCommission(amount: number, channel: 'airbnb' | 'booking' | 'manual'): number {
  switch (channel) {
    case 'booking':
      return Math.round(amount * 0.15 * 100) / 100; // 15% comisión Booking
    case 'airbnb':
      return Math.round(amount * 0.14 * 100) / 100; // 14% comisión Airbnb
    case 'manual':
      return 0; // Sin comisión para reservas manuales
    default:
      return 0;
  }
}

// Funciones para huéspedes
export function getGuests(): Guest[] {
  return readStorageData(STORAGE_KEYS.GUESTS, []);
}

export function createGuest(guestData: Omit<Guest, 'id' | 'created_at'>): Guest {
  const guests = getGuests();
  const newGuest: Guest = {
    ...guestData,
    id: Date.now().toString(),
    created_at: new Date().toISOString(),
  };
  guests.push(newGuest);
  writeStorageData(STORAGE_KEYS.GUESTS, guests);
  return newGuest;
}

// Funciones para mensajes
export function getMessages(): Message[] {
  return readStorageData(STORAGE_KEYS.MESSAGES, initialMessages);
}

export function createMessage(messageData: Omit<Message, 'id' | 'created_at'>): Message {
  const messages = getMessages();
  const newMessage: Message = {
    ...messageData,
    id: Date.now().toString(),
    created_at: new Date().toISOString(),
  };
  messages.push(newMessage);
  writeStorageData(STORAGE_KEYS.MESSAGES, messages);
  return newMessage;
}

export function updateMessage(id: string, messageData: Partial<Message>): Message | null {
  const messages = getMessages();
  const index = messages.findIndex(message => message.id === id);
  if (index === -1) return null;
  
  messages[index] = { ...messages[index], ...messageData };
  writeStorageData(STORAGE_KEYS.MESSAGES, messages);
  return messages[index];
}

export function deleteMessage(id: string): boolean {
  const messages = getMessages();
  const filteredMessages = messages.filter(message => message.id !== id);
  if (filteredMessages.length === messages.length) return false;
  
  writeStorageData(STORAGE_KEYS.MESSAGES, filteredMessages);
  return true;
}

// Funciones para registros de huéspedes
export function getGuestRegistrations(): GuestRegistration[] {
  return readStorageData(STORAGE_KEYS.GUEST_REGISTRATIONS, []);
}

export function createGuestRegistration(registrationData: Omit<GuestRegistration, 'id' | 'created_at' | 'updated_at'>): GuestRegistration {
  const registrations = getGuestRegistrations();
  const newRegistration: GuestRegistration = {
    ...registrationData,
    id: Date.now().toString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  registrations.push(newRegistration);
  writeStorageData(STORAGE_KEYS.GUEST_REGISTRATIONS, registrations);
  return newRegistration;
}

// Función para hacer backup de todos los datos
export function createBackup(): string {
  const backup = {
    rooms: getRooms(),
    reservations: getReservations(),
    guests: getGuests(),
    messages: getMessages(),
    guest_registrations: getGuestRegistrations(),
    created_at: new Date().toISOString(),
  };
  
  const backupKey = `delfin_backup_${Date.now()}`;
  writeStorageData(backupKey, [backup]);
  return backupKey;
}

// Función para restaurar desde backup
export function restoreFromBackup(backupKey: string): boolean {
  try {
    const backup = readStorageData(backupKey, [])[0] as any;
    if (!backup) return false;
    
    writeStorageData(STORAGE_KEYS.ROOMS, backup.rooms || []);
    writeStorageData(STORAGE_KEYS.RESERVATIONS, backup.reservations || []);
    writeStorageData(STORAGE_KEYS.GUESTS, backup.guests || []);
    writeStorageData(STORAGE_KEYS.MESSAGES, backup.messages || []);
    writeStorageData(STORAGE_KEYS.GUEST_REGISTRATIONS, backup.guest_registrations || []);
    
    return true;
  } catch (error) {
    console.error('Error restoring backup:', error);
    return false;
  }
}

// Función para exportar datos como JSON (para descargar)
export function exportDataAsJson(): string {
  const data = {
    rooms: getRooms(),
    reservations: getReservations(),
    guests: getGuests(),
    messages: getMessages(),
    guest_registrations: getGuestRegistrations(),
    exported_at: new Date().toISOString(),
  };
  
  return JSON.stringify(data, null, 2);
}
