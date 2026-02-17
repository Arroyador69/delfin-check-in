-- =====================================================
-- INSERTAR ARTÍCULOS: Registro paso a paso + Multas Airbnb/Booking 2026
-- =====================================================
-- Añade ambos artículos a blog_articles para que aparezcan en
-- SuperAdmin > Monitoreo artículos y el tracking (waitlist, analytics) funcione.
--
-- Ejecutar en Neon Dashboard (SQL Editor) o desde psql
-- =====================================================

-- ---------- Artículo: Registro de viajeros paso a paso (Ministerio del Interior 2026) ----------
DELETE FROM blog_articles
WHERE slug = 'registro-viajeros-paso-a-paso-ministerio-interior-2026';

INSERT INTO blog_articles (
  slug, title, meta_description, meta_keywords, content, excerpt,
  canonical_url, schema_json, status, is_published, published_at, author_name
)
VALUES (
  'registro-viajeros-paso-a-paso-ministerio-interior-2026',
  'Cómo hacer el registro de viajeros paso a paso (Ministerio del Interior 2026)',
  'Guía completa: registro de viajeros España, envío al SES hospedajes y Ministerio del Interior 2026. Cómo registrar huéspedes legalmente en alquiler vacacional. Check-in digital obligatorio.',
  'registro de viajeros España, Ministerio del Interior hospedajes, envío de partes de viajeros, SES hospedajes, registro obligatorio alquiler vacacional, cómo registrar huéspedes legalmente, plataforma registro viajeros, check-in digital obligatorio',
  '<p>Guía práctica sobre el registro obligatorio de viajeros en España, envío al SES y Ministerio del Interior. Cómo registrar huéspedes legalmente en alquiler vacacional. Incluye tabla paso a paso, errores frecuentes y multas.</p>',
  'Guía práctica: registro obligatorio de viajeros en España, envío al SES y Ministerio del Interior 2026. Cómo registrar huéspedes legalmente.',
  'https://delfincheckin.com/articulos/registro-viajeros-paso-a-paso-ministerio-interior-2026.html',
  '{"@context":"https://schema.org","@type":"Article","headline":"Cómo hacer el registro de viajeros paso a paso (Ministerio del Interior 2026)","datePublished":"2026-01-29","dateModified":"2026-01-29"}'::jsonb,
  'published',
  true,
  '2026-01-29'::timestamptz,
  'Delfín Check-in'
);

-- ---------- Artículo: Multas por no registrar huéspedes en Airbnb y Booking (Actualizado 2026) ----------
DELETE FROM blog_articles
WHERE slug = 'multas-no-registrar-huespedes-airbnb-booking-2026';

INSERT INTO blog_articles (
  slug, title, meta_description, meta_keywords, content, excerpt,
  canonical_url, schema_json, status, is_published, published_at, author_name
)
VALUES (
  'multas-no-registrar-huespedes-airbnb-booking-2026',
  'Multas por no registrar huéspedes en Airbnb y Booking (Actualizado 2026)',
  'Multas y sanciones por no registrar viajeros en alquiler vacacional en España. ¿Airbnb o Booking registran por ti? Tabla de multas Ministerio del Interior 2026 y cómo evitar sanciones.',
  'multa por no registrar viajeros, sanciones Ministerio del Interior, Airbnb registro obligatorio, Booking declaración huéspedes, sanciones alquiler vacacional España, cuánto es la multa por no registrar huéspedes',
  '<p>Guía actualizada 2026 sobre multas por no registrar huéspedes en España. Marco legal, si Airbnb o Booking registran por el propietario, tabla de sanciones y cómo evitar multas con registro automatizado.</p>',
  'Multas y sanciones por no registrar viajeros en Airbnb y Booking. Marco legal España 2026, tabla de multas y cómo evitar sanciones.',
  'https://delfincheckin.com/articulos/multas-no-registrar-huespedes-airbnb-booking-2026.html',
  '{"@context":"https://schema.org","@type":"Article","headline":"Multas por no registrar huéspedes en Airbnb y Booking (Actualizado 2026)","datePublished":"2026-01-29","dateModified":"2026-01-29"}'::jsonb,
  'published',
  true,
  '2026-01-29'::timestamptz,
  'Delfín Check-in'
);

-- ---------- Artículo: Check-in digital obligatorio en España 2026 ----------
DELETE FROM blog_articles
WHERE slug = 'check-in-digital-obligatorio-espana-2026';

