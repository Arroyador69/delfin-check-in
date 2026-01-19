-- ================================================
-- Insertar Artículo #2: Errores frecuentes al enviar datos al SES
-- ================================================
-- Fecha: 2026-01-19
-- Slug: errores-frecuentes-enviar-datos-huespedes-ses
-- ================================================

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
  NOW(),
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

-- Verificar inserción
SELECT 
  id,
  slug,
  title,
  status,
  is_published,
  published_at,
  view_count,
  conversion_count
FROM blog_articles 
WHERE slug = 'errores-frecuentes-enviar-datos-huespedes-ses';
