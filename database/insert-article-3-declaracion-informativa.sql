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
  slug,
  title,
  meta_description,
  meta_keywords,
  content,
  excerpt,
  canonical_url,
  schema_json,
  status,
  is_published,
  published_at,
  author_name,
  created_at,
  updated_at
)
VALUES (
  -- Slug
  'declaracion-informativa-alquileres-corta-duracion-2026',
  
  -- Title
  'Declaración Informativa Anual de Alquileres de Corta Duración 2026',
  
  -- Meta description
  'Nueva obligación para propietarios de alquileres turísticos en 2026. Orden VAU/1560/2025 del BOE. Aprende qué es, quién debe presentarla, cuándo y cómo cumplir correctamente. Incluye PDF descargable.',
  
  -- Meta keywords
  'declaración informativa alquileres corta duración, Orden VAU/1560/2025, BOE 2026, registro propiedad alquileres, NRA, alquiler turístico españa, obligaciones propietarios, registro único arrendamientos, declaración anual alquiler vacacional, ventanilla única digital',
  
  -- Content (resumen, el HTML completo está en delfincheckin.com)
  '<p>Desde febrero de 2026, los propietarios de alquileres de corta duración en España tienen una nueva obligación administrativa: la declaración informativa anual ante el Registro de la Propiedad. Esta medida, establecida por la Orden VAU/1560/2025 publicada en el BOE, busca dotar de mayor trazabilidad y control al sector de los arrendamientos turísticos y temporales.</p>

<h2>¿Qué es la declaración informativa anual?</h2>
<p>Se trata de una obligación administrativa de carácter informativo cuyo objetivo principal es proporcionar trazabilidad y control a los arrendamientos de corta duración en España. Esta declaración NO es un impuesto ni sustituye a otras obligaciones fiscales o administrativas existentes.</p>

<h2>Marco legal aplicable</h2>
<p>La obligación de presentar esta declaración se regula mediante la Orden VAU/1560/2025, publicada en el Boletín Oficial del Estado (BOE) y se integra dentro del Registro Único de Arrendamientos gestionado por los Registradores de España.</p>

<h2>¿A quién afecta?</h2>
<p>Deben presentar la declaración informativa anual:</p>
<ul>
<li>Personas físicas (particulares) que ofrezcan alquileres de corta duración</li>
<li>Personas jurídicas (empresas, sociedades) que gestionen alquileres turísticos</li>
<li>Gestores profesionales que administren inmuebles de terceros</li>
<li>Cualquier propietario que ofrezca alquileres turísticos o temporales, independientemente del canal de comercialización</li>
</ul>

<h2>¿Cuándo se presenta?</h2>
<p>La declaración tiene carácter anual y debe presentarse durante el mes de febrero con los datos correspondientes al año natural anterior. La primera presentación obligatoria será en febrero de 2026.</p>

<h2>Errores comunes a evitar</h2>
<ol>
 no