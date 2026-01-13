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
    
    <!-- Información sobre el PMS en desarrollo -->
    <div style="margin-top: 24px; padding: 20px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; border: 2px solid #f59e0b;">
      <p style="margin: 0; color: #92400e; font-size: 16px; line-height: 1.6; text-align: center;">
        <strong>🚀 Estamos diseñando el PMS de gestión en la nube con todo lo que necesitas.</strong><br>
        Los primeros en apuntarse a la lista de espera tendrán acceso prioritario y beneficios exclusivos.
      </p>
    </div>
  </div>
</div>`
}

function generateBenefitsHTML(): string {
  return `
<!-- Beneficios del PMS en Desarrollo -->
<section style="margin: 3rem 0; padding: 2rem; background: white; border-radius: 16px; border: 1px solid #e2e8f0;">
  <h2 style="font-size: 2rem; margin-bottom: 1rem; color: #0b1220;">✨ Estamos Diseñando el PMS Completo en la Nube</h2>
  <p style="color: #475569; margin-bottom: 1.5rem; font-size: 16px; line-height: 1.6;">
    Estamos diseñando el PMS de gestión en la nube con todo lo que se necesita para gestionar tu alquiler vacacional de forma profesional. Incluirá:
  </p>
  <ul style="color:#0f172a; line-height:1.8; padding-left:1.25rem; margin-bottom: 1.5rem;">
    <li><strong>Gestión completa de reservas y calendario</strong> - Organiza todas tus reservas en un solo lugar</li>
    <li><strong>Check-in digital y cumplimiento normativo (RD 933)</strong> - Envío automático al Ministerio del Interior</li>
    <li><strong>Microsite de reservas directas</strong> - Sin comisiones de plataformas externas</li>
    <li><strong>Facturación automática</strong> - Genera facturas de forma instantánea</li>
    <li><strong>Gestión de múltiples propiedades</strong> - Controla todas tus propiedades desde un solo panel</li>
    <li><strong>App móvil</strong> - Gestiona tu negocio desde cualquier lugar</li>
    <li><strong>Y mucho más...</strong> - Todo lo que necesitas para gestionar tu alquiler vacacional</li>
  </ul>
  <p style="color: #2563eb; font-weight: 600; font-size: 16px; margin-top: 1.5rem; padding: 1rem; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #2563eb;">
    🎉 <strong>Early Adopters:</strong> Los primeros en apuntarse tendrán acceso prioritario y el PMS completo gratis para siempre.
  </p>
</section>`
}

function generateEmailCaptureHTML(): string {
  return `
<!-- Formulario de Captura de Email para Waitlist -->
<section style="margin: 3rem 0; padding: 2rem; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 16px; border: 2px solid #bae6fd;">
  <h2 style="font-size: 2rem; margin-bottom: 1rem; color: #0b1220; text-align: center;">🚀 Únete a la Lista de Espera</h2>
  <p style="text-align: center; color: #0f172a; margin-bottom: 1rem; font-size: 18px; font-weight: 600;">
    Estamos diseñando el PMS de gestión en la nube con todo lo que necesitas
  </p>
  <p style="text-align: center; color: #475569; margin-bottom: 2rem; font-size: 16px;">
    Sé de los primeros en acceder cuando lo lancemos. Acceso prioritario y beneficios exclusivos para early adopters.
  </p>
  <form id="emailCaptureForm" onsubmit="handleEmailCapture(event)" style="max-width: 500px; margin: 0 auto;">
    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
      <input type="email" id="leadEmail" required placeholder="tu@email.com" 
             style="flex: 1; min-width: 250px; height: 50px; padding: 0 16px; border-radius: 12px; border: 2px solid #e2e8f0; font-size: 16px; background: white; color: #0f172a;">
      <button type="submit" 
              style="height: 50px; padding: 0 24px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); white-space: nowrap;">
        Apuntarme
      </button>
    </div>
    <p id="emailCaptureMessage" style="margin-top: 12px; text-align: center; font-size: 14px; color: #16a34a; display: none;"></p>
  </form>
</section>`
}

function generateComponentsScript(): string {
  return `
<script>
// Calculadora de Precios
function getVolumePrice(properties) {
  if (properties === 1) return 14.99;
  if (properties === 2) return 13.49;
  if (properties >= 3 && properties <= 4) return 12.74;
  if (properties >= 5 && properties <= 9) return 11.99;
  if (properties >= 10) return 11.24;
  return 14.99;
}

