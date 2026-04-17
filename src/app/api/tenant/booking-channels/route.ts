import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';
import {
  normalizeBookingChannels,
  defaultBookingChannelsConfig,
  type BookingChannelsConfig,
} from '@/lib/booking-channels';

async function resolveTenantId(req: NextRequest): Promise<string | null> {
  let tenantId = await getTenantId(req);
  if (!tenantId?.trim()) {
    tenantId = req.headers.get('x-tenant-id');
  }
  if (!tenantId || tenantId === 'default' || !tenantId.trim()) return null;
  return tenantId;
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const result = await sql`
      SELECT config FROM tenants WHERE id = ${tenantId}::uuid
    `;
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        bookingChannels: defaultBookingChannelsConfig(),
      });
    }
    const config = result.rows[0].config || {};
    const raw = (config as Record<string, unknown>).bookingChannels;
    const bookingChannels = raw ? normalizeBookingChannels(raw) : defaultBookingChannelsConfig();
    return NextResponse.json({ success: true, bookingChannels });
  } catch (e) {
    console.error('[tenant/booking-channels] GET', e);
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const incoming = body?.bookingChannels as BookingChannelsConfig | undefined;
    if (!incoming || typeof incoming !== 'object') {
      return NextResponse.json({ success: false, error: 'bookingChannels requerido' }, { status: 400 });
    }

    const bookingChannels = normalizeBookingChannels(incoming);

    const result = await sql`
      SELECT config FROM tenants WHERE id = ${tenantId}::uuid
    `;
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tenant no encontrado' }, { status: 404 });
    }

    const prev = result.rows[0].config || {};
    const updatedConfig = {
      ...prev,
      bookingChannels,
    };

    await sql`
      UPDATE tenants SET config = ${JSON.stringify(updatedConfig)}::jsonb, updated_at = NOW()
      WHERE id = ${tenantId}::uuid
    `;

    return NextResponse.json({ success: true, bookingChannels });
  } catch (e) {
    console.error('[tenant/booking-channels] PUT', e);
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
