// Mock implementation for Vercel KV to avoid deployment errors
// import { kv } from '@vercel/kv';

export interface ComunicacionPayload {
  codigoEstablecimiento: string;
  contrato: {
    referencia: string;
    fechaContrato: string;
    fechaEntrada: string;
    fechaSalida: string;
    numPersonas: number;
    numHabitaciones?: number;
    internet?: boolean;
    pago: {
      tipoPago: string;
      fechaPago?: string;
      medioPago?: string;
      titular?: string;
      caducidadTarjeta?: string;
    };
  };
  personas: any[];
}

const keyForDate = (date: string) => `comunicaciones:${date}`; // YYYY-MM-DD

// Mock storage using localStorage for development
const mockStorage = new Map<string, string[]>();

export async function saveComunicacion(data: any): Promise<void> {
  const dateISO = new Date().toISOString().split('T')[0];
  const key = keyForDate(dateISO);
  const existing = mockStorage.get(key) || [];
  existing.push(JSON.stringify(data));
  mockStorage.set(key, existing);
  
  // Also save to localStorage for persistence
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(existing));
  }
  
  console.log(`[MOCK KV] Saved communication for ${dateISO}:`, data);
}

export async function getComunicaciones(dateISO?: string): Promise<any[]> {
  if (dateISO) {
    const key = keyForDate(dateISO);
    
    // Try to get from localStorage first
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        mockStorage.set(key, parsed);
        return parsed.map((s: string) => JSON.parse(s));
      }
    }
    
    // Fallback to mock storage
    const items = mockStorage.get(key) || [];
    return items.map((s) => JSON.parse(s));
  } else {
    // Get all communications from all dates
    const allComunicaciones: any[] = [];
    
    // Get from mock storage
    for (const [key, items] of mockStorage.entries()) {
      const comunicaciones = items.map((s) => JSON.parse(s));
      allComunicaciones.push(...comunicaciones);
    }
    
    // Also check localStorage for any additional data
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('comunicaciones:')) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            const comunicaciones = parsed.map((s: string) => JSON.parse(s));
            allComunicaciones.push(...comunicaciones);
          }
        }
      }
    }
    
    return allComunicaciones;
  }
}


