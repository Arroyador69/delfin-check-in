const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🐬 Configurando mensajes automáticos personalizados...');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Plantillas personalizadas basadas en el mensaje del usuario
const messageTemplates = [
  {
    trigger: 'checkin_instructions',
    channel: 'telegram',
    template: `La dirección de la calle es Ceuta número 5, en Fuengirola. Te recuerdo que has alquilado una habitación dentro de una casa donde se comparten dos baños completos y una cocina.

La primera puerta de la casa (pequeña) siempre está abierta sólo tendrás que empujar de ella. Después verás otra puerta y a la derecha encontrarás las cajas de las llaves. Tu habitación es la numero {{room_number}}. El código para abrirla es "{{room_code}}". La llave que abrirá la puerta de la casa es la rectangular (la puerta no se hecha con la llave solo se empuja de ella al salir) (la llave solo puede meterse y sacarse teniéndola de manera Horizontal). La otra llave es la de la habitación.

Tu habitación es la numero {{room_number}} y está subiendo las escaleras a la izquierda. A la izquierda al entrar a la casa esta la cocina y el otro baño completo al lado izquierdo. Y arriba subiendo las escaleras está el otro baño completo de arriba. En la cocina verás la nevera donde está marcado en cada tabla tu habitación para que puedas poner lo que desees.

El wifi es "Casa_Alberto" y su contraseña es "Fuengirola_2022" para cualquier cosa me escribes.`,
    language: 'es',
    is_active: true
  },
  {
    trigger: 'checkin_instructions',
    channel: 'telegram',
    template: `The street address is Ceuta number 5, in Fuengirola. I remind you that you have rented a room within a house where two complete bathrooms and a kitchen are shared.

The first door of the house (small) is always open, you just have to push it. Then you will see another door and on the right you will find the key boxes. Your room is number {{room_number}}. The code to open it is "{{room_code}}". The key that will open the house door is the rectangular one (the door is not locked with the key, you just push it when leaving) (the key can only be inserted and removed by holding it horizontally). The other key is for the room.

Your room is number {{room_number}} and it's up the stairs to the left. To the left when entering the house is the kitchen and the other complete bathroom on the left side. And upstairs going up the stairs is the other complete bathroom upstairs. In the kitchen you will see the refrigerator where your room is marked on each shelf so you can put whatever you want.

The wifi is "Casa_Alberto" and its password is "Fuengirola_2022" for anything write to me.`,
    language: 'en',
    is_active: true
  },
  {
    trigger: 'reservation_confirmed',
    channel: 'telegram',
    template: `¡Hola {{guest_name}}! 

¡Gracias por reservar con nosotros!

Detalles de tu reserva:
- Habitación: {{room_number}}
- Check-in: {{check_in_date}}
- Check-out: {{check_out_date}}

En breve recibirás las instrucciones detalladas para tu llegada.

¡Nos vemos pronto!

Saludos,
El equipo de Delfín Check-in 🐬`,
    language: 'es',
    is_active: true
  },
  {
    trigger: 't_minus_24_hours',
    channel: 'telegram',
    template: `¡Hola {{guest_name}}!

¡Mañana es tu llegada!

Código de la puerta: {{room_code}}

Normas importantes:
- Respetar el descanso de otros huéspedes
- Mantener limpieza en áreas comunes
- No fumar dentro de la casa

WiFi: Casa_Alberto
Contraseña: Fuengirola_2022

¡Bienvenido!

Saludos,
El equipo de Delfín Check-in 🐬`,
    language: 'es',
    is_active: true
  }
];

async function setupMessages() {
  try {
    console.log('📝 Insertando plantillas de mensajes...');
    
    // Primero, eliminar mensajes existentes para evitar duplicados
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .in('trigger', ['checkin_instructions', 'reservation_confirmed', 't_minus_24_hours']);
    
    if (deleteError) {
      console.log('⚠️ No se pudieron eliminar mensajes existentes:', deleteError.message);
    }
    
    // Insertar las nuevas plantillas
    const { data, error } = await supabase
      .from('messages')
      .insert(messageTemplates);
    
    if (error) {
      console.error('❌ Error al insertar mensajes:', error.message);
      return;
    }
    
    console.log('✅ Plantillas de mensajes configuradas correctamente');
    console.log(`📊 Se insertaron ${data?.length || 0} plantillas`);
    
    // Mostrar las plantillas insertadas
    console.log('\n📋 Plantillas configuradas:');
    messageTemplates.forEach((template, index) => {
      console.log(`${index + 1}. ${template.trigger} (${template.language}) - ${template.channel}`);
    });
    
    console.log('\n🎉 ¡Configuración completada!');
    console.log('💡 Ahora puedes:');
    console.log('   1. Ir a http://localhost:3000/messages');
    console.log('   2. Ver y editar las plantillas');
    console.log('   3. Personalizar según tus necesidades');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

setupMessages();
