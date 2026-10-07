import { sql } from '@vercel/postgres';
import { randomBytes } from 'crypto';

export const TAP_WALL_TERMS_VERSION = 'tap-wall-2026-10-01';

export const TAP_WALL_PRODUCTS = [
  {
    sku: 'instructions_nfc',
    name: 'Chip NFC de instrucciones',
    blurb: 'El huésped toca el chip y ve WiFi, normas y cómo contactarte.',
    priceHint: 'Incluido en la suscripción (envío del chip físico)',
  },
  {
    sku: 'wifi_wall',
    name: 'Placa WiFi de pared',
    blurb: 'Placa para la pared con NFC: el huésped ve la red y la clave al instante.',
    priceHint: 'Incluido en la suscripción (envío de la placa)',
  },
  {
    sku: 'kit_wall',
    name: 'Kit pared (placa + chip extra)',
    blurb: 'Placa WiFi y un chip NFC adicional para otra zona del alojamiento.',
    priceHint: 'Incluido en la suscripción (envío del kit)',
  },
] as const;

export type TapWallProductSku = (typeof TAP_WALL_PRODUCTS)[number]['sku'];

export function tapWallBaseProductId(): string {
  return String(process.env.POLAR_PRODUCT_TAP_WALL_ID || '').trim();
}

export function tapWallExtraProductId(): string {
  return String(process.env.POLAR_PRODUCT_TAP_WALL_EXTRA_ID || '').trim();
}

export function isTapWallActiveStatus(status: string | null | undefined): boolean {
  const s = String(status || '').toLowerCase();
  return s === 'active' || s === 'trialing' || s === 'past_due';
}

export function monthlyPriceEuros(propertiesCount: number): number {
  const n = Math.max(1, Math.min(200, Math.floor(propertiesCount || 1)));
  return 10 + Math.max(0, n - 1) * 2;
}

export function newPublicCode(): string {
  return randomBytes(5).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase();
}

export async function ensureTapWallSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS tap_wall_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID,
      email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'inactive',
      polar_subscription_id TEXT,
      polar_customer_id TEXT,
      polar_checkout_id TEXT,
      properties_count INT NOT NULL DEFAULT 1,
      product_sku TEXT NOT NULL DEFAULT 'instructions_nfc',
      shipping_name TEXT,
      shipping_line1 TEXT,
      shipping_line2 TEXT,
      shipping_city TEXT,
      shipping_postal TEXT,
      shipping_country TEXT NOT NULL DEFAULT 'ES',
      shipping_phone TEXT,
      terms_version TEXT,
      terms_accepted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS tap_wall_spaces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id UUID NOT NULL REFERENCES tap_wall_accounts(id) ON DELETE CASCADE,
      tenant_id UUID,
      name TEXT NOT NULL,
      public_code TEXT NOT NULL UNIQUE,
      wifi_ssid TEXT,
      wifi_password TEXT,
      wifi_notes TEXT,
      instructions_text TEXT,
      emergency_phone TEXT,
      emergency_message TEXT,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS tap_wall_emergencies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      space_id UUID NOT NULL REFERENCES tap_wall_spaces(id) ON DELETE CASCADE,
      guest_message TEXT NOT NULL,
      guest_contact TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      seen_at TIMESTAMPTZ
    )
  `;
}

export async function getTapAccountByTenant(tenantId: string) {
  await ensureTapWallSchema();
  const r = await sql`
    SELECT * FROM tap_wall_accounts
    WHERE tenant_id = ${tenantId}::uuid
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return (r.rows[0] as Record<string, unknown> | undefined) ?? null;
}

export async function getTapSpaceByPublicCode(code: string) {
  await ensureTapWallSchema();
  const c = String(code || '').trim().toLowerCase();
  if (!c) return null;
  const r = await sql`
    SELECT s.*, a.status AS account_status, a.email AS owner_email
    FROM tap_wall_spaces s
    JOIN tap_wall_accounts a ON a.id = s.account_id
    WHERE lower(s.public_code) = ${c}
      AND s.active = true
    LIMIT 1
  `;
  return (r.rows[0] as Record<string, unknown> | undefined) ?? null;
}
