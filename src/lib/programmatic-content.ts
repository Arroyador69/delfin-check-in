import OpenAI from 'openai';
import { sql } from '@/lib/db';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ContentTemplate {
  id: string;
  name: string;
  type: 'local' | 'problem-solution' | 'feature' | 'comparison' | 'pillar';
  prompt_base: string;
  variables_schema: Record<string, any>;
  target_length: number;
  is_test?: boolean; // Para generar páginas de prueba/preview
}

export interface ProgrammaticPage {
  id: string;
  template_id: string | null;
  type: string;
  slug: string;
  canonical_url: string;
  title: string;
  meta_description: string | null;
  content_html: string;
  content_jsonld: Record<string, any> | null;
  variables_used: Record<string, any>;
  seo_score: number;
  local_signals_count: number;
  word_count: number;
  status: 'draft' | 'scheduled' | 'published' | 'indexed' | 'failed';
  publish_at: string | null;
  is_test?: boolean; // Para identificar páginas de prueba/preview
}

export interface DatasetItem {
  id: string;
  type: string;
  key: string;
  label: string;
  data: Record<string, any>;
}

// Prompts base según el tipo de plantilla
const PROMPT_TEMPLATES: Record<string, string> = {
  local: `Eres un redactor SEO técnico. Escribe una PÁGINA DE COMPRA con ALTA INTENCIÓN sobre un software de check-in y cumplimiento RD 933 para alquiler vacacional en {ciudad}, {region}.

Objetivo: que el usuario COMPRE ahora mismo (sin demo ni prueba).

Requisitos de salida (en Markdown con front-matter MDX y JSON-LD):

---
title: "Software RD 933 y check-in en {ciudad} | Compra directa"
slug: "rd-933/software-{ciudad}"
intent: "transactional"
region: "{region}"
city: "{ciudad}"
price_eur: {precio}
canonical: "/rd-933/software-{ciudad}"
draft: false
---

<meta-title>Software RD 933 y check-in en {ciudad} | Compra directa</meta-title>
<meta-description>Envía partes en lote (incluso sin internet), microsite de reservas, Stripe split y facturación automática. Compra ahora.</meta-description>

# H1: "Software RD 933 y check-in en {ciudad} (compra directa)"

Intro (70–100 palabras): problema real en {ciudad} → consecuencia → solución (nuestro software). Tono profesional y directo, sin humo.

## Qué compras hoy
Lista de 6 bullets basados en {features_clave[]} (menciona RD 933 en lote, cola offline, microsite, Stripe split, facturación y calculadora de costes).

## Cómo resuelve el dolor
Explica {dolor_principal} en {ciudad} con 2 ejemplos locales (organismos, trámites, casuísticas).

## Mini-pruebas (capturas descritas)
- Panel de envíos RD 933 (describir sin revelar datos sensibles)
- Cola offline (qué pasa si no hay internet)
- Stripe split (esquema de reparto)

## Preguntas frecuentes
3–4 FAQs sobre legal, offline, soporte y pagos.

## Información adicional
Incluye información relevante sobre el servicio y sus beneficios.

{# if sin_garantia == false}
Nota breve: "Devolución 30 días si no te sirve".
{# endif}

## Datos locales útiles
Incluye 2–3 referencias de {ciudad} (organismos, horarios o casuística) de forma genérica (no inventes direcciones).

<schema>
Incluye JSON-LD de Organization + Product + SoftwareApplication con \`offers.price\`={precio} y \`areaServed\`={region}/{ciudad}.
</schema>

Restricciones:
- 700–900 palabras.
- Español claro, sin tecnicismos innecesarios.
- Nada de "prueba gratis" o "demo".
- Evita contenido duplicado con otras ciudades: personaliza el bloque "Datos locales útiles".`,

  'problem-solution': `Genera una página transaccional para quien busca resolver: {problema}.

Estructura: Hook → Evidencia del problema → Solución paso a paso con nuestro software → Beneficios ({beneficios[]}) → 3 FAQs.

700–900 palabras. JSON-LD: Product + SoftwareApplication. Sin demo/free.`,

  feature: `Página de compra centrada en la feature {feature}. Explica {por_que_importa} con un ejemplo práctico y un micro-flujo (3 pasos).

Incluye sección "Qué recibes hoy". 600–800 palabras. Con JSON-LD de Product/SoftwareApplication.`,

  comparison: `Comparativa honesta "Delfín vs {alternativa}" orientada a compra. Tabla con 6 filas (RD 933, offline, microsite, split, facturación, coste total).

Cierra con "Cuándo elegir cada uno". 700–900 palabras. Sin descalificar, sólo hechos.`,

  pillar: `Página pilar sobre {tema} (RD 933, check-in offline/cola, canal directo, pagos divididos).

700–900 palabras. Enlaces internos relevantes. JSON-LD: Article + Product.`
};

