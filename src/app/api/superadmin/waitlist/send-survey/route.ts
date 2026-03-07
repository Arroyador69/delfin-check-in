/**
 * POST /api/superadmin/waitlist/send-survey
 * Envía el email de la encuesta a todos los pendientes de la waitlist.
 * Body opcional: { testEmail: "tu@email.com" } para enviar solo una prueba a ese email (no tiene que estar en la waitlist).
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { sql } from '@/lib/db'
import { getWaitlistSurveyEmail } from '@/lib/waitlist-emails'

const CAMPAIGN_KEY_PREFIX = 'waitlist_survey'

function getCampaignKey(): string {
  const now = new Date()
  return `${CAMPAIGN_KEY_PREFIX}_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || '')
}

export async function POST(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value
    if (!authToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    const payload = verifyToken(authToken)
    if (!payload?.isPlatformAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    let body: { testEmail?: string } = {}
    try {
      body = await req.json()
    } catch {
      // body vacío = envío masivo
    }

    const campaignKey = getCampaignKey()
    const adminBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      'https://admin.delfincheckin.com'

    // Envío de prueba a un solo email (manual)
    if (body.testEmail && isValidEmail(body.testEmail)) {
      const testEmail = body.testEmail.trim()
      const insert = await sql`
        INSERT INTO email_tracking (
          tenant_id, email_type, recipient_email, subject,
          message_id, status, metadata
        )
        VALUES (
          NULL,
          'waitlist_survey',
          ${testEmail},
          ${'📋 Encuesta Delfín Check-in – 2 minutos y nos ayudas mucho'},
          NULL,
          'sent',
          ${JSON.stringify({ campaign_key: campaignKey, sentBy: 'superadmin', userId: payload.userId, test: true })}
        )
        RETURNING id
      `
      const trackingId = (insert.rows[0] as { id: string })?.id
      if (!trackingId) {
        return NextResponse.json({ success: false, error: 'No se pudo crear el tracking' }, { status: 500 })
      }
      const { html, text, subject } = getWaitlistSurveyEmail({
        userName: 'Prueba',
        trackingId,
        adminBaseUrl,
      })
      const emailResult = await sendEmail({
        from: process.env.ZOHO_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || 'noreply@delfincheckin.com',
        to: testEmail,
        subject,
        html,
        text,
      })
      if (emailResult.success && emailResult.messageId) {
        await sql`
          UPDATE email_tracking
          SET message_id = ${emailResult.messageId}, updated_at = NOW()
          WHERE id = ${trackingId}
        `
      }
      return NextResponse.json({
        success: emailResult.success,
        message: emailResult.success
          ? `Email de prueba enviado a ${testEmail}. Abre el correo, haz clic en el enlace, rellena la encuesta y verás el mensaje de éxito; luego en esta página podrás ver abierto, clic y rellenado.`
          : `Error al enviar: ${emailResult.error || 'desconocido'}`,
        sent: emailResult.success ? 1 : 0,
        campaign_key: campaignKey,
        results: [{ email: testEmail, success: emailResult.success, error: emailResult.error }],
      })
    }

    const pending = await sql`
      SELECT id, email, name
      FROM waitlist
      WHERE activated_at IS NULL
      ORDER BY created_at ASC
    `

    const recipients = pending.rows as { id: string; email: string; name: string | null }[]
    if (recipients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay destinatarios pendientes en la waitlist',
        sent: 0,
        campaign_key: campaignKey,
      })
    }

    const results: { email: string; success: boolean; error?: string }[] = []

    for (const r of recipients) {
      try {
        const insert = await sql`
          INSERT INTO email_tracking (
            tenant_id, email_type, recipient_email, subject,
            message_id, status, metadata
          )
          VALUES (
            NULL,
            'waitlist_survey',
            ${r.email},
            ${'📋 Encuesta Delfín Check-in – 2 minutos y nos ayudas mucho'},
            NULL,
            'sent',
            ${JSON.stringify({ campaign_key: campaignKey, sentBy: 'superadmin', userId: payload.userId })}
          )
          RETURNING id
        `
        const trackingId = (insert.rows[0] as { id: string })?.id
        if (!trackingId) {
          results.push({ email: r.email, success: false, error: 'No se creó tracking' })
          continue
        }

        const { html, text, subject } = getWaitlistSurveyEmail({
          userName: r.name || 'propietario',
          trackingId,
          adminBaseUrl,
        })

        const emailResult = await sendEmail({
          from: process.env.ZOHO_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || 'noreply@delfincheckin.com',
          to: r.email,
          subject,
          html,
          text,
        })

        if (emailResult.success && emailResult.messageId) {
          await sql`
            UPDATE email_tracking
            SET message_id = ${emailResult.messageId}, updated_at = NOW()
            WHERE id = ${trackingId}
          `
        }

        results.push({ email: r.email, success: emailResult.success, error: emailResult.error })
      } catch (err) {
        results.push({
          email: r.email,
          success: false,
          error: err instanceof Error ? err.message : 'Error desconocido',
        })
      }
    }

    const sent = results.filter((x) => x.success).length
    return NextResponse.json({
      success: true,
      message: `Enviados ${sent} de ${recipients.length} emails de encuesta`,
      sent,
      total: recipients.length,
      campaign_key: campaignKey,
      results,
    })
  } catch (e) {
    console.error('Error send-survey:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error al enviar encuesta' },
      { status: 500 }
    )
  }
}
