import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Inicializando configuración de WhatsApp...');

    // Verificar si ya existe una configuración
    const existingConfig = await sql`
      SELECT id FROM whatsapp_config LIMIT 1
    `;

    let config;

    if (existingConfig.rows.length === 0) {
      // Crear nueva configuración
      config = await sql`
        INSERT INTO whatsapp_config (phone_number, is_active, created_at, updated_at)
        VALUES ('+34617555255', false, NOW(), NOW())
        RETURNING *
      `;
      console.log('✅ Configuración de WhatsApp creada');
    } else {
      // Actualizar configuración existente
      config = await sql`
        UPDATE whatsapp_config 
        SET phone_number = '+34617555255', 
            updated_at = NOW()
        WHERE id = ${existingConfig.rows[0].id}
        RETURNING *
      `;
      console.log('✅ Configuración de WhatsApp actualizada');
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración de WhatsApp inicializada correctamente',
      data: {
        phone_number: '+34617555255',
        is_active: false,
        message: 'Ahora puedes configurar tu token de acceso y activar WhatsApp'
      }
    });

  } catch (error) {
    console.error('❌ Error inicializando configuración de WhatsApp:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al inicializar configuración de WhatsApp',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Obtener configuración actual
    const config = await sql`
      SELECT * FROM whatsapp_config 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (config.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay configuración de WhatsApp',
        data: null
      });
    }

    return NextResponse.json({
      success: true,
      data: config.rows[0]
    });

  } catch (error) {
    console.error('❌ Error obteniendo configuración de WhatsApp:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al obtener configuración de WhatsApp'
    });
  }
}
