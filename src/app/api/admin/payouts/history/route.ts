// =====================================================
// API: HISTORIAL DE PAGOS PARA PROPIETARIO
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    const result = startDate && endDate
      ? await sql`
          SELECT 
            dr.reservation_code,
            dr.check_in_date,
            dr.check_out_date,
            dr.total_amount,
            dr.stripe_fee_amount,
            dr.delfin_commission_amount,
            dr.property_owner_amount,
            ct.status,
            ct.stripe_transfer_id,
            ct.processed_at
          FROM direct_reservations dr
          LEFT JOIN commission_transactions ct ON dr.id = ct.reservation_id
          WHERE dr.tenant_id = ${tenantId}
            AND dr.reservation_status IN ('confirmed', 'completed')
            AND dr.payment_status = 'paid'
            AND dr.check_in_date >= ${startDate}
            AND dr.check_in_date <= ${endDate}
        `
      : startDate
        ? await sql`
            SELECT 
              dr.reservation_code,
              dr.check_in_date,
              dr.check_out_date,
              dr.total_amount,
              dr.stripe_fee_amount,
              dr.delfin_commission_amount,
              dr.property_owner_amount,
              ct.status,
              ct.stripe_transfer_id,
              ct.processed_at
            FROM direct_reservations dr
            LEFT JOIN commission_transactions ct ON dr.id = ct.reservation_id
            WHERE dr.tenant_id = ${tenantId}
              AND dr.reservation_status IN ('confirmed', 'completed')
              AND dr.payment_status = 'paid'
              AND dr.check_in_date >= ${startDate}
          `
        : endDate
          ? await sql`
              SELECT 
                dr.reservation_code,
                dr.check_in_date,
                dr.check_out_date,
                dr.total_amount,
                dr.stripe_fee_amount,
                dr.delfin_commission_amount,
                dr.property_owner_amount,
                ct.status,
                ct.stripe_transfer_id,
                ct.processed_at
              FROM direct_reservations dr
              LEFT JOIN commission_transactions ct ON dr.id = ct.reservation_id
              WHERE dr.tenant_id = ${tenantId}
                AND dr.reservation_status IN ('confirmed', 'completed')
                AND dr.payment_status = 'paid'
                AND dr.check_in_date <= ${endDate}
            `
          : await sql`
              SELECT 
                dr.reservation_code,
                dr.check_in_date,
                dr.check_out_date,
                dr.total_amount,
                dr.stripe_fee_amount,
                dr.delfin_commission_amount,
                dr.property_owner_amount,
                ct.status,
                ct.stripe_transfer_id,
                ct.processed_at
              FROM direct_reservations dr
              LEFT JOIN commission_transactions ct ON dr.id = ct.reservation_id
              WHERE dr.tenant_id = ${tenantId}
                AND dr.reservation_status IN ('confirmed', 'completed')
                AND dr.payment_status = 'paid'
            `;

    const payments = result.rows.map(row => ({
      reservation_code: row.reservation_code,
      check_in_date: row.check_in_date,
      check_out_date: row.check_out_date,
      total_amount: parseFloat(row.total_amount),
      stripe_fee_amount: parseFloat(row.stripe_fee_amount || 0),
      delfin_commission_amount: parseFloat(row.delfin_commission_amount),
      property_owner_amount: parseFloat(row.property_owner_amount),
      status: row.status || 'pending',
      transfer_id: row.stripe_transfer_id,
      processed_at: row.processed_at
    }));

    return NextResponse.json({
      success: true,
      payments: payments.sort((a, b) => 
        new Date(b.check_in_date).getTime() - new Date(a.check_in_date).getTime()
      ),
      total: payments.length
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo historial de pagos:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo historial' },
      { status: 500 }
    );
  }
}

