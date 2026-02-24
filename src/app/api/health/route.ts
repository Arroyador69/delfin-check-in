import { NextResponse } from 'next/server';

/** GET /api/health — Comprobar que el deploy y las rutas API funcionan */
export async function GET() {
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
