import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getAssistantMonthlyLimit, getUsage } from '@/lib/support/usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const payload = verifyToken(authToken);
    if (!payload?.tenantId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const usage = await getUsage(payload.tenantId);
    return NextResponse.json({
      success: true,
      used: usage.used,
      limit: usage.limit,
      remaining: usage.remaining,
      resetLabel: usage.resetLabel,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg && (msg.includes('assistant_usage') || msg.includes('does not exist'))) {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const resetLabel = next.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      const limit = getAssistantMonthlyLimit();
      return NextResponse.json({
        success: true,
        used: 0,
        limit,
        remaining: limit,
        resetLabel,
      });
    }
    console.error('[support/usage] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}
