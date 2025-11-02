import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// CORS headers para permitir llamadas desde páginas externas
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, source } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Email válido requerido' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verificar si el email ya existe
    const existing = await sql`
      SELECT id FROM programmatic_leads 
      WHERE email = ${email.toLowerCase().trim()} 
      AND source = ${source || 'programmatic_page'}
    `;

    if (existing.rows.length > 0) {
      // Si ya existe, solo actualizar la fecha
      await sql`
        UPDATE programmatic_leads 
        SET updated_at = now(), views_count = views_count + 1
        WHERE email = ${email.toLowerCase().trim()}
      `;
    } else {
      // Obtener IP del cliente
      const clientIP = req.headers.get('x-forwarded-for') || 
                       req.headers.get('x-real-ip') || 
                       'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';
      const referer = req.headers.get('referer') || 'unknown';

      // Insertar nuevo lead
      await sql`
        INSERT INTO programmatic_leads (
          email, source, ip_address, user_agent, referer
        ) VALUES (
          ${email.toLowerCase().trim()},
          ${source || 'programmatic_page'},
          ${clientIP},
          ${userAgent},
          ${referer}
        )
      `;
    }

    console.log(`📧 Lead capturado: ${email} desde ${source || 'programmatic_page'}`);

    return NextResponse.json(
      { success: true, message: 'Email guardado correctamente' },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Error capturando lead:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500, headers: corsHeaders }
    );
  }
}

