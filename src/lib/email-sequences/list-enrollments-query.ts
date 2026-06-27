import { sql } from '@/lib/db';
import {
  LIFECYCLE_ET2_OPENED,
  LIFECYCLE_ET_OPENED,
  LIFECYCLE_ET_WHERE,
} from '@/lib/email-sequences/lifecycle-tracking-sql';

const ENROLLMENTS_LIST_SELECT = `
    SELECT
      e.id AS enrollment_id,
      e.tenant_id,
      t.name AS tenant_name,
      t.email,
      t.onboarding_status,
      COALESCE(t.current_rooms, 0)::int AS current_rooms,
      t.plan_type,
      e.current_step,
      e.status AS enrollment_status,
      e.enrolled_at,
      e.last_sent_at,
      e.next_send_at,
      e.completed_at,
      e.metadata,
      s.key AS sequence_key,
      s.name AS sequence_name,
      s.phase,
      (SELECT COUNT(*)::int FROM email_tracking et
        WHERE et.tenant_id = e.tenant_id
          AND ${LIFECYCLE_ET_WHERE}
          AND et.metadata->>'sequence_key' = s.key) AS emails_sent_sequence,
      (SELECT COUNT(*)::int FROM email_tracking et
        WHERE et.tenant_id = e.tenant_id
          AND ${LIFECYCLE_ET_WHERE}
          AND et.metadata->>'sequence_key' = s.key
          AND ${LIFECYCLE_ET_OPENED}) AS emails_opened_sequence,
      (SELECT COUNT(*)::int FROM email_tracking et
        WHERE et.metadata->>'enrollment_id' = e.id::text
          AND (et.metadata->>'step_order')::int = e.current_step) AS sends_on_current_step,
      (SELECT COUNT(*)::int FROM email_tracking et
        WHERE et.metadata->>'enrollment_id' = e.id::text
          AND (et.metadata->>'step_order')::int = e.current_step
          AND ${LIFECYCLE_ET_OPENED}) AS opens_on_current_step,
      (SELECT BOOL_OR(${LIFECYCLE_ET2_OPENED})
        FROM email_tracking et2
        WHERE et2.metadata->>'enrollment_id' = e.id::text
          AND (et2.metadata->>'step_order')::int = e.current_step) AS current_step_opened,
      COALESCE((e.metadata->>'step_retry_count')::int, 0) AS step_retry_count
    FROM email_sequence_enrollments e
    JOIN email_sequences s ON s.id = e.sequence_id
    JOIN tenants t ON t.id = e.tenant_id
`;

/**
 * Listado de inscripciones lifecycle con filtros opcionales.
 * No usar (${x} IS NULL OR col = ${x}): Postgres/Neon no infiere el tipo de $1 cuando x es null.
 * Cast explícito ($n::int / $n::text) para evitar NeonDbError en sql.query.
 */
export function buildLifecycleEnrollmentsQuery(filters: {
  phase: number | null;
  status: string | null;
}): { text: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.phase != null) {
    params.push(filters.phase);
    conditions.push(`s.phase = $${params.length}::int`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`e.status = $${params.length}::text`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const text = `${ENROLLMENTS_LIST_SELECT} ${whereClause} ORDER BY e.next_send_at ASC NULLS LAST, e.enrolled_at DESC LIMIT 200`;

  return { text, params };
}

export async function listLifecycleEnrollments(filters: {
  phase: number | null;
  status: string | null;
}) {
  const { text, params } = buildLifecycleEnrollmentsQuery(filters);
  return sql.query(text, params);
}
