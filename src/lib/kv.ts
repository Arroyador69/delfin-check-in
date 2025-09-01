import { kv } from '@vercel/kv';

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

export async function saveComunicacion(dateISO: string, data: ComunicacionPayload): Promise<void> {
  const key = keyForDate(dateISO);
  await kv.rpush(key, JSON.stringify(data));
  // caducidad 30 días
  await kv.expire(key, 60 * 60 * 24 * 30);
}

export async function getComunicaciones(dateISO: string): Promise<ComunicacionPayload[]> {
  const key = keyForDate(dateISO);
  const items = await kv.lrange<string>(key, 0, -1);
  return items.map((s) => JSON.parse(s));
}


