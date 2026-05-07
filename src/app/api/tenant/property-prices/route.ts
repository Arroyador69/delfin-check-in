import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
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

    // Asegurar que la propiedad pertenece al tenant
    const owner = await sql`
      SELECT 1
      FROM tenant_properties tp
      WHERE tp.id = ${propertyId}::int
        AND tp.tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;
    if ((owner as any).rowCount <= 0) {
      return NextResponse.json({ success: false, error: 'Propiedad no encontrada' }, { status: 404 });
    }

    // Hardening: permitir precio por día sin migración manual
    try {
      await sql`ALTER TABLE property_availability ADD COLUMN IF NOT EXISTS price DECIMAL(10,2)`;
    } catch (_) {
      // no crítico (si la tabla no existe en esta instalación, fallará más abajo)
    }

    // Crear tabla si no existe (schema mínimo compatible con lo que ya usa el sistema)
    // Nota: si ya existe con otro schema, esta sentencia no lo rompe.
    await sql`
      CREATE TABLE IF NOT EXISTS property_availability (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL,
        date DATE NOT NULL,
        available BOOLEAN NOT NULL DEFAULT TRUE,
        blocked_reason TEXT,
        price DECIMAL(10,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(property_id, date)
      )
    `;

    // Upsert por día en el rango. Si price es null -> borra override (price=NULL) manteniendo available/blocked.
    await sql`
      WITH days AS (
        SELECT generate_series(${from}::date, ${to}::date, '1 day'::interval)::date AS d
      )
      INSERT INTO property_availability (property_id, date, available, price, created_at, updated_at)
      SELECT ${propertyId}::int, d, TRUE, ${price}::decimal(10,2), NOW(), NOW()
      FROM days
      ON CONFLICT (property_id, date) DO UPDATE
      SET
        price = EXCLUDED.price,
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('❌ [tenant/property-prices] error:', e);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

