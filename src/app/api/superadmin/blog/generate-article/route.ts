/**
 * POST /api/superadmin/blog/generate-article
 * Genera un artículo del blog con OpenAI a partir de un tema. Sin escribir nada.
 * Crea el artículo como borrador en blog_articles (mismo estilo que los existentes:
 * registro viajeros, waitlist, Ministerio Interior, multas, declaración informativa, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';
import { getOpenAI } from '@/lib/openai-server';

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
}`;

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

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: BLOG_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 4000
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';
    if (!raw) {
      return NextResponse.json(
        { error: 'OpenAI no devolvió contenido. Intenta con otro tema.' },
        { status: 502 }
      );
    }

    // Extraer JSON (por si viene envuelto en ```json ... ```)
    let jsonStr = raw;
    const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1].trim();

    let data: { slug?: string; title?: string; meta_description?: string; meta_keywords?: string; excerpt?: string; content?: string };
    try {
      data = JSON.parse(jsonStr);
    } catch (e) {
      console.error('OpenAI response (first 500 chars):', raw.slice(0, 500));
      return NextResponse.json(
        { error: 'La respuesta de OpenAI no es un JSON válido. Intenta de nuevo o con otro tema.' },
        { status: 502 }
      );
    }

    const slug = (data.slug || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || `articulo-${Date.now()}`;
    const title = (data.title || topic).slice(0, 500);
    const meta_description = (data.meta_description || '').slice(0, 500);
    const meta_keywords = (data.meta_keywords || '').slice(0, 1000);
    const excerpt = (data.excerpt || '').slice(0, 1000);
    const content = (data.content || '<p>Contenido pendiente.</p>');

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
