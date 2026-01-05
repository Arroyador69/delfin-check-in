import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const affiliateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  commission_rate: z.number().min(0).max(100).optional(),
  commission_months: z.number().int().min(1).optional(),
  status: z.enum(['active', 'pending', 'blocked', 'inactive']).optional(),
  notes: z.string().optional()
})

/**
 * GET /api/superadmin/affiliates
 * Obtiene todos los afiliados
 */
export async function GET(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value
    
    if (!authToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const payload = verifyToken(authToken)
    if (!payload || !payload.isPlatformAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const affiliates = await sql`
      SELECT 
        a.*,
        COUNT(DISTINCT r.id) as total_referrals,
        COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'converted') as converted_referrals
      FROM affiliates a
      LEFT JOIN referrals r ON r.affiliate_id = a.id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `

    return NextResponse.json({
      success: true,
      affiliates: affiliates.rows.map((a: any) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        code: a.code,
        referralLink: a.referral_link,
        commissionRate: parseFloat(a.commission_rate || '0'),
        commissionMonths: parseInt(a.commission_months || '0'),
        status: a.status,
        totalUsersBrought: parseInt(a.total_users_brought || '0'),
        totalRevenueGenerated: parseFloat(a.total_revenue_generated || '0'),
        totalCommissionEarned: parseFloat(a.total_commission_earned || '0'),
        totalCommissionPaid: parseFloat(a.total_commission_paid || '0'),
        totalReferrals: parseInt(a.total_referrals || '0'),
        convertedReferrals: parseInt(a.converted_referrals || '0'),
        notes: a.notes,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      }))
    })

  } catch (error) {
    console.error('❌ Error fetching affiliates:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/superadmin/affiliates
 * Crea un nuevo afiliado
 */
export async function POST(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value
    
    if (!authToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const payload = verifyToken(authToken)
    if (!payload || !payload.isPlatformAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await req.json()
    const data = affiliateSchema.parse(body)

    // Generar código único
    const code = `AFF-${Date.now().toString(36).toUpperCase()}`
    const referralLink = `https://delfincheckin.com/?ref=${code}`

    const result = await sql`
      INSERT INTO affiliates (
        name, email, code, referral_link,
        commission_rate, commission_months, status, notes
      )
      VALUES (
        ${data.name},
        ${data.email},
        ${code},
        ${referralLink},
        ${data.commission_rate || 25.00},
        ${data.commission_months || 12},
        ${data.status || 'active'},
        ${data.notes || null}
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      affiliate: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        email: result.rows[0].email,
        code: result.rows[0].code,
        referralLink: result.rows[0].referral_link,
        commissionRate: parseFloat(result.rows[0].commission_rate || '0'),
        commissionMonths: parseInt(result.rows[0].commission_months || '0'),
        status: result.rows[0].status
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }
    console.error('❌ Error creating affiliate:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/superadmin/affiliates
 * Actualiza un afiliado
 */
export async function PUT(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value
    
    if (!authToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const payload = verifyToken(authToken)
    if (!payload || !payload.isPlatformAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (updateData.name) {
      updates.push(`name = $${paramIndex++}`)
      values.push(updateData.name)
    }
    if (updateData.email) {
      updates.push(`email = $${paramIndex++}`)
      values.push(updateData.email)
    }
    if (updateData.commission_rate !== undefined) {
      updates.push(`commission_rate = $${paramIndex++}`)
      values.push(updateData.commission_rate)
    }
    if (updateData.commission_months !== undefined) {
      updates.push(`commission_months = $${paramIndex++}`)
      values.push(updateData.commission_months)
    }
    if (updateData.status) {
      updates.push(`status = $${paramIndex++}`)
      values.push(updateData.status)
    }
    if (updateData.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`)
      values.push(updateData.notes)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    values.push(id)
    const query = `UPDATE affiliates SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`
    
    const result = await sql.unsafe(query, values)

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Afiliado no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      affiliate: result.rows[0]
    })

  } catch (error) {
    console.error('❌ Error updating affiliate:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/superadmin/affiliates?id=...
 * Elimina un afiliado (soft delete: cambia status a inactive)
 */
export async function DELETE(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value
    
    if (!authToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const payload = verifyToken(authToken)
    if (!payload || !payload.isPlatformAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const url = new URL(req.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Soft delete: cambiar status a inactive
    const result = await sql`
      UPDATE affiliates
      SET status = 'inactive', updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Afiliado no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Afiliado desactivado correctamente'
    })

  } catch (error) {
    console.error('❌ Error deleting affiliate:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

