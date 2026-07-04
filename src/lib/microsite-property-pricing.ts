import { sql } from '@/lib/db';

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** PG date_part('dow'): 0=dom, 1=lun … 5=vie, 6=sáb. Finde = vie–dom. */
export function isPostgresWeekendDow(dow: number): boolean {
  return dow === 0 || dow === 5 || dow === 6;
}

export function isPostgresWeekdayDow(dow: number): boolean {
  return !isPostgresWeekendDow(dow);
}

export async function assertTenantOwnsProperty(
  tenantId: string,
  propertyId: number
): Promise<{ base_price: number } | null> {
  const owner = await sql`
    SELECT tp.base_price::float8 AS base_price
    FROM tenant_properties tp
    WHERE tp.id = ${propertyId}::int
      AND tp.tenant_id::text = ${tenantId}
    LIMIT 1
  `;
  if (owner.rows.length === 0) return null;
  return owner.rows[0] as { base_price: number };
}

export async function ensureAvailabilityPriceColumn(): Promise<void> {
  try {
    await sql`ALTER TABLE property_availability ADD COLUMN IF NOT EXISTS price DECIMAL(10,2)`;
  } catch {
    /* ignore */
  }
}

async function upsertDaysWithPrice(
  propertyId: number,
  from: string,
  to: string,
  price: number | null
): Promise<void> {
  await ensureAvailabilityPriceColumn();

  if (price === null) {
    await sql`
      UPDATE property_availability pa
      SET price = NULL, price_override = NULL
      FROM generate_series(${from}::date, ${to}::date, '1 day'::interval) AS d
      WHERE pa.property_id = ${propertyId}::int
        AND pa.date = d::date
    `;
    return;
  }

  try {
    await sql`
      INSERT INTO property_availability (property_id, date, available, price, created_at)
      SELECT ${propertyId}::int, d::date, TRUE, ${price}::decimal(10,2), NOW()
      FROM generate_series(${from}::date, ${to}::date, '1 day'::interval) AS d
      ON CONFLICT (property_id, date) DO UPDATE
      SET
        price = EXCLUDED.price,
        available = COALESCE(property_availability.available, TRUE)
    `;
  } catch (insertErr: unknown) {
    const msg = insertErr instanceof Error ? insertErr.message : String(insertErr);
    if (msg.includes('property_availability') && msg.includes('does not exist')) {
      throw new Error(
        'La tabla property_availability no existe. Ejecuta database/create-direct-reservations-system.sql.'
      );
    }
    if (msg.includes('price_override')) {
      await sql`
        INSERT INTO property_availability (property_id, date, available, price_override, created_at)
        SELECT ${propertyId}::int, d::date, TRUE, ${price}::decimal(10,2), NOW()
        FROM generate_series(${from}::date, ${to}::date, '1 day'::interval) AS d
        ON CONFLICT (property_id, date) DO UPDATE
        SET price_override = EXCLUDED.price_override
      `;
      try {
        await sql`
          UPDATE property_availability pa
          SET price = ${price}::decimal(10,2)
          FROM generate_series(${from}::date, ${to}::date, '1 day'::interval) AS d
          WHERE pa.property_id = ${propertyId}::int AND pa.date = d::date
        `;
      } catch {
        /* ignore */
      }
    } else {
      throw insertErr;
    }
  }
}

