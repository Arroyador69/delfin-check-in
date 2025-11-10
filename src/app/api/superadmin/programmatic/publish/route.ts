import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';
import { Octokit } from '@octokit/rest';
import { marked } from 'marked';

// Inicializar Octokit con token de GitHub (repo landing)
// Preferimos GITHUB_TOKEN_LANDING para diferenciar del resto de repos
const GITHUB_TOKEN = process.env.GITHUB_TOKEN_LANDING || process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: GITHUB_TOKEN });
if (!GITHUB_TOKEN) {
  console.warn('[programmatic/publish] Falta GITHUB_TOKEN_LANDING (o GITHUB_TOKEN). No se podrá publicar a GitHub Pages.');
}

const GITHUB_OWNER = 'Arroyador69';
const GITHUB_REPO = 'delfincheckin.com';
const GITHUB_BRANCH = 'main';
const GITHUB_PATH = 'programmatic'; // Carpeta donde se guardarán las páginas

export async function POST(req: NextRequest) {
  try {
    // Verificar SuperAdmin
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json();
    const { page_id } = body;

    if (!page_id) {
      return NextResponse.json(
        { error: 'page_id es requerido' },
        { status: 400 }
      );
    }

    // Obtener página
    const pageResult = await sql`
      SELECT * FROM programmatic_pages WHERE id = ${page_id}
    `;

    if (pageResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Página no encontrada' },
        { status: 404 }
      );
    }

    const page = pageResult.rows[0];

    // Generar HTML completo con SEO optimizado
    const htmlContent = generateSEOHTML(page);

    // Path del archivo en GitHub
    const filePath = `${GITHUB_PATH}/${page.slug}.html`;

    try {
      // Intentar obtener el archivo existente (para SHA)
      let sha: string | undefined;
      try {
        const existingFile = await octokit.repos.getContent({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path: filePath,
          ref: GITHUB_BRANCH,
        });

        if (Array.isArray(existingFile.data)) {
          return NextResponse.json(
            { error: 'Path es un directorio, no un archivo' },
            { status: 400 }
          );
        }

        sha = existingFile.data.sha;
      } catch (e: any) {
        // Archivo no existe, crearemos uno nuevo (sha queda undefined)
        if (e.status !== 404) {
          throw e;
        }
      }

      // Crear o actualizar archivo
      const fileContent = Buffer.from(htmlContent).toString('base64');

      await octokit.repos.createOrUpdateFileContents({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: filePath,
        message: `Publicar página programática: ${page.title}`,
        content: fileContent,
        branch: GITHUB_BRANCH,
        ...(sha ? { sha } : {}), // Solo incluir SHA si el archivo existe
      });

      // Obtener el último commit SHA
      const commits = await octokit.repos.listCommits({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        branch: GITHUB_BRANCH,
        per_page: 1,
      });

      const commitSha = commits.data[0]?.sha;

      // Actualizar página en BD
      await sql`
        UPDATE programmatic_pages
        SET 
          status = 'published',
          published_at = now(),
          github_commit_sha = ${commitSha || null},
          github_file_path = ${filePath},
          updated_at = now()
        WHERE id = ${page_id}
      `;

      return NextResponse.json({
        success: true,
        page_id,
        github_path: filePath,
        commit_sha: commitSha,
        url: `https://delfincheckin.com/${page.slug}`
      });

    } catch (githubError: any) {
      console.error('❌ Error publicando en GitHub:', githubError);
      
      // Actualizar estado a failed
      await sql`
        UPDATE programmatic_pages
        SET status = 'failed', updated_at = now()
        WHERE id = ${page_id}
      `;

      return NextResponse.json(
        { 
          error: 'Error publicando en GitHub',
          details: githubError.message 
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ Error publicando página programática:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function generateSEOHTML(page: any): string {
  const jsonld = page.content_jsonld || {};
  
  // Convertir Markdown a HTML
  let contentHtml = '';
  try {
    contentHtml = marked.parse(page.content_html || '');
  } catch (error) {
    console.error('Error convirtiendo Markdown a HTML:', error);
    // Si falla, usar el contenido tal cual (puede ser HTML ya)
    contentHtml = page.content_html || '';
  }
  
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.meta_description || '')}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <link rel="canonical" href="${page.canonical_url}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(page.title)}">
  <meta property="og:description" content="${escapeHtml(page.meta_description || '')}">
  <meta property="og:url" content="${page.canonical_url}">
  <meta property="og:site_name" content="Delfín Check-in">
  
  <!-- JSON-LD -->
  <script type="application/ld+json">
  ${JSON.stringify(jsonld, null, 2)}
  </script>
  
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    h1 { font-size: 2rem; margin-top: 2rem; margin-bottom: 1rem; }
    h2 { font-size: 1.5rem; margin-top: 1.5rem; margin-bottom: 1rem; }
    h3 { font-size: 1.25rem; margin-top: 1.25rem; margin-bottom: 0.75rem; }
    ul, ol { margin: 1rem 0; padding-left: 2rem; }
    p { margin: 1rem 0; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .cta-button {
      display: inline-block;
      background: #2563eb;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      margin: 2rem 0;
    }
    .cta-button:hover {
      background: #1d4ed8;
      text-decoration: none;
    }
  </style>
</head>
<body>
  ${contentHtml}
  
  ${generatePriceCalculatorHTML()}
  ${generateBenefitsHTML()}
  ${generateEmailCaptureHTML()}
  ${generateComponentsScript()}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Generar componente de Calculadora de Precios con Stripe
// IMPORTANTE: Esta función debe ser idéntica a la de render/[id]/route.ts para garantizar consistencia
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

// Generar sección de Beneficios del Servicio
function generateBenefitsHTML(): string {
  return `
<!-- Beneficios del Servicio -->
<section style="margin: 3rem 0; padding: 2.5rem; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border-radius: 20px; border: 2px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
  <div style="text-align: center; margin-bottom: 2rem;">
    <div style="font-size: 48px; margin-bottom: 12px;">✨</div>
    <h2 style="font-size: 2.25rem; margin: 0 0 8px; color: #1f2937; font-weight: 800;">Ventajas de usar Delfín Check-in</h2>
    <p style="margin: 0; color: #64748b; font-size: 18px;">Todo lo que necesitas para gestionar tu alojamiento de forma profesional</p>
  </div>
  
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
    <div style="padding: 24px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 16px; border: 2px solid #3b82f6; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15); transition: transform 0.3s ease, box-shadow 0.3s ease;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 20px rgba(59, 130, 246, 0.25)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.15)'">
      <div style="font-size: 36px; margin-bottom: 12px;">🏠</div>
      <h3 style="margin: 0 0 12px; color: #1e40af; font-size: 20px; font-weight: 700;">Microsite de Reservas Directas</h3>
      <p style="margin: 0; color: #475569; line-height: 1.7; font-size: 15px;">
        Tus huéspedes pueden hacer reservas directas con un perfil microsite de tu vivienda o habitación. 
        Así no te cobran Airbnb o Booking sus tarifas porque la tarifa es la mitad del precio que ellos.
      </p>
    </div>
    
    <div style="padding: 24px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 16px; border: 2px solid #22c55e; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15); transition: transform 0.3s ease, box-shadow 0.3s ease;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 20px rgba(34, 197, 94, 0.25)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(34, 197, 94, 0.15)'">
      <div style="font-size: 36px; margin-bottom: 12px;">📤</div>
      <h3 style="margin: 0 0 12px; color: #166534; font-size: 20px; font-weight: 700;">Envío Automático al Ministerio</h3>
      <p style="margin: 0; color: #475569; line-height: 1.7; font-size: 15px;">
        Beneficios de no hacer nada: se envía directamente el parte de viajeros y la reserva de hospedaje 
        al Ministerio del Interior de manera directa y sencilla tras rellenar nuestro formulario por parte del huésped.
      </p>
    </div>
    
    <div style="padding: 24px; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-radius: 16px; border: 2px solid #f59e0b; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15); transition: transform 0.3s ease, box-shadow 0.3s ease;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 20px rgba(245, 158, 11, 0.25)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(245, 158, 11, 0.15)'">
      <div style="font-size: 36px; margin-bottom: 12px;">📄</div>
      <h3 style="margin: 0 0 12px; color: #92400e; font-size: 20px; font-weight: 700;">Generador de Facturas</h3>
      <p style="margin: 0; color: #475569; line-height: 1.7; font-size: 15px;">
        Nuestro sistema tiene un generador de facturas para cuando los huéspedes las necesitan, 
        facilitando la gestión administrativa y fiscal.
      </p>
    </div>
    
    <div style="padding: 24px; background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-radius: 16px; border: 2px solid #a855f7; box-shadow: 0 4px 12px rgba(168, 85, 247, 0.15); transition: transform 0.3s ease, box-shadow 0.3s ease;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 20px rgba(168, 85, 247, 0.25)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(168, 85, 247, 0.15)'">
      <div style="font-size: 36px; margin-bottom: 12px;">💰</div>
      <h3 style="margin: 0 0 12px; color: #6b21a8; font-size: 20px; font-weight: 700;">Calculadora de Costes</h3>
      <p style="margin: 0; color: #475569; line-height: 1.7; font-size: 15px;">
        Calculadora de costes para saber exactamente cuánto se gasta por absolutamente todo lo que consume 
        tener una vivienda vacacional o alquilar habitaciones.
      </p>
    </div>
    
    <div style="padding: 24px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 16px; border: 2px solid #ef4444; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15); transition: transform 0.3s ease, box-shadow 0.3s ease;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 20px rgba(239, 68, 68, 0.25)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(239, 68, 68, 0.15)'">
      <div style="font-size: 36px; margin-bottom: 12px;">✅</div>
      <h3 style="margin: 0 0 12px; color: #991b1b; font-size: 20px; font-weight: 700;">Cumplimiento RD 933/2021</h3>
      <p style="margin: 0; color: #475569; line-height: 1.7; font-size: 15px;">
        Cumplimiento automático con el Real Decreto 933/2021 para el registro de viajeros, 
        garantizando que estés siempre en cumplimiento de la normativa vigente.
      </p>
    </div>
  </div>
</section>
`;
}

// Generar formulario de captura de email
function generateEmailCaptureHTML(): string {
  return `
<!-- Formulario de Captura de Email -->
<section style="margin: 3rem 0; padding: 2rem; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 16px; border: 2px solid #bae6fd;">
  <h2 style="font-size: 2rem; margin-bottom: 1rem; color: #1f2937; text-align: center;">🤔 ¿Te lo estás pensando?</h2>
  <p style="text-align: center; color: #475569; margin-bottom: 2rem; font-size: 18px;">
    Deja tu email y nos pondremos en contacto contigo para resolver todas tus dudas
  </p>
  
  <form id="emailCaptureForm" onsubmit="handleEmailCapture(event)" style="max-width: 500px; margin: 0 auto;">
    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
      <input type="email" id="leadEmail" required placeholder="tu@email.com" 
             style="flex: 1; min-width: 250px; height: 50px; padding: 0 16px; border-radius: 12px; border: 2px solid #e2e8f0; font-size: 16px; background: white;"
             onfocus="this.style.borderColor='#2563eb'; this.style.boxShadow='0 0 0 3px rgba(37, 99, 235, 0.1)'"
             onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
      <button type="submit" 
              style="height: 50px; padding: 0 24px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); white-space: nowrap;"
              onmouseover="this.style.transform='translateY(-2px)'"
              onmouseout="this.style.transform='translateY(0)'">
        Enviar
      </button>
    </div>
    <p id="emailCaptureMessage" style="margin-top: 12px; text-align: center; font-size: 14px; color: #16a34a; display: none;"></p>
  </form>
</section>
`;
}

// Generar JavaScript para los componentes
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

function openStripePayment() {
  const properties = parseInt(document.getElementById('calcProperties').value) || 1;
  const plan = document.getElementById('calcPlan').value;
  const planType = plan === 'monthly' ? 'monthly' : 'yearly';
  
  // Redirigir a la landing con parámetros para abrir el modal
  window.location.href = \`https://delfincheckin.com/#precio?properties=\${properties}&plan=\${planType}&openModal=true\`;
}

// Captura de Email
async function handleEmailCapture(event) {
  event.preventDefault();
  const email = document.getElementById('leadEmail').value;
  const messageEl = document.getElementById('emailCaptureMessage');
  
  try {
    const response = await fetch('https://admin.delfincheckin.com/api/public/lead-capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'programmatic_page' })
    });
    
    if (response.ok) {
      messageEl.textContent = '✅ ¡Gracias! Te contactaremos pronto.';
      messageEl.style.color = '#16a34a';
      messageEl.style.display = 'block';
      document.getElementById('leadEmail').value = '';
      
      setTimeout(() => {
        messageEl.style.display = 'none';
      }, 5000);
    } else {
      throw new Error('Error en el servidor');
    }
  } catch (error) {
    messageEl.textContent = '❌ Error al enviar. Por favor, intenta de nuevo.';
    messageEl.style.color = '#ef4444';
    messageEl.style.display = 'block';
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
</script>
`;
}