INSERT INTO blog_articles (
  slug, title, meta_description, meta_keywords, content, excerpt,
  canonical_url, schema_json, status, is_published, published_at, author_name
)
VALUES (
  'check-in-digital-obligatorio-espana-2026',
  'Check-in digital obligatorio en España: qué cambia en 2026 y cómo cumplir la ley',
  'Guía 2026: qué es el check-in digital obligatorio, normativa alquiler corta duración, registro telemático huéspedes y envío al Ministerio del Interior. Cómo cumplir la ley.',
  'check-in digital obligatorio, registro telemático huéspedes, normativa alquiler corta duración 2026, Ministerio Interior alquiler turístico, envío telemático partes viajeros',
  '<p>Guía sobre el check-in digital obligatorio, registro telemático de huéspedes y normativa alquiler corta duración 2026. Ministerio del Interior, envío telemático de partes de viajeros, ventajas y riesgos de no digitalizar.</p>',
  'Qué es el check-in digital, si es obligatorio, normativa 2026 y cómo cumplir con el registro telemático de huéspedes y el Ministerio del Interior.',
  'https://delfincheckin.com/articulos/check-in-digital-obligatorio-espana-2026.html',
  '{"@context":"https://schema.org","@type":"Article","headline":"Check-in digital obligatorio en España: qué cambia en 2026 y cómo cumplir la ley","datePublished":"2026-01-29","dateModified":"2026-01-29"}'::jsonb,
  'published',
  true,
  '2026-01-29'::timestamptz,
  'Delfín Check-in'
);

-- ---------- Artículo: ¿Airbnb registra a los huéspedes por ti? 2026 ----------
DELETE FROM blog_articles
WHERE slug = 'airbnb-registra-huespedes-por-ti-2026';

INSERT INTO blog_articles (
  slug, title, meta_description, meta_keywords, content, excerpt,
  canonical_url, schema_json, status, is_published, published_at, author_name
)
VALUES (
  'airbnb-registra-huespedes-por-ti-2026',
  '¿Airbnb registra a los huéspedes por ti? Lo que debes saber en 2026',
  '¿Airbnb registra huéspedes por el propietario? No. Te explicamos quién envía los datos al Ministerio del Interior, la obligación del propietario y el registro viajeros Airbnb España en 2026.',
  'Airbnb registra huéspedes, quién envía los datos al Ministerio del Interior, obligación propietario Airbnb, registro viajeros Airbnb España, Airbnb declaración informativa',
  '<p>Respuesta clara: Airbnb no registra a los huéspedes por el propietario. La obligación y la responsabilidad son del anfitrión. Diferencia entre plataforma y ley, qué pasa con Booking, riesgos y qué hacer. Guía 2026.</p>',
  '¿Airbnb registra huéspedes por ti? No. Quién envía los datos al Ministerio del Interior es el propietario. Obligación y registro viajeros Airbnb España en 2026.',
  'https://delfincheckin.com/articulos/airbnb-registra-huespedes-por-ti-2026.html',
  '{"@context":"https://schema.org","@type":"Article","headline":"¿Airbnb registra a los huéspedes por ti? Lo que debes saber en 2026","datePublished":"2026-01-29","dateModified":"2026-01-29"}'::jsonb,
  'published',
  true,
  '2026-01-29'::timestamptz,
  'Delfín Check-in'
);

-- ---------- Artículo: Declaración informativa alquileres corta duración 2026 guía completa ----------
DELETE FROM blog_articles
WHERE slug = 'declaracion-informativa-alquileres-corta-duracion-2026-guia-completa';

INSERT INTO blog_articles (
  slug, title, meta_description, meta_keywords, content, excerpt,
  canonical_url, schema_json, status, is_published, published_at, author_name
)
VALUES (
  'declaracion-informativa-alquileres-corta-duracion-2026-guia-completa',
  'Declaración informativa alquileres corta duración 2026: guía completa para propietarios',
  'Guía completa: declaración informativa alquileres corta duración 2026. Quién está obligado, plazos, cómo presentarla, modelo declaración alquiler turístico, errores y sanciones. España.',
  'declaración informativa alquileres corta duración 2026, declaración alquiler turístico España, obligación fiscal alquiler vacacional, Agencia Tributaria alquiler corta duración, modelo declaración alquiler turístico',
  '<p>Guía pilar: qué es la declaración informativa, quién está obligado, diferencia con fiscal y registro de viajeros, plazos, presentación, modelo, errores frecuentes, sanciones, tabla resumen y checklist. Orden VAU/1560/2025.</p>',
  'Declaración informativa alquileres corta duración 2026: guía completa. Obligados, plazos, modelo declaración alquiler turístico, Agencia Tributaria y registro de viajeros.',
  'https://delfincheckin.com/articulos/declaracion-informativa-alquileres-corta-duracion-2026-guia-completa.html',
  '{"@context":"https://schema.org","@type":"Article","headline":"Declaración informativa alquileres corta duración 2026: guía completa para propietarios","datePublished":"2026-01-29","dateModified":"2026-01-29"}'::jsonb,
  'published',
  true,
  '2026-01-29'::timestamptz,
  'Delfín Check-in'
);

-- =====================================================
-- FIN
-- =====================================================