async function upsertDaysWithPriceFiltered(
  propertyId: number,
  from: string,
  to: string,
  price: number,
  weekendsOnly: boolean
): Promise<void> {
  await ensureAvailabilityPriceColumn();

  try {
    if (weekendsOnly) {
      await sql`
        INSERT INTO property_availability (property_id, date, available, price, created_at)
        SELECT ${propertyId}::int, gs.day::date, TRUE, ${price}::decimal(10,2), NOW()
        FROM generate_series(${from}::date, ${to}::date, '1 day'::interval) AS gs(day)
        WHERE date_part('dow', gs.day::date) IN (0, 5, 6)
        ON CONFLICT (property_id, date) DO UPDATE
        SET
          price = EXCLUDED.price,
          available = COALESCE(property_availability.available, TRUE)
      `;
    } else {
      await sql`
        INSERT INTO property_availability (property_id, date, available, price, created_at)
        SELECT ${propertyId}::int, gs.day::date, TRUE, ${price}::decimal(10,2), NOW()
        FROM generate_series(${from}::date, ${to}::date, '1 day'::interval) AS gs(day)
        WHERE date_part('dow', gs.day::date) NOT IN (0, 5, 6)
        ON CONFLICT (property_id, date) DO UPDATE
        SET
          price = EXCLUDED.price,
          available = COALESCE(property_availability.available, TRUE)
      `;
    }
  } catch (insertErr: unknown) {
    const msg = insertErr instanceof Error ? insertErr.message : String(insertErr);
    if (msg.includes('price_override')) {
      if (weekendsOnly) {
        await sql`
          INSERT INTO property_availability (property_id, date, available, price_override, created_at)
          SELECT ${propertyId}::int, gs.day::date, TRUE, ${price}::decimal(10,2), NOW()
          FROM generate_series(${from}::date, ${to}::date, '1 day'::interval) AS gs(day)
          WHERE date_part('dow', gs.day::date) IN (0, 5, 6)
          ON CONFLICT (property_id, date) DO UPDATE
          SET price_override = EXCLUDED.price_override
        `;
        try {
          await sql`
            UPDATE property_availability pa
            SET price = ${price}::decimal(10,2)
            FROM generate_series(${from}::date, ${to}::date, '1 day'::interval) AS gs(day)
            WHERE pa.property_id = ${propertyId}::int
              AND pa.date = gs.day::date
              AND date_part('dow', gs.day::date) IN (0, 5, 6)
          `;
        } catch {
          /* ignore */
        }
      } else {
        await sql`
          INSERT INTO property_availability (property_id, date, available, price_override, created_at)
          SELECT ${propertyId}::int, gs.day::date, TRUE, ${price}::decimal(10,2), NOW()
          FROM generate_series(${from}::date, ${to}::date, '1 day'::interval) AS gs(day)
          WHERE date_part('dow', gs.day::date) NOT IN (0, 5, 6)
          ON CONFLICT (property_id, date) DO UPDATE
          SET price_override = EXCLUDED.price_override
        `;
        try {
          await sql`
            UPDATE property_availability pa
            SET price = ${price}::decimal(10,2)
            FROM generate_series(${from}::date, ${to}::date, '1 day'::interval) AS gs(day)
            WHERE pa.property_id = ${propertyId}::int
              AND pa.date = gs.day::date
              AND date_part('dow', gs.day::date) NOT IN (0, 5, 6)
          `;
        } catch {
          /* ignore */
        }
      }
    } else {
      throw insertErr;
    }
  }
}

export async function setMicrositePriceRange(
  propertyId: number,
  from: string,
  to: string,
  price: number | null
): Promise<void> {
  await upsertDaysWithPrice(propertyId, from, to, price);
}

/** L–J = lun–jue; finde = vie–dom (DOW PG: 0 dom, 5 vie, 6 sáb). */
export async function setMicrositeWeekdayWeekendPrices(
  propertyId: number,
  from: string,
  to: string,
  weekdayPrice: number,
  weekendPrice: number
): Promise<void> {
  await upsertDaysWithPriceFiltered(propertyId, from, to, weekdayPrice, false);
  await upsertDaysWithPriceFiltered(propertyId, from, to, weekendPrice, true);
}

export async function setMicrositeSingleDayPrice(
  propertyId: number,
  date: string,
  price: number | null
): Promise<void> {
  await upsertDaysWithPrice(propertyId, date, date, price);
}

export type MicrositeDayPrice = {
  date: string;
  price: number | null;
  effective_price: number;
  is_override: boolean;
};

export async function getMicrositePricesForRange(
  propertyId: number,
  from: string,
  to: string,
  basePrice: number
): Promise<MicrositeDayPrice[]> {
  await ensureAvailabilityPriceColumn();

  const rows = await sql`
    WITH days AS (
      SELECT generate_series(${from}::date, ${to}::date, '1 day'::interval)::date AS d
    )
    SELECT
      d.d::text AS date,
      COALESCE(pa.price, pa.price_override)::float8 AS price
    FROM days d
    LEFT JOIN property_availability pa
      ON pa.property_id = ${propertyId}::int
     AND pa.date = d.d
    ORDER BY d.d
  `;

  return (rows.rows as { date: string; price: number | null }[]).map((r) => {
    const override = r.price != null && Number.isFinite(Number(r.price));
    const effective = override ? Number(r.price) : basePrice;
    return {
      date: r.date.slice(0, 10),
      price: override ? Number(r.price) : null,
      effective_price: effective,
      is_override: override,
    };
  });
}
