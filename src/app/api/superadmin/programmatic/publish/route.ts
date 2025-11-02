import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';
import { Octokit } from '@octokit/rest';

// Inicializar Octokit con token de GitHub
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Personal Access Token con permisos repo
});

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

