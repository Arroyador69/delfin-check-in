import { NextRequest, NextResponse } from 'next/server';
import { getGuestRegistrations } from '@/lib/db';

// Configuración para evitar caché
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "200"), 500);
    
    console.log('📊 Obteniendo registros de viajeros desde base de datos...');
    console.log('🔢 Límite:', limit);
    
    // Obtener registros desde la base de datos
    const registros = await getGuestRegistrations(limit);
    
    console.log(`✅ Se encontraron ${registros.length} registros`);
    
    // Formatear datos para el dashboard
    const items = registros.map(registro => ({
      id: registro.id,
      reserva_ref: registro.reserva_ref,
      fecha_entrada: registro.fecha_entrada,
      fecha_salida: registro.fecha_salida,
      created_at: registro.created_at,
      updated_at: registro.updated_at,
      // Extraer datos del viajero para mostrar en la tabla
      viajero: {
        nombre: registro.data?.comunicaciones?.[0]?.personas?.[0]?.nombre || 'N/A',
        apellido1: registro.data?.comunicaciones?.[0]?.personas?.[0]?.apellido1 || 'N/A',
        apellido2: registro.data?.comunicaciones?.[0]?.personas?.[0]?.apellido2 || '',
        nacionalidad: registro.data?.comunicaciones?.[0]?.personas?.[0]?.nacionalidad || 'N/A',
        tipoDocumento: registro.data?.comunicaciones?.[0]?.personas?.[0]?.tipoDocumento || 'N/A',
        numeroDocumento: registro.data?.comunicaciones?.[0]?.personas?.[0]?.numeroDocumento || 'N/A',
      },
      // Datos del contrato
      contrato: {
        codigoEstablecimiento: registro.data?.codigoEstablecimiento || 'N/A',
        referencia: registro.data?.comunicaciones?.[0]?.contrato?.referencia || 'N/A',
        numHabitaciones: registro.data?.comunicaciones?.[0]?.contrato?.numHabitaciones || 1,
        internet: registro.data?.comunicaciones?.[0]?.contrato?.internet || false,
        tipoPago: registro.data?.comunicaciones?.[0]?.contrato?.pago?.tipoPago || 'N/A',
      },
      // Datos completos para XML
      data: registro.data
    }));
    
    return new NextResponse(JSON.stringify({ 
      ok: true, 
      items: items,
      total: items.length,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
    
  } catch (error) {
    console.error('❌ Error al obtener registros:', error);
    
    return NextResponse.json({ 
      ok: false, 
      error: 'Error al obtener registros',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { 
      status: 500 
    });
  }
}