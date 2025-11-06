import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { getScheduledPages } from '@/lib/programmatic-content';
import { sql } from '@/lib/db';
import { Octokit } from '@octokit/rest';
import { marked } from 'marked';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const GITHUB_OWNER = 'Arroyador69';
const GITHUB_REPO = 'delfincheckin.com';
const GITHUB_BRANCH = 'main';
const GITHUB_PATH = 'programmatic';
const DAILY_QUOTA = 50; // 50 páginas por día

// Mix óptimo diario (distribución recomendada)
const DAILY_MIX = {
  local: 30,        // 60% - Long-tail transaccional
  'problem-solution': 10,  // 20% - Alta intención
  feature: 8,       // 16% - Medio-alto impacto
  comparison: 2     // 4% - Máxima intención
};

// KPIs objetivos por plantilla (sesiones/página/día)
const TARGET_SESSIONS_PER_PAGE = {
  local: 1.7,
  'problem-solution': 1.2,
  feature: 1.0,
  comparison: 0.8
};

// KPIs objetivos de conversión (sesión→pago %)
const TARGET_CONVERSION_RATE = {
  local: 0.30,
  'problem-solution': 0.45,
  feature: 0.50,
  comparison: 0.80
};

// GET: Ejecutar cron (Vercel cron usa GET, también funciona POST para manual)
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación solo si hay token (para manual)
    // Los crons de Vercel no pasan cookies, así que verificamos por header de autorización
    const authHeader = req.headers.get('authorization');
    const isVercelCron = req.headers.get('x-vercel-cron') === '1';
    
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action'); // 'status' o 'run'

    // Si es status, devolver estado del cron
    if (action === 'status') {
      // Verificar autenticación solo si NO es Vercel cron
      if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        const { error } = await verifySuperAdmin(req);
        if (error) return error;
      }

      // Contar páginas por estado
      const stats = await sql`
        SELECT 
          status,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_count,
          COUNT(*) FILTER (WHERE DATE(published_at) = CURRENT_DATE) as published_today
        FROM programmatic_pages
        GROUP BY status
      `;

      // Páginas programadas para hoy
      const scheduledToday = await sql`
        SELECT COUNT(*) as count
        FROM programmatic_pages
        WHERE status = 'scheduled'
          AND DATE(publish_at) = CURRENT_DATE
      `;

      return NextResponse.json({
        stats: stats.rows,
        scheduled_today: parseInt(scheduledToday.rows[0]?.count || '0')
      });
    }

    // Si no es Vercel cron y no tiene secret, verificar SuperAdmin
    if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      const { error } = await verifySuperAdmin(req);
      if (error) return error;
    }

    // Ejecutar cron
    const batch = searchParams.get('batch') || 'morning'; // 'morning', 'afternoon', 'all'

    const result = await runPublishCron(batch);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('❌ Error ejecutando cron:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST: Ejecutar cron manualmente (para testing)
export async function POST(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const batch = body.batch || 'all'; // 'morning', 'afternoon', 'all'

    const result = await runPublishCron(batch);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('❌ Error ejecutando cron:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

async function runPublishCron(batch: string = 'all') {
  // Obtener páginas por tipo según el mix óptimo
  const pagesToPublish = await selectPagesForPublishing();

  if (pagesToPublish.length === 0) {
    return {
      published: 0,
      failed: 0,
      message: 'No hay páginas programadas para publicar según el mix óptimo',
      distribution: DAILY_MIX
    };
  }

  let published = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const page of pagesToPublish) {
    try {
      // Generar HTML
      const htmlContent = generateSEOHTML(page);

      // Path del archivo
      const filePath = `${GITHUB_PATH}/${page.slug}.html`;

      // Obtener SHA si existe
      let sha: string | undefined;
      try {
        const existingFile = await octokit.repos.getContent({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path: filePath,
          ref: GITHUB_BRANCH,
        });

        if (!Array.isArray(existingFile.data)) {
          sha = existingFile.data.sha;
        }
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      // Crear o actualizar
      const fileContent = Buffer.from(htmlContent).toString('base64');

      await octokit.repos.createOrUpdateFileContents({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: filePath,
        message: `[Auto] Publicar página programática: ${page.title}`,
        content: fileContent,
        branch: GITHUB_BRANCH,
        ...(sha ? { sha } : {}),
      });

      // Obtener commit SHA
      const commits = await octokit.repos.listCommits({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        branch: GITHUB_BRANCH,
        per_page: 1,
      });

      const commitSha = commits.data[0]?.sha;

      // Actualizar BD
      await sql`
        UPDATE programmatic_pages
        SET 
          status = 'published',
          published_at = now(),
          github_commit_sha = ${commitSha || null},
          github_file_path = ${filePath},
          updated_at = now()
        WHERE id = ${page.id}
      `;

      published++;

    } catch (error: any) {
      console.error(`❌ Error publicando página ${page.id}:`, error);
      
      await sql`
        UPDATE programmatic_pages
        SET status = 'failed', updated_at = now()
        WHERE id = ${page.id}
      `;

      failed++;
      errors.push(`Página ${page.slug}: ${error.message}`);
    }
  }

  // Estadísticas por tipo
  const statsByType: Record<string, { published: number; failed: number }> = {};
  pagesToPublish.forEach(page => {
    if (!statsByType[page.type]) {
      statsByType[page.type] = { published: 0, failed: 0 };
    }
  });

  pagesToPublish.forEach((page, idx) => {
    if (idx < published) {
      statsByType[page.type].published++;
    } else if (idx >= published && idx < published + failed) {
      statsByType[page.type].failed++;
    }
  });

  return {
    published,
    failed,
    total: pagesToPublish.length,
    distribution: DAILY_MIX,
    statsByType,
    errors: errors.length > 0 ? errors : undefined
  };
}

// Algoritmo de selección inteligente de páginas según mix óptimo
async function selectPagesForPublishing() {
  const selectedPages: any[] = [];

  // 1. Local (30): Priorizar ciudades con más potencial que aún no existan
  // Priorizar por: ciudades con más potencial turístico, menos usadas, y más antiguas programadas
  const localPages = await sql`
    SELECT pp.*
    FROM programmatic_pages pp
    LEFT JOIN content_datasets cd ON cd.type = 'city' 
      AND cd.key = pp.variables_used->>'ciudad_key'
    WHERE pp.status = 'scheduled'
      AND pp.type = 'local'
      AND pp.publish_at <= now()
    ORDER BY 
      COALESCE((cd.data->>'tourism_score')::int, 0) DESC,
      COALESCE(cd.used_count, 0) ASC,
      pp.publish_at ASC
    LIMIT ${DAILY_MIX.local}
  `;
  selectedPages.push(...localPages.rows);

  // 2. Problema→Solución (10): Rotar temas core
  const problemPages = await sql`
    SELECT pp.*
    FROM programmatic_pages pp
    WHERE pp.status = 'scheduled'
      AND pp.type = 'problem-solution'
      AND pp.publish_at <= now()
    ORDER BY pp.publish_at ASC
    LIMIT ${DAILY_MIX['problem-solution']}
  `;
  selectedPages.push(...problemPages.rows);

  // 3. Feature (8): Rotar features clave
  const featurePages = await sql`
    SELECT pp.*
    FROM programmatic_pages pp
    WHERE pp.status = 'scheduled'
      AND pp.type = 'feature'
      AND pp.publish_at <= now()
    ORDER BY pp.publish_at ASC
    LIMIT ${DAILY_MIX.feature}
  `;
  selectedPages.push(...featurePages.rows);

  // 4. Comparativa (2): Priorizar rivales más buscados
  const comparisonPages = await sql`
    SELECT pp.*
    FROM programmatic_pages pp
    WHERE pp.status = 'scheduled'
      AND pp.type = 'comparison'
      AND pp.publish_at <= now()
    ORDER BY pp.publish_at ASC
    LIMIT ${DAILY_MIX.comparison}
  `;
  selectedPages.push(...comparisonPages.rows);

  return selectedPages;
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
function generatePriceCalculatorHTML(): string {
  return `
<!-- Calculadora de Precios con Stripe -->
<section style="margin: 3rem 0; padding: 2rem; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border: 2px solid #2563eb; border-radius: 16px;">
  <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 24px; text-align: center; color: white; border-radius: 12px; margin-bottom: 24px;">
    <div style="font-size: 32px; margin-bottom: 8px;">💰</div>
    <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 700;">Calculadora de Precios</h2>
    <p style="margin: 0; opacity: 0.9; font-size: 16px;">Descubre cuánto te costaría Delfín Check-in según tus necesidades</p>
  </div>
  
  <div style="padding: 24px; background: white; border-radius: 12px; margin-bottom: 24px;">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 24px;">
      <div>
        <label style="display: block; margin-bottom: 12px; font-weight: 600; color: #1f2937; font-size: 16px;">
          🏠 Número de propiedades
        </label>
        <div style="position: relative;">
          <input type="number" id="calcProperties" min="1" max="50" value="1" readonly
                 style="width: 100%; height: 50px; border-radius: 12px; border: 2px solid #e2e8f0; padding: 0 60px 0 20px; font-size: 18px; text-align: center; font-weight: 600; color: #2563eb; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.05); -moz-appearance: textfield;"
                 onkeydown="return false;" onpaste="return false;" oninput="return false;">
          <div style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 2px; pointer-events: auto; z-index: 10;">
            <button type="button" id="incrementBtn" onclick="incrementCalc()" 
                    style="width: 24px; height: 20px; background: #2563eb; color: white; border: none; border-radius: 4px 4px 0 0; cursor: pointer; font-size: 12px; font-weight: bold;"
                    onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">▲</button>
            <button type="button" id="decrementBtn" onclick="decrementCalc()"
                    style="width: 24px; height: 20px; background: #2563eb; color: white; border: none; border-radius: 0 0 4px 4px; cursor: pointer; font-size: 12px; font-weight: bold;"
                    onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">▼</button>
          </div>
        </div>
      </div>
      
      <div>
        <label style="display: block; margin-bottom: 12px; font-weight: 600; color: #1f2937; font-size: 16px;">
          📅 Tipo de plan
        </label>
        <select id="calcPlan" onchange="updateCalc()" 
                style="width: 100%; height: 50px; border-radius: 12px; border: 2px solid #e2e8f0; padding: 0 50px 0 20px; font-size: 16px; font-weight: 500; background: white; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <option value="monthly">💳 Mensual (14,99€/propiedad)</option>
          <option value="yearly" selected>🎯 Anual (descuento 16,7%)</option>
        </select>
      </div>
    </div>
    
    <div id="calcResults" style="background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 32px; text-align: center; border: 2px solid #e2e8f0;">
      <div style="font-size: 36px; font-weight: 900; color: #2563eb; margin-bottom: 12px;" id="calcTotal">181,38€/año</div>
      <div style="color: #64748b; margin-bottom: 8px; font-size: 14px;">(IVA incluido)</div>
      <div style="color: #64748b; margin-bottom: 8px; font-size: 16px;" id="calcPerProperty">14,99€ por propiedad</div>
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
    
    <button onclick="openStripePayment()" 
            style="width: 100%; margin-top: 24px; padding: 16px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; border: none; border-radius: 12px; font-size: 18px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);"
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(37, 99, 235, 0.4)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(37, 99, 235, 0.3)'">
      💳 Contratar
    </button>
  </div>
</section>
`;
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
  
  document.getElementById('calcTotal').textContent = \`\${totalWithVat.toFixed(2)}€\${periodText}\`;
  document.getElementById('calcPerProperty').textContent = \`\${pricePerProperty.toFixed(2)}€ por propiedad\`;
  document.getElementById('calcBase').textContent = \`\${base.toFixed(2)}€\`;
  document.getElementById('calcIVA').textContent = \`\${iva.toFixed(2)}€\`;
  document.getElementById('calcSavings').textContent = savingsText;
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
</script>
`;
}
