-- Insertar el primer artículo en la base de datos
-- Este script inserta el artículo de multas que ya está publicado en delfincheckin.com

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
  author,
  author_name,
  created_at,
  updated_at,
  view_count,
  conversion_count
) VALUES (
  'multas-por-no-registrar-viajeros-espana',
  'Multas por no registrar viajeros en España: importes reales y casos comunes',
  'Descubre los importes reales de las multas por no registrar viajeros en España según el RD 933/2021. Casos comunes, responsabilidades y cómo evitar sanciones legales.',
  'multas registro viajeros, sanciones alquiler vacacional, RD 933/2021, SES Policía Nacional, infracciones turísticas España, registro huéspedes obligatorio, responsabilidad propietario vivienda turística, cumplimiento normativo hospedaje',
  'Artículo completo sobre multas por no registrar viajeros en España',
  'Conoce los importes oficiales de las multas por no enviar el registro de viajeros al SES de Policía Nacional. Analizamos las sanciones del RD 933/2021, casos frecuentes y responsabilidades del propietario.',
  'https://delfincheckin.com/articulos/multas-por-no-registrar-viajeros-espana.html',
  '{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Multas por no registrar viajeros en España: importes reales y casos comunes",
    "description": "Descubre los importes reales de las multas por no registrar viajeros en España según el RD 933/2021. Casos comunes, responsabilidades y cómo evitar sanciones legales.",
    "image": "https://delfincheckin.com/og-image.png",
    "author": {
      "@type": "Organization",
      "name": "Delfín Check-in"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Delfín Check-in",
      "logo": {
        "@type": "ImageObject",
        "url": "https://delfincheckin.com/logo.png"
      }
    },
    "datePublished": "2026-01-18",
    "dateModified": "2026-01-18"
  }'::jsonb,
  'published',
  true,
  NOW(),
  'Delfín Check-in',
  'Equipo Delfín Check-in',
  NOW(),
  NOW(),
  0,
  0
) ON CONFLICT (slug) DO UPDATE SET
  updated_at = NOW();

-- Verificar que se insertó correctamente
SELECT id, slug, title, is_published, published_at 
FROM blog_articles 
WHERE slug = 'multas-por-no-registrar-viajeros-espana';
