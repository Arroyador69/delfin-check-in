/**
 * Cron de artículos SEO: 2 artículos/día sobre alquiler vacacional.
 * Usa OpenAI, guarda en blog_articles + programmatic_pages, publica en articulos/*.html
 * con header, footer, popup, waitlist y FAQ como el resto de artículos.
 */

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** 10 temas para artículos (alquiler vacacional, registro viajeros, PMS, normativa, etc.) */
export const ARTICLE_TOPICS = [
  {
    id: 'multas-registro-viajeros',
    title: 'Multas por no registrar viajeros en alquiler vacacional',
    keywords: 'multas registro viajeros, sanción alquiler turístico, RD 933/2021, cumplimiento Ministerio Interior',
  },
  {
    id: 'check-in-digital-obligatorio',
    title: 'Check-in digital obligatorio en España para alojamientos',
    keywords: 'check-in digital obligatorio, registro huéspedes digital, normativa alquiler turístico España',
  },
  {
    id: 'software-gestion-alquiler-vacacional',
    title: 'Software de gestión para alquiler vacacional: qué debe tener',
    keywords: 'software alquiler vacacional, PMS apartamentos turísticos, gestión reservas Airbnb Booking',
  },
  {
    id: 'licencia-vivienda-turistica-comunidades',
    title: 'Licencia de vivienda turística por comunidades autónomas',
    keywords: 'licencia vivienda turística, registro turístico autonómico, requisitos alquiler vacacional',
  },
  {
    id: 'automatizar-registro-viajeros-ses',
    title: 'Cómo automatizar el registro de viajeros y el envío al SES',
    keywords: 'automatizar registro viajeros, envío SES Ministerio Interior, software registro huéspedes',
  },
  {
    id: 'declaracion-informativa-alquileres',
    title: 'Declaración informativa de alquileres de corta duración',
    keywords: 'declaración informativa alquileres, obligaciones fiscales alquiler vacacional, Hacienda',
  },
  {
    id: 'errores-registro-viajeros-evitar',
    title: 'Errores frecuentes al registrar viajeros y cómo evitarlos',
    keywords: 'errores registro viajeros, rechazos SES, partes de viajeros incorrectos',
  },
  {
    id: 'airbnb-booking-registro-huéspedes',
    title: 'Airbnb y Booking: quién debe registrar a los huéspedes',
    keywords: 'Airbnb registro huéspedes, Booking registro viajeros, obligación propietario',
  },
  {
    id: 'pms-vs-hojas-calculo-alquiler',
    title: 'PMS frente a hojas de cálculo para gestionar alquiler vacacional',
    keywords: 'PMS alquiler vacacional, gestionar reservas sin PMS, ventajas software gestión',
  },
  {
    id: 'consejos-fiscales-propietarios-vacacional',
    title: 'Consejos fiscales para propietarios de alquiler vacacional',
    keywords: 'fiscalidad alquiler vacacional, declarar ingresos Airbnb, IRPF alquiler turístico',
  },
] as const;

export type ArticleTopicId = (typeof ARTICLE_TOPICS)[number]['id'];

export interface GeneratedArticle {
  title: string;
  meta_description: string;
  meta_keywords: string;
  slug: string;
  content_html: string;
  excerpt: string;
  faq: Array<{ question: string; answer: string }>;
  word_count: number;
}

const ARTICLE_SYSTEM_PROMPT = `Eres un redactor SEO experto en alquiler vacacional, registro de viajeros (RD 933/2021), PMS y normativa turística en España.
Escribes artículos de 1600 a 2000 palabras, optimizados para Google, con tono profesional y útil para propietarios y gestores.
Menciona de forma natural Delfín Check-in como software de gestión hotelera y check-in digital (PMS con envío al Ministerio del Interior, lista de espera en delfincheckin.com).
Responde ÚNICAMENTE con un JSON válido, sin texto antes ni después, con esta estructura exacta:
{
  "title": "Título del artículo (máx 70 caracteres, incluir palabras clave)",
  "meta_description": "Meta description 150-160 caracteres con palabras clave",
  "meta_keywords": "palabra1, palabra2, palabra3, palabra4, palabra5",
  "slug": "url-amigable-solo-minusculas-y-guiones-sin-acentos",
  "content_html": "Contenido del artículo en HTML. Usa <h2> para secciones principales, <h3> para subsecciones, <p>, <ul>, <li>, <strong>. Incluye al final un bloque: <div class=\"highlight-box\"><h3>🐬 Delfín Check-in</h3><p>Descripción 2-3 frases del PMS y check-in digital, lista de espera delfincheckin.com.</p></div>",
  "excerpt": "Resumen en 1-2 frases para listados (máx 200 caracteres)",
  "faq": [
    { "question": "Pregunta frecuente 1?", "answer": "Respuesta clara y útil." },
    { "question": "Pregunta frecuente 2?", "answer": "Respuesta." }
  ]
}
Reglas: slug único y corto; content_html sin <!DOCTYPE> ni <html>; entre 5 y 7 preguntas en faq; content_html debe tener entre 1600 y 2000 palabras (cuenta aproximada en español).`;

