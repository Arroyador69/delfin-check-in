import { NextRequest } from 'next/server';
import { GET as superadminBlogCronGet } from '@/app/api/superadmin/blog/cron/route';

/**
 * Vercel Cron wrapper: blog batch "morning".
 *
 * Motivo: /api/superadmin/* suele requerir JWT en middleware y Vercel Cron
 * no envía cookies; además, `vercel.json` no debe depender de query strings.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  url.searchParams.set('batch', 'morning');
  // Permitir `mode=test` para smoke manual desde navegador/CLI.
  const mode = req.nextUrl.searchParams.get('mode');
  if (mode) url.searchParams.set('mode', mode);

  const headers = new Headers(req.headers);
  headers.set('x-vercel-cron', '1');

  return superadminBlogCronGet(new NextRequest(url, { headers }));
}

