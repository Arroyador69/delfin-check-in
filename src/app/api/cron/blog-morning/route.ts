import { NextRequest } from 'next/server';
import { GET as superadminBlogCronGet } from '@/app/api/superadmin/blog/cron/route';

/**
 * Vercel Cron wrapper: blog batch "morning".
 *
 * Motivo: /api/superadmin/* suele requerir JWT en middleware y Vercel Cron
 * no envía cookies; además, `vercel.json` no debe depender de query strings.
 * Auth: reenvía Bearer CRON_SECRET (no falsificar x-vercel-cron).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  url.searchParams.set('batch', 'morning');
  const mode = req.nextUrl.searchParams.get('mode');
  if (mode) url.searchParams.set('mode', mode);

  const headers = new Headers(req.headers);
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && !headers.get('authorization')) {
    headers.set('Authorization', `Bearer ${secret}`);
  }

  return superadminBlogCronGet(new NextRequest(url, { method: 'GET', headers }));
}
