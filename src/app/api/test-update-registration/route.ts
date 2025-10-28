import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * 🧪 API PARA PROBAR ACTUALIZACIÓN DE REGISTROS
 * 
 * Este endpoint permite probar la actualización de registros
 * para verificar que la conexión con la base de datos funciona.
 */

export async function POST(req: NextRequest) {
  try {
    const { id, testField } = await req.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID requerido' },
        { status: 400 }
      );
    }

    console.log('🧪 Probando actualización de registro:', id);

    // Verificar que el registro existe
    const existing = await sql`
      SELECT id, data, updated_at
      FROM guest_registrations
      WHERE id = ${id}
    `;

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: 'Registro no encontrado' },
        { status: 404 }
      );
    }

    const currentData = existing.rows[0].data;
    console.log('📊 Datos actuales:', JSON.stringify(currentData, null, 2));

    // Crear datos de prueba (agregar un campo de prueba)
    const testData = {
      ...currentData,
      testUpdate: {
        timestamp: new Date().toISOString(),
        testField: testField || 'test_value',
        message: 'Actualización de prueba exitosa'
      }
    };

    // Actualizar el registro
    const updated = await sql`
      UPDATE guest_registrations
      SET data = ${JSON.stringify(testData)}::jsonb,
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, data, updated_at;
    `;

    if (updated.rows.length === 0) {
      return NextResponse.json(
        { error: 'Error al actualizar registro' },
        { status: 500 }
      );
    }

    console.log('✅ Registro actualizado exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Registro actualizado exitosamente',
      data: {
        id: updated.rows[0].id,
        updated_at: updated.rows[0].updated_at,
        testData: updated.rows[0].data.testUpdate
      }
    });

  } catch (error) {
    console.error('❌ Error en test-update-registration:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
