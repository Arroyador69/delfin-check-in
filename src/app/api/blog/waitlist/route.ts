import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * ========================================
 * API: Waitlist con tracking de origen
 * ========================================
 * Permite registrar leads desde landing o artículos
 * y trackea el origen para analytics
 */

// Configuración CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://delfincheckin.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400', // 24 horas
};

// Manejar preflight requests (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, source = 'landing' } = body;

    // Validaciones
    if (!email) {
      return NextResponse.json(
        { error: 'El email es obligatorio' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verificar si el email ya existe
    const existingUser = await sql`
      SELECT id, email, source, created_at 
      FROM waitlist 
      WHERE email = ${email}
      LIMIT 1
    `;

    if (existingUser.rows.length > 0) {
      // Email ya registrado, devolver info pero no error
      return NextResponse.json(
        {
          success: true,
          already_registered: true,
          message: 'Ya estás registrado en nuestra lista de espera',
          user: {
            email: existingUser.rows[0].email,
            source: existingUser.rows[0].source,
            registered_at: existingUser.rows[0].created_at
          }
        },
        { headers: corsHeaders }
      );
    }

    // Insertar nuevo usuario en la waitlist
    const result = await sql`
      INSERT INTO waitlist (email, name, source)
      VALUES (${email}, ${name || null}, ${source})
      RETURNING id, email, name, source, created_at
    `;

    console.log('✅ Nuevo usuario en waitlist:', {
      email,
      source,
      timestamp: new Date().toISOString()
    });

    // Si es desde un artículo, incrementar contador de conversiones
    if (source && source.startsWith('article:')) {
      const articleSlug = source.replace('article:', '');
      await sql`
        UPDATE blog_articles
        SET conversion_count = conversion_count + 1
        WHERE slug = ${articleSlug}
      `;
    }

    return NextResponse.json(
      {
        success: true,
        already_registered: false,
        message: '¡Gracias por registrarte! Te avisaremos cuando esté disponible.',
        user: result.rows[0]
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Error registrando en waitlist:', error);
    
    // Error de unicidad (por si hay race condition)
    if (error.code === '23505') {
      return NextResponse.json(
        {
          success: true,
          already_registered: true,
          message: 'Ya estás registrado en nuestra lista de espera'
        },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al procesar tu registro. Inténtalo de nuevo.' 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET: Obtener estadísticas de conversión por source (solo para superadmin)
 */
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación básica (puedes usar verifySuperAdmin aquí)
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const source = searchParams.get('source');

    let query;
    if (source) {
      // Estadísticas de un source específico
      query = sql`
        SELECT 
          source,
          COUNT(*) as total_leads,
          COUNT(DISTINCT email) as unique_leads,
          MIN(created_at) as first_lead,
          MAX(created_at) as last_lead
        FROM waitlist
        WHERE source = ${source}
        GROUP BY source
      `;
    } else {
      // Estadísticas agrupadas por source
      query = sql`
        SELECT 
          source,
          COUNT(*) as total_leads,
          COUNT(DISTINCT email) as unique_leads,
          MIN(created_at) as first_lead,
          MAX(created_at) as last_lead
        FROM waitlist
        WHERE source IS NOT NULL
        GROUP BY source
        ORDER BY total_leads DESC
      `;
    }

    const result = await query;

    return NextResponse.json({
      success: true,
      stats: result.rows
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo stats de waitlist:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
