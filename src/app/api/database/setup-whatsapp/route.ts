import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  const results: string[] = [];
  
  try {
    console.log('🔄 Iniciando configuración de base de datos para WhatsApp...');
    results.push('Iniciando configuración de WhatsApp');

    // 1. Crear tabla message_templates
    try {
      await sql`
        CREATE TABLE message_templates (
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
      results.push('✅ Tabla message_templates creada');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        results.push('⚠️ Tabla message_templates ya existe');
      } else {
        throw error;
      }
    }

    // 2. Crear tabla sent_messages
    try {
      await sql`
        CREATE TABLE sent_messages (
          id SERIAL PRIMARY KEY,
          template_id INTEGER REFERENCES message_templates(id) ON DELETE CASCADE,
          reservation_id UUID,
          guest_phone VARCHAR(50) NOT NULL,
          guest_name VARCHAR(255),
          message_content TEXT NOT NULL,
          whatsapp_message_id VARCHAR(255),
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          sent_at TIMESTAMP WITH TIME ZONE,
          delivered_at TIMESTAMP WITH TIME ZONE,
          read_at TIMESTAMP WITH TIME ZONE
        )
      `;
      results.push('✅ Tabla sent_messages creada');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        results.push('⚠️ Tabla sent_messages ya existe');
      } else {
        throw error;
      }
    }

    // 3. Crear tabla whatsapp_config
    try {
      await sql`
        CREATE TABLE whatsapp_config (
          id SERIAL PRIMARY KEY,
          phone_number VARCHAR(50),
          access_token TEXT,
          webhook_verify_token VARCHAR(255),
          is_active BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
      results.push('✅ Tabla whatsapp_config creada');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        results.push('⚠️ Tabla whatsapp_config ya existe');
      } else {
        throw error;
      }
    }

    // 4. Crear índices
    const indices = [
      'CREATE INDEX idx_message_templates_trigger_type ON message_templates(trigger_type)',
      'CREATE INDEX idx_message_templates_channel ON message_templates(channel)',
      'CREATE INDEX idx_message_templates_active ON message_templates(is_active)',
      'CREATE INDEX idx_sent_messages_template_id ON sent_messages(template_id)',
      'CREATE INDEX idx_sent_messages_phone ON sent_messages(guest_phone)',
      'CREATE INDEX idx_sent_messages_status ON sent_messages(status)'
    ];

    for (const indexSQL of indices) {
      try {
        await sql.query(indexSQL);
        results.push(`✅ Índice creado: ${indexSQL.split(' ')[2]}`);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          results.push(`⚠️ Índice ya existe: ${indexSQL.split(' ')[2]}`);
        } else {
          results.push(`❌ Error creando índice: ${error.message}`);
        }
      }
    }

    // 5. Insertar configuración inicial
    try {
      await sql`
        INSERT INTO whatsapp_config (phone_number, access_token, webhook_verify_token, is_active) 
        VALUES (NULL, NULL, NULL, false)
      `;
      results.push('✅ Configuración inicial insertada');
    } catch (error: any) {
      results.push('⚠️ Configuración inicial ya existe o error insertando');
    }

    // 6. Insertar plantillas predefinidas
    try {
      const templateExists = await sql`SELECT COUNT(*) as count FROM message_templates`;
      
      if (templateExists.rows[0].count === '0') {
        // Plantilla 1: Reserva Confirmada
        await sql`
          INSERT INTO message_templates (name, trigger_type, channel, language, template_content, variables, is_active) 
          VALUES (
            'Reserva Confirmada',
            'reservation_confirmed',
            'whatsapp',
            'es',
            '🎉 ¡Hola {{guest_name}}! Tu reserva ha sido confirmada.\n\n📅 **Detalles de tu reserva:**\n🏠 Habitación: {{room_name}}\n📅 Check-in: {{check_in_date}}\n📅 Check-out: {{check_out_date}}\n👥 Huéspedes: {{guest_count}}\n\n✅ En breve recibirás las instrucciones para el check-in digital.\n\n¡Nos vemos pronto!\n🐬 Equipo Delfín Check-in',
            '["guest_name", "room_name", "check_in_date", "check_out_date", "guest_count"]'::jsonb,
            true
          )
        `;

        // Plantilla 2: Instrucciones Check-in
        await sql`
          INSERT INTO message_templates (name, trigger_type, channel, language, template_content, variables, is_active) 
          VALUES (
            'Instrucciones Check-in',
            'check_in_instructions',
            'whatsapp',
            'es',
            '🏠 ¡Hola {{guest_name}}! Ya puedes hacer el check-in.\n\n🔑 **Código de acceso:** {{door_code}}\n\n📍 **Dirección:** {{property_address}}\n\n⏰ **Horario de check-in:** A partir de las 15:00h\n\n📋 **Instrucciones:**\n1. Usa el código {{door_code}} en la cerradura electrónica\n2. Tu habitación es la {{room_name}}\n3. Completa el registro digital: {{checkin_link}}\n\n📶 **WiFi:**\nRed: {{wifi_network}}\nContraseña: {{wifi_password}}\n\n❓ ¿Dudas? Escríbenos por WhatsApp.\n\n🐬 ¡Bienvenido!',
            '["guest_name", "door_code", "property_address", "room_name", "checkin_link", "wifi_network", "wifi_password"]'::jsonb,
            true
          )
        `;

        // Plantilla 3: Instrucciones Check-out
        await sql`
          INSERT INTO message_templates (name, trigger_type, channel, language, template_content, variables, is_active) 
          VALUES (
            'Instrucciones Check-out',
            'check_out_instructions',
            'whatsapp',
            'es',
            '👋 ¡Hola {{guest_name}}! Esperamos que hayas disfrutado tu estancia.\n\n🕐 **Check-out:** Antes de las 11:00h\n\n📋 **Antes de irte:**\n✅ Deja las llaves en la mesa\n✅ Cierra bien puertas y ventanas\n✅ Apaga luces y aires acondicionados\n✅ Deja la habitación ordenada\n\n🧹 No es necesario limpiar, pero agradecemos dejar todo recogido.\n\n⭐ **¡Nos ayudarías mucho con una reseña!**\n{{review_link}}\n\n🙏 ¡Gracias por elegirnos!\n🐬 Equipo Delfín Check-in\n\n💬 ¿Todo bien? ¡Escríbenos si necesitas algo!',
            '["guest_name", "review_link"]'::jsonb,
            true
          )
        `;

        results.push('✅ Plantillas predefinidas insertadas');
      } else {
        results.push('⚠️ Ya existen plantillas, saltando inserción');
      }
    } catch (error: any) {
      results.push(`❌ Error insertando plantillas: ${error.message}`);
    }

    // Verificar estado final
    const templatesCount = await sql`SELECT COUNT(*) as count FROM message_templates`;
    const configCount = await sql`SELECT COUNT(*) as count FROM whatsapp_config`;
    const sentCount = await sql`SELECT COUNT(*) as count FROM sent_messages`;

    results.push(`🔍 Estado final:`);
    results.push(`- Plantillas: ${templatesCount.rows[0].count}`);
    results.push(`- Configuraciones: ${configCount.rows[0].count}`);
    results.push(`- Mensajes enviados: ${sentCount.rows[0].count}`);

    return NextResponse.json({
      success: true,
      message: 'Configuración de WhatsApp completada',
      steps: results,
      data: {
        templates_count: templatesCount.rows[0].count,
        config_count: configCount.rows[0].count,
        sent_messages_count: sentCount.rows[0].count
      }
    });

  } catch (error) {
    console.error('❌ Error configurando WhatsApp:', error);
    results.push(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error configurando WhatsApp',
        steps: results,
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
