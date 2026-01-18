import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import fs from 'fs';
import path from 'path';

/**
 * ========================================
 * API: Configurar Base de Datos para Blog
 * ========================================
 * Ejecuta la migración del sistema de blog/artículos
 * Solo accesible para superadmin
 */

export async function POST(req: NextRequest) {
  try {
    // Verificar que sea superadmin
    const { error, payload } = await verifySuperAdmin(req);
    if (error) return error;

    console.log('🔄 Iniciando configuración de base de datos para blog...');

    // Leer el archivo SQL de migración
    const migrationPath = path.join(process.cwd(), 'database', 'migration-blog-system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Ejecutar la migración completa
    await sql.query(migrationSQL);

    console.log('✅ Base de datos configurada correctamente para el blog');

    // Verificar tablas creadas
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('blog_articles', 'blog_analytics_sessions', 'blog_analytics_events')
      ORDER BY table_name
    `;

    const tables = tablesResult.rows.map(r => r.table_name);

    return NextResponse.json({
      success: true,
      message: 'Sistema de blog configurado correctamente',
      tables_created: tables,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error configurando base de datos para blog:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error interno del servidor',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Verificar estado de las tablas del blog
 */
export async function GET(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    // Verificar si existen las tablas
    const tablesResult = await sql`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('blog_articles', 'blog_analytics_sessions', 'blog_analytics_events')
      ORDER BY table_name
    `;

    const tables = tablesResult.rows;

    // Contar artículos si existe la tabla
    let articleCount = 0;
    if (tables.some((t: any) => t.table_name === 'blog_articles')) {
      const countResult = await sql`SELECT COUNT(*) as count FROM blog_articles`;
      articleCount = parseInt(countResult.rows[0]?.count || '0');
    }

    return NextResponse.json({
      success: true,
      blog_system_installed: tables.length === 3,
      tables: tables,
      article_count: articleCount
    });

  } catch (error: any) {
    console.error('❌ Error verificando estado del blog:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}
