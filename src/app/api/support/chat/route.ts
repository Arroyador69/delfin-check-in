import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifyToken } from '@/lib/auth';
import { getKBForLocale } from '@/lib/support';
import { getUsage, incrementUsage } from '@/lib/support/usage';
import { getTenantById, getPlanConfig } from '@/lib/tenant';
import { defaultLocale, isValidLocale, toIntlDateLocale } from '@/i18n/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type CacheEntry = { text: string; createdAt: number };

// Cache y rate-limit en memoria (suficiente para demo; en prod usar KV/Redis)
const responseCache = new Map<string, CacheEntry>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 12; // mensajes / minuto
const rateMap = new Map<string, { count: number; windowStart: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .normalize('NFD')
    .replace(/\u0300/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function checkRateLimit(key: string): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const existing = rateMap.get(key);
  if (!existing || now - existing.windowStart > RATE_WINDOW_MS) {
    rateMap.set(key, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (existing.count >= RATE_MAX) {
    const retryAfterSec = Math.ceil((RATE_WINDOW_MS - (now - existing.windowStart)) / 1000);
    return { ok: false, retryAfterSec };
  }
  existing.count += 1;
  return { ok: true };
}

function getFaqContext(question: string, kb = getKBForLocale('es')): string {
  const q = normalizeQuestion(question);
  const hits: Array<{ score: number; q: string; a: string }> = [];

  for (const item of kb.faqs) {
    const nq = normalizeQuestion(item.q);
    let score = 0;
    for (const token of q.split(' ')) {
      if (token.length < 4) continue;
      if (nq.includes(token)) score += 1;
    }
    if (score > 0) hits.push({ score, q: item.q, a: item.a });
  }

  hits.sort((a, b) => b.score - a.score);
  const top = hits.slice(0, 6);

  const ctxLines = top.map(
    (h, i) => `Q${i + 1}: ${h.q}\nA${i + 1}: ${h.a}`
  );

  // Siempre incluir una mini-explicación sobre límites/privacidad
  ctxLines.push(
    `Reglas: El asistente NO ve datos privados de huéspedes ni accede a la base de datos. Solo explica uso del software.`
  );

  return ctxLines.join('\n\n');
}

export async function POST(req: NextRequest) {
  try {
    if (!openai) {
      return NextResponse.json(
        { success: false, error: 'Servicio de IA no disponible' },
        { status: 503 }
      );
    }

    const authToken = req.cookies.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const payload = verifyToken(authToken);
    if (!payload?.tenantId || !payload?.userId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    let body: Record<string, unknown> = {};
    try {
      const parsed = await req.json();
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      body = {};
    }

    const pathLocale =
      typeof body.locale === 'string' && isValidLocale(body.locale) ? body.locale : defaultLocale;
    const intlLocale = toIntlDateLocale(pathLocale);

    const tenant = await getTenantById(payload.tenantId);
    const planType = tenant ? getPlanConfig(tenant).planType : 'free';
    const eligible = true;

    let usage: Awaited<ReturnType<typeof getUsage>> | null = null;
    try {
      usage = await getUsage({ tenantId: payload.tenantId, userId: payload.userId, planType, locale: intlLocale });
      if (usage.remainingDaily <= 0 || usage.remainingMonthly <= 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              usage.remainingDaily <= 0
                ? `Has alcanzado el límite diario. Se reinicia el ${usage.resetLabelDay}.`
                : `Has alcanzado el límite mensual. Se reinicia en ${usage.resetLabelMonth}.`,
            code: usage.remainingDaily <= 0 ? 'DAILY_LIMIT' : 'MONTHLY_LIMIT',
          },
          { status: 429 }
        );
      }
    } catch (e) {
      console.warn('[support/chat] usage check failed (table may not exist):', e);
    }

    const ip = getIp(req);
    const rateKey = `${payload.tenantId}:${ip}`;
    const rl = checkRateLimit(rateKey);
    if (!rl.ok) {
      return NextResponse.json(
        { success: false, error: 'Demasiadas consultas. Inténtalo en unos segundos.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec || 30) } }
      );
    }

    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const screen = typeof body?.screen === 'string' ? body.screen.trim() : '';

    if (!message || message.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Escribe una pregunta.' },
        { status: 400 }
      );
    }

    const cacheKey = `${pathLocale}:${normalizeQuestion(message)}`;
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        text: cached.text,
        cached: true,
        model: process.env.OPENAI_SUPPORT_MODEL || 'gpt-4o-mini',
        ...(usage && {
          usage: {
            remainingDaily: usage.remainingDaily,
            remainingMonthly: usage.remainingMonthly,
            limitDaily: usage.limitDaily,
            limitMonthly: usage.limitMonthly,
            resetLabelDay: usage.resetLabelDay,
            resetLabelMonth: usage.resetLabelMonth,
          },
        }),
      });
    }

    const kb = getKBForLocale(pathLocale);
    const faqContext = getFaqContext(message, kb);
    const model = process.env.OPENAI_SUPPORT_MODEL || 'gpt-4o-mini';

    const systemPrompt =
      `${kb.intro}\n\n` +
      `Style / Estilo:\n` +
      `- Máximo 8-12 líneas.\n` +
      `- Usa pasos numerados claros.\n` +
      `- Si la pregunta es ambigua, pide solo: pantalla actual y objetivo.\n` +
      `Prohibiciones:\n` +
      `- No menciones código, ficheros ni rutas internas.\n` +
      `- No inventes datos.\n` +
      `- No pidas datos personales del huésped.\n`;

    const userContent =
      `Pregunta del usuario:\n${message}\n\n` +
      (screen ? `Pantalla actual (si aplica): ${screen}\n\n` : '') +
      `Base de conocimiento (FAQ relevantes):\n${faqContext}\n`;

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 320,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    });

    const text = completion.choices?.[0]?.message?.content?.trim() || '';
    if (!text) {
      return NextResponse.json(
        { success: false, error: 'No se pudo generar respuesta.' },
        { status: 502 }
      );
    }

    responseCache.set(cacheKey, { text, createdAt: Date.now() });

    let newUsage: Awaited<ReturnType<typeof getUsage>> | null = null;
    try {
      newUsage = await incrementUsage({
        tenantId: payload.tenantId,
        userId: payload.userId,
        planType,
        locale: intlLocale,
      });
    } catch (e) {
      console.warn('[support/chat] increment usage failed:', e);
    }

    return NextResponse.json({
      success: true,
      text,
      cached: false,
      model,
      ...(newUsage && {
        usage: {
          remainingDaily: newUsage.remainingDaily,
          remainingMonthly: newUsage.remainingMonthly,
          limitDaily: newUsage.limitDaily,
          limitMonthly: newUsage.limitMonthly,
          resetLabelDay: newUsage.resetLabelDay,
          resetLabelMonth: newUsage.resetLabelMonth,
        },
      }),
    });
  } catch (error) {
    console.error('[support/chat] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

