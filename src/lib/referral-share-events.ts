import { sql } from '@/lib/db';

export type ReferralShareAction =
  | 'copy_link'
  | 'share_native'
  | 'share_facebook'
  | 'open_share_dialog'
  | 'copy_from_landing'
  | 'click_from_landing';

export async function ensureReferralShareEventsSchema(): Promise<void> {
  // Keep schema creation close to usage (project uses this pattern in multiple routes).
  await sql`
    CREATE TABLE IF NOT EXISTS referral_share_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      referral_code TEXT,
      action TEXT NOT NULL,
      page TEXT,
      target TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_referral_share_events_tenant_id ON referral_share_events(tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_referral_share_events_action ON referral_share_events(action)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_referral_share_events_created_at ON referral_share_events(created_at DESC)`;
}

export async function insertReferralShareEvent(args: {
  tenantId: string;
  referralCode?: string | null;
  action: ReferralShareAction | string;
  page?: string | null;
  target?: string | null;
  metadata?: Record<string, any> | null;
}): Promise<void> {
  await ensureReferralShareEventsSchema();

  await sql`
    INSERT INTO referral_share_events (
      tenant_id,
      referral_code,
      action,
      page,
      target,
      metadata
    ) VALUES (
      ${args.tenantId},
      ${args.referralCode || null},
      ${args.action},
      ${args.page || null},
      ${args.target || null},
      ${args.metadata || {}}
    )
  `;
}

