import { sql } from '@/lib/db';

type AuditAction =
  | 'PARTE_CREATE'
  | 'VALIDATE_OK'
  | 'QUEUE_ADD'
  | 'QUEUE_FLUSH_ATTEMPT'
  | 'SES_SENT'
  | 'SES_ACK'
  | 'ERROR';

let auditTableEnsured = false;

export async function ensureAuditTable(): Promise<void> {
  if (auditTableEnsured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY DEFAULT md5((random())::text || clock_timestamp()::text),
      tenant_id UUID,
      actor_id UUID,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload_hash CHAR(64) NOT NULL,
      at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ip TEXT,
      meta JSONB
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log (tenant_id, entity_type, entity_id);`;
  await sql`CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log (action);`;
  auditTableEnsured = true;
}

export async function logAudit(entry: {
  action: AuditAction;
  entityType: string;
  entityId: string;
  payloadHash: string;
  ip?: string | null;
  tenantId?: string | null;
  actorId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  await ensureAuditTable();
  await sql`
    INSERT INTO audit_log (tenant_id, actor_id, action, entity_type, entity_id, payload_hash, ip, meta)
    VALUES (
      ${entry.tenantId || null},
      ${entry.actorId || null},
      ${entry.action},
      ${entry.entityType},
      ${entry.entityId},
      ${entry.payloadHash},
      ${entry.ip || null},
      ${JSON.stringify(entry.meta || {})}::jsonb
    );
  `;
}


