import { NextRequest, NextResponse } from 'next/server';
import { recordAffiliateClickFromRequest } from '@/lib/affiliate-click-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * Registra clic de afiliado sin redirigir (la app/PWA abre Amazon directamente).
 * Público: sin tenant en JWT se guarda igual (tenant_id null) para agregados en superadmin.
 */
export async function POST(req: NextRequest) {
  let placement: string | null = null;
  try {
    const body = (await req.json()) as { placement?: unknown };
    placement = typeof body?.placement === 'string' ? body.placement : null;
  } catch {
    // body vacío o no JSON
  }

  try {
    await recordAffiliateClickFromRequest(req, placement);
  } catch (err) {
    console.error('[public/affiliate-click]', err);
  }

  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
