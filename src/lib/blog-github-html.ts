/**
 * HTML final del artículo con plantilla de delfincheckin.com (GitHub Pages).
 * Compartido: preview superadmin, publicación manual y cron → GitHub.
 */

export const GITHUB_OWNER = 'Arroyador69';
export const GITHUB_REPO = 'delfincheckin.com';
export const GITHUB_BRANCH = 'main';
export const TEMPLATE_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/articulos/_template.html`;

export function escapeAttr(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function estimateReadTimeMinutes(htmlContent: string): number {
  const text = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}

export type ArticleForLandingTemplate = {
  slug: string;
  title: string;
  meta_description?: string | null;
  meta_keywords?: string | null;
  content: string;
  published_at?: Date | string | null;
  updated_at?: Date | string | null;
};

export async function fetchLandingArticleTemplate(): Promise<string> {
  const res = await fetch(TEMPLATE_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`No se pudo descargar la plantilla (HTTP ${res.status})`);
  return res.text();
}

export function buildLandingArticleHtml(
  templateHtml: string,
  article: ArticleForLandingTemplate
): string {
  const publishedAt = article.published_at ? new Date(article.published_at) : new Date();
  const updatedAt = article.updated_at ? new Date(article.updated_at) : publishedAt;
  const publishedDate = publishedAt.toISOString().split('T')[0];
  const modifiedDate = updatedAt.toISOString().split('T')[0];
  const readTime = estimateReadTimeMinutes(article.content || '');

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

  return html;
}
