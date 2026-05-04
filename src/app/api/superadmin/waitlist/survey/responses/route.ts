/**
 * GET /api/superadmin/waitlist/survey/responses
 * Lista respuestas de la encuesta. Query: ?campaign_key=X (opcional; si no, última campaña).
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value
    if (!authToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    const payload = verifyToken(authToken)
    if (!isEffectiveSuperAdminPayload(payload)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    let campaignKey = req.nextUrl.searchParams.get('campaign_key')
    if (!campaignKey) {
      const latest = await sql`
        SELECT metadata->>'campaign_key' AS campaign_key
        FROM email_tracking
        WHERE email_type = 'waitlist_survey' AND metadata->>'campaign_key' IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
      `
      campaignKey = (latest.rows[0] as { campaign_key: string } | undefined)?.campaign_key ?? null
    }

    if (!campaignKey) {
      return NextResponse.json({
        success: true,
        campaign_key: null,
        responses: [],
      })
    }

    const rows = await sql`
      SELECT id, email, responded_at, answers, created_at
      FROM waitlist_survey_responses
      WHERE campaign_key = ${campaignKey}
      ORDER BY responded_at DESC
    `

    const responses = (rows.rows as Array<{
      id: string
      email: string
      responded_at: string
      answers: Record<string, unknown>
      created_at: string
    }>).map((r) => ({
      id: r.id,
      email: r.email,
      responded_at: r.responded_at,
      created_at: r.created_at,
      answers: r.answers || {},
    }))

    return NextResponse.json({
      success: true,
      campaign_key: campaignKey,
      responses,
    })
  } catch (e) {
    console.error('Error survey responses:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    )
  }
}
