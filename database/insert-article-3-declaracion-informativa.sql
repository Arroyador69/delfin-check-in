-- =====================================================
-- INSERTAR ARTÍCULO 3: DECLARACIÓN INFORMATIVA 2026
-- =====================================================
-- Este script inserta el tercer artículo del blog:
-- "Declaración Informativa Anual de Alquileres de Corta Duración 2026"
--
-- Ejecutar en Neon Dashboard (SQL Editor) o desde psql
-- =====================================================

-- Primero verificamos que no exista ya
DELETE FROM blog_articles 
WHERE slug = 'declaracion-informativa-alquileres-corta-duracion-2026';

-- Insertar el artículo 3
INSERT INTO blog_articles (
  title,
  slug,
  excerpt,
  content,
  author_name,
  published,
  featured,
  seo_title,
  seo_description,
  seo_keywords,
  created_at,
  updated_at,
  published_at
)
VALUES (
  -- Title
  'Declaración Informativa Anual de Alquileres de Corta Duración 2026',
  
  -- Slug
  'declaracion-informativa-alquileres-corta-duracion-2026',
  
  -- Excerpt
  'Nueva obligación para propietarios de alquileres turísticos en 2026. Orden VAU/1560/2025 del BOE. Aprende qué es, quién debe presentarla, cuándo y cómo cumplir correctamente. Incluye PDF descargable y recordatorios de calendario.',
  
  -- Content (resumen, el HTML completo está en delfincheckin.com)
  'Desde febrero de 2026, los propietarios de alquileres de corta duración en España tienen una nueva obligación administrativa: la declaración informativa anual ante el Registro de la Propiedad. Esta medida, establecida por la Orden VAU/1560/2025 publicada en el BOE, busca dotar de mayor trazabilidad y control al sector de los arrendamientos turísticos y temporales.

## ¿Qué es la declaración informativa anual?

Se trata de una obligación administrativa de carácter informativo cuyo objetivo principal es proporcionar trazabilidad y control a los arrendamientos de corta duración en España. Esta declaración NO es un impuesto ni sustituye a otras obligaciones fiscales o administrativas existentes.

## Marco legal aplicable

La obligación de presentar esta declaración se regula mediante la Orden VAU/1560/2025, publicada en el Boletín Oficial del Estado (BOE) y se integra dentro del Registro Único de Arrendamientos gestionado por los Registradores de España.

## ¿A quién afecta?

Deben presentar la declaración informativa anual:
- Personas físicas (particulares) que ofrezcan alquileres de corta duración
- Personas jurídicas (empresas, sociedades) que gestionen alquileres turísticos
- Gestores profesionales que administren inmuebles de terceros
- Cualquier propietario que ofrezca alquileres turísticos o temporales, independientemente del canal de comercialización

## ¿Cuándo se presenta?

La declaración tiene carácter anual y debe presentarse durante el mes de febrero con los datos correspondientes al año natural anterior. La primera presentación obligatoria será en febrero de 2026.

## Errores comunes a evitar

1. Confundir esta declaración con obligaciones fiscales
2. Pensar que la plataforma de alquiler la presenta automáticamente
3. No tener la información anual organizada
4. No presentar la declaración dentro de plazo
5. No tener el NRA (Número de Registro de Alquiler) en regla

Descarga la guía completa en PDF y añade un recordatorio a tu calendario para no olvidar presentar tu declaración en febrero.',
  
  -- Author name
  'Delfín Check-in',
  
  -- Published
  true,
  
  -- Featured
  true,
  
  -- SEO Title
  'Declaración Informativa Anual de Alquileres de Corta Duración 2026 | Guía Completa BOE',
  
  -- SEO Description
  'Nueva obligación para propietarios de alquileres turísticos en 2026. Orden VAU/1560/2025 del BOE. Aprende qué es, quién debe presentarla, cuándo y cómo cumplir correctamente. Incluye PDF descargable.',
  
  -- SEO Keywords
  'declaración informativa alquileres corta duración, Orden VAU/1560/2025, BOE 2026, registro propiedad alquileres, NRA, alquiler turístico españa, obligaciones propietarios, registro único arrendamientos, declaración anual alquiler vacacional, ventanilla única digital',
  
  -- Created at
  NOW(),
  
  -- Updated at
  NOW(),
  
  -- Published at
  '2026-01-20T00:00:00Z'
);

-- Verificar que se insertó correctamente
SELECT 
  id,
  title,
  slug,
  author_name,
  published,
  featured,
  created_at,
  published_at
FROM blog_articles
WHERE slug = 'declaracion-informativa-alquileres-corta-duracion-2026';

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- Debería mostrar 1 fila con:
-- - title: "Declaración Informativa Anual de Alquileres de Corta Duración 2026"
-- - slug: "declaracion-informativa-alquileres-corta-duracion-2026"
-- - published: true
-- - featured: true
-- - published_at: 2026-01-20
-- =====================================================
