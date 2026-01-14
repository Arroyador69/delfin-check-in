import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';
import { Octokit } from '@octokit/rest';

// Inicializar Octokit para eliminar archivos de GitHub Pages
const GITHUB_TOKEN = process.env.GITHUB_TOKEN_LANDING || process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: GITHUB_TOKEN });

const GITHUB_OWNER = 'Arroyador69';
const GITHUB_REPO = 'delfincheckin.com';
const GITHUB_BRANCH = 'main';

export async function POST(req: NextRequest) {
  try {
    // Verificar SuperAdmin
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json();
    const { pageIds } = body;

    if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
      return NextResponse.json(
        { error: 'Debes proporcionar al menos un ID de página' },
        { status: 400 }
      );
    }

    // Obtener las páginas seleccionadas
    const pages = await sql`
      SELECT id, slug, github_file_path
      FROM programmatic_pages
      WHERE id = ANY(${pageIds}::uuid[])
      AND is_test = true
    `;

    if (pages.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No se encontraron páginas de prueba con los IDs proporcionados',
        deleted: 0
      });
    }

    const deletedPages: string[] = [];
    const errors: string[] = [];

    // Eliminar cada página seleccionada
    for (const page of pages.rows) {
      try {
        // 1. Eliminar archivo de GitHub si existe
        if (page.github_file_path && GITHUB_TOKEN) {
          try {
            // Obtener SHA del archivo para poder eliminarlo
            const fileInfo = await octokit.repos.getContent({
              owner: GITHUB_OWNER,
              repo: GITHUB_REPO,
              path: page.github_file_path,
              ref: GITHUB_BRANCH,
            });

            if (!Array.isArray(fileInfo.data) && fileInfo.data.sha) {
              await octokit.repos.deleteFile({
                owner: GITHUB_OWNER,
                repo: GITHUB_REPO,
                path: page.github_file_path,
                message: `[Auto] Eliminar página de prueba: ${page.slug}`,
                sha: fileInfo.data.sha,
                branch: GITHUB_BRANCH,
              });
            }

            // También intentar eliminar el fallback .html si existe
            const fallbackPath = `${page.slug}.html`;
            try {
              const fallbackInfo = await octokit.repos.getContent({
                owner: GITHUB_OWNER,
                repo: GITHUB_REPO,
                path: fallbackPath,
                ref: GITHUB_BRANCH,
              });

              if (!Array.isArray(fallbackInfo.data) && fallbackInfo.data.sha) {
                await octokit.repos.deleteFile({
                  owner: GITHUB_OWNER,
                  repo: GITHUB_REPO,
                  path: fallbackPath,
                  message: `[Auto] Eliminar fallback de prueba: ${page.slug}`,
                  sha: fallbackInfo.data.sha,
                  branch: GITHUB_BRANCH,
                });
              }
            } catch (e: any) {
              // Ignorar si el fallback no existe
              if (e.status !== 404) {
                console.warn(`⚠️ Error eliminando fallback ${fallbackPath}:`, e.message);
              }
            }
          } catch (e: any) {
            if (e.status !== 404) {
              console.warn(`⚠️ Error eliminando archivo de GitHub para ${page.slug}:`, e.message);
            }
          }
        }

        // 2. Eliminar de la base de datos
        await sql`
          DELETE FROM programmatic_pages
          WHERE id = ${page.id}
        `;

        deletedPages.push(page.slug);
      } catch (error: any) {
        console.error(`❌ Error eliminando página ${page.slug}:`, error);
        errors.push(`${page.slug}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Eliminadas ${deletedPages.length} página(s) de prueba`,
      deleted: deletedPages.length,
      deletedPages: deletedPages,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('❌ Error eliminando páginas seleccionadas:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
