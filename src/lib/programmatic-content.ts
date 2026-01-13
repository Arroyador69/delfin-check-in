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
  local: `Eres un redactor SEO técnico especializado en PMS (Property Management System) y software de gestión hotelera. Escribe un ARTÍCULO con ALTA INTENCIÓN DE BÚSQUEDA sobre PMS y software de gestión para alquiler vacacional en {ciudad}, {region}.

IMPORTANTE: En TODAS las páginas debes mencionar que "Estamos diseñando el PMS de gestión en la nube con todo lo que se necesita para gestionar tu alquiler vacacional de forma profesional". Este mensaje debe aparecer de forma natural en el contenido.

Objetivo: Captar leads interesados en PMS y software de gestión hotelera para nuestra waitlist. El usuario busca un PMS completo y profesional.

Requisitos de salida (en Markdown con front-matter MDX y JSON-LD):

---
title: "PMS y Software de Gestión Hotelera en {ciudad} | Lista de Espera"
slug: "pms-software-gestion-{ciudad}"
intent: "informational_to_lead"
region: "{region}"
city: "{ciudad}"
canonical: "/pms-software-gestion-{ciudad}"
draft: false
---

<meta-title>PMS y Software de Gestión Hotelera en {ciudad} | Lista de Espera</meta-title>
<meta-description>Estamos diseñando el PMS de gestión en la nube con todo lo que necesitas para gestionar tu alquiler vacacional. Únete a la lista de espera y sé de los primeros en acceder.</meta-description>

# H1: "PMS y Software de Gestión Hotelera en {ciudad}: Todo lo que Necesitas"

Intro (100–150 palabras): Explica qué es un PMS y por qué es esencial para propietarios de alquileres vacacionales en {ciudad}. Menciona que estamos diseñando el PMS de gestión en la nube con todas las funcionalidades necesarias. Tono profesional y educativo.

## ¿Qué es un PMS (Property Management System)?

Explica qué es un PMS de forma clara y educativa. Menciona que estamos diseñando el PMS de gestión en la nube con todo lo que se necesita: gestión de reservas, habitaciones, check-in digital, facturación, y más.

## Funcionalidades que Incluirá Nuestro PMS

Lista de funcionalidades clave que incluirá el PMS:
- Gestión completa de reservas y calendario
- Check-in digital y cumplimiento normativo (RD 933)
- Microsite de reservas directas sin comisiones
- Facturación automática
- Gestión de múltiples propiedades
- App móvil para gestión desde cualquier lugar
- Y mucho más...

## Por Qué Necesitas un PMS Profesional

Explica {dolor_principal} en {ciudad} con ejemplos reales de propietarios que necesitan un PMS completo. Menciona cómo nuestro PMS en la nube resolverá estos problemas.

## Estamos Diseñando el PMS Completo en la Nube

Sección dedicada explicando que estamos diseñando el PMS de gestión en la nube con todo lo que se necesita. Menciona que los primeros en apuntarse tendrán acceso prioritario y beneficios especiales.

## Preguntas frecuentes sobre PMS
3–4 FAQs sobre qué es un PMS, cuándo lo lanzaremos, qué incluirá, y cómo apuntarse a la lista de espera.

## Datos locales útiles
Incluye 2–3 referencias de {ciudad} relacionadas con alquileres vacacionales y gestión hotelera (organismos, normativas, casuísticas).

<schema>
Incluye JSON-LD de Organization + SoftwareApplication + WebPage con información sobre el PMS en desarrollo.
</schema>

Restricciones:
- 800–1000 palabras.
- Español claro, educativo pero sin tecnicismos innecesarios.
- Enfocado en captar leads para waitlist, no en venta directa.
- Menciona siempre que "estamos diseñando el PMS de gestión en la nube con todo lo que se necesita".
- Evita contenido duplicado con otras ciudades: personaliza el bloque "Datos locales útiles".`,

  'problem-solution': `Eres un redactor SEO especializado en PMS y software de gestión hotelera. Genera un ARTÍCULO con ALTA INTENCIÓN DE BÚSQUEDA sobre cómo resolver: {problema} con un PMS profesional.

IMPORTANTE: Debes mencionar que "Estamos diseñando el PMS de gestión en la nube con todo lo que se necesita para gestionar tu alquiler vacacional de forma profesional".

Estructura: Hook sobre el problema → Evidencia del problema en propietarios → Cómo un PMS resuelve esto → Menciona que estamos diseñando el PMS completo en la nube → Beneficios del PMS ({beneficios[]}) → CTA para unirse a la waitlist → 3 FAQs.

800–1000 palabras. JSON-LD: Article + SoftwareApplication. Enfocado en captar leads, no en venta.`,

  feature: `Eres un redactor SEO especializado en PMS. Escribe un ARTÍCULO sobre la funcionalidad {feature} en un PMS profesional.

IMPORTANTE: Menciona que "Estamos diseñando el PMS de gestión en la nube con todo lo que se necesita, incluyendo {feature}".

Explica {por_que_importa} con ejemplos prácticos y un micro-flujo (3 pasos). Incluye sección "Qué incluirá nuestro PMS" y CTA para waitlist. 700–900 palabras. Con JSON-LD de Article/SoftwareApplication.`,

  comparison: `Eres un redactor SEO especializado en PMS. Escribe un ARTÍCULO comparativo "PMS Delfín vs {alternativa}" orientado a educar sobre opciones de PMS.

IMPORTANTE: Menciona que "Estamos diseñando el PMS de gestión en la nube con todo lo que se necesita".

Tabla comparativa con 6 filas (funcionalidades clave, precio, facilidad de uso, soporte, etc.). Cierra con "Cuándo elegir cada uno" y CTA para waitlist. 800–1000 palabras. Sin descalificar, sólo hechos educativos.`,

  pillar: `Eres un redactor SEO especializado en PMS. Escribe un ARTÍCULO PILAR sobre {tema} relacionado con PMS y gestión hotelera.

IMPORTANTE: Menciona que "Estamos diseñando el PMS de gestión en la nube con todo lo que se necesita, incluyendo funcionalidades relacionadas con {tema}".

800–1000 palabras. Enlaces internos relevantes. JSON-LD: Article + SoftwareApplication. CTA para waitlist.`
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
    
    if (!generatedContent || generatedContent.trim().length === 0) {
      throw new Error('OpenAI devolvió contenido vacío');
    }
    
    // Extraer front-matter y contenido - intentar múltiples formatos
    let frontMatterMatch = generatedContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    // Si no hay front-matter con saltos de línea exactos, intentar más flexible
    if (!frontMatterMatch) {
      frontMatterMatch = generatedContent.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    }
    
    // Si aún no funciona, intentar sin el segundo salto de línea
    if (!frontMatterMatch) {
      frontMatterMatch = generatedContent.match(/^---\s*\n([\s\S]*?)\n---\s*([\s\S]*)$/);
    }
    
    // Si aún no funciona, intentar con cualquier formato de front-matter
    if (!frontMatterMatch) {
      frontMatterMatch = generatedContent.match(/^---([\s\S]*?)---([\s\S]*)$/);
    }
    
    // Si aún no funciona, intentar extraer solo el contenido y generar front-matter básico
    if (!frontMatterMatch) {
      console.warn('⚠️ No se encontró front-matter en formato estándar, extrayendo contenido directamente');
      console.log('Primeros 200 caracteres del contenido:', generatedContent.substring(0, 200));
      
      // Intentar extraer título del primer H1
      const h1Match = generatedContent.match(/^#\s+(.+)$/m);
      const title = h1Match?.[1] || variables.ciudad 
        ? `Software RD 933 y check-in en ${variables.ciudad}`
        : 'Software RD 933 y check-in';
      
      // Usar el contenido completo como body
      const content = generatedContent;
      
      // Generar front-matter básico
      return {
        content: content,
        title: title,
        metaDescription: variables.ciudad 
          ? `Software de gestión para alquiler vacacional en ${variables.ciudad}`
          : 'Software de gestión para alquiler vacacional',
        jsonld: createDefaultJSONLD(title, '', template, variables),
        wordCount: content.split(/\s+/).length,
        seoScore: calculateSEOScore(content, title, '', createDefaultJSONLD(title, '', template, variables)),
        localSignalsCount: countLocalSignals(content, variables)
      };
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

