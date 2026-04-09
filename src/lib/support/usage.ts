import { sql } from '@/lib/db';

type PlanType = 'free' | 'free_legal' | 'checkin' | 'standard' | 'pro';

export type AssistantLimits = {
  daily: number;
  monthly: number;
};

export function getAssistantLimits(planType: PlanType): AssistantLimits {
  // El asistente solo se puede usar en CHECKIN+.
  // En FREE se muestra el widget pero bloqueado (limits = 0).
  switch (planType) {
    case 'checkin':
      return { daily: 20, monthly: 60 };
    case 'standard':
      return { daily: 50, monthly: 200 };
    case 'pro':
      return { daily: 150, monthly: 600 };
    case 'free':
    case 'free_legal':
    default:
      return { daily: 0, monthly: 0 };
  }
}

function getMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getDayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getResetLabelMonth(locale: string): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

function getResetLabelDay(locale: string): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export type UsageResult = {
  usedDaily: number;
  usedMonthly: number;
  limitDaily: number;
  limitMonthly: number;
  remainingDaily: number;
  remainingMonthly: number;
  dayKey: string;
  monthKey: string;
  resetLabelDay: string;
  resetLabelMonth: string;
};

async function ensureUsageTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS assistant_usage_v2 (
      tenant_id UUID NOT NULL,
      user_id UUID NOT NULL,
      period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('day','month')),
      period_key VARCHAR(10) NOT NULL,
      message_count INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (tenant_id, user_id, period_type, period_key)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_assistant_usage_v2_tenant ON assistant_usage_v2(tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_assistant_usage_v2_user ON assistant_usage_v2(user_id)`;
}

async function getCount(tenantId: string, userId: string, periodType: 'day'|'month', periodKey: string): Promise<number> {
  const r = await sql`
    SELECT message_count
    FROM assistant_usage_v2
    WHERE tenant_id = ${tenantId}::uuid
      AND user_id = ${userId}::uuid
      AND period_type = ${periodType}
      AND period_key = ${periodKey}
  `;
  return r.rows[0]?.message_count ?? 0;
}

export async function getUsage(args: {
  tenantId: string;
  userId: string;
  planType: PlanType;
  locale?: string;
}): Promise<UsageResult> {
  const { tenantId, userId, planType } = args;
  const locale = args.locale || 'es-ES';
  await ensureUsageTable();
  const monthKey = getMonthKey();
  const dayKey = getDayKey();
  const limits = getAssistantLimits(planType);

  const usedMonthly = await getCount(tenantId, userId, 'month', monthKey);
  const usedDaily = await getCount(tenantId, userId, 'day', dayKey);

  const remainingMonthly = Math.max(0, limits.monthly - usedMonthly);
  const remainingDaily = Math.max(0, limits.daily - usedDaily);

  return {
    usedDaily,
    usedMonthly,
    limitDaily: limits.daily,
    limitMonthly: limits.monthly,
    remainingDaily,
    remainingMonthly,
    dayKey,
    monthKey,
    resetLabelDay: getResetLabelDay(locale),
    resetLabelMonth: getResetLabelMonth(locale),
  };
}

async function increment(tenantId: string, userId: string, periodType: 'day'|'month', periodKey: string): Promise<void> {
  await sql`
    INSERT INTO assistant_usage_v2 (tenant_id, user_id, period_type, period_key, message_count, updated_at)
    VALUES (${tenantId}::uuid, ${userId}::uuid, ${periodType}, ${periodKey}, 1, NOW())
    ON CONFLICT (tenant_id, user_id, period_type, period_key)
    DO UPDATE SET
      message_count = assistant_usage_v2.message_count + 1,
      updated_at = NOW()
  `;
}

export async function incrementUsage(args: {
  tenantId: string;
  userId: string;
  planType: PlanType;
  locale?: string;
}): Promise<UsageResult> {
  const { tenantId, userId, planType } = args;
  const locale = args.locale || 'es-ES';
  await ensureUsageTable();
  const monthKey = getMonthKey();
  const dayKey = getDayKey();

  await increment(tenantId, userId, 'month', monthKey);
  await increment(tenantId, userId, 'day', dayKey);

  return getUsage({ tenantId, userId, planType, locale });
}
