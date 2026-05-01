import { NextRequest, NextResponse } from 'next/server';
import { recordAffiliateClickFromRequest } from '@/lib/affiliate-click-log';
import { buildAmazonProductAffiliateUrl, resolveAmazonAffiliateConfig } from '@/lib/amazon-affiliate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const placement = req.nextUrl.searchParams.get('placement');

  const cfg = resolveAmazonAffiliateConfig();
  let destination: string;
  try {
    destination = buildAmazonProductAffiliateUrl(cfg);
  } catch (e) {
    console.error('[affiliate/go] config/url', e);
    return NextResponse.json({ error: 'Configuración de afiliado inválida' }, { status: 500 });
  }

  try {
    await recordAffiliateClickFromRequest(req, placement);
  } catch (err) {
    console.error('[affiliate/go] audit_log', err);
  }

  return NextResponse.redirect(destination, 302);
}