export async function generateContentWithOpenAI(
  template: ContentTemplate,
  variables: Record<string, any>
): Promise<{
  content: string;
  title: string;
  metaDescription: string;
  jsonld: Record<string, any>;
  wordCount: number;
  seoScore: number;
  localSignalsCount: number;
}> {
  // Construir el prompt final
  let prompt = PROMPT_TEMPLATES[template.type] || template.prompt_base;
  
  // Reemplazar variables en el prompt
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    if (Array.isArray(value)) {
      prompt = prompt.replace(regex, value.join(', '));
    } else {
      prompt = prompt.replace(regex, String(value));
    }
  });

  // Reemplazar variables comunes
  prompt = prompt.replace(/{sin_garantia}/g, variables.sin_garantia === false ? 'false' : 'true');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en SEO técnico y copywriting de conversión. Generas contenido optimizado para motores de búsqueda y Google AI, con JSON-LD estructurado y señales locales únicas.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const generatedContent = completion.choices[0]?.message?.content || '';
    
    // Extraer front-matter y contenido
    const frontMatterMatch = generatedContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontMatterMatch) {
      throw new Error('No se encontró front-matter válido en la respuesta');
    }

    const frontMatter = frontMatterMatch[1];
    const content = frontMatterMatch[2];

    // Parsear front-matter
    const titleMatch = frontMatter.match(/title:\s*"([^"]+)"/);
    const metaTitleMatch = content.match(/<meta-title>([^<]+)<\/meta-title>/);
    const metaDescMatch = content.match(/<meta-description>([^<]+)<\/meta-description>/);
    const schemaMatch = content.match(/<schema>([\s\S]*?)<\/schema>/);

    const title = titleMatch?.[1] || metaTitleMatch?.[1] || 'Software RD 933 y check-in';
    const metaDescription = metaDescMatch?.[1] || 'Software de gestión para alquiler vacacional';
    
    // Parsear JSON-LD del schema
    let jsonld = {};
    if (schemaMatch?.[1]) {
      try {
        jsonld = JSON.parse(schemaMatch[1].trim());
      } catch (e) {
        // Si falla el parse, crear JSON-LD básico
        jsonld = createDefaultJSONLD(title, metaDescription, template, variables);
      }
    } else {
      jsonld = createDefaultJSONLD(title, metaDescription, template, variables);
    }

    // Agregar interlinking automático según el tipo
    const contentWithLinks = addInterlinking(content, template.type, variables);

    // Calcular métricas
    const wordCount = contentWithLinks.split(/\s+/).length;
    const seoScore = calculateSEOScore(contentWithLinks, title, metaDescription, jsonld);
    const localSignalsCount = countLocalSignals(contentWithLinks, variables);

    return {
      content: contentWithLinks.replace(/<meta-title>([^<]+)<\/meta-title>/g, '')
        .replace(/<meta-description>([^<]+)<\/meta-description>/g, '')
        .replace(/<schema>[\s\S]*?<\/schema>/g, ''),
      title,
      metaDescription,
      jsonld,
      wordCount,
      seoScore,
      localSignalsCount
    };
  } catch (error) {
    console.error('Error generando contenido con OpenAI:', error);
    throw error;
  }
}

function createDefaultJSONLD(
  title: string,
  description: string,
  template: ContentTemplate,
  variables: Record<string, any>
): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Delfín Check-in',
    description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: 14.99, // Precio base por propiedad
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock'
    },
    ...(variables.ciudad ? {
      areaServed: {
        '@type': 'City',
        name: variables.ciudad,
        ...(variables.region ? {
          containedIn: {
            '@type': 'State',
            name: variables.region
          }
        } : {})
      }
    } : {})
  };
}

