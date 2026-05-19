import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyToken } from '@/lib/auth';
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner';
import {
  buildPlatformBroadcastEmailHtml,
  buildPlatformBroadcastPlainText,
} from '@/lib/platform-broadcast-email';

const previewSchema = z.object({
  subject: z.string().min(1).max(200),
  heroTitle: z.string().min(1).max(120),
  heroSubtitle: z.string().max(200).optional(),
  body: z.string().min(1).max(12000),
  ctaLabel: z.string().max(80).optional(),
  ctaUrl: z.string().url().optional().or(z.literal('')),
  footerNote: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const payload = verifyToken(authToken);
    if (!payload || !isEffectiveSuperAdminPayload(payload)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const data = previewSchema.parse(await req.json());
    const ctaUrl = data.ctaUrl?.trim() || undefined;
    const ctaLabel = data.ctaLabel?.trim() || undefined;

    const params = {
      subject: data.subject,
      heroTitle: data.heroTitle,
      heroSubtitle: data.heroSubtitle,
      body: data.body,
      ctaLabel: ctaLabel && ctaUrl ? ctaLabel : undefined,
      ctaUrl: ctaLabel && ctaUrl ? ctaUrl : undefined,
      footerNote: data.footerNote,
    };

    return NextResponse.json({
      html: buildPlatformBroadcastEmailHtml(params),
      text: buildPlatformBroadcastPlainText(params),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
