import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * 🔍 API PARA VERIFICAR ESTRUCTURA DE BASE DE DATOS
 * 
 * Este endpoint ayuda a verificar la estructura de las tablas
 * para asegurar que usamos los nombres de columna correctos.
 */

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Verificando estructura de base de datos...');

    // Verificar estructura de tabla tenants
    const tenantsStructure = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'tenants' 
      ORDER BY ordinal_position;
    `;

    // Verificar estructura de tabla tenant_users
    const usersStructure = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'tenant_users' 
      ORDER BY ordinal_position;
    `;

    // Verificar datos de ejemplo
    const tenantsData = await sql`
      SELECT id, name, email, status, plan_id
      FROM tenants 
      LIMIT 3;
    `;

    const usersData = await sql`
      SELECT id, email, full_name, role, tenant_id, is_active
      FROM tenant_users 
      LIMIT 3;
    `;

    return NextResponse.json({
      success: true,
      message: 'Estructura de base de datos verificada',
      structure: {
        tenants: tenantsStructure.rows,
        tenant_users: usersStructure.rows
      },
      sampleData: {
        tenants: tenantsData.rows,
        tenant_users: usersData.rows
      }
    });

  } catch (error) {
    console.error('❌ Error verificando estructura de BD:', error);
    return NextResponse.json(
      { 
        error: 'Error verificando base de datos', 
        details: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    );
  }
}





