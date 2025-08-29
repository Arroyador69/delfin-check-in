import { getRooms, createReservation } from './storage';
import { parseExternalICal, createReservationFromICalEvent } from './ical-generator';

// Función para sincronizar todos los iCal de Booking.com
export async function syncAllBookingICals(): Promise<void> {
  console.log('🔄 Iniciando sincronización de iCal de Booking.com...');
  
  const rooms = getRooms();
  const roomsWithBooking = rooms.filter(room => room.ical_in_booking_url);
  
  console.log(`📅 Encontradas ${roomsWithBooking.length} habitaciones con iCal de Booking`);
  
  for (const room of roomsWithBooking) {
    try {
      await syncBookingICalForRoom(room.id, room.ical_in_booking_url!);
      console.log(`✅ Habitación ${room.name} sincronizada`);
    } catch (error) {
      console.error(`❌ Error sincronizando habitación ${room.name}:`, error);
    }
  }
  
  console.log('🎉 Sincronización completada');
}

// Función para sincronizar iCal de una habitación específica
async function syncBookingICalForRoom(roomId: string, icalUrl: string): Promise<void> {
  try {
    console.log(`📥 Descargando iCal de Booking para habitación ${roomId}...`);
    
    // Descargar el iCal de Booking.com
    const response = await fetch(icalUrl);
    if (!response.ok) {
      throw new Error(`Error descargando iCal: ${response.status}`);
    }
    
    const icalContent = await response.text();
    console.log(`📄 iCal descargado (${icalContent.length} caracteres)`);
    
    // Parsear eventos del iCal
    const events = parseExternalICal(icalContent);
    console.log(`📅 Encontrados ${events.length} eventos en el iCal`);
    
    // Crear reservas para cada evento
    for (const event of events) {
      try {
        createReservationFromICalEvent(event, roomId, 'booking');
        console.log(`✅ Reserva creada: ${event.summary} (${event.start.toLocaleDateString()} - ${event.end.toLocaleDateString()})`);
      } catch (error) {
        console.error(`❌ Error creando reserva:`, error);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error sincronizando iCal para habitación ${roomId}:`, error);
    throw error;
  }
}

// Función para sincronizar iCal de Airbnb (cuando esté online)
export async function syncAllAirbnbICals(): Promise<void> {
  console.log('🔄 Iniciando sincronización de iCal de Airbnb...');
  
  const rooms = getRooms();
  const roomsWithAirbnb = rooms.filter(room => room.ical_in_airbnb_url);
  
  console.log(`📅 Encontradas ${roomsWithAirbnb.length} habitaciones con iCal de Airbnb`);
  
  for (const room of roomsWithAirbnb) {
    try {
      await syncAirbnbICalForRoom(room.id, room.ical_in_airbnb_url!);
      console.log(`✅ Habitación ${room.name} sincronizada`);
    } catch (error) {
      console.error(`❌ Error sincronizando habitación ${room.name}:`, error);
    }
  }
  
  console.log('🎉 Sincronización de Airbnb completada');
}

// Función para sincronizar iCal de Airbnb de una habitación específica
async function syncAirbnbICalForRoom(roomId: string, icalUrl: string): Promise<void> {
  try {
    console.log(`📥 Descargando iCal de Airbnb para habitación ${roomId}...`);
    
    // Descargar el iCal de Airbnb
    const response = await fetch(icalUrl);
    if (!response.ok) {
      throw new Error(`Error descargando iCal: ${response.status}`);
    }
    
    const icalContent = await response.text();
    console.log(`📄 iCal descargado (${icalContent.length} caracteres)`);
    
    // Parsear eventos del iCal
    const events = parseExternalICal(icalContent);
    console.log(`📅 Encontrados ${events.length} eventos en el iCal`);
    
    // Crear reservas para cada evento
    for (const event of events) {
      try {
        createReservationFromICalEvent(event, roomId, 'airbnb');
        console.log(`✅ Reserva creada: ${event.summary} (${event.start.toLocaleDateString()} - ${event.end.toLocaleDateString()})`);
      } catch (error) {
        console.error(`❌ Error creando reserva:`, error);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error sincronizando iCal para habitación ${roomId}:`, error);
    throw error;
  }
}

// Función para sincronización manual desde el frontend
export async function manualSync(): Promise<{ success: boolean; message: string; reservationsAdded: number }> {
  try {
    // Obtener habitaciones desde la API para asegurar datos actualizados
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/rooms`);
    const rooms = await response.json();
    
    console.log('🔍 Habitaciones encontradas:', rooms.length);
    console.log('🔍 Habitaciones con iCal de Booking:', rooms.filter((room: any) => room.ical_in_booking_url).length);
    
    const roomsWithBooking = rooms.filter((room: any) => room.ical_in_booking_url);
    
    if (roomsWithBooking.length === 0) {
      return {
        success: false,
        message: `No hay habitaciones configuradas con iCal de Booking.com. Total habitaciones: ${rooms.length}`,
        reservationsAdded: 0
      };
    }
    
    let totalReservations = 0;
    
    for (const room of roomsWithBooking) {
      try {
        await syncBookingICalForRoom(room.id, room.ical_in_booking_url!);
        totalReservations++;
      } catch (error) {
        console.error(`Error sincronizando ${room.name}:`, error);
      }
    }
    
    return {
      success: true,
      message: `Sincronización completada. ${totalReservations} habitaciones procesadas.`,
      reservationsAdded: totalReservations
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Error en sincronización: ${error}`,
      reservationsAdded: 0
    };
  }
}
