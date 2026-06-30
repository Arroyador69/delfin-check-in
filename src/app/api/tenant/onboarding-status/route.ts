import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTenantId } from '@/lib/tenant';

/**
 * PUT - Actualizar onboarding_status del tenant
 */
export async function PUT(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || await getTenantId(req);
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { onboarding_status, deferred_tasks } = body as {
      onboarding_status?: string;
      deferred_tasks?: string[];
    };

    // Validar status
    if (!onboarding_status || !['pending', 'in_progress', 'completed'].includes(onboarding_status)) {
      return NextResponse.json(
        { success: false, error: 'Estado de onboarding inválido' },
        { status: 400 }
      );
    }

    // Actualizar onboarding_status (+ tareas aplazadas en config)
    if (Array.isArray(deferred_tasks) && deferred_tasks.length > 0) {
      const patch = JSON.stringify({ onboarding_deferred: deferred_tasks });
      await sql`
        UPDATE tenants
        SET
          onboarding_status = ${onboarding_status},
          config = COALESCE(config, '{}'::jsonb) || ${patch}::jsonb,
          updated_at = NOW()
        WHERE id = ${tenantId}
      `;
    } else {
      await sql`
        UPDATE tenants
        SET onboarding_status = ${onboarding_status}, updated_at = NOW()
        WHERE id = ${tenantId}
      `;
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const res = NextResponse.json({
      success: true,
      message: 'Estado de onboarding actualizado',
      onboarding_status
    });

    // Mantener cookie sincronizada para el middleware Edge
    res.cookies.set('onboarding_status', onboarding_status, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return res;

  } catch (error: any) {
    console.error('Error actualizando onboarding_status:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar estado de onboarding' },
      { status: 500 }
    );
  }
}

