import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Probando configuración de WhatsApp...');

    // Probar crear solo una tabla primero
    await sql`
      CREATE TABLE IF NOT EXISTS message_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        trigger_type VARCHAR(100) NOT NULL,
        channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
        language VARCHAR(10) NOT NULL DEFAULT 'es',
        template_content TEXT NOT NULL,
        variables JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    console.log('✅ Tabla message_templates creada');

    // Verificar que existe
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'message_templates'
    `;

    return NextResponse.json({
      success: true,
      message: 'Prueba exitosa',
      table_exists: result.rows.length > 0
    });

  } catch (error) {
    console.error('❌ Error en prueba:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error en prueba',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}