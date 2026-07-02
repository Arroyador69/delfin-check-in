import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { upsertOnboardingReminders } from '@/lib/onboarding-reminders';
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
    const { onboarding_status, deferred_tasks, merge_deferred } = body as {
      onboarding_status?: string;
      deferred_tasks?: string[];
      merge_deferred?: boolean;
    };

    // Validar status
    if (!onboarding_status || !['pending', 'in_progress', 'completed'].includes(onboarding_status)) {
      return NextResponse.json(
        { success: false, error: 'Estado de onboarding inválido' },
        { status: 400 }
      );
    }

    let tasksToPersist = Array.isArray(deferred_tasks) ? deferred_tasks : [];

    if (tasksToPersist.length > 0 && merge_deferred) {
      const row = await sql`
        SELECT config FROM tenants WHERE id = ${tenantId}::uuid LIMIT 1
      `;
      const config = (row.rows[0]?.config as Record<string, unknown> | null) || {};
      const existing = Array.isArray(config.onboarding_deferred)
        ? (config.onboarding_deferred as string[])
        : [];
      tasksToPersist = [...new Set([...existing, ...tasksToPersist])];
    }

    // Actualizar onboarding_status (+ tareas aplazadas en config)
    if (tasksToPersist.length > 0) {
      const patch = JSON.stringify({ onboarding_deferred: tasksToPersist });
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

    if (tasksToPersist.length > 0) {
      try {
        await upsertOnboardingReminders(tenantId, tasksToPersist);
      } catch (reminderErr) {
        console.warn('[onboarding-status] No se pudieron crear recordatorios:', reminderErr);
      }
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

