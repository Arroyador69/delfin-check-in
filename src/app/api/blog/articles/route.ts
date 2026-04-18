import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySuperAdmin } from '@/lib/auth-superadmin';

/**
 * ========================================
 * API: Gestión de Artículos del Blog
 * ========================================
 * CRUD completo para artículos
 */

// GET: Obtener todos los artículos o uno específico por slug
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const status = searchParams.get('status');
    const published_only = searchParams.get('published_only') === 'true';

    if (slug) {
      // Dos consultas evitan fragmentos sql anidados (tipos de @vercel/postgres).
      const result = published_only
        ? await sql`
            SELECT * FROM blog_articles
            WHERE slug = ${slug} AND is_published = true
            LIMIT 1
          `
        : await sql`
            SELECT * FROM blog_articles
            WHERE slug = ${slug}
            LIMIT 1
          `;

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Artículo no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        article: result.rows[0]
      });
    }

    // Obtener lista de artículos con filtros
    let result;
    
    if (published_only && status) {
      result = await sql`
        SELECT 
          id, slug, title, excerpt, meta_description, 
          status, is_published, published_at, 
          author_name, created_at, updated_at,
          view_count, conversion_count
        FROM blog_articles
        WHERE is_published = true AND status = ${status}
        ORDER BY 
          CASE 
            WHEN is_published = true THEN published_at
            ELSE created_at
          END DESC
      `;
    } else if (published_only) {
      result = await sql`
        SELECT 
          id, slug, title, excerpt, meta_description, 
          status, is_published, published_at, 
          author_name, created_at, updated_at,
          view_count, conversion_count
        FROM blog_articles
        WHERE is_published = true
        ORDER BY 
          CASE 
            WHEN is_published = true THEN published_at
            ELSE created_at
          END DESC
      `;
    } else if (status) {
      result = await sql`
        SELECT 
          id, slug, title, excerpt, meta_description, 
          status, is_published, published_at, 
          author_name, created_at, updated_at,
          view_count, conversion_count
        FROM blog_articles
        WHERE status = ${status}
        ORDER BY 
          CASE 
            WHEN is_published = true THEN published_at
            ELSE created_at
          END DESC
      `;
    } else {
      result = await sql`
        SELECT 
          id, slug, title, excerpt, meta_description, 
          status, is_published, published_at, 
          author_name, created_at, updated_at,
          view_count, conversion_count
        FROM blog_articles
        ORDER BY 
          CASE 
            WHEN is_published = true THEN published_at
            ELSE created_at
          END DESC
      `;
    }

    console.log('📊 Query result:', {
      published_only,
      status,
      rowCount: result.rows.length,
      articles: result.rows.map(r => ({ slug: r.slug, is_published: r.is_published, status: r.status }))
    });

    return NextResponse.json({
      success: true,
      articles: result.rows,
      count: result.rows.length
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo artículos:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo artículo (solo superadmin)
export async function POST(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json();
    const {
      slug,
      title,
      meta_description,
      meta_keywords,
      content,
      excerpt,
      canonical_url,
      schema_json,
      status = 'draft',
      is_published = false,
      author_name = 'Delfín Check-in'
    } = body;

    // Validaciones
    if (!slug || !title || !content) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: slug, title, content' },
        { status: 400 }
      );
    }

    // Verificar que el slug no exista
    const existing = await sql`
      SELECT id FROM blog_articles WHERE slug = ${slug}
    `;

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un artículo con ese slug' },
        { status: 409 }
      );
    }

    const published_at = is_published ? new Date().toISOString() : null;

    const result = await sql`
      INSERT INTO blog_articles (
        slug, title, meta_description, meta_keywords,
        content, excerpt, canonical_url, schema_json,
        status, is_published, published_at, author_name
      ) VALUES (
        ${slug}, ${title}, ${meta_description}, ${meta_keywords},
        ${content}, ${excerpt}, ${canonical_url}, 
        ${schema_json ? JSON.stringify(schema_json) : null},
        ${status}, ${is_published}, ${published_at}, ${author_name}
      )
      RETURNING *
    `;

    console.log('✅ Artículo creado:', slug);

    return NextResponse.json({
      success: true,
      article: result.rows[0],
      message: 'Artículo creado correctamente'
    });

  } catch (error: any) {
    console.error('❌ Error creando artículo:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT: Actualizar artículo existente (solo superadmin)
export async function PUT(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Se requiere el ID del artículo' },
        { status: 400 }
      );
    }

    // Si se publica el artículo, actualizar published_at
    if (updates.is_published === true) {
      const existing = await sql`
        SELECT is_published FROM blog_articles WHERE id = ${id}::uuid
      `;
      if (existing.rows.length > 0 && !existing.rows[0].is_published) {
        updates.published_at = new Date().toISOString();
      }
    }

    // Actualizar solo columnas permitidas con consultas explícitas (evita sql.unsafe/sql(field) que fallan en @vercel/postgres)
    const now = new Date().toISOString();
    const result = await sql`
      UPDATE blog_articles
      SET
        slug = COALESCE(${updates.slug ?? null}, slug),
        title = COALESCE(${updates.title ?? null}, title),
        meta_description = COALESCE(${updates.meta_description ?? null}, meta_description),
        meta_keywords = COALESCE(${updates.meta_keywords ?? null}, meta_keywords),
        content = COALESCE(${updates.content ?? null}, content),
        excerpt = COALESCE(${updates.excerpt ?? null}, excerpt),
        status = COALESCE(${updates.status ?? null}, status),
        is_published = COALESCE(${updates.is_published ?? null}, is_published),
        published_at = COALESCE(${updates.published_at ?? null}, published_at),
        author_name = COALESCE(${updates.author_name ?? null}, author_name),
        canonical_url = COALESCE(${updates.canonical_url ?? null}, canonical_url),
        schema_json = COALESCE(${updates.schema_json != null ? JSON.stringify(updates.schema_json) : null}::jsonb, schema_json),
        updated_at = ${now}
      WHERE id = ${id}::uuid
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    console.log('✅ Artículo actualizado:', result.rows[0].slug);

    return NextResponse.json({
      success: true,
      article: result.rows[0],
      message: 'Artículo actualizado correctamente'
    });

  } catch (error: any) {
    console.error('❌ Error actualizando artículo:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar artículo (solo superadmin)
export async function DELETE(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Se requiere el ID del artículo' },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM blog_articles
      WHERE id = ${id}::uuid
      RETURNING slug
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    console.log('✅ Artículo eliminado:', result.rows[0].slug);

    return NextResponse.json({
      success: true,
      message: 'Artículo eliminado correctamente'
    });

  } catch (error: any) {
    console.error('❌ Error eliminando artículo:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
