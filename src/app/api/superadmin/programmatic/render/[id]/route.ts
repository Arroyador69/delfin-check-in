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

function cleanMarkdownContent(rawContent: string): string {
  let cleaned = rawContent;
  
  // 1. Remover front-matter YAML (--- ... ---) - múltiples intentos para diferentes formatos
  // Primero intentar con formato estándar (con saltos de línea)
  cleaned = cleaned.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/m, '');
  // Si no funcionó, intentar sin saltos de línea estrictos
  cleaned = cleaned.replace(/^---[\s\S]*?---\s*\n?/m, '');
  // Remover cualquier línea que empiece con --- al inicio del documento
  cleaned = cleaned.replace(/^---.*$/gm, '');
  
  // 2. Remover tags especiales que no deben aparecer en el contenido
  cleaned = cleaned.replace(/<meta-title>[\s\S]*?<\/meta-title>/gi, '');
  cleaned = cleaned.replace(/<meta-description>[\s\S]*?<\/meta-description>/gi, '');
  // Remover <schema> con todo su contenido (puede tener múltiples objetos JSON-LD)
  cleaned = cleaned.replace(/<schema>[\s\S]*?<\/schema>/gi, '');
  
  // 3. Remover bloques de código JSON-LD en Markdown (```json ... ``` o ``` ... ```)
  cleaned = cleaned.replace(/```json[\s\S]*?\{[\s\S]*?"@context"[\s\S]*?"@type"[\s\S]*?\}[\s\S]*?```/gi, '');
  cleaned = cleaned.replace(/```[\s\S]*?\{[\s\S]*?"@context"[\s\S]*?"@type"[\s\S]*?\}[\s\S]*?```/gi, '');
  
  // 4. Remover líneas que contengan solo metadatos YAML sueltos (title:, slug:, etc.)
  cleaned = cleaned.split('\n').filter(line => {
    const trimmed = line.trim();
    // Ignorar líneas que sean solo metadatos YAML
    if (/^(title|slug|intent|region|city|canonical|draft|createdAt):\s*/.test(trimmed)) {
      return false;
    }
    return true;
  }).join('\n');
  
  // 5. Normalizar símbolos de markdown no estándar a markdown estándar
  // Convertir +++ a ### (H3), ++ a ## (H2), + a # (H1) - pero solo si están al inicio de línea
  cleaned = cleaned.replace(/^\+\+\+\s+(.+)$/gm, '### $1');
  cleaned = cleaned.replace(/^\+\+\s+(.+)$/gm, '## $1');
  cleaned = cleaned.replace(/^\+\s+(.+)$/gm, '# $1');
  
  // 6. Limpiar prefijos "H1: " y comillas en títulos
  // Remover "H1: " al inicio de líneas que empiezan con #
  cleaned = cleaned.replace(/^#\s*H1:\s*"?/gm, '# ');
  // Remover comillas al final de títulos H1
  cleaned = cleaned.replace(/^#\s+(.+?)"\s*$/gm, '# $1');
  // Remover comillas que rodean todo el título en H1
  cleaned = cleaned.replace(/^#\s*"(.+?)"\s*$/gm, '# $1');
  
  // 7. Asegurar que los títulos tengan espacio después del #
  cleaned = cleaned.replace(/^#+([^#\s])/gm, (match, p1) => {
    const hashes = match.match(/^#+/)?.[0] || '';
    return hashes + ' ' + p1;
  });
  
  // 8. Limpiar líneas vacías múltiples
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

function generateSEOHTML(page: any): string {
  const jsonld = page.content_jsonld || {}
  
  // Obtener el contenido raw de la BD
  const rawContent = page.content_html || ''
  
  // Limpiar el contenido ANTES de parsearlo
  const cleanedMarkdown = cleanMarkdownContent(rawContent)
  
  let contentHtml = ''
  try {
    // Asegurarse de que marked esté configurado correctamente
    if (!cleanedMarkdown || cleanedMarkdown.trim().length === 0) {
      console.warn('⚠️ Contenido markdown vacío después de limpiar')
      contentHtml = '<p>Contenido no disponible</p>'
    } else {
      contentHtml = marked.parse(cleanedMarkdown, { breaks: true, gfm: true })
      
      // Verificar que el parseo funcionó (debería contener tags HTML)
      if (!contentHtml.includes('<') && cleanedMarkdown.includes('#')) {
        console.error('❌ El parseo de markdown no generó HTML. Contenido original:', cleanedMarkdown.substring(0, 200))
        // Si el parseo falló silenciosamente, intentar parsear de nuevo
        contentHtml = marked.parse(cleanedMarkdown, { breaks: true, gfm: true })
      }
    }
  } catch (error) {
    console.error('❌ Error convirtiendo Markdown a HTML:', error)
    console.error('Contenido que causó el error:', cleanedMarkdown.substring(0, 500))
    // En caso de error, usar el contenido sin parsear pero escapado
    contentHtml = `<pre>${escapeHtml(cleanedMarkdown)}</pre>`
  }
  
  // Limpiar contenido HTML para remover JSON-LD visible si existe (como medida adicional)
  let cleanContentHtml = contentHtml;
  // Remover bloques de código JSON-LD que puedan aparecer en el contenido HTML
  cleanContentHtml = cleanContentHtml.replace(/<pre[^>]*>[\s\S]*?\{[\s\S]*?"@context"[\s\S]*?"@type"[\s\S]*?\}[\s\S]*?<\/pre>/gi, '');
  cleanContentHtml = cleanContentHtml.replace(/<code[^>]*>[\s\S]*?\{[\s\S]*?"@context"[\s\S]*?"@type"[\s\S]*?\}[\s\S]*?<\/code>/gi, '');

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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root{
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --brand: #2563eb;
      --accent: #16a34a;
      --danger: #ef4444;
      --ring: rgba(37,99,235,0.1);
      --maxw: 1180px;
      --radius: 14px;
      --shadow: 0 2px 8px rgba(0,0,0,0.1);
      --border: #e2e8f0;
    }
    *{ box-sizing: border-box }
    html,body{ height:100%; margin: 0; }
    body{
      font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      color: var(--text);
      background: #ffffff;
    }
    a{ color: var(--brand); text-decoration: none }
    a:hover{ text-decoration: underline; }
    .container{ max-width: var(--maxw); margin:0 auto; padding: 0 20px }
    
    /* Header */
    header{
      position: sticky; top:0; z-index:100; backdrop-filter: saturate(160%) blur(8px);
      background: #ffffff; border-bottom: 1px solid var(--border);
    }
    .nav{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding:16px 0 }
    .brand{ display:flex; gap:12px; align-items:center }
    .logo{ font-size:32px; line-height:1; display:grid; place-items:center }
    .brand b{ font-weight:800; letter-spacing:.2px; font-size:22px; color: #0f172a; }
    .actions{ display:flex; gap:10px; align-items:center }
    .btn{ display:inline-flex; align-items:center; justify-content:center; gap:8px; height:40px; padding:0 14px; border-radius:10px; border:1px solid rgba(15,23,42,.12); color:#0f172a; background: #ffffff; cursor: pointer; }
    .btn:hover{ border-color: rgba(15,23,42,.18); background: #f8fafc; }
    .btn.primary{ background: #2563eb; border: none; color: #ffffff; font-weight:700; box-shadow: 0 6px 18px var(--ring) }
    .btn.primary:hover{ background: #1d4ed8; }
    
    /* Contenido del artículo */
    main {
      max-width: 860px;
      margin: 0 auto;
      padding: 2rem;
      background: #ffffff;
      margin-top: 2rem;
      margin-bottom: 2rem;
    }
    main h1 { font-size: 2.25rem; margin-top: 2rem; margin-bottom: 1rem; color: #0b1220; font-weight: 800; line-height: 1.2; }
    main h2 { font-size: 1.75rem; margin-top: 1.5rem; margin-bottom: 1rem; color: #0b1220; font-weight: 700; }
    main h3 { font-size: 1.35rem; margin-top: 1.25rem; margin-bottom: 0.75rem; color: #0b1220; font-weight: 600; }
    main ul, main ol { margin: 1rem 0; padding-left: 2rem; color: #475569; line-height: 1.8; }
    main p { margin: 1rem 0; color: #475569; line-height: 1.7; font-size: 16px; }
    main a { color: var(--brand); }
    main a:hover { text-decoration: underline; }
    main code, main pre {
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-weight: 500;
    }
    main pre {
      padding: 1rem;
      overflow-x: auto;
      background: #f8fafc;
      border: 1px solid var(--border);
    }
    
    /* Footer */
    footer{ color: #64748b; border-top:1px solid var(--border); margin-top:32px; padding:14px 0 26px; background: #ffffff; }
    .footer-content{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
    footer h4{ margin: 0 0 10px; color: #0f172a; }
    footer p{ margin: 0; color: #64748b; font-size: 14px; }
    footer a{ color: var(--brand); }
  </style>
</head>
<body>
  ${generateHeaderHTML()}
  <main>
    ${cleanContentHtml}
    ${generateWaitlistSectionHTML()}
  </main>
  ${generateFooterHTML()}
  ${generateWaitlistScript()}
</body>
</html>`
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return (text || '').replace(/[&<>"']/g, (m) => map[m])
}

// Header de la landing (copiado exactamente)
function generateHeaderHTML(): string {
  return `
<header>
  <div class="container nav">
    <div class="brand">
      <div class="logo" aria-hidden="true">🐬</div>
      <b>Delfín Check‑in</b>
    </div>
    <div class="actions">
      <a class="btn primary" href="https://delfincheckin.com/#registro">Registro Gratis</a>
      <a class="btn" href="https://delfincheckin.com/#caracteristicas">Funciones</a>
    </div>
  </div>
</header>`;
}

// Footer de la landing (copiado exactamente)
function generateFooterHTML(): string {
  const currentYear = new Date().getFullYear();
  return `
<footer>
  <div class="container">
    <div class="footer-content">
      <div>
        <h4>Delfín Check‑in</h4>
        <p>Software de gestión hotelera y auto check‑in para hostales y apartamentos.</p>
      </div>
      <div>
        <h4>Contacto</h4>
        <p>
          📧 <a href="mailto:contacto@delfincheckin.com" style="color: var(--brand);">contacto@delfincheckin.com</a><br>
          🕒 Lun-Dom: 9:00-22:00
        </p>
      </div>
      <div>
        <h4>Programas</h4>
        <p>
          <a href="https://delfincheckin.com/referidos.html" style="color: var(--brand);">Programa de Referidos</a><br>
          <a href="https://delfincheckin.com/afiliados.html" style="color: var(--brand);">Programa de Afiliados</a>
        </p>
      </div>
      <div>
        <h4>Legal</h4>
        <p>
          <a href="https://delfincheckin.com/politica-privacidad.html" style="color: var(--brand);">Política de Privacidad</a><br>
          <a href="https://delfincheckin.com/politica-cookies.html" style="color: var(--brand);">Política de Cookies</a><br>
          <a href="https://delfincheckin.com/terminos-servicio.html" style="color: var(--brand);">Términos de Servicio</a><br>
          <a href="https://delfincheckin.com/aviso-legal.html" style="color: var(--brand);">Aviso Legal</a>
        </p>
      </div>
    </div>
    <div style="border-top: 1px solid var(--border); padding-top: 15px; text-align: center; color: var(--muted);">
      <p style="margin: 0 0 12px; font-size: 14px;">
        © ${currentYear} Delfín Check‑in · <a href="https://delfincheckin.com/#registro" style="color: var(--brand);">Registro Gratis</a>
      </p>
      <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.8;">
        <a href="https://delfincheckin.com/politica-privacidad.html" style="color: var(--brand); margin: 0 8px;">Política de Privacidad</a> ·
        <a href="https://delfincheckin.com/terminos-servicio.html" style="color: var(--brand); margin: 0 8px;">Términos de Servicio</a> ·
        <a href="https://delfincheckin.com/aviso-legal.html" style="color: var(--brand); margin: 0 8px;">Aviso Legal</a>
        <br style="margin: 8px 0;">
        <span style="font-size: 11px; display: block; margin-top: 8px;">
          El Plan Gratuito se financia con anuncios elegantes y discretos. El Plan Check-in tiene un coste de 8€/mes. Sin costes ocultos.
        </span>
      </p>
    </div>
  </div>
</footer>`;
}

// Sección de Waitlist completa (copiada exactamente de la landing)
function generateWaitlistSectionHTML(): string {
  return `
<section id="registro" style="background: linear-gradient(135deg, #44c0ff 0%, #2563eb 100%); border-radius: 24px; padding: 48px 24px; margin: 64px auto; max-width: 900px; box-shadow: 0 20px 60px rgba(37, 99, 235, 0.3);">
  <div style="text-align: center; color: white; margin-bottom: 32px;">
    <div style="font-size: 64px; margin-bottom: 16px;">🐬</div>
    <h2 style="color: white; margin-bottom: 16px; font-size: 42px; font-weight: 900; text-shadow: 0 4px 12px rgba(0,0,0,0.2);">El software de gestión hotelera (PMS) que estabas esperando</h2>
    <p class="lead" style="color: rgba(255,255,255,0.95); font-size: 22px; line-height: 1.6; margin-bottom: 16px; font-weight: 600;">
      <strong>Gratis para siempre si te apuntas ya.</strong> De propietarios, para propietarios.
    </p>
    <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin-top: 12px; line-height: 1.6;">
      Estamos en la fase final de desarrollo. <strong style="font-size: 20px; text-decoration: underline;">⚠️ URGENTE: Solo los primeros en registrarse tendrán el software completo gratis para siempre.</strong>
      <br><strong style="font-size: 20px;">Regístrate ahora antes de que se agoten las plazas gratuitas.</strong>
      <br><span style="font-size: 16px; opacity: 0.9;">El módulo de check-in digital (envío al Ministerio del Interior) siempre costará 8€/mes.</span>
    </p>
    <div style="margin-top: 24px; padding: 16px; background: rgba(255,255,255,0.15); border-radius: 12px; backdrop-filter: blur(10px);">
      <p style="margin: 0; font-size: 16px; font-weight: 600;">📱 Apps móviles en desarrollo | 💯 PMS 100% Gratis | 💰 Check-in: 8€/mes</p>
    </div>
  </div>
  
  <div class="card" style="background: white; max-width: 600px; margin: 0 auto; padding: 32px; border-radius: 16px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 48px; margin-bottom: 12px;">🎯</div>
      <h3 style="color: #0f172a; font-size: 28px; font-weight: 800; margin-bottom: 8px;">Consigue el plan gratis para siempre</h3>
      <p style="color: #64748b; font-size: 18px; line-height: 1.6;">
        Únete a la lista de espera y recibe acceso prioritario cuando lancemos. Los primeros usuarios tendrán el Plan Gratuito para siempre.
      </p>
    </div>
    
    <form id="waitlistForm" style="display: grid; gap: 20px;" onsubmit="handleWaitlistSubmit(event)">
      <label>
        <span style="display: block; margin-bottom: 8px; font-weight: 600; color: #0f172a;">Email *</span>
        <input 
          id="waitlistEmail" 
          type="email" 
          required 
          placeholder="tu@email.com" 
          style="width: 100%; height: 52px; border-radius: 12px; background: #ffffff; color: #0f172a; border: 2px solid rgba(15,23,42,.2); padding: 0 16px; font-size: 16px; transition: border-color 0.2s;"
          onfocus="this.style.borderColor='#2563eb'; this.style.boxShadow='0 0 0 3px rgba(37, 99, 235, 0.1)'"
          onblur="this.style.borderColor='rgba(15,23,42,.2)'; this.style.boxShadow='none'"
        >
      </label>
      <label>
        <span style="display: block; margin-bottom: 8px; font-weight: 600; color: #0f172a;">Nombre (opcional)</span>
        <input 
          id="waitlistName" 
          type="text" 
          placeholder="Tu nombre" 
          style="width: 100%; height: 52px; border-radius: 12px; background: #ffffff; color: #0f172a; border: 2px solid rgba(15,23,42,.2); padding: 0 16px; font-size: 16px; transition: border-color 0.2s;"
          onfocus="this.style.borderColor='#2563eb'; this.style.boxShadow='0 0 0 3px rgba(37, 99, 235, 0.1)'"
          onblur="this.style.borderColor='rgba(15,23,42,.2)'; this.style.boxShadow='none'"
        >
      </label>
      <button 
        type="submit" 
        id="waitlistSubmit"
        style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; border: none; padding: 18px 32px; border-radius: 12px; font-size: 18px; font-weight: 700; cursor: pointer; transition: all 0.2s; width: 100%; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);"
        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(37, 99, 235, 0.4)'"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(37, 99, 235, 0.3)'"
      >
        <span id="waitlistSubmitText">🎁 ¡Quiero gratis para siempre</span>
        <span id="waitlistLoading" style="display: none;">Enviando...</span>
      </button>
      <div id="waitlistMessage" style="margin: 0; padding: 0; border-radius: 8px; display: none; text-align: left;"></div>
    </form>
    
    <div style="margin-top: 24px; padding: 20px; background: #f0f9ff; border-radius: 12px; border-left: 4px solid #2563eb;">
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="font-size: 24px;">ℹ️</div>
        <div>
          <h4 style="margin: 0 0 8px 0; color: #1e40af; font-weight: 700; font-size: 18px;">✨ Plan Gratuito - Incluye todo esto</h4>
          <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 15px; line-height: 2;">
            <li><strong>✅ Gestión completa de reservas</strong> - Sin límites</li>
            <li><strong>✅ Gestión de habitaciones o propiedades</strong> - Control total</li>
            <li><strong>✅ Exportación de datos</strong> - CSV/Excel</li>
            <li><strong>✅ Panel de administración</strong> - Intuitivo y potente</li>
            <li><strong>✅ Soporte por email</strong> - Siempre disponible</li>
            <li><strong>✅ App móvil</strong> - iOS y Android (próximamente)</li>
            <li><strong>✅ Crea enlaces de pago personalizados</strong> - Define fechas, importe acordado y genera un enlace único de pago. Compártelo por WhatsApp o email y el huésped paga de forma segura. El dinero entra directamente en tu cuenta bancaria.</li>
            <li><strong>✅ Microsite para reservas directas</strong> - Crea en minutos una página pública para tu alojamiento, comparte el enlace en redes o con tus huéspedes y recibe reservas directas. Con pagos directos las comisiones se reducen y el dinero entra en tu cuenta sin esperas.</li>
            <li><strong>💡 Financiado con anuncios</strong> - Elegantes y discretos, sin coste para ti</li>
          </ul>
          <div style="margin-top: 16px; padding: 16px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; border: 2px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 15px; font-weight: 700;">
              🎁 Los primeros usuarios: tendrás el software con el plan gratis para siempre
            </p>
          </div>
          <div style="margin-top: 16px; padding: 16px; background: #fef2f2; border-radius: 8px; border: 2px solid #ef4444;">
            <p style="margin: 0; color: #991b1b; font-size: 15px; font-weight: 700;">
              ❌ No incluye: Check-in digital (8€/mes) ni envío al Ministerio del Interior
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

// Script para el formulario de waitlist (copiado de la landing)
function generateWaitlistScript(): string {
  return `
<script>
async function handleWaitlistSubmit(event) {
  event.preventDefault();
  
  const emailInput = document.getElementById('waitlistEmail');
  const nameInput = document.getElementById('waitlistName');
  const submitBtn = document.getElementById('waitlistSubmit');
  const submitText = document.getElementById('waitlistSubmitText');
  const loadingText = document.getElementById('waitlistLoading');
  const messageDiv = document.getElementById('waitlistMessage');
  
  if (!emailInput || !submitBtn || !messageDiv) {
    console.error('Elementos del formulario no encontrados');
    return;
  }
  
  const email = emailInput.value.trim();
  const name = nameInput ? nameInput.value.trim() : null;
  
  if (!email || !email.includes('@')) {
    messageDiv.innerHTML = '<p style="margin: 0; padding: 12px; background: #fef2f2; color: #dc2626; border-radius: 8px;">Por favor, introduce un email válido.</p>';
    messageDiv.style.display = 'block';
    return;
  }
  
  // Mostrar estado de carga
  submitBtn.disabled = true;
  submitText.style.display = 'none';
  loadingText.style.display = 'inline';
  
  try {
    const response = await fetch('https://admin.delfincheckin.com/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: email,
        name: name || null,
        source: 'programmatic_page',
        notes: 'Lead capturado desde página programática'
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      messageDiv.innerHTML = '<p style="margin: 0; padding: 12px; background: #dcfce7; color: #166534; border-radius: 8px; font-weight: 600;">✅ ¡Te hemos agregado a la lista de espera! Te notificaremos cuando el PMS esté disponible.</p>';
      messageDiv.style.display = 'block';
      emailInput.value = '';
      if (nameInput) nameInput.value = '';
    } else {
      let errorMessage = data.error || 'Error al agregar a la lista de espera. Por favor, inténtalo de nuevo.';
      if (data.alreadyInWaitlist) {
        errorMessage = 'ℹ️ Ya estás en nuestra lista de espera. Te notificaremos cuando el PMS esté disponible.';
        messageDiv.innerHTML = '<p style="margin: 0; padding: 12px; background: #dbeafe; color: #1e40af; border-radius: 8px; font-weight: 600;">' + errorMessage + '</p>';
      } else if (data.alreadyActivated) {
        errorMessage = 'ℹ️ Ya tienes una cuenta activa. ¡Gracias por tu interés!';
        messageDiv.innerHTML = '<p style="margin: 0; padding: 12px; background: #dbeafe; color: #1e40af; border-radius: 8px; font-weight: 600;">' + errorMessage + '</p>';
      } else {
        messageDiv.innerHTML = '<p style="margin: 0; padding: 12px; background: #fef2f2; color: #dc2626; border-radius: 8px;">❌ ' + errorMessage + '</p>';
      }
      messageDiv.style.display = 'block';
    }
  } catch (error) {
    console.error('Error en waitlist:', error);
    messageDiv.innerHTML = '<p style="margin: 0; padding: 12px; background: #fef2f2; color: #dc2626; border-radius: 8px;">❌ Error al enviar. Por favor, intenta de nuevo.</p>';
    messageDiv.style.display = 'block';
  } finally {
    // Restaurar estado del botón
    submitBtn.disabled = false;
    submitText.style.display = 'inline';
    loadingText.style.display = 'none';
    
    // Ocultar mensaje después de 8 segundos
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 8000);
  }
}
</script>`;
}


