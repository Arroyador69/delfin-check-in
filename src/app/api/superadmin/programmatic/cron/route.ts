import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { getScheduledPages } from '@/lib/programmatic-content';
import { sql } from '@/lib/db';
import { Octokit } from '@octokit/rest';

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
  ${page.content_html}
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
