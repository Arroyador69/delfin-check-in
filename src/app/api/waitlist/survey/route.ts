/**
 * POST /api/waitlist/survey
 * Recibe respuestas de la encuesta (formulario en delfincheckin.com/encuesta).
 * Público; CORS permitido desde delfincheckin.com.
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allow =
    origin === 'https://delfincheckin.com' ||
    (origin && /^https?:\/\/localhost(:\d+)?$/.test(origin))
      ? origin
      : 'https://delfincheckin.com'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tid, email: bodyEmail, answers: rawAnswers } = body

    const answers = {
      want_beta: rawAnswers?.want_beta ?? null,
      properties_count: rawAnswers?.properties_count ?? null,
      what_features: rawAnswers?.what_features ?? null,
      accommodation_type: rawAnswers?.accommodation_type ?? null,
      has_direct_reservations: rawAnswers?.has_direct_reservations ?? null,
      current_software: rawAnswers?.current_software ?? null,
      current_monthly_pay: rawAnswers?.current_monthly_pay ?? null,
      plan_choice: rawAnswers?.plan_choice ?? null,
      price_perception: rawAnswers?.price_perception ?? null,
      comments: rawAnswers?.comments ?? null,
    }

    let campaignKey = 'waitlist_survey'
    let recipientEmail: string | null = null

    if (tid) {
      const row = await sql`
        SELECT id, recipient_email, metadata
        FROM email_tracking
        WHERE id = ${tid}
        LIMIT 1
      `
      if (row.rows.length > 0) {
        const r = row.rows[0] as { recipient_email: string; metadata: { campaign_key?: string } | null }
        recipientEmail = r.recipient_email
        campaignKey = (r.metadata && typeof r.metadata === 'object' && r.metadata.campaign_key) || campaignKey
      }
    }

    const email = recipientEmail || bodyEmail || null
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Falta email o identificador de encuesta' },
        { status: 400, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
      )
    }

    await sql`
      INSERT INTO waitlist_survey_responses (
        email_tracking_id, campaign_key, email, answers
      )
      VALUES (
        ${tid || null},
        ${campaignKey},
        ${email},
        ${JSON.stringify(answers)}
      )
    `

    const cors = getCorsHeaders(req.headers.get('origin'))
    return NextResponse.json(
      { success: true, message: 'Gracias por completar la encuesta' },
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('Error guardando encuesta waitlist:', e)
    return NextResponse.json(
      { success: false, error: 'Error al guardar la encuesta' },
      { status: 500, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req.headers.get('origin')) } }
    )
  }
}
