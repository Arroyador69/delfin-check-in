import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronSecret } from '@/lib/cron-auth';
import { runPublicOwnerLeadsWaveCron } from '@/lib/public-owner-leads/run-wave-cron';
import { PUBLIC_OWNER_LEADS_WAVE_MAX } from '@/lib/public-owner-leads/constants';
import { waveScheduleSummary } from '@/lib/public-owner-leads/wave-schedule';
import {
  getOutreachProviderInfo,
  sendOutreachMail,
} from '@/lib/public-owner-leads/send-smtp';

export const maxDuration = 300;

/**
 * Oleada Zoho-safe: hasta 50 mails · cada ~30 min · tope día 1000.
 * Vercel: `0,30 7-16 * * *` (CET ≈ 08:00–17:30 Madrid).
 * Para si altas ≥ 20; Telegram cada 150 acumulados.
 *
 * Diagnóstico: `?probeProvider=1` · prueba 1 mail: `?probeProvider=1&send=1&to=email`
 */
export async function GET(req: NextRequest) {
  if (!authorizeCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (req.nextUrl.searchParams.get('probeProvider') === '1') {
    const info = getOutreachProviderInfo();
    const wantSend = req.nextUrl.searchParams.get('send') === '1';
    if (!wantSend) {
      return NextResponse.json({
        ok: true,
        outreach_provider: info,
        hasResendKey: Boolean(process.env.RESEND_API_KEY?.trim()),
        hasBrevoKey: Boolean(process.env.BREVO_API_KEY?.trim()),
      });
    }
    const to =
      String(req.nextUrl.searchParams.get('to') || 'contacto@delfincheckin.com')
        .trim()
        .toLowerCase() || 'contacto@delfincheckin.com';
    try {
      const sent = await sendOutreachMail({
        to,
        subject: `[probe Resend] Delfín outreach ${new Date().toISOString()}`,
        text: `Probe proveedor=${info.provider} from=${info.from}`,
        html: `<p>Probe proveedor=<b>${info.provider}</b><br/>from=${info.from}</p>`,
      });
      return NextResponse.json({
        ok: true,
        outreach_provider: info,
        sent: { to, messageId: sent.messageId, provider: sent.provider },
      });
    } catch (e) {
      return NextResponse.json(
        {
          ok: false,
          outreach_provider: info,
          error: e instanceof Error ? e.message : String(e),
        },
        { status: 502 }
      );
    }
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const force = req.nextUrl.searchParams.get('force') === '1';
  const maxRaw = parseInt(req.nextUrl.searchParams.get('max') || '', 10);
  const maxSend = Number.isFinite(maxRaw)
    ? Math.min(PUBLIC_OWNER_LEADS_WAVE_MAX, Math.max(1, maxRaw))
    : PUBLIC_OWNER_LEADS_WAVE_MAX;

  const result = await runPublicOwnerLeadsWaveCron({
    dryRun,
    force,
    maxSend,
  });

  return NextResponse.json(
    {
      ...result,
      outreach_provider: getOutreachProviderInfo(),
      schedule: waveScheduleSummary(),
      flow: process.env.PUBLIC_OWNER_LEADS_FLOW || 'A+B+C',
    },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  return GET(req);
}
