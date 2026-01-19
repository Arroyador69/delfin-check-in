-- ================================================
-- Limpieza de artículos del blog
-- ================================================
-- Fecha: 2026-01-19
-- Propósito: Eliminar artículos antiguos y mantener solo los 2 correctos
-- ================================================

-- Paso 1: Ver artículos actuales
SELECT 
  id,
  slug,
  title,
  status,
  is_published,
  published_at,
  view_count,
  conversion_count,
  created_at
FROM blog_articles 
ORDER BY created_at DESC;

-- Paso 2: Eliminar TODOS los artículos que NO sean los 2 correctos
DELETE FROM blog_articles 
WHERE slug NOT IN (
  'multas-por-no-registrar-viajeros-espana',
  'errores-frecuentes-enviar-datos-huespedes-ses'
);

-- Paso 3: Insertar/Actualizar artículo #1 (Multas)
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
) VALUES (
  'multas-por-no-registrar-viajeros-espana',
  'Multas por no registrar viajeros en España: importes reales y casos comunes',
  'Conoce los importes oficiales de las multas por no registrar viajeros en España según el RD 933/2021. Guía práctica sin alarmismos para propietarios de alquiler vacacional.',
  'multas registro viajeros, sanciones ses, alquiler vacacional multas, rd 933/2021 sanciones, parte de viajeros multa, cuánto cuesta no registrar huéspedes',
  '<p>Artículo completo sobre las multas por no registrar viajeros en España, con importes oficiales del RD 933/2021, casos comunes y cómo evitarlos.</p>',
  'Descubre los importes reales de las multas por no registrar viajeros: leves (100-600€), graves (601-30.000€) y muy graves (30.001-600.000€). Guía con casos comunes y cómo evitar sanciones.',
  'https://delfincheckin.com/articulos/multas-por-no-registrar-viajeros-espana',
  '{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Multas por no registrar viajeros en España: importes reales y casos comunes",
    "description": "Conoce los importes oficiales de las multas por no registrar viajeros en España según el RD 933/2021. Guía práctica sin alarmismos para propietarios de alquiler vacacional.",
    "image": "https://delfincheckin.com/og-image.svg",
    "author": {
      "@type": "Organization",
      "name": "Delfín Check-in",
      "url": "https://delfincheckin.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Delfín Check-in",
      "logo": {
        "@type": "ImageObject",
        "url": "https://delfincheckin.com/og-image.svg"
      }
    },
    "datePublished": "2026-01-18T12:00:00+00:00",
    "dateModified": "2026-01-18T12:00:00+00:00",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://delfincheckin.com/articulos/multas-por-no-registrar-viajeros-espana"
    }
  }'::jsonb,
  'published',
  true,
  '2026-01-18 12:00:00+00',
  'Equipo Delfín Check-in',
  '2026-01-18 12:00:00+00',
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  meta_description = EXCLUDED.meta_description,
  meta_keywords = EXCLUDED.meta_keywords,
  content = EXCLUDED.content,
  excerpt = EXCLUDED.excerpt,
  canonical_url = EXCLUDED.canonical_url,
  schema_json = EXCLUDED.schema_json,
  status = EXCLUDED.status,
  is_published = EXCLUDED.is_published,
  published_at = EXCLUDED.published_at,
  author_name = EXCLUDED.author_name,
  updated_at = NOW();

-- Paso 4: Insertar/Actualizar artículo #2 (Errores SES)
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
) VALUES (
  'errores-frecuentes-enviar-datos-huespedes-ses',
  'Errores frecuentes al enviar datos de huéspedes al SES (y cómo evitarlos)',
  'Descubre los errores más comunes al enviar datos al SES del Ministerio del Interior y cómo evitarlos. Guía práctica para propietarios de alquiler vacacional.',
  'errores ses, envío datos huéspedes, ses ministerio interior, partes de viajeros, alquiler vacacional, registro viajeros, errores comunes ses',
  '<p>Artículo completo sobre errores frecuentes al enviar datos de huéspedes al SES, incluyendo identificación incorrecta, datos personales erróneos, fechas mal configuradas, y más.</p>',
  'Conoce los errores más frecuentes al enviar datos al SES del Ministerio del Interior: tipo de documento incorrecto, formato de datos mal, fechas de entrada erróneas, y cómo evitarlos para cumplir sin multas.',
  'https://delfincheckin.com/articulos/errores-frecuentes-enviar-datos-huespedes-ses',
  '{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Errores frecuentes al enviar datos de huéspedes al SES (y cómo evitarlos)",
    "description": "Descubre los errores más comunes al enviar datos al SES del Ministerio del Interior y cómo evitarlos. Guía práctica para propietarios de alquiler vacacional.",
    "image": "https://delfincheckin.com/og-image.svg",
    "author": {
      "@type": "Organization",
      "name": "Delfín Check-in",
      "url": "https://delfincheckin.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Delfín Check-in",
      "logo": {
        "@type": "ImageObject",
        "url": "https://delfincheckin.com/og-image.svg"
      }
    },
    "datePublished": "2026-01-19T12:00:00+00:00",
    "dateModified": "2026-01-19T12:00:00+00:00",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://delfincheckin.com/articulos/errores-frecuentes-enviar-datos-huespedes-ses"
    }
  }'::jsonb,
  'published',
  true,
  '2026-01-19 12:00:00+00',
  'Equipo Delfín Check-in',
  '2026-01-19 12:00:00+00',
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  meta_description = EXCLUDED.meta_description,
  meta_keywords = EXCLUDED.meta_keywords,
  content = EXCLUDED.content,
  excerpt = EXCLUDED.excerpt,
  canonical_url = EXCLUDED.canonical_url,
  schema_json = EXCLUDED.schema_json,
  status = EXCLUDED.status,
  is_published = EXCLUDED.is_published,
  published_at = EXCLUDED.published_at,
  author_name = EXCLUDED.author_name,
  updated_at = NOW();

-- Paso 5: Verificar resultado final
SELECT 
  id,
  slug,
  title,
  status,
  is_published,
  published_at,
  view_count,
  conversion_count,
  created_at,
  updated_at
FROM blog_articles 
ORDER BY published_at DESC;

-- Paso 6: Contar artículos
SELECT COUNT(*) as total_articulos FROM blog_articles;
