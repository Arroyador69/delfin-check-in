import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Configuración para evitar caché
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = request.headers.get('x-tenant-id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de reserva requerido' },
        { status: 400 }
      );
    }
    if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
      return NextResponse.json(
        { error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }

    console.log(`🗑️ Eliminando reserva con ID: ${id}`);

    // Verificar que la reserva existe
    const existingReservation = await sql`
      SELECT id, guest_name, room_id, check_in, check_out
      FROM reservations
      WHERE id = ${id} AND tenant_id = ${tenantId}::uuid
    `;

    if (existingReservation.rows.length === 0) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }

    const reservation = existingReservation.rows[0];

    // Eliminar la reserva
    const result = await sql`
      DELETE FROM reservations
      WHERE id = ${id} AND tenant_id = ${tenantId}::uuid
      RETURNING id, guest_name, room_id, check_in, check_out;
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No se pudo eliminar la reserva' },
        { status: 500 }
      );
    }

    console.log(`✅ Reserva eliminada exitosamente: ${id}`);
    console.log(`📋 Detalles de la reserva eliminada:`, {
      huésped: reservation.guest_name,
      habitación: reservation.room_id,
      llegada: reservation.check_in,
      salida: reservation.check_out
    });

    return NextResponse.json({
      success: true,
      message: 'Reserva eliminada exitosamente',
      deletedReservation: result.rows[0]
    });

  } catch (error: any) {
    console.error('Error deleting reservation:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la reserva', details: error.message },
      { status: 500 }
    );
  }
}