/**
 * Genera un artículo con OpenAI a partir de un tema.
 */
export async function generateArticleWithOpenAI(
  topic: (typeof ARTICLE_TOPICS)[number]
): Promise<GeneratedArticle> {
  const userPrompt = `Escribe un artículo SEO completo (1600-2000 palabras) sobre este tema:

Tema: ${topic.title}
Palabras clave a integrar de forma natural: ${topic.keywords}

Estructura sugerida:
- Introducción (problema o contexto)
- 4-5 secciones con H2/H3 (explicación, normativa, consejos, herramientas)
- Conclusión breve
- Bloque final con clase "highlight-box" sobre Delfín Check-in (PMS, check-in digital, envío al Ministerio, lista de espera)
- FAQ con 5-7 preguntas relevantes para el tema

Responde SOLO con el JSON indicado en las instrucciones del sistema.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: ARTICLE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.6,
    max_tokens: 4500,
  });

  const raw = completion.choices[0]?.message?.content?.trim() || '';
  if (!raw) throw new Error('OpenAI devolvió contenido vacío');

  // Extraer JSON (puede venir envuelto en ```json ... ```)
  let jsonStr = raw;
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  const parsed = JSON.parse(jsonStr) as GeneratedArticle;
  const wordCount = (parsed.content_html || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  parsed.word_count = wordCount;
  if (!parsed.faq || !Array.isArray(parsed.faq)) parsed.faq = [];
  return parsed;
}

/**
 * Escapa HTML para atributos y texto.
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return (text || '').replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Genera el HTML completo del artículo (header, hero, contenido, waitlist, FAQ, footer, popup, scripts).
 * Misma estructura que el resto de artículos de la web.
 */
export function buildFullArticleHTML(params: {
  slug: string;
  title: string;
  meta_description: string;
  meta_keywords: string;
  content_html: string;
  published_date: string; // YYYY-MM-DD
  read_time_min: number;
  faq: Array<{ question: string; answer: string }>;
}): string {
  const {
    slug,
    title,
    meta_description,
    meta_keywords,
    content_html,
    published_date,
    read_time_min,
    faq,
  } = params;

  const canonicalUrl = `https://delfincheckin.com/articulos/${slug}.html`;
  const schemaArticle = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: meta_description,
    image: 'https://delfincheckin.com/og-image.svg',
    author: { '@type': 'Organization', name: 'Delfín Check-in', url: 'https://delfincheckin.com' },
    publisher: {
      '@type': 'Organization',
      name: 'Delfín Check-in',
      logo: { '@type': 'ImageObject', url: 'https://delfincheckin.com/og-image.svg' },
    },
    datePublished: published_date,
    dateModified: published_date,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  const faqSectionHtml =
    faq.length > 0
      ? `
    <div class="faq-section">
      <h2>Preguntas frecuentes</h2>
      ${faq
        .map(
          (f) => `
      <details>
        <summary>${escapeHtml(f.question)}</summary>
        <p>${escapeHtml(f.answer)}</p>
      </details>`
        )
        .join('\n')}
    </div>`
      : '';

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-');
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${parseInt(day, 10)} de ${months[parseInt(m, 10) - 1]} de ${y}`;
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-QT3JVKX2GE"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-QT3JVKX2GE');
  </script>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes">
  <title>${escapeHtml(title)} | Delfín Check-in</title>
  <meta name="description" content="${escapeHtml(meta_description)}">
  <meta name="keywords" content="${escapeHtml(meta_keywords)}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(meta_description)}">
  <meta property="og:image" content="https://delfincheckin.com/og-image.svg">
  <meta property="article:published_time" content="${published_date}">
  <meta property="article:author" content="Delfín Check-in">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(meta_description)}">
  <meta name="author" content="Delfín Check-in">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="language" content="Spanish">
  <meta name="geo.region" content="ES">
  <meta name="theme-color" content="#44c0ff">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <script type="application/ld+json">${JSON.stringify(schemaArticle)}</script>
  <style>
    :root { --bg: #eef6ff; --card: #ffffff; --text: #0f172a; --muted: #475569; --brand: #2563eb; --accent: #16a34a; --danger: #ef4444; --border: rgba(15,23,42,.08); --maxw: 1200px; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; overflow-x: hidden; }
    html { scroll-behavior: smooth; }
    header { background: #fff; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 10px rgba(0,0,0,.05); }
    .nav { max-width: var(--maxw); margin: 0 auto; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
    .brand { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 700; color: var(--text); text-decoration: none; }
    .logo { font-size: 28px; }
    .nav-actions { display: flex; gap: 12px; }
    .btn { display: inline-block; height: 42px; padding: 0 20px; border-radius: 10px; border: 1px solid rgba(15,23,42,.12); background: #fff; color: var(--text); font-weight: 600; font-size: 14px; text-decoration: none; line-height: 40px; text-align: center; transition: all 0.3s ease; }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.1); }
    .btn.primary { background: var(--brand); color: #fff; border-color: var(--brand); box-shadow: 0 4px 12px rgba(37,99,235,.25); }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    article { background: var(--card); border-radius: 16px; padding: 48px; box-shadow: 0 4px 20px rgba(0,0,0,.08); margin-bottom: 40px; }
    .article-meta { display: flex; gap: 16px; color: var(--muted); font-size: 14px; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid var(--border); }
    .article-content h2 { font-size: 32px; font-weight: 700; margin-top: 40px; margin-bottom: 16px; color: var(--text); }
    .article-content h3 { font-size: 24px; font-weight: 600; margin-top: 32px; margin-bottom: 12px; color: var(--text); }
    .article-content p { margin-bottom: 20px; font-size: 17px; line-height: 1.8; }
    .article-content ul, .article-content ol { margin: 20px 0 20px 24px; }
    .article-content li { margin-bottom: 8px; font-size: 17px; line-height: 1.7; }
    .article-content strong { font-weight: 600; color: var(--text); }
    .article-content a { color: var(--brand); text-decoration: underline; }
    .highlight-box { background: linear-gradient(135deg, rgba(68,192,255,0.1) 0%, rgba(124,240,124,0.1) 100%); border: 2px solid rgba(68,192,255,0.3); border-radius: 12px; padding: 24px; margin: 32px 0; }
    .highlight-box h3 { margin-top: 0; color: var(--brand); }
    .faq-section { background: var(--card); border-radius: 16px; padding: 48px; box-shadow: 0 4px 20px rgba(0,0,0,.08); margin-bottom: 40px; }
    .faq-section h2 { font-size: 32px; font-weight: 700; margin-bottom: 24px; text-align: center; }
    details { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; margin-bottom: 12px; cursor: pointer; }
    summary { font-weight: 600; font-size: 17px; cursor: pointer; list-style: none; }
    summary::-webkit-details-marker { display: none; }
    summary::after { content: '+'; float: right; font-size: 24px; font-weight: 700; color: var(--brand); }
    details[open] summary::after { content: '−'; }
    details p { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); font-size: 16px; line-height: 1.7; }
    footer { background: #fff; border-top: 1px solid var(--border); padding: 48px 20px 32px; }
    .footer-content { max-width: var(--maxw); margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 32px; margin-bottom: 32px; }
    .footer-content h4 { margin-bottom: 12px; font-size: 16px; font-weight: 700; }
    .footer-content p, .footer-content a { font-size: 14px; color: var(--muted); text-decoration: none; display: block; line-height: 1.8; }
    .footer-content a:hover { color: var(--brand); }
    .footer-bottom { max-width: var(--maxw); margin: 0 auto; border-top: 1px solid var(--border); padding-top: 24px; text-align: center; color: var(--muted); font-size: 14px; }
    .popup-overlay { display: none; position: fixed; inset: 0; background: rgba(15,23,42,.6); z-index: 10000; backdrop-filter: blur(4px); align-items: center; justify-content: center; }
    .popup-overlay.show { display: flex; }
    .popup-content { background: white; border-radius: 20px; padding: 40px; max-width: 500px; width: 90%; box-shadow: 0 25px 80px rgba(0,0,0,.4); position: relative; }
    .popup-close { position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 32px; cursor: pointer; color: var(--muted); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
    .article-hero { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 80px 24px; text-align: center; }
    .article-hero-content { max-width: 900px; margin: 0 auto; }
    .article-hero h1 { font-size: 48px; font-weight: 800; line-height: 1.2; margin-bottom: 20px; }
    .article-hero .subtitle { font-size: 22px; opacity: 0.95; font-weight: 500; margin-bottom: 20px; }
    .article-hero .article-meta { display: flex; gap: 20px; justify-content: center; font-size: 15px; opacity: 0.9; flex-wrap: wrap; border: none; padding: 0; margin: 0; }
    @media (max-width: 768px) { article { padding: 32px 24px; } .article-hero h1 { font-size: 32px; } .article-content h2 { font-size: 26px; } .article-content h3 { font-size: 20px; } .nav-actions { flex-direction: column; } .btn { width: 100%; } }
  </style>
</head>
<body>
  <header>
    <div class="nav">
      <a href="https://delfincheckin.com" class="brand"><div class="logo" aria-hidden="true">🐬</div><b>Delfín Check‑in</b></a>
      <div class="nav-actions">
        <a class="btn primary" href="https://delfincheckin.com#registro">Registro Gratis</a>
        <a class="btn" href="https://delfincheckin.com#caracteristicas">Funciones</a>
      </div>
    </div>
  </header>
  <section class="article-hero">
    <div class="article-hero-content">
      <h1>${escapeHtml(title)}</h1>
      <p class="subtitle">${escapeHtml(meta_description)}</p>
      <div class="article-meta">
        <span>📅 ${formatDate(published_date)}</span>
        <span>⏱️ ${read_time_min} min lectura</span>
        <span>✍️ Delfín Check-in</span>
      </div>
    </div>
  </section>
  <main class="container">
    <article>
      <div class="article-content">
${content_html}
      </div>
    </article>
    <section id="registro" class="section" style="background: linear-gradient(135deg, #44c0ff 0%, #2563eb 100%); border-radius: 24px; padding: 48px 24px; margin: 64px auto; max-width: 900px; box-shadow: 0 20px 60px rgba(37, 99, 235, 0.3);">
      <div style="text-align: center; color: white; margin-bottom: 32px;">
        <div style="font-size: 64px; margin-bottom: 16px;">🐬</div>
        <h2 style="color: white; margin-bottom: 16px; font-size: 42px; font-weight: 900;">El software de gestión hotelera (PMS) que estabas esperando</h2>
        <p style="color: rgba(255,255,255,0.95); font-size: 22px; line-height: 1.6; margin-bottom: 16px; font-weight: 600;"><strong>Acceso gratuito al plan básico si te apuntas ya.</strong> De propietarios, para propietarios.</p>
        <p style="color: rgba(255,255,255,0.9); font-size: 18px; line-height: 1.6;">Regístrate y sé de los primeros. <strong>Los primeros usuarios tendrán acceso permanente al Plan Gratuito (Básico) sin coste mensual.</strong> El módulo de check-in digital (envío al Ministerio del Interior) siempre costará 8€/mes.</p>
        <div style="margin-top: 24px; padding: 16px; background: rgba(255,255,255,0.15); border-radius: 12px;"><p style="margin: 0; font-size: 16px; font-weight: 600;">📱 Apps móviles en desarrollo | 💯 Plan Básico Gratis | 💰 Check-in: 8€/mes</p></div>
      </div>
      <div style="background: white; max-width: 600px; margin: 0 auto; padding: 32px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 48px; margin-bottom: 12px;">🎯</div>
          <h3 style="color: #0f172a; font-size: 28px; font-weight: 800; margin-bottom: 8px;">🎁 Consigue acceso permanente al plan básico</h3>
          <p style="color: #64748b; font-size: 18px; line-height: 1.6;">Únete a la lista de espera y recibe acceso prioritario cuando lancemos. <strong style="color: #2563eb;">Los primeros usuarios tendrán acceso permanente al Plan Gratuito (Básico) sin coste mensual.</strong></p>
        </div>
        <form id="waitlistForm" style="display: grid; gap: 20px;">
          <label><span style="display: block; margin-bottom: 8px; font-weight: 600; color: #0f172a;">Email *</span><input id="waitlistEmail" type="email" name="email" required placeholder="tu@email.com" style="width: 100%; height: 52px; border-radius: 12px; background: #fff; color: #0f172a; border: 2px solid rgba(15,23,42,.2); padding: 0 16px; font-size: 16px;"></label>
          <label><span style="display: block; margin-bottom: 8px; font-weight: 600; color: #0f172a;">Nombre (opcional)</span><input id="waitlistName" type="text" name="name" placeholder="Tu nombre" style="width: 100%; height: 52px; border-radius: 12px; background: #fff; color: #0f172a; border: 2px solid rgba(15,23,42,.2); padding: 0 16px; font-size: 16px;"></label>
          <button type="submit" id="waitlistSubmit" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; border: none; padding: 18px 32px; border-radius: 12px; font-size: 18px; font-weight: 700; cursor: pointer; width: 100%; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);"><span id="waitlistSubmitText">🎁 Quiero acceso permanente al plan básico</span><span id="waitlistLoading" style="display: none;">Enviando...</span></button>
          <div id="waitlistMessage" style="margin: 0; padding: 0; border-radius: 8px; display: none; text-align: left;"></div>
        </form>
        <div style="margin-top: 24px; padding: 20px; background: #f0f9ff; border-radius: 12px; border-left: 4px solid #2563eb;">
          <div style="display: flex; align-items: start; gap: 12px;">
            <div style="font-size: 24px;">ℹ️</div>
            <div>
              <h4 style="margin: 0 0 8px 0; color: #1e40af; font-weight: 700; font-size: 18px;">✨ Plan Gratuito (Básico) - Incluye esto</h4>
              <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 15px; line-height: 2;">
                <li><strong>✅ Gestión de reservas</strong> - Gestiona todas tus reservas desde un panel intuitivo</li>
                <li><strong>✅ Gestión de habitaciones o propiedades</strong> - Controla tu inventario</li>
                <li><strong>✅ Exportación de datos</strong> - CSV/Excel</li>
                <li><strong>✅ Panel de administración</strong> - Intuitivo y potente</li>
                <li><strong>✅ Soporte por email</strong> - Siempre disponible</li>
                <li><strong>✅ App móvil</strong> - iOS y Android (próximamente)</li>
                <li><strong>🔗 Crea enlaces de pago personalizados</strong> - Compártelos por WhatsApp o email</li>
                <li><strong>🌐 Microsite para reservas directas</strong> - Recibe reservas directas con pagos en tu cuenta</li>
                <li style="margin-top: 12px; padding-top: 12px; border-top: 2px solid #bae6fd;"><strong style="font-size: 16px; color: #059669;">🎁 Los primeros usuarios: acceso permanente al plan básico sin coste mensual</strong></li>
                <li style="color: #dc2626; font-size: 14px; margin-top: 12px; font-weight: 600;">❌ <strong>No incluye:</strong> Check-in digital (8€/mes) ni envío al Ministerio del Interior</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
${faqSectionHtml}
  </main>
  <footer>
    <div class="footer-content">
      <div><h4>Delfín Check‑in</h4><p>Software de gestión hotelera y auto check‑in para hostales y apartamentos.</p></div>
      <div><h4>Contacto</h4><p>📧 contacto@delfincheckin.com<br>🕒 Lun-Dom: 9:00-22:00</p></div>
      <div><h4>Programas</h4><a href="https://delfincheckin.com/referidos.html">Programa de Referidos</a><a href="https://delfincheckin.com/afiliados.html">Programa de Afiliados</a></div>
      <div><h4>Legal</h4><a href="https://delfincheckin.com/politica-privacidad.html">Política de Privacidad</a><a href="https://delfincheckin.com/politica-cookies.html">Política de Cookies</a><a href="https://delfincheckin.com/terminos-servicio.html">Términos de Servicio</a><a href="https://delfincheckin.com/aviso-legal.html">Aviso Legal</a></div>
    </div>
    <div class="footer-bottom">
      <p style="margin: 0 0 12px; font-size: 14px;">© <span id="year"></span> Delfín Check‑in · <a href="https://delfincheckin.com/#registro" style="color: var(--brand);">Registro Gratis</a></p>
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">El Plan Gratuito (Básico) se financia con anuncios. El Plan Check-in: 8€/mes. Sin costes ocultos.</p>
    </div>
  </footer>
  <div class="popup-overlay" id="popupWaitlist" style="display: none; position: fixed; inset: 0; background: rgba(15,23,42,.6); z-index: 10000; backdrop-filter: blur(4px); align-items: center; justify-content: center;">
    <div class="popup-content">
      <button class="popup-close" id="closePopup" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 32px; cursor: pointer; color: #64748b;">&times;</button>
      <div style="text-align: center;">
        <div style="font-size: 48px; margin-bottom: 12px;">🐬</div>
        <h3 style="font-size: 28px; margin-bottom: 12px; color: #2563eb;">¿Te interesa Delfín Check-in?</h3>
        <p style="color: #64748b; margin-bottom: 24px;">Únete a la lista de espera y sé de los primeros en acceder al Plan Básico Gratuito.</p>
        <button id="popupCtaBtn" style="height: 52px; width: 100%; background: #2563eb; color: white; border: none; border-radius: 10px; font-weight: 700; cursor: pointer;">Quiero acceso anticipado</button>
      </div>
    </div>
  </div>
  <script>
    const ARTICLE_SLUG = ${JSON.stringify(slug)};
    const ADMIN_API_URL = 'https://admin.delfincheckin.com/api';
    let sessionId = sessionStorage.getItem('delfin_session_id') || ('session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
    sessionStorage.setItem('delfin_session_id', sessionId);
    async function trackEvent(et, ed) { try { await fetch(ADMIN_API_URL + '/blog/analytics/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ article_slug: ARTICLE_SLUG, session_id: sessionId, event_type: et, event_data: ed || {}, session_data: {} }); } catch(e) {} }
    trackEvent('page_view');
    const POPUP_KEY = 'delfin_popup_closed_article_' + ARTICLE_SLUG;
    let popupShown = false;
    setTimeout(function(){ if (!popupShown && localStorage.getItem(POPUP_KEY) !== 'true') { popupShown = true; document.getElementById('popupWaitlist').style.display = 'flex'; trackEvent('popup_view'); } }, 10000);
    window.addEventListener('scroll', function(){ if (!popupShown && (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) > 0.5) { if (localStorage.getItem(POPUP_KEY) !== 'true') { popupShown = true; document.getElementById('popupWaitlist').style.display = 'flex'; trackEvent('popup_view'); } } });
    function closePopup(){ document.getElementById('popupWaitlist').style.display = 'none'; localStorage.setItem(POPUP_KEY, 'true'); trackEvent('popup_close'); }
    document.getElementById('closePopup').onclick = closePopup;
    document.getElementById('popupWaitlist').onclick = function(e){ if (e.target === this) closePopup(); };
    document.getElementById('popupCtaBtn').onclick = function(){ closePopup(); trackEvent('popup_cta_click'); document.getElementById('registro').scrollIntoView({ behavior: 'smooth' }); };
    document.getElementById('waitlistForm').onsubmit = async function(e){ e.preventDefault(); var email = document.getElementById('waitlistEmail').value, name = document.getElementById('waitlistName').value, btn = document.getElementById('waitlistSubmit'), msg = document.getElementById('waitlistMessage'); btn.disabled = true; document.getElementById('waitlistSubmitText').textContent = 'Enviando...'; try { var r = await fetch(ADMIN_API_URL + '/blog/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, source: 'article:' + ARTICLE_SLUG }) }); var d = await r.json(); if (d.success) { msg.style.display = 'block'; msg.style.background = '#d1fae5'; msg.style.padding = '16px'; msg.style.borderRadius = '8px'; msg.innerHTML = '✅ ¡Te hemos agregado a la lista de espera! Revisa tu email.'; this.reset(); } else { msg.style.display = 'block'; msg.style.background = '#fee2e2'; msg.textContent = d.error || 'Error'; } } catch(err) { msg.style.display = 'block'; msg.style.background = '#fee2e2'; msg.textContent = 'Error de conexión.'; } btn.disabled = false; document.getElementById('waitlistSubmitText').textContent = '🎁 Quiero acceso permanente al plan básico'; };
    document.getElementById('year').textContent = new Date().getFullYear();
  </script>
  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
</body>
</html>`;
}

/**
 * Elige N temas aleatorios distintos de los 10 disponibles.
 */
export function pickRandomTopics(count: number): (typeof ARTICLE_TOPICS)[number][] {
  const shuffled = [...ARTICLE_TOPICS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, ARTICLE_TOPICS.length));
}
