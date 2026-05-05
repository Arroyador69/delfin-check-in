import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner'
import { sendEmail } from '@/lib/email'
import { sql } from '@/lib/db'
import { z } from 'zod'

const sendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().optional(),
  emailType: z.enum(['onboarding', 'legal_notice', 'upsell', 'incident', 'custom']).optional(),
  tenantId: z.string().uuid().optional()
})

/**
 * POST /api/superadmin/emails/send
 * Envía un email desde el superadmin y lo registra en tracking
 */
export async function POST(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value
    
    if (!authToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const payload = verifyToken(authToken)
    if (!payload || !isEffectiveSuperAdminPayload(payload)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await req.json()
    const data = sendEmailSchema.parse(body)

    const recipients = Array.isArray(data.to) ? data.to : [data.to]
    const results = []

    for (const recipient of recipients) {
      try {
        // Enviar email
        const emailResult = await sendEmail({
          from: process.env.ZOHO_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || 'noreply@delfincheckin.com',
          to: recipient,
          subject: data.subject,
          html: data.html,
          text: data.text
        })

        // Registrar en tracking
        if (emailResult.success) {
          await sql`
            INSERT INTO email_tracking (
              tenant_id, email_type, recipient_email, subject,
              message_id, status, metadata
            )
            VALUES (
              ${data.tenantId || null},
              ${data.emailType || 'custom'},
              ${recipient},
              ${data.subject},
              ${emailResult.messageId || null},
              'sent',
              ${JSON.stringify({ sentBy: 'superadmin', userId: payload.userId })}
            )
          `
        }

        results.push({
          recipient,
          success: emailResult.success,
          messageId: emailResult.messageId,
          error: emailResult.error
        })

      } catch (error) {
        console.error(`❌ Error enviando email a ${recipient}:`, error)
        results.push({
          recipient,
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        })
      }
    }

    const allSuccess = results.every(r => r.success)
    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: allSuccess,
      message: `Enviados ${successCount} de ${recipients.length} emails`,
      results
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }
    console.error('❌ Error sending email:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

