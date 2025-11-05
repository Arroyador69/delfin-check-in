import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdmin } from '@/lib/auth-superadmin'
import { sql } from '@/lib/db'
import { marked } from 'marked'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await verifySuperAdmin(req)
    if (error) return error

    const pageId = params.id
    const result = await sql`SELECT * FROM programmatic_pages WHERE id = ${pageId}`
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Página no encontrada' }, { status: 404 })
    }

    const page = result.rows[0]
    const html = generateSEOHTML(page)
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}

function generateSEOHTML(page: any): string {
  const jsonld = page.content_jsonld || {}
  let contentHtml = ''
  try {
    contentHtml = marked.parse(page.content_html || '')
  } catch {
    contentHtml = page.content_html || ''
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.meta_description || '')}">
  <meta name="robots" content="${page.is_test ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}">
  <link rel="canonical" href="${page.canonical_url}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(page.title)}">
  <meta property="og:description" content="${escapeHtml(page.meta_description || '')}">
  <meta property="og:url" content="${page.canonical_url}">
  <meta property="og:site_name" content="Delfín Check-in">
  <script type="application/ld+json">${JSON.stringify(jsonld)}</script>
  <style>
    body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, Noto Sans, Helvetica, "Apple Color Emoji", "Segoe UI Emoji"; line-height: 1.7; color: #0f172a; max-width: 860px; margin: 0 auto; padding: 2rem; }
    h1,h2,h3 { color: #0b1220; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
  
</head>
<body>
  ${contentHtml}
  ${generatePriceCalculatorHTML()}
  ${generateBenefitsHTML()}
  ${generateEmailCaptureHTML()}
  ${generateComponentsScript()}
</body>
</html>`
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return (text || '').replace(/[&<>"']/g, (m) => map[m])
}

function generatePriceCalculatorHTML(): string {
  return `
<section style="margin: 3rem 0; padding: 2rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
  <h2 style="margin: 0 0 1rem; font-size: 1.5rem; color: #0b1220;">💰 Calculadora de Precios</h2>
  <div id="calcContainer"></div>
  <button onclick="openStripePayment()" style="margin-top: 16px; padding: 12px 16px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: 600;">Contratar ahora</button>
</section>`
}

function generateBenefitsHTML(): string {
  return `
<section style="margin: 3rem 0; padding: 2rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;">
  <h2 style="margin: 0 0 1rem; font-size: 1.5rem; color: #0b1220;">✨ Ventajas de usar Delfín Check-in</h2>
  <ul style="color:#0f172a; line-height:1.8; padding-left:1.25rem;">
    <li>Microsite de reservas directas sin comisiones</li>
    <li>Envío automático al Ministerio (RD 933)</li>
    <li>Generador de facturas integrado</li>
    <li>Calculadora de costes detallada</li>
  </ul>
</section>`
}

function generateEmailCaptureHTML(): string {
  return `
<section style="margin: 3rem 0; padding: 2rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px;">
  <h2 style="margin: 0 0 1rem; font-size: 1.5rem; color: #0b1220; text-align: center;">¿Te lo estás pensando?</h2>
  <form id="emailCaptureForm" onsubmit="handleEmailCapture(event)" style="max-width: 500px; margin: 0 auto; display:flex; gap: 12px;">
    <input type="email" id="leadEmail" required placeholder="tu@email.com" style="flex: 1; height: 44px; padding: 0 12px; border-radius: 8px; border: 1px solid #e2e8f0; color:#0f172a;">
    <button type="submit" style="height: 44px; padding: 0 16px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: 600;">Enviar</button>
  </form>
  <p id="emailCaptureMessage" style="margin-top: 12px; text-align: center; font-size: 14px; color: #16a34a; display: none;"></p>
</section>`
}

function generateComponentsScript(): string {
  return `
<script>
  function openStripePayment(){ window.location.href = 'https://admin.delfincheckin.com/checkout'; }
  function handleEmailCapture(e){ e.preventDefault(); const msg = document.getElementById('emailCaptureMessage'); if(msg){ msg.textContent='¡Gracias! Te contactaremos pronto.'; msg.style.display='block'; } }
</script>`
}


