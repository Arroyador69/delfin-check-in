import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';
import {
  ISO_DATE,
  assertTenantOwnsProperty,
  getMicrositePricesForRange,
  setMicrositePriceRange,
  setMicrositeSingleDayPrice,
  setMicrositeWeekdayWeekendPrices,
} from '@/lib/microsite-property-pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PostAction = 'range' | 'weekday_weekend' | 'single_day';

async function resolveTenantId(req: NextRequest): Promise<string | null> {
  let tenantId = await getTenantId(req);
  if (!tenantId || tenantId.trim() === '') {
    tenantId = req.headers.get('x-tenant-id') || '';
  }
  if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
    return null;
  }
  return tenantId;
}

function validateRange(from: string, to: string): string | null {
  if (!ISO_DATE.test(from) || !ISO_DATE.test(to) || from > to) {
    return 'Rango de fechas inválido';
  }
  return null;
}

/**
 * GET — precios del microsite por día en un rango.
 * ?property_id=&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No se pudo identificar el tenant' }, { status: 401 });
    }

    const propertyId = Number(req.nextUrl.searchParams.get('property_id'));
    const from = String(req.nextUrl.searchParams.get('from') || '').trim();
    const to = String(req.nextUrl.searchParams.get('to') || '').trim();

    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      return NextResponse.json({ success: false, error: 'property_id inválido' }, { status: 400 });
    }
    const rangeErr = validateRange(from, to);
    if (rangeErr) {
      return NextResponse.json({ success: false, error: rangeErr }, { status: 400 });
    }

    const prop = await assertTenantOwnsProperty(tenantId, propertyId);
    if (!prop) {
      return NextResponse.json({ success: false, error: 'Propiedad no encontrada' }, { status: 404 });
    }

    const basePrice = parseFloat(String(prop.base_price || 0)) || 0;
    const days = await getMicrositePricesForRange(propertyId, from, to, basePrice);
    const overrideCount = days.filter((d) => d.is_override).length;

    return NextResponse.json({
      success: true,
      property_id: propertyId,
      base_price: basePrice,
      from,
      to,
      override_count: overrideCount,
      days,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('❌ [tenant/property-prices] GET:', e);
    return NextResponse.json({ success: false, error: 'Error interno', details: msg }, { status: 500 });
  }
}

/**
 * POST — tarifas microsite: rango, entre semana/finde o día suelto.
 */
export async function POST(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No se pudo identificar el tenant' }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 });
    }

    const propertyId = Number(body.property_id);
    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      return NextResponse.json({ success: false, error: 'property_id inválido' }, { status: 400 });
    }

    const prop = await assertTenantOwnsProperty(tenantId, propertyId);
    if (!prop) {
      return NextResponse.json({ success: false, error: 'Propiedad no encontrada' }, { status: 404 });
    }

    const action = (body.action as PostAction | undefined) || 'range';

    if (action === 'single_day') {
      const date = String(body.date || '').trim();
      if (!ISO_DATE.test(date)) {
        return NextResponse.json({ success: false, error: 'Fecha inválida' }, { status: 400 });
      }
      const priceRaw = body.price;
      const price =
        priceRaw === null || priceRaw === undefined ? null : Number(priceRaw);
      if (price !== null && (!Number.isFinite(price) || price <= 0)) {
        return NextResponse.json({ success: false, error: 'price inválido' }, { status: 400 });
      }
      await setMicrositeSingleDayPrice(propertyId, date, price);
      return NextResponse.json({ success: true, action: 'single_day', date });
    }

    if (action === 'weekday_weekend') {
      const from = String(body.from || '').trim();
      const to = String(body.to || '').trim();
      const weekdayPrice = Number(body.weekday_price);
      const weekendPrice = Number(body.weekend_price);
      const rangeErr = validateRange(from, to);
      if (rangeErr) {
        return NextResponse.json({ success: false, error: rangeErr }, { status: 400 });
      }
      if (
        !Number.isFinite(weekdayPrice) ||
        weekdayPrice <= 0 ||
        !Number.isFinite(weekendPrice) ||
        weekendPrice <= 0
      ) {
        return NextResponse.json({ success: false, error: 'Precios inválidos' }, { status: 400 });
      }
      await setMicrositeWeekdayWeekendPrices(
        propertyId,
        from,
        to,
        weekdayPrice,
        weekendPrice
      );
      return NextResponse.json({ success: true, action: 'weekday_weekend', from, to });
    }

    const from = String(body.from || '').trim();
    const to = String(body.to || '').trim();
    const priceRaw = body.price;
    const price = priceRaw === null || priceRaw === undefined ? null : Number(priceRaw);
    const rangeErr = validateRange(from, to);
    if (rangeErr) {
      return NextResponse.json({ success: false, error: rangeErr }, { status: 400 });
    }
    if (price !== null && (!Number.isFinite(price) || price <= 0)) {
      return NextResponse.json({ success: false, error: 'price inválido' }, { status: 400 });
    }

    await setMicrositePriceRange(propertyId, from, to, price);
    return NextResponse.json({ success: true, action: 'range', from, to });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('property_availability no existe')) {
      return NextResponse.json({ success: false, error: msg }, { status: 503 });
    }
    console.error('❌ [tenant/property-prices] POST:', e);
    return NextResponse.json({ success: false, error: 'Error interno', details: msg }, { status: 500 });
  }
}
