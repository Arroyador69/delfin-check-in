import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';
import { getStripeServer } from '@/lib/stripe-server';

async function ensureStripeConnectColumn(): Promise<void> {
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled BOOLEAN`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled BOOLEAN`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connect_last_status_sync TIMESTAMP`;
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'Tenant no identificado' }, { status: 401 });
    }

    await ensureStripeConnectColumn();

    const row = await sql`
      SELECT stripe_connect_account_id,
             stripe_connect_charges_enabled,
             stripe_connect_payouts_enabled,
             stripe_connect_details_submitted,
             stripe_connect_last_status_sync
      FROM tenants
      WHERE id = ${tenantId}::uuid
      LIMIT 1
    `;
    if (row.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tenant no encontrado' }, { status: 404 });
    }

    const tenant = row.rows[0] as {
      stripe_connect_account_id: string | null;
      stripe_connect_charges_enabled: boolean | null;
      stripe_connect_payouts_enabled: boolean | null;
      stripe_connect_details_submitted: boolean | null;
      stripe_connect_last_status_sync: string | null;
    };

    const accountId = tenant.stripe_connect_account_id?.trim() || null;
    if (!accountId) {
      return NextResponse.json({
        success: true,
        has_account: false,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      });
    }

    const stripe = getStripeServer();
    const account = await stripe.accounts.retrieve(accountId);

    await sql`
      UPDATE tenants
      SET stripe_connect_charges_enabled = ${Boolean(account.charges_enabled)},
          stripe_connect_payouts_enabled = ${Boolean(account.payouts_enabled)},
          stripe_connect_details_submitted = ${Boolean(account.details_submitted)},
          stripe_connect_last_status_sync = NOW()
      WHERE id = ${tenantId}::uuid
    `;

    return NextResponse.json({
      success: true,
      has_account: true,
      stripe_connect_account_id: accountId,
      charges_enabled: Boolean(account.charges_enabled),
      payouts_enabled: Boolean(account.payouts_enabled),
      details_submitted: Boolean(account.details_submitted),
      requirements: account.requirements ?? null,
    });
  } catch (error: unknown) {
    console.error('❌ [stripe-connect status] Error:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

