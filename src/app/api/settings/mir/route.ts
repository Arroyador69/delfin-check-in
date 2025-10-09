import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * API para actualizar la configuración MIR del tenant
 */
export async function POST(req: NextRequest) {
  try {
    // Obtener tenant_id del header (enviado por el middleware)
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No se pudo identificar el tenant' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { mir } = body;

    if (!mir) {
      return NextResponse.json(
        { error: 'Configuración MIR requerida' },
        { status: 400 }
      );
    }

    // Validar campos requeridos si MIR está habilitado
    if (mir.enabled) {
      if (!mir.codigoEstablecimiento || !mir.denominacion || !mir.direccionCompleta) {
        return NextResponse.json(
          { error: 'Los campos código de establecimiento, denominación y dirección son requeridos cuando MIR está habilitado' },
          { status: 400 }
        );
      }
    }

    // Obtener configuración actual del tenant
    const tenantResult = await sql`
      SELECT config FROM tenants WHERE id = ${tenantId}
    `;

    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    const currentConfig = tenantResult.rows[0].config || {};

    // Actualizar solo la sección MIR de la configuración
    const updatedConfig = {
      ...currentConfig,
      mir: {
        enabled: Boolean(mir.enabled),
        codigoEstablecimiento: String(mir.codigoEstablecimiento || '').trim(),
        denominacion: String(mir.denominacion || '').trim(),
        direccionCompleta: String(mir.direccionCompleta || '').trim(),
        autoSubmit: Boolean(mir.autoSubmit),
        testMode: Boolean(mir.testMode)
      }
    };

    // Actualizar en la base de datos
    await sql`
      UPDATE tenants
      SET 
        config = ${JSON.stringify(updatedConfig)}::jsonb,
        updated_at = NOW()
      WHERE id = ${tenantId}
    `;

    console.log(`✅ Configuración MIR actualizada para tenant ${tenantId}`);

    return NextResponse.json({
      success: true,
      message: 'Configuración MIR actualizada correctamente',
      mir: updatedConfig.mir
    });

  } catch (error) {
    console.error('Error actualizando configuración MIR:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la configuración MIR' },
      { status: 500 }
    );
  }
}

/**
 * API para obtener la configuración MIR del tenant
 */
export async function GET(req: NextRequest) {
  try {
    // Obtener tenant_id del header (enviado por el middleware)
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No se pudo identificar el tenant' },
        { status: 400 }
      );
    }

    // Obtener configuración del tenant
    const result = await sql`
      SELECT config FROM tenants WHERE id = ${tenantId}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    const config = result.rows[0].config || {};
    const mir = config.mir || {
      enabled: true,
      codigoEstablecimiento: '',
      denominacion: '',
      direccionCompleta: '',
      autoSubmit: false,
      testMode: true
    };

    return NextResponse.json({ mir });

  } catch (error) {
    console.error('Error obteniendo configuración MIR:', error);
    return NextResponse.json(
      { error: 'Error al obtener la configuración MIR' },
      { status: 500 }
    );
  }
}

