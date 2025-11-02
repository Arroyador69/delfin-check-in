/**
 * Script para inicializar las 5 plantillas base de contenido programático
 * Ejecutar desde el SuperAdmin o manualmente en la BD
 */

import { sql } from '@/lib/db';

const TEMPLATES = [
  {
    name: 'Compra Local - Software RD 933 por Ciudad',
    type: 'local',
    prompt_base: `Eres un redactor SEO técnico. Escribe una PÁGINA DE COMPRA con ALTA INTENCIÓN sobre un software de check-in y cumplimiento RD 933 para alquiler vacacional en {ciudad}, {region}.

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

## Llamada a la acción
Botón textual: **Comprar ahora → {cta_url}**

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
    variables_schema: {
      ciudad: { type: 'string', required: true },
      region: { type: 'string', required: true },
      dolor_principal: { type: 'string', required: true },
      features_clave: { type: 'array', required: true },
      sin_garantia: { type: 'boolean', default: false }
    },
    target_length: 800
  },
  {
    name: 'Problema → Solución',
    type: 'problem-solution',
    prompt_base: `Genera una página transaccional para quien busca resolver: {problema}.

Estructura: Hook → Evidencia del problema → Solución paso a paso con nuestro software → Beneficios ({beneficios[]}) → CTA "Comprar ahora" ({cta_url}) → 3 FAQs.

700–900 palabras. JSON-LD: Product + SoftwareApplication. Sin demo/free.`,
    variables_schema: {
      problema: { type: 'string', required: true },
      beneficios: { type: 'array', required: true }
    },
    target_length: 800
  },
  {
    name: 'Feature-Focus',
    type: 'feature',
    prompt_base: `Página de compra centrada en la feature {feature}. Explica {por_que_importa} con un ejemplo práctico y un micro-flujo (3 pasos).

Incluye sección "Qué recibes hoy" y CTA a {cta_url}. 600–800 palabras. Con JSON-LD de Product/SoftwareApplication.`,
    variables_schema: {
      feature: { type: 'string', required: true },
      por_que_importa: { type: 'string', required: true }
    },
    target_length: 700,
    cta_url: 'https://delfincheckin.com',
    pricing_eur: 29.99
  },
  {
    name: 'Comparativa',
    type: 'comparison',
    prompt_base: `Comparativa honesta "Delfín vs {alternativa}" orientada a compra. Tabla con 6 filas (RD 933, offline, microsite, split, facturación, coste total).

Cierra con "Cuándo elegir cada uno" y CTA a {cta_url}. 700–900 palabras. Sin descalificar, sólo hechos.`,
    variables_schema: {
      alternativa: { type: 'string', required: true }
    },
    target_length: 800
  },
  {
    name: 'Pilar',
    type: 'pillar',
    prompt_base: `Página pilar sobre {tema} (RD 933, check-in offline/cola, canal directo, pagos divididos).

700–900 palabras. Enlaces internos relevantes. JSON-LD: Article + Product. CTA a {cta_url}.`,
    variables_schema: {
      tema: { type: 'string', required: true }
    },
    target_length: 800
  }
];

export async function initTemplates() {
  try {
    console.log('🚀 Inicializando plantillas programáticas...');

    for (const template of TEMPLATES) {
      // Verificar si ya existe
      const existing = await sql`
        SELECT id FROM content_templates WHERE name = ${template.name}
      `;

      if (existing.rows.length > 0) {
        console.log(`⏭️  Plantilla "${template.name}" ya existe, omitiendo...`);
        continue;
      }

      // Crear plantilla
      await sql`
        INSERT INTO content_templates (
          name, type, prompt_base, variables_schema, target_length
        ) VALUES (
          ${template.name},
          ${template.type},
          ${template.prompt_base},
          ${JSON.stringify(template.variables_schema)}::jsonb,
          ${template.target_length}
        )
      `;

      console.log(`✅ Plantilla "${template.name}" creada`);
    }

    console.log('✨ Inicialización completada');

  } catch (error) {
    console.error('❌ Error inicializando plantillas:', error);
    throw error;
  }
}

