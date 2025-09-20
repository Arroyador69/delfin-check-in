import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Creando tabla guest_registrations...');
    
    // Crear la tabla si no existe
    await sql`
      CREATE TABLE IF NOT EXISTS guest_registrations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        reserva_ref VARCHAR(50),
        fecha_entrada DATE NOT NULL,
        fecha_salida DATE NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    // Crear índices
    await sql`
      CREATE INDEX IF NOT EXISTS idx_guest_registrations_fecha_entrada 
      ON guest_registrations(fecha_entrada);
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_guest_registrations_fecha_salida 
      ON guest_registrations(fecha_salida);
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_guest_registrations_created_at 
      ON guest_registrations(created_at);
    `;
    
    // Crear función para actualizar updated_at
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `;
    
    // Crear trigger
    try {
      await sql`
        CREATE TRIGGER update_guest_registrations_updated_at 
        BEFORE UPDATE ON guest_registrations 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `;
    } catch (e) {
      console.log('⚠️  Trigger para guest_registrations ya existe');
    }
    
    console.log('✅ Tabla guest_registrations creada correctamente');
    
    // Ahora configurar también las tablas de WhatsApp
    console.log('🔄 Configurando tablas de WhatsApp...');
    
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

    // Crear índices para WhatsApp
    await sql`CREATE INDEX IF NOT EXISTS idx_message_templates_trigger_type ON message_templates(trigger_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_message_templates_channel ON message_templates(channel)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_message_templates_active ON message_templates(is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sent_messages_template_id ON sent_messages(template_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sent_messages_reservation_id ON sent_messages(reservation_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sent_messages_phone ON sent_messages(guest_phone)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sent_messages_status ON sent_messages(status)`;

    // Crear triggers para WhatsApp
    try {
      await sql`
        CREATE TRIGGER update_message_templates_updated_at 
          BEFORE UPDATE ON message_templates 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `;
    } catch (e) {
      console.log('⚠️  Trigger para message_templates ya existe');
    }

    try {
      await sql`
        CREATE TRIGGER update_whatsapp_config_updated_at 
          BEFORE UPDATE ON whatsapp_config 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `;
    } catch (e) {
      console.log('⚠️  Trigger para whatsapp_config ya existe');
    }

    // Insertar configuración inicial de WhatsApp
    await sql`
      INSERT INTO whatsapp_config (phone_number, access_token, webhook_verify_token, is_active) 
      VALUES (NULL, NULL, NULL, false)
      ON CONFLICT (id) DO NOTHING
    `;

    // Verificar si ya existen plantillas
    const existingTemplates = await sql`SELECT COUNT(*) as count FROM message_templates`;

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
      console.log('✅ Plantillas predefinidas de WhatsApp creadas');
    } else {
      console.log('⚠️  Las plantillas de WhatsApp ya existen');
    }

    const templatesCount = await sql`SELECT COUNT(*) as count FROM message_templates`;
    const configCount = await sql`SELECT COUNT(*) as count FROM whatsapp_config`;
    
    console.log('✅ Configuración de WhatsApp completada');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Base de datos configurada correctamente (guest_registrations + WhatsApp)',
      whatsapp: {
        templates_count: templatesCount.rows[0].count,
        config_count: configCount.rows[0].count
      }
    });
    
  } catch (error) {
    console.error('❌ Error creando tabla:', error);
    return NextResponse.json({ 
      error: 'Error creando tabla',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
