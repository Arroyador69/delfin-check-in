import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId, getTenantById } from '@/lib/tenant';
import { verifyToken } from '@/lib/auth';
import {
  parseReputationGoogleFromConfig,
  mergeReputationIntoConfig,
  isProForReputation,
  isPlausibleGoogleReviewUrl,
  GUEST_MESSAGE_MAX_LENGTH,
  RECOMMENDED_GUEST_MESSAGE_ES,
  RECOMMENDED_GUEST_MESSAGE_EN,
  type ReputationGoogleSettings,
} from '@/lib/reputation-google';

async function resolveTenantId(req: NextRequest): Promise<string | null> {
  let tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) tenantId = await getTenantId(req);
  return tenantId;
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant no encontrado' }, { status: 404 });
    }

    const settings = parseReputationGoogleFromConfig(tenant.config as Record<string, unknown>);
    const isPro = isProForReputation(tenant);

    return NextResponse.json({
      success: true,
      settings,
      isPro,
      recommendedGuestMessages: {
        es: RECOMMENDED_GUEST_MESSAGE_ES,
        en: RECOMMENDED_GUEST_MESSAGE_EN,
      },
    });
  } catch (e) {
    console.error('[reputation-google GET]', e);
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const token = req.cookies.get('auth_token')?.value;
    const payload = token ? verifyToken(token) : null;
    const isPlatformAdmin = Boolean(payload?.isPlatformAdmin);

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant no encontrado' }, { status: 404 });
    }

    if (!isProForReputation(tenant) && !isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: 'Disponible solo en plan Pro' },
        { status: 403 }
      );
    }

    const body = (await req.json()) as Partial<ReputationGoogleSettings>;
    const currentConfig = (tenant.config || {}) as Record<string, unknown>;
    const prev = parseReputationGoogleFromConfig(currentConfig);

    const clip = (s: unknown) =>
      typeof s === 'string' ? s.slice(0, GUEST_MESSAGE_MAX_LENGTH) : '';

    const next: ReputationGoogleSettings = {
      enabled: typeof body.enabled === 'boolean' ? body.enabled : prev.enabled,
      reviewUrl: typeof body.reviewUrl === 'string' ? body.reviewUrl : prev.reviewUrl,
      guestEmailLocale:
        body.guestEmailLocale === 'en'
          ? 'en'
          : body.guestEmailLocale === 'es'
            ? 'es'
            : prev.guestEmailLocale,
      guestMessageEs:
        typeof body.guestMessageEs === 'string' ? clip(body.guestMessageEs) : prev.guestMessageEs,
      guestMessageEn:
        typeof body.guestMessageEn === 'string' ? clip(body.guestMessageEn) : prev.guestMessageEn,
    };

    if (next.enabled) {
      if (!next.reviewUrl.trim()) {
        return NextResponse.json(
          { success: false, error: 'Pega el enlace de reseña de Google para activar el envío.' },
          { status: 400 }
        );
      }
      if (!isPlausibleGoogleReviewUrl(next.reviewUrl)) {
        return NextResponse.json(
          {
            success: false,
            error:
              'El enlace no parece un enlace de Google (Maps, Perfil de empresa o g.page). Revísalo y vuelve a guardar.',
          },
          { status: 400 }
        );
      }
    }

    const updatedConfig = mergeReputationIntoConfig(currentConfig, next);

    await sql`
      UPDATE tenants
      SET config = ${JSON.stringify(updatedConfig)}::jsonb,
          updated_at = NOW()
      WHERE id = ${tenantId}::uuid
    `;

    return NextResponse.json({ success: true, settings: next });
  } catch (e) {
    console.error('[reputation-google PUT]', e);
    return NextResponse.json({ success: false, error: 'Error al guardar' }, { status: 500 });
  }
}
