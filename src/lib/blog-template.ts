import { z } from 'zod'

/**
 * Schema y validación del JSON que devolvemos desde OpenAI para generar artículos.
 * Objetivo: que el HTML del artículo ("{{ARTICLE_CONTENT}}") sea siempre consistente
 * con el template de landing (header/footer/FAQ/waitlist/popup ya vienen en el _template.html).
 */

export const BLOG_OPENAI_RESPONSE_SCHEMA = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  meta_description: z.string().min(10).max(160),
  meta_keywords: z.string().min(1),
  excerpt: z.string().min(10),
  content: z.string().min(50)
})

export type BlogOpenAIResponse = z.infer<typeof BLOG_OPENAI_RESPONSE_SCHEMA>

const FORBIDDEN_TAGS = [
  // Estructura completa / duplicados del template
  'html',
  'head',
  'body',
  'header',
  'footer',
  'script',
  'style',
  // Elementos típicos de “UI/plantillas” que no van dentro del body
  'details',
  'summary',
  'form',
  'button',
  'input',
  'textarea',
  'select',
  'option',
  'link',
  'meta',
  // Embed
  'iframe',
  'object',
  'embed'
] as const

const ALLOWED_TAGS = new Set([
  // Body + jerarquía
  'p',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  // Formato
  'strong',
  'em',
  'blockquote',
  'a',
  'code',
  'pre',
  'br',
  // “Cajas” (si quieres mantener estilo consistente)
  'div'
])

function extractJson(raw: string): string {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) throw new Error('OpenAI devolvió contenido vacío')

  // 1) Intento directo
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed

  // 2) Intento por code block
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (codeBlock?.[1]) return codeBlock[1].trim()

  // 3) Fallback: buscar el primer { ... último }
  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) return trimmed.slice(first, last + 1)

  throw new Error('No se pudo extraer JSON de la respuesta de OpenAI')
}

/** Errores de estructura HTML del cuerpo (para plantilla landing / GitHub). */
export function validateBlogArticleContentHtml(content: string): string[] {
  const errors: string[] = []
  const html = String(content ?? '')

  // No debe llevar h1 para evitar romper jerarquía del template
  if (/<h1\b/i.test(html)) errors.push('El content NO debe incluir <h1> (el template ya lo controla).')

  // Mínimo de estructura para consistencia visual
  const h2Count = (html.match(/<h2\b/gi) ?? []).length
  const h3Count = (html.match(/<h3\b/gi) ?? []).length
  const pCount = (html.match(/<p\b/gi) ?? []).length
  const listCount = (html.match(/<(ul|ol)\b/gi) ?? []).length

  if (h2Count < 2) errors.push(`El content debe incluir al menos 2 <h2>. (tienes ${h2Count})`)
  if (pCount < 2) errors.push(`El content debe incluir al menos 2 <p>. (tienes ${pCount})`)
  if (listCount < 1) errors.push(`El content debe incluir al menos 1 lista (<ul> o <ol>).`)
  if (h3Count < 1) errors.push(`El content debe incluir al menos 1 <h3>. (tienes ${h3Count})`)

  // Tags prohibidos (no deben aparecer en ARTICLE_CONTENT)
  for (const tag of FORBIDDEN_TAGS) {
    const re = new RegExp(`<${tag}\\b`, 'i')
    if (re.test(html)) errors.push(`El content incluye tag prohibido: <${tag}>`)
  }

  // Tags permitidos (si aparecen otros, fallamos rápido)
  const tagMatches = [...html.matchAll(/<\/?([a-z0-9-]+)\b/gi)].map((m) => String(m[1]).toLowerCase())
  for (const tag of tagMatches) {
    if (tag.startsWith('!')) continue
    if (tag.startsWith('?')) continue
    if (tag.startsWith('--')) continue

    if (!ALLOWED_TAGS.has(tag)) {
      // permitimos atributos/otros solo si vienen con div en cajas (pero igual falla si no está permitido)
      errors.push(`El content incluye tag no permitido: <${tag}>`)
      break
    }

    // Si permitimos div, aceptamos:
    // - div sin class (OpenAI a veces envuelve)
    // - div con class solo si es highlight-box o warning-box
    if (tag === 'div') {
      const divTagRe = /<div\b[^>]*>/gi
      const allDivs = html.match(divTagRe) ?? []
      for (const d of allDivs) {
        const classMatch = d.match(/class=(["'])(.*?)\1/i)
        const classAttr = (classMatch?.[2] ?? '').trim()
        if (!classAttr) continue

        const allowed = ['highlight-box', 'warning-box']
        const hasAllowedClass = allowed.some((c) => classAttr.split(/\s+/).includes(c))
        if (!hasAllowedClass) {
          errors.push(`El content incluye <div> con class no permitida: ${classAttr}`)
          break
        }
      }
    }
  }

  return Array.from(new Set(errors))
}

export function parseAndValidateBlogOpenAIResponse(raw: string): BlogOpenAIResponse {
  const jsonStr = extractJson(raw)
  const parsed = JSON.parse(jsonStr)
  const result = BLOG_OPENAI_RESPONSE_SCHEMA.parse(parsed)

  const contentErrors = validateBlogArticleContentHtml(result.content)
  if (contentErrors.length > 0) {
    throw new Error(`content_html inválido: ${contentErrors.join(' | ')}`)
  }

  // Normalizaciones ligeras
  const meta_description = result.meta_description.slice(0, 160)

  return {
    ...result,
    meta_description
  }
}

export type BlogValidationResult =
  | { valid: true; errors: []; data: BlogOpenAIResponse }
  | { valid: false; errors: string[] }

/** Validación estricta (mismo criterio que OpenAI / generador). */
export function validateBlogArticleStrictPayload(data: unknown): BlogValidationResult {
  const r = BLOG_OPENAI_RESPONSE_SCHEMA.safeParse(data)
  if (!r.success) {
    const errs = r.error.issues.map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
    return { valid: false, errors: errs.length ? errs : ['Payload inválido'] }
  }
  const contentErrors = validateBlogArticleContentHtml(r.data.content)
  if (contentErrors.length) return { valid: false, errors: contentErrors }
  return {
    valid: true,
    errors: [],
    data: { ...r.data, meta_description: r.data.meta_description.slice(0, 160) }
  }
}

/** Solo HTML del cuerpo (publicación GitHub / edición manual). */
export function validateBlogContentOnly(content: unknown): { valid: boolean; errors: string[] } {
  const html = typeof content === 'string' ? content : ''
  const errs = validateBlogArticleContentHtml(html)
  return errs.length ? { valid: false, errors: errs } : { valid: true, errors: [] }
}

