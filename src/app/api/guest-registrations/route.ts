import { NextRequest, NextResponse } from 'next/server';
import { getGuestRegistrations, deleteGuestRegistrationById, deleteGuestRegistrationsByIds } from '@/lib/db';
import { sql } from '@/lib/db';

// Configuración para evitar caché
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    // Validar acceso al módulo legal
    const { validateLegalModuleAccess } = await import('@/lib/permissions');
    const legalValidation = await validateLegalModuleAccess(req);
    
    if (!legalValidation.success) {
      return NextResponse.json(
        { 
          ok: false, 
          error: legalValidation.error,
          code: 'LEGAL_MODULE_REQUIRED',
          suggestion: 'El módulo de registro de viajeros requiere un plan FREE+LEGAL o PRO. Actualiza tu plan para acceder.'
        },
        { status: legalValidation.status || 403 }
      );
    }
    
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "200"), 500);
    
    console.log('📊 Obteniendo registros de viajeros desde base de datos...');
    console.log('🔢 Límite:', limit);
    
    // Verificar si la tabla existe, si no, crearla
    try {
      await sql`SELECT 1 FROM guest_registrations LIMIT 1`;
    } catch (error) {
      console.log('🔧 Tabla guest_registrations no existe, creándola...');
      await sql`
        CREATE TABLE IF NOT EXISTS guest_registrations (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          reserva_ref VARCHAR(50),
          fecha_entrada DATE NOT NULL,
          fecha_salida DATE NOT NULL,
          data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      // Crear índices
      await sql`
        CREATE INDEX IF NOT EXISTS idx_guest_registrations_fecha_entrada 
        ON guest_registrations(fecha_entrada);
      `;
      
      await sql`
        CREATE INDEX IF NOT EXISTS idx_guest_registrations_fecha_salida 
        ON guest_registrations(fecha_salida);
      `;
      
      await sql`
        CREATE INDEX IF NOT EXISTS idx_guest_registrations_created_at 
        ON guest_registrations(created_at);
      `;
      
      console.log('✅ Tabla guest_registrations creada correctamente');
    }
    
    // Obtener tenant_id del request
    const { getTenantFromRequest } = await import('@/lib/permissions');
    const tenantData = await getTenantFromRequest(req);
    const tenantId = tenantData?.tenantId || null;
    
    console.log('🏢 Tenant ID para filtrar registros:', tenantId);
    
    // Obtener registros desde la base de datos filtrados por tenant_id
    const registros = await getGuestRegistrations(limit, tenantId);
    
    console.log(`✅ Se encontraron ${registros.length} registros para tenant ${tenantId}`);
    
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

// Eliminar registros (individual o múltiple)
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const ids = url.searchParams.get('ids');
    
    console.log('🗑️ Eliminando registros de viajeros...');
    
    if (id) {
      // Eliminar registro individual
      console.log('🔍 Eliminando registro individual:', id);
      const deleted = await deleteGuestRegistrationById(id);
      
      if (!deleted) {
        return new NextResponse(JSON.stringify({
          ok: false,
          error: 'Registro no encontrado'
        }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      console.log('✅ Registro eliminado correctamente:', id);
      return new NextResponse(JSON.stringify({
        ok: true,
        message: 'Registro eliminado correctamente',
        deletedId: id
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      
    } else if (ids) {
      // Eliminar múltiples registros
      const idsArray = ids.split(',').filter(Boolean);
      console.log('🔍 Eliminando múltiples registros:', idsArray);
      
      if (idsArray.length === 0) {
        return new NextResponse(JSON.stringify({
          ok: false,
          error: 'No se proporcionaron IDs válidos'
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const deletedCount = await deleteGuestRegistrationsByIds(idsArray);
      
      console.log(`✅ ${deletedCount} registros eliminados correctamente`);
      return new NextResponse(JSON.stringify({
        ok: true,
        message: `${deletedCount} registros eliminados correctamente`,
        deletedCount: deletedCount,
        requestedCount: idsArray.length
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      
    } else {
      return new NextResponse(JSON.stringify({
        ok: false,
        error: 'Se requiere el parámetro "id" para eliminación individual o "ids" para eliminación múltiple'
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
  } catch (error) {
    console.error('❌ Error al eliminar registros:', error);
    return new NextResponse(JSON.stringify({
      ok: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Actualizar datos (solo campo data o subcampos típicos)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, data } = body || {};
    
    console.log('🔄 Actualizando registro de viajero...');
    console.log('📋 ID:', id);
    console.log('📊 Datos recibidos:', JSON.stringify(data, null, 2));
    
    if (!id || !data) {
      console.log('❌ Faltan parámetros requeridos');
      return NextResponse.json({ ok: false, error: 'Faltan id o data' }, { status: 400 });
    }

    // Verificar que el registro existe antes de actualizar
    const existing = await sql`
      SELECT id, data, updated_at
      FROM guest_registrations
      WHERE id = ${id}
    `;

    if (existing.rows.length === 0) {
      console.log('❌ Registro no encontrado:', id);
      return NextResponse.json({ ok: false, error: 'Registro no encontrado' }, { status: 404 });
    }

    console.log('✅ Registro encontrado, procediendo con la actualización...');

    // Asegurar tabla
    await sql`CREATE TABLE IF NOT EXISTS guest_registrations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      reserva_ref VARCHAR(50),
      fecha_entrada DATE NOT NULL,
      fecha_salida DATE NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`;

    const updated = await sql`
      UPDATE guest_registrations
      SET data = ${JSON.stringify(data)}::jsonb,
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, reserva_ref, fecha_entrada, fecha_salida, data, created_at, updated_at;
    `;

    if (updated.rows.length === 0) {
      console.log('❌ Error al actualizar registro');
      return NextResponse.json({ ok: false, error: 'Error al actualizar registro' }, { status: 500 });
    }

    console.log('✅ Registro actualizado exitosamente');
    console.log('📊 Datos actualizados:', JSON.stringify(updated.rows[0], null, 2));

    return NextResponse.json({ 
      ok: true, 
      item: updated.rows[0],
      message: 'Registro actualizado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error al actualizar registro:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      ok: false, 
      error: message,
      details: 'Error interno del servidor'
    }, { status: 500 });
  }
}