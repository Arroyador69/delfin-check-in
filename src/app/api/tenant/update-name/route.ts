import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * API para actualizar el nombre del tenant
 * Permite cambiar el nombre una vez cada 14 días
 */
export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No se pudo identificar el tenant' },
        { status: 400 }
      );
    }

    const { newName } = await req.json();

    if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
      return NextResponse.json(
        { error: 'El nombre no puede estar vacío' },
        { status: 400 }
      );
    }

    // Verificar si existe un historial de cambios de nombre
    try {
      await sql`SELECT 1 FROM tenant_name_history LIMIT 1`;
    } catch (error) {
      // Crear tabla de historial si no existe
      await sql`
        CREATE TABLE IF NOT EXISTS tenant_name_history (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          tenant_id UUID NOT NULL,
          old_name VARCHAR(255) NOT NULL,
          new_name VARCHAR(255) NOT NULL,
          changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );
      `;
    }

    // Verificar el último cambio de nombre
    const lastChange = await sql`
      SELECT changed_at 
      FROM tenant_name_history 
      WHERE tenant_id = ${tenantId} 
      ORDER BY changed_at DESC 
      LIMIT 1
    `;

    if (lastChange.rows.length > 0) {
      const lastChangeDate = new Date(lastChange.rows[0].changed_at);
      const daysSinceLastChange = (Date.now() - lastChangeDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastChange < 14) {
        const daysRemaining = Math.ceil(14 - daysSinceLastChange);
        return NextResponse.json(
          { 
            error: `Debes esperar ${daysRemaining} día(s) más para cambiar el nombre nuevamente`,
            daysRemaining 
          },
          { status: 429 }
        );
      }
    }

    // Obtener el nombre actual del tenant
    const currentTenant = await sql`
      SELECT name FROM tenants WHERE id = ${tenantId}
    `;

    if (currentTenant.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    const currentName = currentTenant.rows[0].name;

    // Si el nombre nuevo es igual al actual, no hacer nada
    if (currentName === newName.trim()) {
      return NextResponse.json(
        { message: 'El nombre es el mismo que el actual' },
        { status: 200 }
      );
    }

    // Actualizar el nombre en la tabla tenants
    await sql`
      UPDATE tenants 
      SET name = ${newName.trim()}, updated_at = NOW()
      WHERE id = ${tenantId}
    `;

    // Registrar el cambio en el historial
    await sql`
      INSERT INTO tenant_name_history (tenant_id, old_name, new_name)
      VALUES (${tenantId}, ${currentName}, ${newName.trim()})
    `;

    console.log(`✅ Nombre del tenant ${tenantId} actualizado de "${currentName}" a "${newName.trim()}"`);

    return NextResponse.json({
      success: true,
      message: 'Nombre actualizado correctamente',
      newName: newName.trim()
    });

  } catch (error: any) {
    console.error('Error al actualizar el nombre del tenant:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el nombre del tenant' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint para obtener la información del último cambio
 */
export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No se pudo identificar el tenant' },
        { status: 400 }
      );
    }

    // Verificar si existe la tabla
    try {
      await sql`SELECT 1 FROM tenant_name_history LIMIT 1`;
    } catch (error) {
      return NextResponse.json({
        lastChange: null,
        canChange: true
      });
    }

    const lastChange = await sql`
      SELECT * FROM tenant_name_history 
      WHERE tenant_id = ${tenantId} 
      ORDER BY changed_at DESC 
      LIMIT 1
    `;

    if (lastChange.rows.length === 0) {
      return NextResponse.json({
        lastChange: null,
        canChange: true
      });
    }

    const lastChangeDate = new Date(lastChange.rows[0].changed_at);
    const daysSinceLastChange = (Date.now() - lastChangeDate.getTime()) / (1000 * 60 * 60 * 24);
    const canChange = daysSinceLastChange >= 14;
    const daysRemaining = canChange ? 0 : Math.ceil(14 - daysSinceLastChange);

    return NextResponse.json({
      lastChange: lastChange.rows[0],
      canChange,
      daysRemaining
    });

  } catch (error) {
    console.error('Error al obtener información del cambio:', error);
    return NextResponse.json(
      { error: 'Error al obtener la información' },
      { status: 500 }
    );
  }
}
