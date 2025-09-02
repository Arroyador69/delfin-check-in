import { NextRequest, NextResponse } from 'next/server';
import { getComunicaciones } from '@/lib/kv';
import { createGuestRegistration } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    
    let registrations = [];
    
    if (date) {
      // Si se especifica una fecha, obtener solo esa fecha
      const comunicaciones = await getComunicaciones(date);
      registrations = comunicaciones.map((com, index) => ({
        id: `${date}-${index}`,
        date: date,
        data: com
      }));
    } else {
      // Si no se especifica fecha, obtener todos los registros de los últimos 30 días
      const today = new Date();
      const allRegistrations = [];
      
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateString = checkDate.toISOString().slice(0, 10);
        
        try {
          const comunicaciones = await getComunicaciones(dateString);
          if (comunicaciones.length > 0) {
            const dayRegistrations = comunicaciones.map((com, index) => ({
              id: `${dateString}-${index}`,
              date: dateString,
              data: com
            }));
            allRegistrations.push(...dayRegistrations);
          }
        } catch (error) {
          // Continuar con la siguiente fecha si hay error
          console.log(`Error obteniendo registros para ${dateString}:`, error);
        }
      }
      
      registrations = allRegistrations;
    }
    
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validar datos requeridos
    if (!body.name || !body.arrival_date || !body.departure_date) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: nombre, fecha de llegada, fecha de salida' },
        { status: 400 }
      );
    }

    // Crear el registro de huésped
    const guestRegistration = createGuestRegistration(body);
    
    return NextResponse.json(guestRegistration, { status: 201 });
  } catch (error) {
    console.error('Error creando registro de huésped:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
