// =====================================================
// API ENDPOINT: ESTADÍSTICAS DE RESERVAS DIRECTAS
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ReservationStats } from '@/lib/direct-reservations-types';

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    
    console.log('📊 Obteniendo estadísticas para tenant:', tenantId);
    
    const result = await sql`
      SELECT 
        COUNT(*) as total_reservations,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(delfin_commission_amount), 0) as total_commission,
        COALESCE(SUM(property_owner_amount), 0) as total_property_owner_amount,
        COALESCE(AVG(total_amount), 0) as average_reservation_value,
        COUNT(CASE WHEN reservation_status = 'confirmed' THEN 1 END) as confirmed_reservations,
        COUNT(CASE WHEN reservation_status = 'cancelled' THEN 1 END) as cancelled_reservations,
        COUNT(CASE WHEN reservation_status = 'pending' THEN 1 END) as pending_reservations
      FROM direct_reservations 
      WHERE tenant_id = ${tenantId}
    `;
    
    const row = result.rows[0];
    
    const stats: ReservationStats = {
      total_reservations: parseInt(row.total_reservations),
      total_revenue: parseFloat(row.total_revenue),
      total_commission: parseFloat(row.total_commission),
      total_property_owner_amount: parseFloat(row.total_property_owner_amount),
      average_reservation_value: parseFloat(row.average_reservation_value),
      confirmed_reservations: parseInt(row.confirmed_reservations),
      cancelled_reservations: parseInt(row.cancelled_reservations),
      pending_reservations: parseInt(row.pending_reservations)
    };
    
    console.log('✅ Estadísticas calculadas:', stats);
    
    return NextResponse.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
