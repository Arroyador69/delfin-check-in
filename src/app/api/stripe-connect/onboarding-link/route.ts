import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';
import { getStripeServer } from '@/lib/stripe-server';

function getBaseUrl(req: NextRequest): string {
  // En Vercel, `NEXT_PUBLIC_APP_URL` suele estar definido; fallback al host actual.
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`.replace(/\/+$/, '');
}

async function ensureStripeConnectColumn(): Promise<void> {
  // Hardening: permitir despliegue sin migración manual.
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled BOOLEAN`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled BOOLEAN`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connect_last_status_sync TIMESTAMP`;
}

/**
 * POST /api/stripe-connect/onboarding-link
 *
 * Crea (si no existe) una cuenta Connect Express para el tenant y devuelve un link
 * alojado de Stripe para completar KYC + IBAN.
 *
 * UX: 1 botón "Activar cobros" / "Completar verificación".
 */
export async function POST(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'Tenant no identificado' }, { status: 401 });
    }

    await ensureStripeConnectColumn();

    const body = await req.json().catch(() => ({}));
    const returnPath = typeof body?.return_path === 'string' && body.return_path ? body.return_path : '/microsite/pagos';

    const tenantRow = await sql`
      SELECT id, email, name, stripe_connect_account_id
      FROM tenants
      WHERE id = ${tenantId}::uuid
      LIMIT 1
    `;
    if (tenantRow.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tenant no encontrado' }, { status: 404 });
    }

    const tenant = tenantRow.rows[0] as {
      id: string;
      email: string | null;
      name: string | null;
      stripe_connect_account_id: string | null;
    };

    const stripe = getStripeServer();
    const baseUrl = getBaseUrl(req);
    const returnUrl = `${baseUrl}${returnPath.startsWith('/') ? '' : '/'}${returnPath}`;
    const refreshUrl = `${baseUrl}${returnPath.startsWith('/') ? '' : '/'}${returnPath}?connect=refresh`;

    let accountId = tenant.stripe_connect_account_id?.trim() || null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'ES',
        email: tenant.email || undefined,
        business_type: 'individual',
        metadata: {
          tenant_id: tenantId,
          product: 'delfincheckin',
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            schedule: { interval: 'daily' },
          },
        },
      });

      accountId = account.id;

      await sql`
        UPDATE tenants
        SET stripe_connect_account_id = ${accountId}
        WHERE id = ${tenantId}::uuid
      `;
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: refreshUrl,
      return_url: returnUrl,
    });

    return NextResponse.json({
      success: true,
      url: link.url,
      stripe_connect_account_id: accountId,
    });
  } catch (error: unknown) {
    console.error('❌ [stripe-connect onboarding-link] Error:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

