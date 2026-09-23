/**
 * Congelación de contenido SEO a escala.
 * Google (política de abuso de contenido a escala) y Bing penalizan dominios
 * que publican muchas páginas casi iguales para manipular el ranking.
 * Mientras esto esté activo, ningún cron ni botón del superadmin puede
 * generar o subir artículos o páginas programáticas a la landing.
 */
export const SEO_CONTENT_PUBLISHING_FROZEN = true;

export const SEO_CONTENT_FREEZE_MESSAGE =
  'La publicación automática de artículos y páginas programáticas está pausada. Google y Bing estaban indexando cientos de textos casi iguales y el dominio perdía visibilidad. No se generará ni se subirá contenido nuevo.';
