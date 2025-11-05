import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { generateContentWithOpenAI, saveProgrammaticPage } from '@/lib/programmatic-content';
import { sql } from '@/lib/db';
import { Octokit } from '@octokit/rest';
import { marked } from 'marked';

// Inicializar Octokit para publicar en GitHub Pages (repo landing)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN_LANDING || process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: GITHUB_TOKEN });
if (!GITHUB_TOKEN) {
  console.warn('[programmatic/generate] Falta GITHUB_TOKEN_LANDING (o GITHUB_TOKEN). La publicación automática a GitHub Pages estará desactivada.');
}

const GITHUB_OWNER = 'Arroyador69';
const GITHUB_REPO = 'delfincheckin.com';
const GITHUB_BRANCH = 'main';
const GITHUB_PATH = 'programmatic';

export async function POST(req: NextRequest) {
  try {
    // Verificar SuperAdmin
    const { error, payload } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json();
    const { template_id, variables, schedule_publish_at, is_test } = body;

    if (!template_id || !variables) {
      return NextResponse.json(
        { error: 'template_id y variables son requeridos' },
        { status: 400 }
      );
    }

    // Obtener plantilla
    const templateResult = await sql`
      SELECT * FROM content_templates WHERE id = ${template_id} AND active = true
    `;

    if (templateResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada o inactiva' },
        { status: 404 }
      );
    }

    const template = templateResult.rows[0];

    // Generar contenido con OpenAI
    const generated = await generateContentWithOpenAI(template, variables);

    // Generar slug y canonical URL (añadir prefijo test- si es prueba)
    const slugPrefix = is_test ? 'test-' : '';
    const citySlug = variables.ciudad
      ? slugify(String(variables.ciudad))
      : null;
    const slugBase = variables.slug || 
      (citySlug ? `${slugPrefix}rd-933/software-${citySlug}` : 
      `${slugPrefix}content/${template.type}-${Date.now()}`);
    const canonicalUrl = `https://delfincheckin.com/${slugBase}`;

    // Guardar en BD
    const pageId = await saveProgrammaticPage({
      template_id: template.id,
      type: template.type,
      slug: slugBase,
      canonical_url: canonicalUrl,
      title: generated.title,
      meta_description: generated.metaDescription,
      content_html: generated.content,
      content_jsonld: generated.jsonld,
      variables_used: variables,
      seo_score: generated.seoScore,
      local_signals_count: generated.localSignalsCount,
      word_count: generated.wordCount,
      status: schedule_publish_at ? 'scheduled' : 'draft',
      publish_at: schedule_publish_at || null,
      is_test: is_test || false
    });

    // Si es página de prueba, publicarla automáticamente a GitHub Pages
    let publishStatus = 'draft';
    let githubPath = null;
    let commitSha = null;
    
    if (is_test && GITHUB_TOKEN) {
      try {
        const page = await sql`SELECT * FROM programmatic_pages WHERE id = ${pageId}`;
        if (page.rows.length > 0) {
          const publishResult = await publishToGitHub(page.rows[0]);
          if (publishResult.success) {
            publishStatus = 'published';
            githubPath = publishResult.github_path;
            commitSha = publishResult.commit_sha;
            
            // Actualizar estado en BD
            await sql`
              UPDATE programmatic_pages
              SET 
                status = 'published',
                published_at = now(),
                github_commit_sha = ${commitSha},
                github_file_path = ${githubPath},
                updated_at = now()
              WHERE id = ${pageId}
            `;
          }
        }
      } catch (error) {
        console.error('⚠️ Error publicando página de prueba automáticamente:', error);
        // No fallar la generación si la publicación falla
      }
    }

    return NextResponse.json({
      success: true,
      page_id: pageId,
      title: generated.title,
      meta_description: generated.metaDescription,
      slug: slugBase,
      canonical_url: canonicalUrl,
      seo_score: generated.seoScore,
      word_count: generated.wordCount,
      local_signals_count: generated.localSignalsCount,
      status: publishStatus,
      github_path: githubPath,
      commit_sha: commitSha
    });

  } catch (error: any) {
    console.error('❌ Error generando contenido programático:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función helper para publicar página a GitHub Pages
async function publishToGitHub(page: any): Promise<{
  success: boolean;
  github_path?: string;
  commit_sha?: string;
  error?: string;
}> {
  try {
    // Generar HTML completo con SEO optimizado
    const htmlContent = generateSEOHTML(page);

    // Path del archivo en GitHub
    // Para GitHub Pages, necesitamos que el slug coincida con la URL
    // Si el slug es "test-rd-933/software-málaga", el archivo debe ser "test-rd-933/software-málaga.html"
    // GitHub Pages servirá esto como delfincheckin.com/test-rd-933/software-málaga.html
    // Pero si queremos que sea delfincheckin.com/test-rd-933/software-málaga sin .html,
    // necesitamos crear la estructura de carpetas: test-rd-933/software-málaga/index.html
    const slugParts = page.slug.split('/');
    let filePath: string;
    
    if (slugParts.length > 1) {
      // Si tiene estructura de carpetas, crear index.html en la última carpeta
      const folderPath = slugParts.slice(0, -1).join('/');
      const fileName = slugParts[slugParts.length - 1];
      filePath = `${folderPath}/${fileName}/index.html`;
    } else {
      // Si es un slug simple, crear archivo .html
      filePath = `${page.slug}.html`;
    }

    // Intentar obtener SHA si el archivo existe
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

    // Crear o actualizar archivo
    const fileContent = Buffer.from(htmlContent).toString('base64');

    // 1) index.html en carpeta (ruta limpia)
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      message: `[Auto] Publicar página de prueba: ${page.title}`,
      content: fileContent,
      branch: GITHUB_BRANCH,
      ...(sha ? { sha } : {}),
    });

    // 2) Copia con .html en raíz (fallback por si no aplica rutas limpias)
    const fallbackPath = `${page.slug}.html`
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: fallbackPath,
      message: `[Auto] Publicar fallback .html: ${page.title}`,
      content: fileContent,
      branch: GITHUB_BRANCH,
    });

    // Obtener commit SHA
    const commits = await octokit.repos.listCommits({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      branch: GITHUB_BRANCH,
      per_page: 1,
    });

    const commitSha = commits.data[0]?.sha;

    return {
      success: true,
      github_path: filePath,
      commit_sha: commitSha,
    };
  } catch (error: any) {
    console.error('❌ Error publicando en GitHub:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido',
    };
  }
}

