/**
 * POST /api/superadmin/blog/generate-article
 * Genera un artículo del blog con OpenAI a partir de un tema. Sin escribir nada.
 * Crea el artículo como borrador en blog_articles (mismo estilo que los existentes:
 * registro viajeros, waitlist, Ministerio Interior, multas, declaración informativa, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';
import OpenAI from 'openai';
import { parseAndValidateBlogOpenAIResponse } from '@/lib/blog-template';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BLOG_SYSTEM_PROMPT = `Eres un redactor SEO experto en contenido para Delfín Check-in (PMS y software de registro de viajeros para alquiler vacacional en España).

Nuestros artículos tratan de: registro de viajeros, Ministerio del Interior, SES hospedajes, multas por no registrar, declaración informativa, check-in digital obligatorio, RD 933/2021, Airbnb y Booking (si registran o no), comunidades autónomas, plazos, errores frecuentes al enviar datos, etc.

Estilo de los artículos existentes:
- Títulos claros y con año cuando aplica (ej: "... (Actualizado 2026)", "... paso a paso (Ministerio del Interior 2026)").
- Meta description 150-160 caracteres, con palabras clave.
- Contenido en HTML: párrafos <p>, subtítulos <h2> y <h3>, listas <ul>/<ol>, <strong> para énfasis. Sin waitlist ni popup en el HTML (eso lo añade la plantilla de la web).
- Tono educativo, legal/normativo cuando toque, orientado a propietarios de alquiler vacacional.
- Keywords en meta_keywords separadas por comas.

Debes responder ÚNICAMENTE con un JSON válido (sin markdown, sin \`\`\`), con esta estructura exacta:
{
  "slug": "url-amigable-del-articulo-sin-acentos",
  "title": "Título del artículo",
  "meta_description": "Descripción para SEO, máx 160 caracteres",
  "meta_keywords": "palabra1, palabra2, palabra3, ...",
  "excerpt": "Resumen breve 1-2 frases para listados",
  "content": "<p>...</p><h2>...</h2><p>...</p>..."
}

REQUISITOS IMPORTANTES PARA "content" (ARTICLE_CONTENT):
- content debe ser SOLO un fragmento HTML (NO incluyas <html>, <head>, <body>, <header>, <footer>, <script>, <style>).
- content NO debe incluir <h1>.
- content debe incluir jerarquía clara: al menos 2 secciones con <h2> y al menos 1 <h3>.
- content debe incluir al menos 1 lista (<ul> o <ol>).
- Usa HTML consistente: <p>, <h2>, <h3>, <ul>/<ol>/<li>, <strong>/<em>, <blockquote>.
- Si usas cajas, usa exactamente: <div class="highlight-box"> o <div class="warning-box">.

Si la salida no cumple, REINTENTA UNA VEZ corrigiendo SOLO el HTML del campo "content" (manteniendo el JSON válido).`;

export async function POST(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const topic = (body.topic || '').trim();
    if (!topic) {
      return NextResponse.json(
        { error: 'Falta el campo "topic". Indica el tema del artículo (ej: plazo para registrar viajeros, declaración informativa 2026).' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY no configurada. No se puede generar el artículo.' },
        { status: 500 }
      );
    }

    const userPrompt = `Genera un artículo nuevo para el blog de Delfín Check-in sobre este tema: "${topic}".

El artículo debe ser útil para propietarios de alquiler vacacional en España (registro de viajeros, normativa, Ministerio del Interior, multas, etc.). Mismo estilo y profundidad que nuestros otros artículos. Entre 600 y 1000 palabras de contenido. Responde solo con el JSON.`;

    let validated: any = null;
    let lastError: any = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      const prompt =
        attempt === 0
          ? userPrompt
          : `${userPrompt}\n\nVALIDACION_PREVIA_FALLIDA: ${String(lastError?.message || lastError)}\n\nCorrige SOLO el campo "content" para cumplir el esquema y la validación (mantén el JSON válido).`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: BLOG_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 4000
      });

      const raw = completion.choices[0]?.message?.content?.trim() || '';
      if (!raw) {
        lastError = new Error('OpenAI no devolvió contenido');
        continue;
      }

      // Extraer JSON (por si viene envuelto en ```json ... ```)
      let jsonStr = raw;
      const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlock) jsonStr = codeBlock[1].trim();

      try {
        validated = parseAndValidateBlogOpenAIResponse(jsonStr);
        break;
      } catch (e: any) {
        lastError = e;
        console.error('Validación OpenAI falló (intento ' + (attempt + 1) + '):', raw.slice(0, 500));
      }
    }

    if (!validated) {
      return NextResponse.json(
        { error: `Validación OpenAI falló: ${String(lastError?.message || lastError || 'error desconocido')}` },
        { status: 502 }
      );
    }

    const slug = (validated.slug || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || `articulo-${Date.now()}`;
    const title = (validated.title || topic).slice(0, 500);
    const meta_description = (validated.meta_description || '').slice(0, 160);
    const meta_keywords = (validated.meta_keywords || '').slice(0, 1000);
    const excerpt = (validated.excerpt || '').slice(0, 1000);
    const content = (validated.content || '<p>Contenido pendiente.</p>');

    const schema_json = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description: meta_description,
      datePublished: new Date().toISOString().split('T')[0],
      dateModified: new Date().toISOString().split('T')[0],
      author: { '@type': 'Organization', name: 'Delfín Check-in' },
      publisher: { '@type': 'Organization', name: 'Delfín Check-in' }
    };

    let finalSlug = slug;
    const existing = await sql`SELECT id FROM blog_articles WHERE slug = ${finalSlug}`;
    if (existing.rows.length > 0) {
      finalSlug = `${slug}-${Date.now().toString(36)}`;
    }

    const result = await sql`
      INSERT INTO blog_articles (
        slug, title, meta_description, meta_keywords,
        content, excerpt, canonical_url, schema_json,
        status, is_published, author_name
      ) VALUES (
        ${finalSlug}, ${title}, ${meta_description}, ${meta_keywords},
        ${content}, ${excerpt}, ${`https://delfincheckin.com/articulos/${finalSlug}.html`},
        ${JSON.stringify(schema_json)}::jsonb,
        'draft', false, 'Delfín Check-in'
      )
      RETURNING id, slug, title, status, created_at
    `;

    const article = result.rows[0];
    return NextResponse.json({
      success: true,
      article,
      message: 'Artículo generado y guardado como borrador. Puedes editarlo y publicarlo en Gestión de Artículos.'
    });
  } catch (err: any) {
    console.error('Error generando artículo:', err);
    return NextResponse.json(
      { error: err?.message || 'Error al generar el artículo' },
      { status: 500 }
    );
  }
}
