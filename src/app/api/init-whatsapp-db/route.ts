import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Inicializando base de datos de WhatsApp...');

    // Crear tabla de plantillas de mensajes
    await sql`
      CREATE TABLE IF NOT EXISTS message_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        trigger_type VARCHAR(50) NOT NULL,
        channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
        language VARCHAR(5) NOT NULL DEFAULT 'es',
        template_content TEXT NOT NULL,
        variables JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Crear tabla de mensajes enviados
    await sql`
      CREATE TABLE IF NOT EXISTS sent_messages (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES message_templates(id),
        reservation_id INTEGER,
        guest_phone VARCHAR(20) NOT NULL,
        guest_name VARCHAR(100),
        message_content TEXT NOT NULL,
        whatsapp_message_id VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        sent_at TIMESTAMP,
        delivered_at TIMESTAMP,
        read_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Crear tabla de configuración de WhatsApp
    await sql`
      CREATE TABLE IF NOT EXISTS whatsapp_config (
        id SERIAL PRIMARY KEY,
        phone_number VARCHAR(20) NOT NULL DEFAULT '+34617555255',
        access_token TEXT,
        webhook_verify_token VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Insertar configuración por defecto si no existe
    await sql`
      INSERT INTO whatsapp_config (phone_number, is_active) 
      VALUES ('+34617555255', true)
      ON CONFLICT DO NOTHING;
    `;

    // Insertar plantillas por defecto si no existen
    const defaultTemplates = [
      {
        name: 'Confirmación de Reserva',
        trigger_type: 'reservation_confirmed',
        template_content: `¡Hola {{guest_name}}! 🏨

Tu reserva ha sido confirmada:

📅 Fechas: {{check_in}} - {{check_out}}
🏠 Habitación: {{room_number}} ({{room_code}})
👥 Huéspedes: {{guest_count}}

Para cualquier consulta, no dudes en contactarnos.

¡Esperamos verte pronto! 🐬`,
        variables: JSON.stringify(["guest_name", "check_in", "check_out", "room_number", "room_code", "guest_count"])
      },
      {
        name: 'Instrucciones Check-in',
        trigger_type: 'checkin_instructions',
        template_content: `¡Hola {{guest_name}}! 🗝️

Instrucciones para tu check-in:

🏠 Habitación: {{room_number}}
🔑 Código: {{room_code}}
📅 Fecha: {{check_in}}

El código te permitirá acceder a la habitación las 24h.

¡Que disfrutes tu estancia! 🐬`,
        variables: JSON.stringify(["guest_name", "room_number", "room_code", "check_in"])
      },
      {
        name: 'Recordatorio 7 días',
        trigger_type: 't_minus_7_days',
        template_content: `¡Hola {{guest_name}}! ⏰

Te recordamos que en 7 días tienes tu reserva:

📅 {{check_in}} - {{check_out}}
🏠 Habitación {{room_number}}

¿Necesitas el formulario de registro de huéspedes? Te lo podemos enviar.

¡Nos vemos pronto! 🐬`,
        variables: JSON.stringify(["guest_name", "check_in", "check_out", "room_number"])
      },
      {
        name: 'Recordatorio 24h',
        trigger_type: 't_minus_24_hours',
        template_content: `¡Hola {{guest_name}}! 🚀

¡Mañana es tu llegada! 

📅 Check-in: {{check_in}}
🏠 Habitación: {{room_number}} ({{room_code}})

¿Necesitas el formulario de registro? Responde "SÍ" y te lo enviamos.

¡Te esperamos! 🐬`,
        variables: JSON.stringify(["guest_name", "check_in", "room_number", "room_code"])
      },
      {
        name: 'Envío Formulario',
        trigger_type: 'send_form',
        template_content: `¡Perfecto! 📋

Aquí tienes el formulario de registro de huéspedes:

🔗 {{form_url}}

Por favor, complétalo antes de tu llegada.

¡Gracias! 🐬`,
        variables: JSON.stringify(["form_url"])
      },
      {
        name: 'Post Check-out',
        trigger_type: 'post_checkout',
        template_content: `¡Hola {{guest_name}}! 👋

Esperamos que hayas disfrutado tu estancia en la habitación {{room_number}}.

¿Cómo fue todo? Nos encantaría conocer tu experiencia.

¡Gracias por elegirnos! 🐬`,
        variables: JSON.stringify(["guest_name", "room_number"])
      }
    ];

    for (const template of defaultTemplates) {
      await sql`
        INSERT INTO message_templates (name, trigger_type, template_content, variables)
        VALUES (${template.name}, ${template.trigger_type}, ${template.template_content}, ${template.variables}::jsonb)
        ON CONFLICT (name) DO NOTHING;
      `;
    }

    // Crear índices
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sent_messages_reservation ON sent_messages(reservation_id);
      CREATE INDEX IF NOT EXISTS idx_sent_messages_phone ON sent_messages(guest_phone);
      CREATE INDEX IF NOT EXISTS idx_sent_messages_status ON sent_messages(status);
      CREATE INDEX IF NOT EXISTS idx_sent_messages_created ON sent_messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_templates_trigger ON message_templates(trigger_type);
      CREATE INDEX IF NOT EXISTS idx_templates_active ON message_templates(is_active);
    `;

    console.log('✅ Base de datos de WhatsApp inicializada correctamente');

    return NextResponse.json({
      success: true,
      message: 'Base de datos de WhatsApp inicializada correctamente',
      tables_created: ['message_templates', 'sent_messages', 'whatsapp_config'],
      templates_inserted: defaultTemplates.length
    });

  } catch (error) {
    console.error('❌ Error inicializando base de datos de WhatsApp:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al inicializar la base de datos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
