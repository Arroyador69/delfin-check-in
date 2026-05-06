/**
 * POST /api/superadmin/blog/publish-to-github
 * Genera el HTML del artículo desde la plantilla de la landing y lo sube al repo delfincheckin.com (GitHub).
 * Así el artículo queda en la web pública y deja de dar 404.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';
import { Octokit } from '@octokit/rest';

const GITHUB_OWNER = 'Arroyador69';
const GITHUB_REPO = 'delfincheckin.com';
const GITHUB_BRANCH = 'main';
const TEMPLATE_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/articulos/_template.html`;

function escapeAttr(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function estimateReadTimeMinutes(htmlContent: string): number {
  const text = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}

function plansHtmlBlock(): string {
  // Importante: evitar llevar al usuario a una página del panel antes del checkout.
  // Mandamos directo al checkout de Polar via /api/polar/subscribe-redirect (público).
  const appBase = 'https://admin.delfincheckin.com';
  const base = `${appBase}/api/polar/subscribe-redirect?locale=es&seats=1&interval=month`;
  const hrefCheckin = `${base}&plan=checkin`;
  const hrefStandard = `${base}&plan=standard`;
  const hrefPro = `${base}&plan=pro`;
  // Bloque de planes con el mismo look&feel que la página /plans (tarjetas grandes).
  // Usamos estilos inline para que se vea igual también en HTML estático (sin depender de Tailwind).
  return `
<section style="margin: 2.5rem 0;">
  <div style="text-align:center;margin-bottom:1.25rem;">
    <h2 style="font-size: 2rem; line-height: 1.2; font-weight: 900; color: #0f172a; margin: 0;">
      Planes claros y transparentes
    </h2>
    <p style="margin: 0.5rem 0 0; color: #475569; font-size: 1rem;">
      Sin sorpresas, sin letra pequeña. Sabes exactamente qué obtienes y qué cuesta.
    </p>
  </div>

  <div style="max-width: 980px; margin: 0 auto; border-radius: 18px; background: #eef6ff; padding: 14px;">
    <div style="border: 2px solid #fca5a5; background: #fff7ed; color: #7c2d12; border-radius: 14px; padding: 10px 12px; font-weight: 800; font-size: 12px; text-align:center; margin-bottom: 14px;">
      ⚠️ IMPORTANTE: El acceso permanente al Plan Gratuito (Básico) sin coste mensual solo está disponible si te apuntas ahora. Las plazas son limitadas. Regístrate ya antes de que se agoten.
    </div>

    <div style="margin: 0 auto 14px; max-width: 540px;">
      <label for="delfin-plan-email" style="display:block; font-weight: 900; font-size: 13px; color:#0f172a; margin-bottom: 6px;">
        Email (para agilizar el checkout)
      </label>
      <input
        id="delfin-plan-email"
        type="email"
        placeholder="tu@email.com"
        style="width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: 12px; border: 2px solid #cbd5e1; font-size: 14px;"
      />
      <p style="margin: 6px 0 0; font-size: 12px; color:#64748b;">
        Si lo dejas vacío, Polar te lo pedirá igualmente.
      </p>
    </div>

    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
      ${pricingCard({
        badge: 'Solo si te apuntas ya',
        title: 'Plan Básico',
        price: '0€',
        priceSuffix: '/mes',
        subtitle: 'Hasta 1 propiedad. Con anuncios.',
        border: '#a7f3d0',
        buttonText: 'Empezar Gratis',
        buttonColor: '#16a34a',
        href: hrefCheckin,
        bullets: [
          '✅ Formulario y listado de viajeros',
          '✅ Descarga XML (subida manual al Ministerio)',
          '✅ Reservas directas (9% comisión)',
          '✅ Anuncios discretos',
          '❌ Envío automático MIR (no incluido)',
        ],
      })}

      ${pricingCard({
        badge: 'Más popular',
        title: 'Plan Check-in',
        price: '2€',
        priceSuffix: '/mes + 2€/propiedad',
        subtitle: 'Propiedades ilimitadas. Con anuncios.',
        border: '#93c5fd',
        buttonText: 'Contratar Check-in',
        buttonColor: '#2563eb',
        href: hrefCheckin,
        bullets: [
          '✅ Envío automático al Ministerio (MIR)',
          '✅ Check-in digital y registro de viajeros',
          '✅ Reservas directas (9% comisión)',
          '✅ Cumplimiento RD 933/2021',
          '✅ Anuncios discretos',
        ],
      })}

      ${pricingCard({
        title: 'Plan Standard',
        price: '9,99€',
        priceSuffix: '/mes',
        subtitle: '1 propiedad incluida. Sin anuncios.',
        border: '#fdba74',
        buttonText: 'Contratar Standard',
        buttonColor: '#c2410c',
        href: hrefStandard,
        bullets: [
          '✅ Todo lo del Check-in',
          '✅ Sin anuncios',
          '✅ 1 propiedad incluida, luego 2€/mes por cada nueva',
          '✅ Reservas directas (9% comisión)',
          '✅ Instrucciones de check-in por email al huésped (seguimiento de apertura)',
        ],
      })}

      ${pricingCard({
        title: 'Plan Pro',
        price: '29,99€',
        priceSuffix: '/mes',
        subtitle: '1 propiedad incluida, luego 2€/mes por cada adicional. Sin anuncios.',
        border: '#c4b5fd',
        buttonText: 'Contratar Pro',
        buttonColor: '#7c3aed',
        href: hrefPro,
        bullets: [
          '✅ Todo lo del Standard',
          '✅ 1 propiedad incluida, luego 2€/mes por cada nueva',
          '✅ Reservas directas con solo 5% comisión',
          '✅ Instrucciones de check-in por email al huésped (seguimiento de apertura)',
          '✅ Reseñas Google + microsite en tu ficha (más visibilidad y reservas directas fuera de Airbnb/Booking)',
          '✅ Sin anuncios, soporte prioritario y copia de seguridad',
        ],
      })}
    </div>

    <script>
      (function() {
        try {
          var input = document.getElementById('delfin-plan-email');
          if (!input) return;
          var links = document.querySelectorAll('a[href*=\"/api/polar/subscribe-redirect\"]');
          function patchHref(a) {
            var href = a.getAttribute('href') || '';
            if (!href) return;
            var email = String(input.value || '').trim();
            if (!email) return;
            // Guard simple: solo emails plausibles
            if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return;
            // Añadir customerEmail si no existe
            if (href.indexOf('customerEmail=') !== -1) return;
            var sep = href.indexOf('?') !== -1 ? '&' : '?';
            a.setAttribute('href', href + sep + 'customerEmail=' + encodeURIComponent(email));
          }
          links.forEach(function(a) {
            a.addEventListener('click', function() {
              patchHref(a);
            });
          });
        } catch (e) {}
      })();
    </script>
  </div>
</section>
`.trim();
}

function pricingCard(opts: {
  badge?: string;
  title: string;
  price: string;
  priceSuffix: string;
  subtitle: string;
  bullets: string[];
  buttonText: string;
  buttonColor: string;
  border: string;
  href: string;
}): string {
  const badge = opts.badge
    ? `<div style="display:inline-block; font-size: 11px; font-weight: 900; padding: 6px 10px; border-radius: 999px; background: #e2e8f0; color:#0f172a; margin-bottom: 10px;">${escapeAttr(opts.badge)}</div>`
    : '';
  const bullets = opts.bullets
    .map((b) => `<li style="display:flex; gap: 8px; align-items:flex-start; margin: 0 0 8px 0; color:#334155; font-size: 13px; line-height: 1.35;">${escapeAttr(b)}</li>`)
    .join('');
  return `
<div style="background:#ffffff;border:3px solid ${opts.border};border-radius:16px;padding:16px;box-shadow:0 10px 22px rgba(15,23,42,0.08);">
  <div style="text-align:center;">
    ${badge}
    <div style="font-size: 18px; font-weight: 950; color:#0f172a; margin: 0;">${escapeAttr(opts.title)}</div>
    <div style="margin-top: 10px;">
      <span style="font-size: 40px; font-weight: 950; color:#0f172a;">${escapeAttr(opts.price)}</span>
      <span style="color:#475569; font-weight: 800; font-size: 13px;">${escapeAttr(opts.priceSuffix)}</span>
    </div>
    <div style="margin-top: 8px; color:#475569; font-size: 13px; font-weight: 700;">${escapeAttr(opts.subtitle)}</div>
  </div>
  <ul style="list-style:none; padding: 14px 0 0 0; margin: 14px 0 0 0; border-top: 1px solid #e2e8f0;">
    ${bullets}
  </ul>
  <a href="${opts.href}" style="display:block; margin-top: 14px; text-align:center; background:${opts.buttonColor}; color:#fff; padding: 12px 14px; border-radius: 12px; font-weight: 900; text-decoration:none;">
    ${escapeAttr(opts.buttonText)}
  </a>
</div>`.trim();
}

function replaceWaitlistWithPlans(html: string): string {
  let out = html;

  // 1) Eliminar la sección waitlist (no solo ocultarla).
  out = out.replace(/<section[^>]*class="waitlist-section"[\s\S]*?<\/section>/gi, '');

  // 2) Eliminar el popup waitlist y overlay si existen.
  out = out.replace(/<div[^>]*id="popupWaitlist"[\s\S]*?<\/div>/gi, '');
  out = out.replace(/<div[^>]*class="popup-overlay"[\s\S]*?<\/div>/gi, '');

  // 3) Insertar planes antes de </article> o </body>.
  const marker = 'Planes claros y transparentes';
  if (!out.includes(marker)) {
    if (out.includes('</article>')) {
      out = out.replace('</article>', `${plansHtmlBlock()}\n</article>`);
    } else if (out.includes('</body>')) {
      out = out.replace('</body>', `${plansHtmlBlock()}\n</body>`);
    } else {
      out = `${out}\n${plansHtmlBlock()}`;
    }
  }

  return out;
}

export async function POST(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const slug = (body.slug || '').trim();
    if (!slug) {
      return NextResponse.json(
        { error: 'Falta el campo "slug" del artículo.' },
        { status: 400 }
      );
    }

    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN_LANDING;
    if (!token) {
      return NextResponse.json(
        { error: 'GITHUB_TOKEN (o GITHUB_TOKEN_LANDING) no configurado. No se puede publicar en GitHub.' },
        { status: 500 }
      );
    }

    const articleResult = await sql`
      SELECT id, slug, title, meta_description, meta_keywords, content, excerpt,
             published_at, updated_at, is_published, status
      FROM blog_articles
      WHERE slug = ${slug}
      LIMIT 1
    `;
    if (articleResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Artículo no encontrado en la base de datos.' },
        { status: 404 }
      );
    }
    const article = articleResult.rows[0] as any;

    const publishedAt = article.published_at ? new Date(article.published_at) : new Date();
    const updatedAt = article.updated_at ? new Date(article.updated_at) : publishedAt;
    const publishedDate = publishedAt.toISOString().split('T')[0];
    const modifiedDate = updatedAt.toISOString().split('T')[0];
    const readTime = estimateReadTimeMinutes(article.content || '');

    let templateHtml: string;
    try {
      const res = await fetch(TEMPLATE_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      templateHtml = await res.text();
    } catch (e: any) {
      console.error('Error fetching template:', e);
      return NextResponse.json(
        { error: 'No se pudo descargar la plantilla del repo. Comprueba que _template.html existe en articulos/.' },
        { status: 502 }
      );
    }

    const replacements: [string, string][] = [
      ['{{ARTICLE_TITLE}}', escapeAttr(article.title || '')],
      ['{{META_DESCRIPTION}}', escapeAttr(article.meta_description || '')],
      ['{{META_KEYWORDS}}', escapeAttr(article.meta_keywords || '')],
      ['{{ARTICLE_SLUG}}', article.slug],
      ['{{PUBLISHED_DATE}}', publishedDate],
      ['{{MODIFIED_DATE}}', modifiedDate],
      ['{{PUBLISH_DATE}}', publishedDate],
      ['{{READ_TIME}}', String(readTime)],
      ['{{ARTICLE_CONTENT}}', article.content || ''],
    ];
    let html = templateHtml;
    for (const [from, to] of replacements) {
      html = html.split(from).join(to);
    }
    const scriptSlugLiteral = "const ARTICLE_SLUG = 'multas-por-no-registrar-viajeros-espana';";
    if (html.includes(scriptSlugLiteral)) {
      html = html.replace(scriptSlugLiteral, `const ARTICLE_SLUG = '${article.slug}';`);
    }

    // IMPORTANTE: eliminamos waitlist/popup y colocamos CTA de planes en todos los artículos.
    html = replaceWaitlistWithPlans(html);

    const octokit = new Octokit({ auth: token });
    const filePath = `articulos/${article.slug}.html`;

    let sha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: filePath,
        ref: GITHUB_BRANCH,
      });
      if (!Array.isArray(data) && data.sha) sha = data.sha;
    } catch (e: any) {
      if (e.status !== 404) throw e;
    }

    const contentBase64 = Buffer.from(html, 'utf-8').toString('base64');
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      message: `Publicar artículo: ${article.title}`,
      content: contentBase64,
      branch: GITHUB_BRANCH,
      ...(sha ? { sha } : {}),
    });

    const url = `https://delfincheckin.com/articulos/${article.slug}.html`;
    return NextResponse.json({
      success: true,
      url,
      message: 'Artículo publicado en GitHub. En unos minutos estará en ' + url,
    });
  } catch (err: any) {
    console.error('Error publicando en GitHub:', err);
    return NextResponse.json(
      { error: err?.message || 'Error al publicar en GitHub' },
      { status: 500 }
    );
  }
}
