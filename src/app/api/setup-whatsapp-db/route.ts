import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando configuración de base de datos para WhatsApp...');

    // Crear tabla message_templates
    await sql`
      CREATE TABLE IF NOT EXISTS message_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        trigger_type VARCHAR(100) NOT NULL,
        channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'telegram')),
        language VARCHAR(10) NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
        template_content TEXT NOT NULL,
        variables JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Crear tabla sent_messages
    await sql`
      CREATE TABLE IF NOT EXISTS sent_messages (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES message_templates(id) ON DELETE CASCADE,
        reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
        guest_phone VARCHAR(50) NOT NULL,
        guest_name VARCHAR(255),
        message_content TEXT NOT NULL,
        whatsapp_message_id VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        sent_at TIMESTAMP WITH TIME ZONE,
        delivered_at TIMESTAMP WITH TIME ZONE,
        read_at TIMESTAMP WITH TIME ZONE
      )
    `;

    // Crear tabla whatsapp_config
    await sql`
      CREATE TABLE IF NOT EXISTS whatsapp_config (
        id SERIAL PRIMARY KEY,
        phone_number VARCHAR(50),
        access_token TEXT,
        webhook_verify_token VARCHAR(255),
        is_active BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    console.log('✅ Tablas creadas exitosamente');

    // Crear índices
    await sql`CREATE INDEX IF NOT EXISTS idx_message_templates_trigger_type ON message_templates(trigger_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_message_templates_channel ON message_templates(channel)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_message_templates_active ON message_templates(is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sent_messages_template_id ON sent_messages(template_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sent_messages_reservation_id ON sent_messages(reservation_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sent_messages_phone ON sent_messages(guest_phone)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sent_messages_status ON sent_messages(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sent_messages_created_at ON sent_messages(created_at)`;

    console.log('✅ Índices creados exitosamente');

    // Crear triggers para updated_at
    try {
      await sql`
        CREATE TRIGGER update_message_templates_updated_at 
          BEFORE UPDATE ON message_templates 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `;
    } catch (error) {
      console.log('⚠️  Trigger para message_templates ya existe');
    }

    try {
      await sql`
        CREATE TRIGGER update_whatsapp_config_updated_at 
          BEFORE UPDATE ON whatsapp_config 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `;
    } catch (error) {
      console.log('⚠️  Trigger para whatsapp_config ya existe');
    }

    console.log('✅ Triggers configurados');

    // Insertar configuración inicial de WhatsApp
    const configResult = await sql`
      INSERT INTO whatsapp_config (phone_number, access_token, webhook_verify_token, is_active) 
      VALUES (NULL, NULL, NULL, false)
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;

    console.log('✅ Configuración inicial de WhatsApp creada');

    // Verificar si ya existen plantillas
    const existingTemplates = await sql`
      SELECT COUNT(*) as count FROM message_templates
    `;

    if (existingTemplates.rows[0].count === '0') {
      // Insertar plantillas predefinidas
      await sql`
        INSERT INTO message_templates (name, trigger_type, channel, language, template_content, variables, is_active) VALUES
        (
          'Reserva Confirmada',
          'reservation_confirmed',
          'whatsapp',
          'es',
          '🎉 ¡Hola {{guest_name}}! Tu reserva ha sido confirmada.

📅 **Detalles de tu reserva:**
🏠 Habitación: {{room_name}}
📅 Check-in: {{check_in_date}}
📅 Check-out: {{check_out_date}}
👥 Huéspedes: {{guest_count}}

✅ En breve recibirás las instrucciones para el check-in digital.

¡Nos vemos pronto!
🐬 Equipo Delfín Check-in',
          '["guest_name", "room_name", "check_in_date", "check_out_date", "guest_count"]'::jsonb,
          true
        ),
        (
          'Instrucciones Check-in',
          'check_in_instructions',
          'whatsapp',
          'es',
          '🏠 ¡Hola {{guest_name}}! Ya puedes hacer el check-in.

🔑 **Código de acceso:** {{door_code}}

📍 **Dirección:** {{property_address}}

⏰ **Horario de check-in:** A partir de las 15:00h

📋 **Instrucciones:**
1. Usa el código {{door_code}} en la cerradura electrónica
2. Tu habitación es la {{room_name}}
3. Completa el registro digital: {{checkin_link}}

📶 **WiFi:**
Red: {{wifi_network}}
Contraseña: {{wifi_password}}

❓ ¿Dudas? Escríbenos por WhatsApp.

🐬 ¡Bienvenido!',
          '["guest_name", "door_code", "property_address", "room_name", "checkin_link", "wifi_network", "wifi_password"]'::jsonb,
          true
        ),
        (
          'Instrucciones Check-out',
          'check_out_instructions',
          'whatsapp',
          'es',
          '👋 ¡Hola {{guest_name}}! Esperamos que hayas disfrutado tu estancia.

🕐 **Check-out:** Antes de las 11:00h

📋 **Antes de irte:**
✅ Deja las llaves en la mesa
✅ Cierra bien puertas y ventanas
✅ Apaga luces y aires acondicionados
✅ Deja la habitación ordenada

🧹 No es necesario limpiar, pero agradecemos dejar todo recogido.

⭐ **¡Nos ayudarías mucho con una reseña!**
{{review_link}}

🙏 ¡Gracias por elegirnos!
🐬 Equipo Delfín Check-in

💬 ¿Todo bien? ¡Escríbenos si necesitas algo!',
          '["guest_name", "review_link"]'::jsonb,
          true
        )
      `;

      console.log('✅ Plantillas predefinidas creadas');
    } else {
      console.log('⚠️  Las plantillas ya existen, saltando inserción');
    }

    // Verificar que todo está funcionando
    const templatesCount = await sql`SELECT COUNT(*) as count FROM message_templates`;
    const configCount = await sql`SELECT COUNT(*) as count FROM whatsapp_config`;

    console.log('🔍 Verificación final:');
    console.log(`- Plantillas de mensajes: ${templatesCount.rows[0].count}`);
    console.log(`- Configuraciones de WhatsApp: ${configCount.rows[0].count}`);

    return NextResponse.json({
      success: true,
      message: '✅ Base de datos de WhatsApp configurada exitosamente',
      data: {
        templates_count: templatesCount.rows[0].count,
        config_count: configCount.rows[0].count
      }
    });

  } catch (error) {
    console.error('❌ Error configurando base de datos de WhatsApp:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error configurando base de datos de WhatsApp',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}