function calculateSEOScore(
  content: string,
  title: string,
  metaDescription: string,
  jsonld: Record<string, any>
): number {
  let score = 0;

  // Título (0-20 puntos)
  if (title && title.length >= 30 && title.length <= 70) score += 20;
  else if (title) score += 10;

  // Meta description (0-15 puntos)
  if (metaDescription && metaDescription.length >= 120 && metaDescription.length <= 160) score += 15;
  else if (metaDescription) score += 7;

  // Longitud del contenido (0-25 puntos)
  const wordCount = content.split(/\s+/).length;
  if (wordCount >= 700 && wordCount <= 900) score += 25;
  else if (wordCount >= 600 && wordCount < 1200) score += 20; // Aceptable para Feature
  else if (wordCount >= 500) score += 15;
  else if (wordCount >= 300) score += 5;

  // Headers H1, H2, H3 (0-15 puntos)
  const h1Count = (content.match(/^#\s/gm) || []).length;
  const h2Count = (content.match(/^##\s/gm) || []).length;
  const h3Count = (content.match(/^###\s/gm) || []).length;
  if (h1Count >= 1) score += 5;
  if (h2Count >= 2) score += 5;
  if (h3Count >= 1) score += 5;

  // JSON-LD (0-15 puntos)
  if (jsonld && Object.keys(jsonld).length > 0) score += 15;

  // Enlaces internos (0-10 puntos)
  const internalLinks = (content.match(/\[([^\]]+)\]\(https?:\/\/delfincheckin\.com/g) || []).length;
  if (internalLinks >= 2) score += 10;
  else if (internalLinks >= 1) score += 5;

  return Math.min(score, 100);
}

function countLocalSignals(content: string, variables: Record<string, any>): number {
  let count = 0;

  // Ciudad mencionada
  if (variables.ciudad && content.toLowerCase().includes(variables.ciudad.toLowerCase())) count++;

  // Región mencionada
  if (variables.region && content.toLowerCase().includes(variables.region.toLowerCase())) count++;

  // Referencias locales (organismos, trámites, etc.)
  const localKeywords = ['ayuntamiento', 'gobierno', 'organismo', 'trámite', 'normativa', 'local', 'municipio'];
  localKeywords.forEach(keyword => {
    if (content.toLowerCase().includes(keyword)) count++;
  });

  return count;
}

// Agregar interlinking automático según el tipo de plantilla
function addInterlinking(content: string, type: string, variables: Record<string, any>): string {
  let linkedContent = content;

  // Reglas de interlinking
  if (type === 'local') {
    // Enlazar a: 1 Pilar + 1 Problema + 1 Feature + /checkout
    linkedContent += '\n\n## Enlaces relacionados\n\n';
    linkedContent += '- [Guía completa sobre RD 933](https://delfincheckin.com/rd-933-guia-completa)\n';
    linkedContent += '- [Enviar partes sin internet](https://delfincheckin.com/envio-partes-sin-internet)\n';
    linkedContent += '- [Microsite de reservas](https://delfincheckin.com/microsite-reservas)\n';
    linkedContent += '- [**Comprar ahora →**](https://delfincheckin.com/checkout)\n';
  } else if (type === 'problem-solution' || type === 'feature') {
    // Enlazar a 2-3 Locales cercanos + /checkout
    linkedContent += '\n\n## También te puede interesar\n\n';
    if (variables.ciudad) {
      linkedContent += `- [Software RD 933 en ${variables.ciudad}](https://delfincheckin.com/rd-933/software-${variables.ciudad.toLowerCase().replace(/\s+/g, '-')})\n`;
    }
    linkedContent += '- [Software RD 933 para alquiler vacacional](https://delfincheckin.com/rd-933/software-alquiler-vacacional)\n';
    linkedContent += '- [**Comprar ahora →**](https://delfincheckin.com/checkout)\n';
  } else if (type === 'comparison') {
    // Enlazar a 1 Pilar + /pricing y /checkout
    linkedContent += '\n\n## Más información\n\n';
    linkedContent += '- [Guía completa sobre RD 933](https://delfincheckin.com/rd-933-guia-completa)\n';
    linkedContent += '- [Ver planes y precios](https://delfincheckin.com/pricing)\n';
    linkedContent += '- [**Comprar ahora →**](https://delfincheckin.com/checkout)\n';
  }

  return linkedContent;
}

export async function saveProgrammaticPage(page: Partial<ProgrammaticPage>): Promise<string> {
  const result = await sql`
    INSERT INTO programmatic_pages (
      template_id, type, slug, canonical_url, title, meta_description,
      content_html, content_jsonld, variables_used, seo_score,
      local_signals_count, word_count, status, publish_at, is_test
    ) VALUES (
      ${page.template_id || null},
      ${page.type!},
      ${page.slug!},
      ${page.canonical_url!},
      ${page.title!},
      ${page.meta_description || null},
      ${page.content_html!},
      ${page.content_jsonld || null}::jsonb,
      ${page.variables_used || {}}::jsonb,
      ${page.seo_score || 0},
      ${page.local_signals_count || 0},
      ${page.word_count || 0},
      ${page.status || 'draft'},
      ${page.publish_at || null},
      ${page.is_test || false}
    ) RETURNING id
  `;
  return result.rows[0].id;
}

export async function getScheduledPages(limit: number = 50): Promise<ProgrammaticPage[]> {
  const result = await sql`
    SELECT * FROM programmatic_pages
    WHERE status = 'scheduled'
      AND publish_at <= now()
    ORDER BY publish_at ASC
    LIMIT ${limit}
  `;
  return result.rows as any[];
}

