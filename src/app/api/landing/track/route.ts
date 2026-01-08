import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { z } from 'zod';

/**
 * ========================================
 * API: Landing Page Analytics Tracking
 * ========================================
 * Recibe eventos de tracking de la landing page
 */

const TrackEventSchema = z.object({
  session_id: z.string(),
  event_type: z.enum([
    'page_view',
    'scroll',
    'click',
    'form_start',
    'form_submit',
    'popup_view',
    'popup_close',
    'popup_click',
    'exit'
  ]),
  event_data: z.record(z.any()).optional(),
  user_agent: z.string().optional(),
  referrer: z.string().optional(),
  time_on_page: z.number().optional(), // segundos
});

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * POST - Registrar evento de tracking
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const parsed = TrackEventSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Datos inválidos',
          details: parsed.error.flatten()
        },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }
    
    const { session_id, event_type, event_data, user_agent, referrer, time_on_page } = parsed.data;
    
    // Obtener IP del cliente
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown';
    
    // Extraer user agent del request si no viene en body
    const finalUserAgent = user_agent || req.headers.get('user-agent') || 'unknown';
    
    // SIEMPRE asegurar que la sesión existe antes de insertar eventos
    // Usar INSERT ... ON CONFLICT para evitar race conditions
    try {
      await sql`
        INSERT INTO landing_sessions (
          session_id,
          started_at,
          user_agent,
          referrer,
          ip_address
        )
        VALUES (
          ${session_id},
          NOW(),
          ${finalUserAgent},
          ${referrer || null},
          ${ip}
        )
        ON CONFLICT (session_id) DO NOTHING
      `;
    } catch (insertError: any) {
      // Si falla, verificar que la sesión existe (puede haber sido creada por otro request)
      const existingSession = await sql`
        SELECT id FROM landing_sessions WHERE session_id = ${session_id} LIMIT 1
      `;
      
      if (existingSession.rows.length === 0) {
        // Si realmente no existe, lanzar error
        throw insertError;
      }
    }
    
    // Si es exit o form_submit, actualizar sesión
    if (event_type === 'exit' || event_type === 'form_submit') {
      if (event_type === 'exit' && time_on_page) {
        await sql`
          UPDATE landing_sessions
          SET 
            time_on_page = ${time_on_page},
            ended_at = NOW()
          WHERE session_id = ${session_id}
        `;
      }
      
      if (event_type === 'form_submit') {
        await sql`
          UPDATE landing_sessions
          SET 
            conversion = true,
            ended_at = NOW()
          WHERE session_id = ${session_id}
        `;
      }
    }
    
    // Registrar evento
    await sql`
      INSERT INTO landing_events (
        session_id,
        event_type,
        event_data,
        timestamp
      )
      VALUES (
        ${session_id},
        ${event_type},
        ${event_data ? JSON.stringify(event_data) : null},
        NOW()
      )
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Evento registrado correctamente'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    
  } catch (error: any) {
    console.error('❌ Error en landing/track:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error.message
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}

/**
 * GET - Health check
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Landing tracking API está funcionando'
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
