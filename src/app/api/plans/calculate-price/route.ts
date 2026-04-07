/**
 * ========================================
 * API: Calcular Precio de Plan
 * ========================================
 * Calcula precio de un plan con IVA según número de habitaciones
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculatePlanPriceWithInterval } from '@/lib/plan-pricing';
import { getTenantFromRequest } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('planId') as 'free' | 'checkin' | 'standard' | 'pro' | null;
    const roomCountParam = searchParams.get('roomCount');
    const intervalParam = (searchParams.get('interval') || 'month').toLowerCase();
    const interval = intervalParam === 'year' || intervalParam === 'annual' || intervalParam === 'yearly'
      ? 'year'
      : 'month';

    if (!planId || !['free', 'checkin', 'standard', 'pro'].includes(planId)) {
      return NextResponse.json(
        { success: false, error: 'Plan inválido' },
        { status: 400 }
      );
    }

    const roomCount = parseInt(roomCountParam || '2', 10);
    if (isNaN(roomCount) || roomCount < 1) {
      return NextResponse.json(
        { success: false, error: 'Número de habitaciones inválido' },
        { status: 400 }
      );
    }

    // Obtener tenant para saber el país (para IVA)
    const tenantData = await getTenantFromRequest(req);
    const countryCode = tenantData?.tenant?.country_code || 'ES';

    // Calcular precio
    const pricing = await calculatePlanPriceWithInterval(planId, roomCount, interval, countryCode);

    const vat = pricing.vat;
    const vatNormalized = {
      ...vat,
      vat_rate: vat.vatRate,
      vat_amount: vat.vatAmount,
    };

    return NextResponse.json({
      success: true,
      pricing: {
        base_price: pricing.basePrice,
        extra_rooms: pricing.extraRooms || 0,
        extra_rooms_price: pricing.extraRoomsPrice || 0,
        subtotal: pricing.subtotal,
        vat: vatNormalized,
        vat_rate: vat.vatRate,
        vat_amount: vat.vatAmount,
        total: pricing.total,
        interval,
        yearly_discount_rate: pricing.yearlyDiscountRate ?? null,
        currency: 'EUR'
      }
    });

  } catch (error: any) {
    console.error('❌ Error calculando precio:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}

