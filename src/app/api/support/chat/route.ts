import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifyToken } from '@/lib/auth';
import { KB_ES } from '@/lib/support/kb-es';
import { getUsage, incrementUsage, MONTHLY_LIMIT } from '@/lib/support/usage';

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

function getFaqContext(question: string): string {
  const q = normalizeQuestion(question);
  const hits: Array<{ score: number; q: string; a: string }> = [];

  for (const item of KB_ES.faqs) {
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
    if (!payload?.tenantId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    let usage: Awaited<ReturnType<typeof getUsage>> | null = null;
    try {
      usage = await getUsage(payload.tenantId);
      if (usage.remaining <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Has alcanzado el límite de ${MONTHLY_LIMIT} mensajes este mes. Se reinicia en ${usage.resetLabel}.`,
            code: 'MONTHLY_LIMIT',
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

    const body = await req.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const locale = typeof body?.locale === 'string' ? body.locale : 'es';
    const screen = typeof body?.screen === 'string' ? body.screen.trim() : '';

    if (!message || message.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Escribe una pregunta.' },
        { status: 400 }
      );
    }

    const cacheKey = `${locale}:${normalizeQuestion(message)}`;
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        text: cached.text,
        cached: true,
        model: process.env.OPENAI_SUPPORT_MODEL || 'gpt-4o-mini',
        ...(usage && { usage: { remaining: usage.remaining, limit: usage.limit, resetLabel: usage.resetLabel } }),
      });
    }

    const faqContext = getFaqContext(message);
    const model = process.env.OPENAI_SUPPORT_MODEL || 'gpt-4o-mini';

    const systemPrompt =
      `${KB_ES.intro}\n\n` +
      `Estilo:\n` +
      `- Responde en español.\n` +
      `- Máximo 8-12 líneas.\n` +
      `- Usa pasos numerados.\n` +
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
      newUsage = await incrementUsage(payload.tenantId);
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
          remaining: newUsage.remaining,
          limit: newUsage.limit,
          resetLabel: newUsage.resetLabel,
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

