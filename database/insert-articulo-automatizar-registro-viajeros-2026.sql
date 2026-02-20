-- Ejecutar en Neon SQL Editor (copiar y pegar todo el bloque)
-- Artículo: Cómo automatizar el registro de viajeros en 2026 - SuperAdmin / Monitoreo

DELETE FROM blog_articles
WHERE slug = $$automatizar-registro-viajeros-2026-guia-tecnica$$;

INSERT INTO blog_articles (
  slug, title, meta_description, meta_keywords, content, excerpt,
  canonical_url, schema_json, status, is_published, published_at, author_name
)
VALUES (
  $$automatizar-registro-viajeros-2026-guia-tecnica$$,
  $$Cómo automatizar el registro de viajeros en 2026: guía técnica para propietarios y gestores turísticos$$,
  $$Guía 2026: cómo automatizar el registro de viajeros, envío automático SES, software registro viajeros España y normativa alquiler turístico. Evitar multas y cumplir con el Ministerio del Interior.$$,
  $$automatizar registro viajeros, envío automático SES, registro viajeros Ministerio Interior, software registro viajeros España, normativa 2026 alquiler turístico, evitar multas registro viajeros, check-in digital obligatorio$$,
  $$<p>Guía técnica para automatizar el registro de huéspedes: envío automático al SES, software de registro viajeros en España, normativa 2026 alquiler turístico, proceso manual vs automatizado, ventajas, errores comunes, caso práctico y checklist. Cumplir con el Ministerio del Interior y evitar multas.</p>$$,
  $$Cómo automatizar el registro de viajeros en 2026: envío automático SES, software registro viajeros España, normativa 2026 y evitar multas. Guía técnica para propietarios y gestores.$$,
  $$https://delfincheckin.com/articulos/automatizar-registro-viajeros-2026-guia-tecnica.html$$,
  '{"@context":"https://schema.org","@type":"Article","headline":"Cómo automatizar el registro de viajeros en 2026: guía técnica para propietarios y gestores turísticos","datePublished":"2026-01-29","dateModified":"2026-01-29"}'::jsonb,
  $$published$$,
  true,
  $$2026-01-29$$::timestamptz,
  $$Delfín Check-in$$
);
