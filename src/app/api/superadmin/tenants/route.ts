import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const authToken = req.cookies.get('auth_token')?.value
    
    if (!authToken) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar que sea superadmin
    const payload = verifyToken(authToken)
    
    if (!payload || !payload.isPlatformAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      )
    }

    // Obtener todos los tenants
    const tenantsResult = await sql`
      SELECT 
        t.id,
        t.name,
        t.email,
        t.plan_id,
        t.status,
        t.max_rooms,
        t.current_rooms,
        t.created_at
      FROM tenants t
      ORDER BY t.created_at DESC
    `

    return NextResponse.json({
      tenants: tenantsResult.rows
    })

  } catch (error) {
    console.error('❌ Error fetching tenants:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

