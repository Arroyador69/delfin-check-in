import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId, getTenantById } from '@/lib/tenant';
import { verifyToken } from '@/lib/auth';
import { effectivePlatformAdmin } from '@/lib/platform-owner';
import { sendEmail } from '@/lib/email';
import {
  parseReputationGoogleFromConfig,
  isProForReputation,
  isPlausibleGoogleReviewUrl,
  buildGoogleReviewReminderContent,
} from '@/lib/reputation-google';

function isValidEmailAddress(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export async function POST(req: NextRequest) {
  try {
    let tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) tenantId = await getTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const token = req.cookies.get('auth_token')?.value;
    const payload = token ? verifyToken(token) : null;
    const isPlatformAdmin = effectivePlatformAdmin(
      payload?.isPlatformAdmin,
      payload?.email
    );

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant no encontrado' }, { status: 404 });
    }

    if (!isProForReputation(tenant) && !isPlatformAdmin) {
      return NextResponse.json({ success: false, error: 'Disponible solo en plan Pro' }, { status: 403 });
    }

    const settings = parseReputationGoogleFromConfig(tenant.config as Record<string, unknown>);
    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    const urlFromBody = typeof body.reviewUrl === 'string' ? body.reviewUrl.trim() : '';
    const propertyIdRaw = (body as any).propertyId;
    const propertyId = typeof propertyIdRaw === 'number' ? propertyIdRaw : Number(propertyIdRaw);

    // Si se pasa propertyId, usar el enlace por propiedad (fallback al global del tenant).
    let propertyUrl = '';
    if (Number.isFinite(propertyId) && propertyId > 0) {
      try {
        await sql`ALTER TABLE tenant_properties ADD COLUMN IF NOT EXISTS google_review_url TEXT`;
      } catch (_) {}
      try {
        const r = await sql`
          SELECT COALESCE(google_review_url, '') AS google_review_url
          FROM tenant_properties
          WHERE id = ${propertyId}
            AND tenant_id = ${tenantId}::uuid
          LIMIT 1
        `;
        propertyUrl = String(r.rows?.[0]?.google_review_url || '').trim();
      } catch (_) {
        propertyUrl = '';
      }
    }

    const reviewUrl = urlFromBody || propertyUrl || settings.reviewUrl.trim();
    const locale =
      body.guestEmailLocale === 'en' || body.guestEmailLocale === 'es'
        ? body.guestEmailLocale
        : settings.guestEmailLocale;

    if (!reviewUrl || !isPlausibleGoogleReviewUrl(reviewUrl)) {
      return NextResponse.json(
        { success: false, error: 'Pega un enlace de reseña válido de Google en el campo o guárdalo antes.' },
        { status: 400 }
      );
    }

    let targetEmail = String(tenant.email || '').trim();
    if (typeof body.to === 'string' && body.to.trim()) {
      const addr = body.to.trim();
      if (!isValidEmailAddress(addr)) {
        return NextResponse.json(
          { success: false, error: 'Introduce un email válido para la prueba.' },
          { status: 400 }
        );
      }
      targetEmail = addr;
    }
    if (!targetEmail || !isValidEmailAddress(targetEmail)) {
      return NextResponse.json(
        { success: false, error: 'No hay email de destino válido.' },
        { status: 400 }
      );
    }

    const msgEs =
      typeof body.guestMessageEs === 'string' ? body.guestMessageEs : settings.guestMessageEs;
    const msgEn =
      typeof body.guestMessageEn === 'string' ? body.guestMessageEn : settings.guestMessageEn;
    const guestMessage = locale === 'en' ? msgEn : msgEs;

    const { subject, html, text } = buildGoogleReviewReminderContent({
      guestName: locale === 'en' ? 'Alex Guest' : 'María Huésped',
      propertyName: locale === 'en' ? 'Sample apartment' : 'Apartamento de ejemplo',
      reviewUrl,
      locale,
      tenantBrandName: tenant.name || 'Delfín Check-in',
      guestMessage: guestMessage.trim() ? guestMessage : null,
    });

    const result = await sendEmail({
      to: targetEmail,
      subject: `[Prueba] ${subject}`,
      html,
      text,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'No se pudo enviar el correo de prueba' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      sentTo: targetEmail,
      locale,
    });
  } catch (e) {
    console.error('[reputation-google test-email]', e);
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 });
  }
}
