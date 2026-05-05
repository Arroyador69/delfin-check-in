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
  const subscribeEs = 'https://admin.delfincheckin.com/es/subscribe';
  return `
<section style="margin: 2.5rem 0; padding: 2.2rem; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border-radius: 20px; border: 2px solid rgba(15,23,42,.10); box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
  <div style="text-align:center;margin-bottom:1.2rem;">
    <div style="font-size:44px;margin-bottom:8px;">🚀</div>
    <h2 style="font-size:2rem;margin:0 0 8px;color:#0f172a;font-weight:900;">Planes de Delfín Check-in</h2>
    <p style="margin:0;color:#475569;font-size:16px;">
      Contrata en minutos. Registro de viajeros + envío automático al Ministerio del Interior.
    </p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
    ${planCard('Starter', '1 propiedad', 'Ideal para empezar', '#e2e8f0', subscribeEs)}
    ${planCard('Pro', '2–4 propiedades', 'Más volumen, mejor precio', '#bfdbfe', subscribeEs)}
    ${planCard('Business', '5–9 propiedades', 'Para gestores', '#bbf7d0', subscribeEs)}
    ${planCard('Enterprise', '10+ propiedades', 'Precio por volumen', '#fde68a', subscribeEs)}
  </div>
  <div style="text-align:center;margin-top:16px;">
    <a href="${subscribeEs}" style="display:inline-block;background:#2563eb;color:#fff;padding:0.9rem 1.4rem;border-radius:0.75rem;font-weight:900;text-decoration:none;">
      Ver precios y contratar →
    </a>
    <div style="margin-top:8px;color:#64748b;font-size:12px;">
      Pagos seguros (Polar como Merchant of Record). IVA incluido según aplique.
    </div>
  </div>
</section>
`.trim();
}

function planCard(name: string, size: string, desc: string, border: string, href: string): string {
  const esc = (v: string) => escapeAttr(v);
  return `
<a href="${href}" style="text-decoration:none;color:inherit;">
  <div style="border:2px solid ${border};border-radius:16px;padding:16px;background:#fff;box-shadow:0 6px 16px rgba(15,23,42,0.05);height:100%;">
    <div style="font-size:13px;color:#64748b;font-weight:800;">${esc(size)}</div>
    <div style="font-size:19px;color:#0f172a;font-weight:950;margin-top:6px;">${esc(name)}</div>
    <div style="font-size:14px;color:#475569;margin-top:8px;line-height:1.45;">${esc(desc)}</div>
    <div style="margin-top:12px;font-weight:900;color:#2563eb;">Contratar →</div>
  </div>
</a>`.trim();
}

function replaceWaitlistWithPlans(html: string): string {
  // 1) Ocultar waitlist + popup incluso si cambia ligeramente el markup (fallback seguro).
  let out = html;
  const safetyCss = `<style>
  .waitlist-section, #popupWaitlist, .popup-overlay { display: none !important; }
  </style>`;
  out = out.includes('</head>') ? out.replace('</head>', `${safetyCss}\n</head>`) : out;

  // 2) Reemplazo “best-effort”: si existe una sección waitlist, sustituirla por planes.
  out = out.replace(
    /<section[^>]*class="waitlist-section"[\s\S]*?<\/section>/i,
    plansHtmlBlock()
  );

  // 3) Si no había waitlist (o no matcheó), insertar planes antes de </article> o antes de </body>.
  if (!out.includes('Planes de Delfín Check-in')) {
    if (out.includes('</article>')) {
      out = out.replace('</article>', `${plansHtmlBlock()}\n</article>`);
    } else if (out.includes('</body>')) {
      out = out.replace('</body>', `${plansHtmlBlock()}\n</body>`);
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
