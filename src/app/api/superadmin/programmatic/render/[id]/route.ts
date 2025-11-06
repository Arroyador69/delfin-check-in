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
<!-- Calculadora de Precios -->
<div style="margin: 3rem 0; padding: 0; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border: 2px solid #2563eb; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(37, 99, 235, 0.1);">
  <!-- Header con gradiente -->
  <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 24px; text-align: center; color: white;">
    <div style="font-size: 32px; margin-bottom: 8px;">💰</div>
    <h3 style="margin: 0 0 8px; font-size: 24px; font-weight: 700;">Calculadora de precios</h3>
    <p style="margin: 0; opacity: 0.9; font-size: 16px;">Descubre cuánto te costaría Delfín Check-in según tus necesidades</p>
  </div>
  
  <!-- Contenido principal -->
  <div style="padding: 32px;">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 32px;">
      <!-- Selector de propiedades -->
      <div style="position: relative;">
        <label style="display: block; margin-bottom: 12px; font-weight: 600; color: #1f2937; font-size: 16px;">
          🏠 Número de propiedades
        </label>
        <div style="position: relative;">
          <input type="number" id="calcProperties" min="1" max="50" value="1" readonly
                 style="width: 100%; height: 50px; border-radius: 12px; border: 2px solid #e2e8f0; padding: 0 20px 0 20px; font-size: 18px; text-align: center; font-weight: 600; color: #2563eb; background: white; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.05); -moz-appearance: textfield; cursor: default;"
                 onkeydown="return false;"
                 onpaste="return false;"
                 oninput="return false;">
          <!-- Flechas personalizadas -->
          <div style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 2px; pointer-events: auto; z-index: 10;">
            <button type="button" id="incrementBtn" onclick="incrementCalc()" 
                    style="width: 24px; height: 20px; background: #2563eb; color: white; border: none; border-radius: 4px 4px 0 0; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; transition: all 0.2s ease; user-select: none;"
                    onmouseover="this.style.background='#1d4ed8'"
                    onmouseout="this.style.background='#2563eb'">▲</button>
            <button type="button" id="decrementBtn" onclick="decrementCalc()"
                    style="width: 24px; height: 20px; background: #2563eb; color: white; border: none; border-radius: 0 0 4px 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; transition: all 0.2s ease; user-select: none;"
                    onmouseover="this.style.background='#1d4ed8'"
                    onmouseout="this.style.background='#2563eb'">▼</button>
          </div>
          <div style="position: absolute; right: 40px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 14px; font-weight: 500; pointer-events: none;">propiedades</div>
        </div>
      </div>
      
      <!-- Selector de plan -->
      <div>
        <label style="display: block; margin-bottom: 12px; font-weight: 600; color: #1f2937; font-size: 16px;">
          📅 Tipo de plan
        </label>
        <div style="position: relative;">
          <select id="calcPlan" onchange="updateCalc()" 
                  style="width: 100%; height: 50px; border-radius: 12px; border: 2px solid #e2e8f0; padding: 0 50px 0 20px; font-size: 16px; font-weight: 500; background: white; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.05); appearance: none; -webkit-appearance: none; -moz-appearance: none;">
            <option value="monthly">💳 Mensual (14,99€/propiedad)</option>
            <option value="yearly" selected>🎯 Anual (descuento 16,7%) - RECOMENDADO</option>
          </select>
          <!-- Flecha personalizada para el select -->
          <div style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #2563eb; font-size: 16px; font-weight: bold;">▼</div>
        </div>
      </div>
    </div>
    
    <!-- Resultados -->
    <div id="calcResults" style="background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 32px; text-align: center; border: 2px solid #e2e8f0; position: relative; overflow: hidden;">
      <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 50%; opacity: 0.1;"></div>
      <div style="position: absolute; bottom: -30px; left: -30px; width: 80px; height: 80px; background: linear-gradient(135deg, #16a34a, #15803d); border-radius: 50%; opacity: 0.1;"></div>
      
      <div style="position: relative; z-index: 1;">
        <div style="font-size: 36px; font-weight: 900; color: #2563eb; margin-bottom: 12px; text-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);" id="calcTotal">181,38€/año</div>
        <div style="color: #64748b; margin-bottom: 8px; font-size: 14px; font-weight: 500;">(IVA incluido)</div>
        <div style="color: #64748b; margin-bottom: 8px; font-size: 14px; font-weight: 500;" id="calcPerProperty">14,99€ por propiedad</div>
        <div style="margin-bottom: 12px; padding: 8px 12px; background: rgba(0,0,0,0.02); border-radius: 8px; font-size: 12px; color: #64748b;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Base imponible:</span>
            <span id="calcBase" style="font-weight: 600;">149,90€</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>IVA (21%):</span>
            <span id="calcIVA" style="font-weight: 600;">31,48€</span>
          </div>
        </div>
        <div style="color: #16a34a; font-weight: 700; font-size: 18px; padding: 8px 16px; background: rgba(22, 163, 74, 0.1); border-radius: 20px; display: inline-block;" id="calcSavings">Ahorras 29,90€ al año</div>
      </div>
    </div>
    
    <!-- Botón de contratar -->
    <button onclick="openStripePayment()" 
            style="width: 100%; margin-top: 24px; padding: 16px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; border: none; border-radius: 12px; font-size: 18px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); transition: all 0.3s ease;"
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(37, 99, 235, 0.4)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(37, 99, 235, 0.3)'">
      💳 Contratar
    </button>
  </div>
</div>`
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
  function openStripePayment(){ 
    const propertiesEl = document.getElementById('calcProperties');
    const planEl = document.getElementById('calcPlan');
    const properties = propertiesEl ? parseInt(propertiesEl.value) || 1 : 1;
    const planType = planEl && planEl.value === 'monthly' ? 'monthly' : 'yearly';
    window.location.href = `https://delfincheckin.com/#precio?properties=${properties}&plan=${planType}&openModal=true`;
  }
  function handleEmailCapture(e){ e.preventDefault(); const msg = document.getElementById('emailCaptureMessage'); if(msg){ msg.textContent='¡Gracias! Te contactaremos pronto.'; msg.style.display='block'; } }
</script>`
}


