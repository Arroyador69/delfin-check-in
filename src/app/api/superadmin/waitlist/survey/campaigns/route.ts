/**
 * GET /api/superadmin/waitlist/survey/campaigns
 * Lista campañas de encuesta (agrupado por metadata->campaign_key).
 * Query: ?campaign_key=X devuelve detalle por destinatario (abierto, clic, rellenado).
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value
    if (!authToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    const payload = verifyToken(authToken)
    if (!payload?.isPlatformAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const campaignKey = req.nextUrl.searchParams.get('campaign_key')

    if (campaignKey) {
      const rows = await sql`
        SELECT
          et.id,
          et.recipient_email,
          et.subject,
          et.status,
          et.created_at AS sent_at,
          et.opened_at,
          et.clicked_at,
          et.opened_count,
          et.clicked_count
        FROM email_tracking et
        WHERE et.email_type = 'waitlist_survey'
          AND et.metadata->>'campaign_key' = ${campaignKey}
        ORDER BY et.created_at DESC
      `
      const ids = (rows.rows as { id: string }[]).map((r) => r.id)
      const completed =
        ids.length > 0
          ? await sql`
              SELECT email_tracking_id
              FROM waitlist_survey_responses
              WHERE email_tracking_id = ANY(${ids})
            `
          : { rows: [] }
      const completedSet = new Set(
        (completed.rows as { email_tracking_id: string }[]).map((r) => r.email_tracking_id)
      )

      const detail = (rows.rows as Array<{
        id: string
        recipient_email: string
        sent_at: string
        opened_at: string | null
        clicked_at: string | null
        opened_count: number
        clicked_count: number
      }>).map((r) => ({
        id: r.id,
        email: r.recipient_email,
        sent_at: r.sent_at,
        opened: !!r.opened_at || (r.opened_count ?? 0) > 0,
        opened_at: r.opened_at,
        clicked: !!r.clicked_at || (r.clicked_count ?? 0) > 0,
        clicked_at: r.clicked_at,
        completed: completedSet.has(r.id),
      }))

      return NextResponse.json({
        success: true,
        campaign_key: campaignKey,
        detail,
      })
    }

    const campaigns = await sql`
      SELECT
        et.metadata->>'campaign_key' AS campaign_key,
        COUNT(*)::int AS sent_count,
        COUNT(*) FILTER (WHERE et.status IN ('opened', 'clicked') OR et.opened_count > 0)::int AS opened_count,
        COUNT(*) FILTER (WHERE et.status = 'clicked' OR et.clicked_count > 0)::int AS clicked_count
      FROM email_tracking et
      WHERE et.email_type = 'waitlist_survey'
        AND et.metadata->>'campaign_key' IS NOT NULL
      GROUP BY et.metadata->>'campaign_key'
      ORDER BY MAX(et.created_at) DESC
    `

    const campaignKeys = (campaigns.rows as { campaign_key: string }[])
      .map((r) => r.campaign_key)
      .filter(Boolean)
    const completedCounts =
      campaignKeys.length > 0
        ? await sql`
            SELECT campaign_key, COUNT(*)::int AS completed_count
            FROM waitlist_survey_responses
            WHERE campaign_key = ANY(${campaignKeys})
            GROUP BY campaign_key
          `
        : { rows: [] }
    const completedByKey: Record<string, number> = {}
    for (const r of completedCounts.rows as { campaign_key: string; completed_count: number }[]) {
      completedByKey[r.campaign_key] = r.completed_count
    }

    const list = (campaigns.rows as Array<{ campaign_key: string; sent_count: number; opened_count: number; clicked_count: number }>).map(
      (r) => ({
        campaign_key: r.campaign_key,
        sent_count: r.sent_count,
        opened_count: r.opened_count,
        clicked_count: r.clicked_count,
        completed_count: completedByKey[r.campaign_key] ?? 0,
      })
    )

    return NextResponse.json({
      success: true,
      campaigns: list,
    })
  } catch (e) {
    console.error('Error survey campaigns:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    )
  }
}
