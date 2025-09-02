import { NextRequest } from 'next/server';
import { getComunicaciones } from '@/lib/kv';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    
    const comunicaciones = await getComunicaciones(date);
    
    // Transformar los datos para el dashboard
    const registrations = comunicaciones.map((com, index) => ({
      id: `${date}-${index}`,
      date: date,
      data: com
    }));
    
    return new Response(JSON.stringify(registrations), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error obteniendo registros:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