function updateCalc() {
  const properties = parseInt(document.getElementById('calcProperties').value) || 1;
  const plan = document.getElementById('calcPlan').value;
  
  const pricePerProperty = getVolumePrice(properties);
  const monthlyTotal = properties * pricePerProperty;
  const yearlyTotal = monthlyTotal * 12;
  const yearlyDiscount = yearlyTotal * 0.167;
  const finalYearlyTotal = yearlyTotal - yearlyDiscount;
  
  let total, periodText, savingsText;
  if (plan === 'monthly') {
    total = monthlyTotal;
    periodText = '/mes';
    savingsText = properties > 1 ? \`Descuento \${Math.round(((14.99 - pricePerProperty) / 14.99) * 100)}% por volumen\` : 'Precio base';
  } else {
    total = finalYearlyTotal;
    periodText = '/año';
    const regularYearly = properties * 14.99 * 12;
    const totalSavings = regularYearly - finalYearlyTotal;
    savingsText = \`Ahorras \${totalSavings.toFixed(2)}€ al año\`;
  }
  
  // Calcular IVA
  const base = total;
  const iva = total * 0.21;
  const totalWithVat = total * 1.21;
  
  // Formatear números con comas para decimales (formato español)
  const formatNumber = (num) => num.toFixed(2).replace('.', ',');
  
  document.getElementById('calcTotal').textContent = \`\${formatNumber(totalWithVat)}€\${periodText}\`;
  document.getElementById('calcPerProperty').textContent = \`\${formatNumber(pricePerProperty)}€ por propiedad\`;
  document.getElementById('calcBase').textContent = \`\${formatNumber(base)}€\`;
  document.getElementById('calcIVA').textContent = \`\${formatNumber(iva)}€\`;
  document.getElementById('calcSavings').textContent = savingsText.replace(/\\./g, ',');
}

function incrementCalc() {
  const input = document.getElementById('calcProperties');
  const current = parseInt(input.value) || 1;
  if (current < 50) {
    input.value = current + 1;
    updateCalc();
  }
}

function decrementCalc() {
  const input = document.getElementById('calcProperties');
  const current = parseInt(input.value) || 1;
  if (current > 1) {
    input.value = current - 1;
    updateCalc();
  }
}

// Función eliminada - ya no redirige a compra, el formulario de waitlist está más abajo

// Captura de Email para Waitlist
async function handleEmailCapture(e){ 
  e.preventDefault(); 
  const email = document.getElementById('leadEmail').value;
  const messageEl = document.getElementById('emailCaptureMessage');
  
  try {
    const response = await fetch('https://admin.delfincheckin.com/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: email,
        source: 'programmatic_page',
        name: null,
        notes: 'Lead capturado desde página programática'
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      messageEl.textContent = '✅ ¡Perfecto! Te hemos agregado a la lista de espera. Te notificaremos cuando el PMS esté disponible.';
      messageEl.style.color = '#16a34a';
      messageEl.style.display = 'block';
      document.getElementById('leadEmail').value = '';
      
      setTimeout(() => {
        messageEl.style.display = 'none';
      }, 8000);
    } else {
      // Manejar errores específicos
      if (data.alreadyInWaitlist) {
        messageEl.textContent = 'ℹ️ Ya estás en nuestra lista de espera. Te notificaremos cuando el PMS esté disponible.';
        messageEl.style.color = '#2563eb';
      } else if (data.alreadyActivated) {
        messageEl.textContent = 'ℹ️ Ya tienes una cuenta activa. ¡Gracias por tu interés!';
        messageEl.style.color = '#2563eb';
      } else {
        messageEl.textContent = '❌ ' + (data.error || 'Error al enviar. Por favor, intenta de nuevo.');
        messageEl.style.color = '#ef4444';
      }
      messageEl.style.display = 'block';
      
      setTimeout(() => {
        messageEl.style.display = 'none';
      }, 8000);
    }
  } catch (error) {
    messageEl.textContent = '❌ Error al enviar. Por favor, intenta de nuevo.';
    messageEl.style.color = '#ef4444';
    messageEl.style.display = 'block';
    
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 5000);
  }
}

// Inicializar calculadora al cargar
if (document.getElementById('calcProperties')) {
  updateCalc();
}

// Asegurar que la calculadora se actualice cuando cambie el plan
const calcPlanSelect = document.getElementById('calcPlan');
if (calcPlanSelect) {
  calcPlanSelect.addEventListener('change', updateCalc);
}
</script>`
}


