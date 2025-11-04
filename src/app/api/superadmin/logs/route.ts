import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth';
import { getErrorLogs, getErrorStats } from '@/lib/error-logger';

export async function GET(req: NextRequest) {
  try {
    // Verificar que es superadmin
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    // Obtener parámetros de la query
    const { searchParams } = new URL(req.url);
    const level = searchParams.get('level') as 'error' | 'warning' | 'info' | 'all' | null;
    const tenantId = searchParams.get('tenantId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Obtener logs y estadísticas
    const [logs, stats] = await Promise.all([
      getErrorLogs({
        level: level || 'all',
        tenantId,
        limit,
        offset,
      }),
      getErrorStats(),
    ]);

    // Formatear logs para el frontend
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      timestamp: log.created_at,
      level: log.level,
      message: log.message,
      tenant_id: log.tenant_id,
      user_id: log.user_id,
      error: log.error_stack || undefined,
      url: log.url || undefined,
      metadata: log.metadata || undefined,
    }));

    return NextResponse.json({
      logs: formattedLogs,
      stats,
    });
  } catch (error: any) {
    console.error('Error obteniendo logs:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
