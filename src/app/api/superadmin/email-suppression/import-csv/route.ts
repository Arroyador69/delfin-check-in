import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import {
  parseEmailsFromCsvText,
  upsertEmailSuppressions,
  type SuppressionReason,
} from '@/lib/email-suppression';

/**
 * POST /api/superadmin/email-suppression/import-csv
 *
 * Body JSON: { csv: string, reason?: 'bounce'|'unsubscribe'|'tenant_inactive'|'manual' }
 * o multipart/form-data con campo `file` / `csv`.
 */
export async function POST(req: NextRequest) {
  const { error } = await verifySuperAdmin(req);
  if (error) return error;

  try {
    const contentType = req.headers.get('content-type') || '';
    let csvText = '';
    let reason: SuppressionReason = 'bounce';

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file') || form.get('csv');
      if (file && typeof file === 'object' && 'text' in file) {
        csvText = await (file as File).text();
      } else if (typeof file === 'string') {
        csvText = file;
      }
      const reasonField = form.get('reason');
      if (typeof reasonField === 'string' && isReason(reasonField)) {
        reason = reasonField;
      }
    } else {
      const body = (await req.json()) as { csv?: string; text?: string; reason?: string };
      csvText = String(body.csv || body.text || '');
      if (body.reason && isReason(body.reason)) reason = body.reason;
    }

    if (!csvText.trim()) {
      return NextResponse.json(
        { success: false, error: 'Falta CSV (campo csv o file)' },
        { status: 400 }
      );
    }

    const emails = parseEmailsFromCsvText(csvText);
    if (emails.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se encontraron emails en el CSV' },
        { status: 400 }
      );
    }

    const result = await upsertEmailSuppressions(emails, reason, 'csv_import');

    return NextResponse.json({
      success: true,
      reason,
      source: 'csv_import',
      ...result,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[superadmin/email-suppression/import-csv]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

function isReason(v: string): v is SuppressionReason {
  return (
    v === 'bounce' ||
    v === 'unsubscribe' ||
    v === 'tenant_inactive' ||
    v === 'manual'
  );
}
