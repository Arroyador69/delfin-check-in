import { sql } from '@/lib/db';

/**
 * Límite mensual de mensajes del Asistente por tenant.
 * Neon solo almacena contadores en `assistant_usage`; el tope lo define la app.
 * Override: ASSISTANT_MONTHLY_LIMIT (1–500 recomendado; máx. 10000).
 * Por defecto 30 para controlar coste de tokens en planes gratuitos / waitlist.
 */
export function getAssistantMonthlyLimit(): number {
  const raw = process.env.ASSISTANT_MONTHLY_LIMIT;
  if (raw != null && raw !== '') {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= 10000) return n;
  }
  return 30;
}


function getMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getResetLabel(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

export type UsageResult = {
  used: number;
  limit: number;
  remaining: number;
  monthKey: string;
  resetLabel: string;
};

export async function getUsage(tenantId: string): Promise<UsageResult> {
  const monthKey = getMonthKey();
  const limit = getAssistantMonthlyLimit();

  const result = await sql`
    SELECT message_count
    FROM assistant_usage
    WHERE tenant_id = ${tenantId}::uuid AND month_key = ${monthKey}
  `;

  const used = result.rows[0]?.message_count ?? 0;
  const remaining = Math.max(0, limit - used);

  return {
    used,
    limit,
    remaining,
    monthKey,
    resetLabel: getResetLabel(),
  };
}

export async function incrementUsage(tenantId: string): Promise<UsageResult> {
  const monthKey = getMonthKey();

  await sql`
    INSERT INTO assistant_usage (tenant_id, month_key, message_count, updated_at)
    VALUES (${tenantId}::uuid, ${monthKey}, 1, NOW())
    ON CONFLICT (tenant_id, month_key)
    DO UPDATE SET
      message_count = assistant_usage.message_count + 1,
      updated_at = NOW()
  `;

  return getUsage(tenantId);
}
