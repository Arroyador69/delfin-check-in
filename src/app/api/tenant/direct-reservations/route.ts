// =====================================================
// API ENDPOINT: OBTENER RESERVAS DIRECTAS DEL TENANT
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { DirectReservation } from '@/lib/direct-reservations-types';
import { getTenantId } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    // Obtener tenant_id del header (inyectado por middleware) o del token
    let tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      tenantId = await getTenantId(req);
    }
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }
    
    console.log('📊 Obteniendo reservas directas para tenant:', tenantId);
    
    const result = await sql`
      SELECT 
        dr.*, tp.property_name
      FROM direct_reservations dr
      LEFT JOIN tenant_properties tp ON dr.property_id = tp.id
      WHERE dr.tenant_id = ${tenantId}
      ORDER BY dr.created_at DESC
    `;
    
    const reservations: DirectReservation[] = result.rows.map(row => ({
      id: row.id,
      tenant_id: row.tenant_id,
      property_id: row.property_id,
      reservation_code: row.reservation_code,
      guest_name: row.guest_name,
      guest_email: row.guest_email,
      guest_phone: row.guest_phone,
      guest_document_type: row.guest_document_type,
      guest_document_number: row.guest_document_number,
      guest_nationality: row.guest_nationality,
      check_in_date: row.check_in_date,
      check_out_date: row.check_out_date,
      nights: row.nights,
      guests: row.guests,
      base_price: parseFloat(row.base_price),
      cleaning_fee: parseFloat(row.cleaning_fee || '0'),
      security_deposit: parseFloat(row.security_deposit || '0'),
      subtotal: parseFloat(row.subtotal),
      delfin_commission_rate: parseFloat(row.delfin_commission_rate),
      delfin_commission_amount: parseFloat(row.delfin_commission_amount),
      stripe_fee_amount: parseFloat(row.stripe_fee_amount || '0'),
      property_owner_amount: parseFloat(row.property_owner_amount),
      total_amount: parseFloat(row.total_amount),
      stripe_payment_intent_id: row.stripe_payment_intent_id,
      stripe_charge_id: row.stripe_charge_id,
      payment_status: row.payment_status,
      payment_method: row.payment_method,
      reservation_status: row.reservation_status,
      special_requests: row.special_requests,
      internal_notes: row.internal_notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      confirmed_at: row.confirmed_at,
      cancelled_at: row.cancelled_at
    }));
    
    console.log(`✅ Encontradas ${reservations.length} reservas`);
    
    return NextResponse.json({
      success: true,
      reservations,
      total: reservations.length
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo reservas directas:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
