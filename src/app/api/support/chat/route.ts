import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifyToken } from '@/lib/auth';
import { getKBForLocale } from '@/lib/support';
import { sql } from '@/lib/db';
import { kbForTenantCountry } from '@/lib/support/kb-country';
import { getAssistantMonthlyLimit, getUsage, incrementUsage } from '@/lib/support/usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type CacheEntry = { text: string; createdAt: number };

// Cache y rate-limit en memoria (suficiente para demo; en prod usar KV/Redis)
const responseCache = new Map<string, CacheEntry>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5; // mensajes / minuto (anti abuso y coste)
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
    if (!payload?.tenantId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    let usage: Awaited<ReturnType<typeof getUsage>> | null = null;
    try {
      usage = await getUsage(payload.tenantId);
      if (usage.remaining <= 0) {
        const cap = getAssistantMonthlyLimit();
        return NextResponse.json(
          {
            success: false,
            error: `Has alcanzado el límite de ${cap} mensajes este mes. Se reinicia en ${usage.resetLabel}.`,
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
    const context = typeof body?.context === 'string' ? body.context.trim() : '';

    if (!message || message.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Escribe una pregunta.' },
        { status: 400 }
      );
    }

    let tenantCountry: string | null = null;
    try {
      const cr = await sql`
        SELECT country_code FROM tenants WHERE id = ${payload.tenantId} LIMIT 1
      `;
      tenantCountry = cr.rows[0]?.country_code ?? null;
    } catch {
      tenantCountry = null;
    }

    const cacheKey = `${locale}:${tenantCountry || 'XX'}:${normalizeQuestion(message)}`;
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

    const kbBase = getKBForLocale(locale);
    const kb = kbForTenantCountry(kbBase, tenantCountry);
    const faqContext = getFaqContext(message, kb);
    const model = process.env.OPENAI_SUPPORT_MODEL || 'gpt-4o-mini';

    const onboardingRules =
      context === 'onboarding'
        ? `\nOnboarding guiado:\n` +
          `- El usuario está en el asistente de alta (pasos 1–5). No recomiendes como primer paso ir a Propiedades ni a ajustes avanzados del panel.\n` +
          `- Prioriza explicar: país y datos de contacto, nombre y dirección del alojamiento, habitaciones/unidades, check-in y MIR solo si el país es España, revisión final.\n` +
          `- Si preguntan por el teléfono: contacto operativo y avisos del servicio.\n` +
          `- Pueden usar "Saltar por ahora" (pasos 2–5) y completar después en Ajustes.\n`
        : '';

    const supportContact =
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
      process.env.SUPPORT_CONTACT_EMAIL ||
      'soporte';

    const systemPrompt =
      `${kb.intro}\n\n` +
      `Alcance obligatorio:\n` +
      `- Solo respondes sobre el USO del producto Delfín Check-in (panel, reservas, calendario, MIR en España, formularios, propiedades, check-in, facturación en la medida en que esté en el panel).\n` +
      `- Si la pregunta no tiene que ver con el uso del software (vida personal, política, legal general, otros negocios, temas ajenos): responde en 2-3 líneas que no puedes ayudar con eso y vuelve al uso del producto.\n` +
      `- Si el usuario describe una incidencia técnica real (no envían formularios, error del sistema, datos que no cuadran): indica brevemente que eso requiere revisión humana; pide pantalla y qué intentaba hacer; sugiere contactar a soporte (${supportContact}) o el canal de incidencias del servicio cuando exista.\n` +
      `- No des asesoramiento legal, fiscal ni médico.\n\n` +
      `Style / Estilo:\n` +
      `- Máximo 6-10 líneas salvo que hagan falta pasos muy concretos.\n` +
      `- Usa pasos numerados claros.\n` +
      `- Si la pregunta es ambigua, pide solo: pantalla actual y objetivo.\n` +
      `Prohibiciones:\n` +
      `- No menciones código, ficheros ni rutas internas.\n` +
      `- No inventes datos.\n` +
      `- No pidas datos personales del huésped.\n` +
      onboardingRules;

    const userContent =
      `Pregunta del usuario:\n${message}\n\n` +
      (screen ? `Pantalla actual (si aplica): ${screen}\n\n` : '') +
      `Base de conocimiento (FAQ relevantes):\n${faqContext}\n`;

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 220,
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

