import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';

/**
 * Autorización de crons / jobs programados.
 *
 * Nunca confiar solo en `x-vercel-cron` (cualquier cliente puede enviarla).
 * Acepta:
 * - `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron con CRON_SECRET, o llamada manual)
 * - Sesión SuperAdmin de plataforma (panel)
 */
export async function authorizeCronOrSuperAdmin(req: NextRequest): Promise<{
  error: NextResponse | null;
  via: 'cron_secret' | 'superadmin' | null;
}> {
  const secret = process.env.CRON_SECRET?.trim();
  const authHeader = req.headers.get('authorization');

  if (secret && authHeader === `Bearer ${secret}`) {
    return { error: null, via: 'cron_secret' };
  }

  const { error, payload } = await verifySuperAdmin(req);
  if (!error && payload) {
    return { error: null, via: 'superadmin' };
  }

  return {
    error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    via: null,
  };
}

/** Solo secreto de cron (jobs sin sesión de usuario). */
export function authorizeCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}