// Funciones helper para generar HTML (reutilizadas de publish/route.ts)
function generateSEOHTML(page: any): string {
  const jsonld = page.content_jsonld || {};
  
  // Convertir Markdown a HTML
  let contentHtml = '';
  try {
    contentHtml = marked.parse(page.content_html || '');
  } catch (error) {
    console.error('Error convirtiendo Markdown a HTML:', error);
    contentHtml = page.content_html || '';
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
      line-height: 1.7;
      color: #0f172a; /* más oscuro */
      max-width: 860px;
      margin: 0 auto;
      padding: 2rem;
    }
    h1 { font-size: 2.25rem; margin-top: 2rem; margin-bottom: 1rem; color: #0b1220; }
    h2 { font-size: 1.75rem; margin-top: 1.5rem; margin-bottom: 1rem; color: #0b1220; }
    h3 { font-size: 1.35rem; margin-top: 1.25rem; margin-bottom: 0.75rem; color: #0b1220; }
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
    .cta-button:hover { background: #1d4ed8; text-decoration: none; }
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

function generatePriceCalculatorHTML(): string {
  return `
<!-- Calculadora de Precios con Stripe -->
<section style="margin: 3rem 0; padding: 2rem; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border: 2px solid #2563eb; border-radius: 16px;">
  <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 24px; text-align: center; color: white; border-radius: 12px; margin-bottom: 24px;">
    <div style="font-size: 32px; margin-bottom: 8px;">💰</div>
    <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 700;">Calculadora de Precios</h2>
    <p style="margin: 0; opacity: 0.9; font-size: 16px;">Descubre cuánto te costaría Delfín Check-in según tus necesidades</p>
  </div>
  <div id="calcContainer"></div>
  <button onclick="openStripePayment()" 
          style="width: 100%; margin-top: 24px; padding: 16px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; border: none; border-radius: 12px; font-size: 18px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
    💳 Contratar ahora con Stripe
  </button>
</section>`;
}

function generateBenefitsHTML(): string {
  return `
<!-- Beneficios del Servicio -->
<section style="margin: 3rem 0; padding: 2rem; background: white; border-radius: 16px; border: 1px solid #e2e8f0;">
  <h2 style="font-size: 2rem; margin-bottom: 1.5rem; color: #0b1220;">✨ Ventajas de usar Delfín Check-in</h2>
  <ul style="color:#0f172a; line-height:1.8; padding-left:1.25rem;">
    <li>Microsite de reservas directas sin comisiones</li>
    <li>Envío automático al Ministerio (RD 933)</li>
    <li>Generador de facturas integrado</li>
    <li>Calculadora de costes detallada</li>
  </ul>
</section>`;
}

function generateEmailCaptureHTML(): string {
  return `
<!-- Formulario de Captura de Email -->
<section style="margin: 3rem 0; padding: 2rem; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 16px; border: 2px solid #bae6fd;">
  <h2 style="font-size: 2rem; margin-bottom: 1rem; color: #0b1220; text-align: center;">🤔 ¿Te lo estás pensando?</h2>
  <p style="text-align: center; color: #0f172a; margin-bottom: 2rem; font-size: 18px;">
    Deja tu email y nos pondremos en contacto contigo para resolver todas tus dudas
  </p>
  <form id="emailCaptureForm" onsubmit="handleEmailCapture(event)" style="max-width: 500px; margin: 0 auto;">
    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
      <input type="email" id="leadEmail" required placeholder="tu@email.com" 
             style="flex: 1; min-width: 250px; height: 50px; padding: 0 16px; border-radius: 12px; border: 2px solid #e2e8f0; font-size: 16px; background: white; color: #0f172a;">
      <button type="submit" 
              style="height: 50px; padding: 0 24px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); white-space: nowrap;">
        Enviar
      </button>
    </div>
    <p id="emailCaptureMessage" style="margin-top: 12px; text-align: center; font-size: 14px; color: #16a34a; display: none;"></p>
  </form>
</section>`;
}

function generateComponentsScript(): string {
  return `
<script>
function openStripePayment(){
  // Redirige al checkout del admin con parámetros por defecto
  window.location.href = 'https://admin.delfincheckin.com/checkout';
}

function handleEmailCapture(e){
  e.preventDefault();
  const el = document.getElementById('leadEmail');
  const msg = document.getElementById('emailCaptureMessage');
  if(!el || !msg) return;
  msg.textContent = '¡Gracias! Te contactaremos pronto.';
  msg.style.display = 'block';
}
</script>`;
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

// Slugify seguro (quita acentos y caracteres especiales)
function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

