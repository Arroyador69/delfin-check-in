import { NextResponse } from 'next/server';
import { polarErrorMeta, polarServer, normalizePolarAccessToken } from '@/lib/polar-server';

/**
 * GET /api/polar/health — comprueba PAT + entorno (sin exponer el token).
 * Útil tras renovar POLAR_ACCESS_TOKEN en Vercel y redeploy.
 */
export async function GET() {
  const configured = Boolean(normalizePolarAccessToken(process.env.POLAR_ACCESS_TOKEN || ''));
  const server = polarServer();

  if (!configured) {
    return NextResponse.json(
      { ok: false, configured: false, server, reason: 'POLAR_ACCESS_TOKEN missing' },
      { status: 503 }
    );
  }

  try {
    const token = normalizePolarAccessToken(process.env.POLAR_ACCESS_TOKEN || '');
    const base =
      server === 'production' ? 'https://api.polar.sh/v1' : 'https://sandbox-api.polar.sh/v1';
    const res = await fetch(`${base}/products?limit=1`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw Object.assign(new Error(`Polar API ${res.status}`), {
        statusCode: res.status,
        body,
      });
    }
    return NextResponse.json({ ok: true, configured: true, server });
  } catch (e: unknown) {
    const meta = polarErrorMeta(e);
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        server,
        reason: meta.polar_status === 401 ? 'invalid_token' : 'polar_api_error',
        status: meta.polar_status,
      },
      { status: 503 }
    );
  }
}
