import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { z } from 'zod';

/**
 * ========================================
 * ENDPOINTS DE WAITLIST
 * ========================================
 * Maneja la lista de espera de usuarios interesados en el PMS
 */

const WaitlistSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional()
});

/**
 * POST - Agregar email a la waitlist
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const parsed = WaitlistSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Datos inválidos',
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }
    
    const { email, name, source, notes } = parsed.data;
    
    // Verificar si el email ya está en la waitlist
    const existing = await sql`
      SELECT id, activated_at FROM waitlist WHERE email = ${email} LIMIT 1
    `;
    
    if (existing.rows.length > 0) {
      const entry = existing.rows[0];
      
      // Si ya está activado, informar
      if (entry.activated_at) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Este email ya tiene una cuenta activa',
            alreadyActivated: true
          },
          { status: 400 }
        );
      }
      
      // Si ya está en waitlist pero no activado, informar
      return NextResponse.json(
        { 
          success: false, 
          error: 'Este email ya está en la lista de espera',
          alreadyInWaitlist: true
        },
        { status: 400 }
      );
    }
    
    // Verificar si el email ya tiene un tenant activo
    const existingTenant = await sql`
      SELECT id FROM tenants WHERE email = ${email} LIMIT 1
    `;
    
    if (existingTenant.rows.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Este email ya tiene una cuenta activa',
          alreadyActivated: true
        },
        { status: 400 }
      );
    }
    
    // Agregar a la waitlist
    const result = await sql`
      INSERT INTO waitlist (email, name, source, notes)
      VALUES (${email}, ${name || null}, ${source || null}, ${notes || null})
      RETURNING id, email, created_at
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Te hemos agregado a la lista de espera. Te notificaremos cuando el PMS esté disponible.',
      data: result.rows[0]
    });
    
  } catch (error: any) {
    console.error('Error agregando a waitlist:', error);
    
    // Si es error de constraint único, el email ya existe
    if (error.code === '23505') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Este email ya está en la lista de espera'
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al agregar a la lista de espera'
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Obtener estadísticas de waitlist (solo para admin interno)
 * Nota: En producción, esto debería estar protegido con autenticación
 */
export async function GET(req: NextRequest) {
  try {
    // Obtener estadísticas
    const stats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE activated_at IS NULL) as pending,
        COUNT(*) FILTER (WHERE activated_at IS NOT NULL) as activated
      FROM waitlist
    `;
    
    // Obtener últimos registros (solo si se solicita)
    const url = new URL(req.url);
    const includeEntries = url.searchParams.get('include_entries') === 'true';
    
    let entries = null;
    if (includeEntries) {
      const result = await sql`
        SELECT id, email, name, created_at, activated_at, tenant_id, source
        FROM waitlist
        ORDER BY created_at DESC
        LIMIT 100
      `;
      entries = result.rows;
    }
    
    return NextResponse.json({
      success: true,
      stats: stats.rows[0],
      entries: entries
    });
    
  } catch (error) {
    console.error('Error obteniendo waitlist:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al obtener la lista de espera'
      },
      { status: 500 }
    );
  }
}

