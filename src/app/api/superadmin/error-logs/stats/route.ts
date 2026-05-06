import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { getErrorStats } from '@/lib/error-logger';

export async function GET(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const stats = await getErrorStats();
    return NextResponse.json({ success: true, stats });
  } catch (e: any) {
    console.error('[superadmin/error-logs/stats]', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

