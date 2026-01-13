/**
 * Script para inicializar las 5 plantillas base de contenido programático
 * Ejecutar desde el SuperAdmin o manualmente en la BD
 */

import { sql } from '@/lib/db';

const TEMPLATES = [
  {
    name: 'PMS Local - Software de Gestión Hotelera por Ciudad',
    type: 'local',
    prompt_base: `Eres un redactor SEO técnico especializado en PMS (Property Management System) y software de gestión hotelera. Escribe un ARTÍCULO con ALTA INTENCIÓN DE BÚSQUEDA sobre PMS y software de gestión para alquiler vacacional en {ciudad}, {region}.

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
    name: 'Problema → Solución (PMS)',
    type: 'problem-solution',
    prompt_base: `Eres un redactor SEO especializado en PMS y software de gestión hotelera. Genera un ARTÍCULO con ALTA INTENCIÓN DE BÚSQUEDA sobre cómo resolver: {problema} con un PMS profesional.

IMPORTANTE: Debes mencionar que "Estamos diseñando el PMS de gestión en la nube con todo lo que se necesita para gestionar tu alquiler vacacional de forma profesional".

Estructura: Hook sobre el problema → Evidencia del problema en propietarios → Cómo un PMS resuelve esto → Menciona que estamos diseñando el PMS completo en la nube → Beneficios del PMS ({beneficios[]}) → CTA para unirse a la waitlist → 3 FAQs.

800–1000 palabras. JSON-LD: Article + SoftwareApplication. Enfocado en captar leads, no en venta.`,
    variables_schema: {
      problema: { type: 'string', required: true },
      beneficios: { type: 'array', required: true }
    },
    target_length: 800
  },
  {
    name: 'Feature-Focus (PMS)',
    type: 'feature',
    prompt_base: `Eres un redactor SEO especializado en PMS. Escribe un ARTÍCULO sobre la funcionalidad {feature} en un PMS profesional.

IMPORTANTE: Menciona que "Estamos diseñando el PMS de gestión en la nube con todo lo que se necesita, incluyendo {feature}".

Explica {por_que_importa} con ejemplos prácticos y un micro-flujo (3 pasos). Incluye sección "Qué incluirá nuestro PMS" y CTA para waitlist. 700–900 palabras. Con JSON-LD de Article/SoftwareApplication.`,
    variables_schema: {
      feature: { type: 'string', required: true },
      por_que_importa: { type: 'string', required: true }
    },
    target_length: 700,
    cta_url: 'https://delfincheckin.com',
    pricing_eur: 29.99
  },
  {
    name: 'Comparativa (PMS)',
    type: 'comparison',
    prompt_base: `Eres un redactor SEO especializado en PMS. Escribe un ARTÍCULO comparativo "PMS Delfín vs {alternativa}" orientado a educar sobre opciones de PMS.

IMPORTANTE: Menciona que "Estamos diseñando el PMS de gestión en la nube con todo lo que se necesita".

Tabla comparativa con 6 filas (funcionalidades clave, precio, facilidad de uso, soporte, etc.). Cierra con "Cuándo elegir cada uno" y CTA para waitlist. 800–1000 palabras. Sin descalificar, sólo hechos educativos.`,
    variables_schema: {
      alternativa: { type: 'string', required: true }
    },
    target_length: 800
  },
  {
    name: 'Pilar (PMS)',
    type: 'pillar',
    prompt_base: `Eres un redactor SEO especializado en PMS. Escribe un ARTÍCULO PILAR sobre {tema} relacionado con PMS y gestión hotelera.

IMPORTANTE: Menciona que "Estamos diseñando el PMS de gestión en la nube con todo lo que se necesita, incluyendo funcionalidades relacionadas con {tema}".

800–1000 palabras. Enlaces internos relevantes. JSON-LD: Article + SoftwareApplication. CTA para waitlist.`,
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

