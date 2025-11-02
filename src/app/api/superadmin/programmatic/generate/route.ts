import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { generateContentWithOpenAI, saveProgrammaticPage } from '@/lib/programmatic-content';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    // Verificar SuperAdmin
    const { error, payload } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json();
    const { template_id, variables, schedule_publish_at } = body;

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

    // Generar slug y canonical URL
    const slugBase = variables.slug || 
      (variables.ciudad ? `rd-933/software-${variables.ciudad.toLowerCase().replace(/\s+/g, '-')}` : 
      `content/${template.type}-${Date.now()}`);
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
      publish_at: schedule_publish_at || null
    });

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
      status: schedule_publish_at ? 'scheduled' : 'draft'
    });

  } catch (error: any) {
    console.error('❌ Error generando contenido programático:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

