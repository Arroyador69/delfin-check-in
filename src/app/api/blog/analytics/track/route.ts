import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * ========================================
 * API: Tracking de Analytics para Artículos
 * ========================================
 * Registra eventos y sesiones de usuarios en artículos
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      article_slug,
      session_id,
      event_type, // 'page_view', 'scroll', 'click', 'popup_view', 'popup_close', 'popup_click', 'form_start', 'form_submit', 'exit'
      event_data = {},
      session_data = {}
    } = body;

    if (!article_slug || !session_id) {
      return NextResponse.json(
        { error: 'Se requieren article_slug y session_id' },
        { status: 400 }
      );
    }

    // Obtener article_id desde el slug
    const articleResult = await sql`
      SELECT id FROM blog_articles WHERE slug = ${article_slug} LIMIT 1
    `;

    if (articleResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    const article_id = articleResult.rows[0].id;

    // ========================================
    // REGISTRAR O ACTUALIZAR SESIÓN
    // ========================================
    const {
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      user_agent,
      device_type,
      time_on_page,
      scroll_depth,
      conversion,
      popup_viewed,
      popup_closed,
      popup_clicked
    } = session_data;

    // Verificar si la sesión ya existe
    const existingSession = await sql`
      SELECT id FROM blog_analytics_sessions
      WHERE article_id = ${article_id}::uuid
      AND session_id = ${session_id}
      LIMIT 1
    `;

    if (existingSession.rows.length === 0) {
      // Crear nueva sesión
      await sql`
        INSERT INTO blog_analytics_sessions (
          article_id, session_id, referrer, utm_source, utm_medium, utm_campaign,
          user_agent, device_type, time_on_page, scroll_depth,
          popup_viewed, popup_closed, popup_clicked, conversion
        ) VALUES (
          ${article_id}::uuid, ${session_id}, ${referrer || null}, 
          ${utm_source || null}, ${utm_medium || null}, ${utm_campaign || null},
          ${user_agent || null}, ${device_type || null}, ${time_on_page || 0}, 
          ${scroll_depth || 0}, ${popup_viewed || false}, ${popup_closed || false},
          ${popup_clicked || false}, ${conversion || false}
        )
      `;
    } else {
      // Actualizar sesión existente
      const updates: any = {};
      if (time_on_page !== undefined) updates.time_on_page = time_on_page;
      if (scroll_depth !== undefined) updates.scroll_depth = scroll_depth;
      if (popup_viewed !== undefined) updates.popup_viewed = popup_viewed;
      if (popup_closed !== undefined) updates.popup_closed = popup_closed;
      if (popup_clicked !== undefined) updates.popup_clicked = popup_clicked;
      if (conversion !== undefined) updates.conversion = conversion;

      if (Object.keys(updates).length > 0) {
        const setClause = Object.keys(updates)
          .map(key => `${key} = $${Object.keys(updates).indexOf(key) + 3}`)
          .join(', ');

        await sql.query(
          `UPDATE blog_analytics_sessions 
           SET ${setClause}, ended_at = NOW()
           WHERE article_id = $1::uuid AND session_id = $2`,
          [article_id, session_id, ...Object.values(updates)]
        );
      }
    }

    // ========================================
    // REGISTRAR EVENTO
    // ========================================
    if (event_type) {
      await sql`
        INSERT INTO blog_analytics_events (
          article_id, session_id, event_type, event_data
        ) VALUES (
          ${article_id}::uuid, ${session_id}, ${event_type}, 
          ${JSON.stringify(event_data)}::jsonb
        )
      `;

      // Actualizar contadores específicos en el artículo
      if (event_type === 'page_view') {
        await sql`
          UPDATE blog_articles
          SET view_count = view_count + 1
          WHERE id = ${article_id}::uuid
        `;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Evento registrado correctamente'
    });

  } catch (error: any) {
    console.error('❌ Error tracking analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
