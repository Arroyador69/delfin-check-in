import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyToken } from '@/lib/auth';

/**
 * Endpoint para actualizar el plan de un tenant (solo SuperAdmin)
 * PUT /api/superadmin/tenants/update-plan
 * Body: { tenant_id: string, plan_type: 'free' | 'checkin' | 'standard' | 'pro' }
 */
export async function PUT(req: NextRequest) {
  try {
    // Verificar autenticación
    const authToken = req.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que sea superadmin
    const payload = verifyToken(authToken);
    
    if (!payload || !payload.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: 'Acceso denegado. Solo SuperAdmin puede actualizar planes.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { tenant_id, plan_type } = body;

    if (!tenant_id || !plan_type) {
      return NextResponse.json(
        { success: false, error: 'tenant_id y plan_type son requeridos' },
        { status: 400 }
      );
    }

    if (!['free', 'checkin', 'standard', 'pro'].includes(plan_type)) {
      return NextResponse.json(
        { success: false, error: 'plan_type debe ser: free, checkin, standard o pro' },
        { status: 400 }
      );
    }

    // Configuración según el plan (ver PLANS.md)
    const planConfig = {
      free: {
        plan_id: 'basic',
        ads_enabled: true,
        legal_module: false,
        max_rooms: 2,
        max_rooms_included: 2,
        base_plan_price: 0,
        extra_room_price: null,
      },
      checkin: {
        plan_id: 'premium',
        ads_enabled: true,
        legal_module: true,
        max_rooms: -1,
        max_rooms_included: 0,
        base_plan_price: 2.00,
        extra_room_price: 2.00,
      },
      standard: {
        plan_id: 'standard',
        ads_enabled: false,
        legal_module: true,
        max_rooms: -1,
        max_rooms_included: 4,
        base_plan_price: 9.99,
        extra_room_price: 2.00,
      },
      pro: {
        plan_id: 'enterprise',
        ads_enabled: false,
        legal_module: true,
        max_rooms: -1,
        max_rooms_included: 6,
        base_plan_price: 29.99,
        extra_room_price: 2.00,
      },
    };

    const config = planConfig[plan_type as keyof typeof planConfig];

    // Actualizar tenant
    const result = await sql`
      UPDATE tenants
      SET 
        plan_type = ${plan_type},
        plan_id = ${config.plan_id},
        ads_enabled = ${config.ads_enabled},
        legal_module = ${config.legal_module},
        max_rooms = ${config.max_rooms},
        max_rooms_included = ${config.max_rooms_included},
        base_plan_price = ${config.base_plan_price},
        extra_room_price = ${config.extra_room_price},
        updated_at = NOW()
      WHERE id = ${tenant_id}::uuid
      RETURNING id, name, email, plan_type, plan_id, ads_enabled, legal_module, max_rooms
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    console.log(`✅ [SuperAdmin] Plan actualizado: ${result.rows[0].name} -> ${plan_type.toUpperCase()}`);

    return NextResponse.json({
      success: true,
      message: `Plan actualizado a ${plan_type.toUpperCase()}`,
      tenant: result.rows[0]
    });

  } catch (error: any) {
    console.error('❌ Error actualizando plan del tenant:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
