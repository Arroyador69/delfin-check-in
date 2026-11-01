/**
 * Marca leads outreach como bounced + suppression global.
 * Usado tras Zoho Undelivered, pegado manual en Superadmin o SMTP 550.
 */

import { sql } from '@/lib/db';
import { stopSequenceByEmail } from './sequence-db';
import {
  normalizeSuppressionEmail,
  parseEmailsFromCsvText,
  upsertEmailSuppression,
} from '@/lib/email-suppression';

export type ApplyBouncesResult = {
  emails: number;
  suppressed: number;
  leadsMarked: number;
  trackingUpdated: number;
};

async function tableReady(): Promise<boolean> {
  const meta = await sql`SELECT to_regclass('public.public_owner_leads') AS reg`;
  return Boolean(meta.rows[0]?.reg);
}

/**
 * Aplica lista de emails undelivered/bounce:
 * 1) email_unsubscribes reason=bounce
 * 2) public_owner_leads status=bounced
 * 3) email_tracking outreach → bounced (si hay tid)
 */
export async function applyOutreachBounceEmails(
  rawEmails: string[],
  source: string = 'zoho_undelivered'
): Promise<ApplyBouncesResult> {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const raw of rawEmails) {
    const e = normalizeSuppressionEmail(raw);
    if (!e || !e.includes('@') || seen.has(e)) continue;
    if (e.endsWith('@delfincheckin.com') || e.endsWith('@mail.delfincheckin.com')) continue;
    seen.add(e);
    emails.push(e);
  }

  let suppressed = 0;
  let leadsMarked = 0;
  let trackingUpdated = 0;

  for (const email of emails) {
    const r = await upsertEmailSuppression({
      email,
      reason: 'bounce',
      source,
    });
    if (r.inserted) suppressed += 1;

    if (!(await tableReady())) continue;

    const lead = await sql`
      UPDATE public_owner_leads
      SET
        status = 'bounced',
        last_error = ${`bounce:${source}`},
        updated_at = NOW(),
        notes = COALESCE(notes, '') || ${` | bounce:${source}:${new Date().toISOString().slice(0, 10)}`}
      WHERE LOWER(TRIM(email)) = ${email}
        AND status IS DISTINCT FROM 'bounced'
      RETURNING id, tracking_id
    `;
    // Parar follow-ups aunque el lead ya estuviera 'bounced' (no-op sin migración)
    await stopSequenceByEmail(email, 'stopped_bounce');

    if (lead.rows[0]?.id) {
      leadsMarked += 1;
      const tid = lead.rows[0].tracking_id ? String(lead.rows[0].tracking_id) : '';
      if (tid) {
        try {
          await sql`
            UPDATE email_tracking
            SET status = 'bounced', updated_at = NOW()
            WHERE id = ${tid}::uuid
          `;
          trackingUpdated += 1;
        } catch {
          /* ignore */
        }
      }
    }

    try {
      const tr = await sql`
        UPDATE email_tracking
        SET status = 'bounced', updated_at = NOW()
        WHERE email_type = 'public_owner_outreach'
          AND LOWER(TRIM(recipient_email)) = ${email}
          AND status IS DISTINCT FROM 'bounced'
        RETURNING id
      `;
      trackingUpdated += tr.rows.length;
    } catch {
      /* ignore */
    }
  }

  return {
    emails: emails.length,
    suppressed,
    leadsMarked,
    trackingUpdated,
  };
}

/** Parsea texto/CSV pegado desde Zoho Undelivered UI. */
export async function applyOutreachBouncesFromText(
  text: string,
  source: string = 'csv_import'
): Promise<ApplyBouncesResult> {
  const emails = parseEmailsFromCsvText(text);
  return applyOutreachBounceEmails(emails, source);
}
