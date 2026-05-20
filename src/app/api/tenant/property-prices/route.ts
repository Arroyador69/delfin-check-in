import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTenantId } from '@/lib/tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type UpsertBody = {
  property_id: number;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD (inclusive)
  price: number | null; // null => borrar override
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: NextRequest) {
  try {
    let tenantId = await getTenantId(req);
    if (!tenantId || tenantId.trim() === '') {
      tenantId = req.headers.get('x-tenant-id') || '';
    }
    if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
      return NextResponse.json({ success: false, error: 'No se pudo identificar el tenant' }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as UpsertBody | null;
    if (!body) {
      return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 });
    }
    const propertyId = Number(body.property_id);
    const from = String(body.from || '').trim();
    const to = String(body.to || '').trim();
    const price = body.price === null ? null : Number(body.price);

    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      return NextResponse.json({ success: false, error: 'property_id inválido' }, { status: 400 });
    }
    if (!ISO.test(from) || !ISO.test(to) || from > to) {
      return NextResponse.json({ success: false, error: 'Rango de fechas inválido' }, { status: 400 });
    }
    if (price !== null && (!Number.isFinite(price) || price <= 0)) {
      return NextResponse.json({ success: false, error: 'price inválido' }, { status: 400 });
    }

    const owner = await sql`
      SELECT 1
      FROM tenant_properties tp
      WHERE tp.id = ${propertyId}::int
        AND tp.tenant_id::text = ${tenantId}
      LIMIT 1
    `;
    if (owner.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Propiedad no encontrada' }, { status: 404 });
    }

    try {
      await sql`ALTER TABLE property_availability ADD COLUMN IF NOT EXISTS price DECIMAL(10,2)`;
    } catch (_) {
      // tabla puede no existir aún en instalaciones antiguas
    }

    try {
      await sql`
        INSERT INTO property_availability (property_id, date, available, price, created_at)
        SELECT ${propertyId}::int, d, TRUE, ${price}::decimal(10,2), NOW()
        FROM generate_series(${from}::date, ${to}::date, '1 day'::interval) AS d
        ON CONFLICT (property_id, date) DO UPDATE
        SET
          price = EXCLUDED.price,
          available = COALESCE(property_availability.available, TRUE)
      `;
    } catch (insertErr: unknown) {
      const msg = insertErr instanceof Error ? insertErr.message : String(insertErr);
      if (msg.includes('property_availability') && msg.includes('does not exist')) {
        return NextResponse.json(
          {
            success: false,
            error:
              'La tabla property_availability no existe. Ejecuta database/create-direct-reservations-system.sql.',
          },
          { status: 503 }
        );
      }
      if (msg.includes('price_override') || msg.includes('updated_at')) {
        await sql`
          INSERT INTO property_availability (property_id, date, available, price_override, created_at)
          SELECT ${propertyId}::int, d, TRUE, ${price}::decimal(10,2), NOW()
          FROM generate_series(${from}::date, ${to}::date, '1 day'::interval) AS d
          ON CONFLICT (property_id, date) DO UPDATE
          SET price_override = EXCLUDED.price_override
        `;
        if (price !== null) {
          try {
            await sql`
              UPDATE property_availability pa
              SET price = ${price}::decimal(10,2)
              FROM generate_series(${from}::date, ${to}::date, '1 day'::interval) AS d
              WHERE pa.property_id = ${propertyId}::int AND pa.date = d::date
            `;
          } catch (_) {}
        }
      } else {
        throw insertErr;
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('❌ [tenant/property-prices] error:', e);
    return NextResponse.json({ success: false, error: 'Error interno', details: msg }, { status: 500 });
  }
}
