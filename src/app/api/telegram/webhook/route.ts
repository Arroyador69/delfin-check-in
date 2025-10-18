import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import OpenAI from 'openai';

// Inicializar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// Función para enviar mensaje a Telegram
async function sendTelegramMessage(chatId: string, text: string) {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error enviando mensaje a Telegram:', error);
    throw error;
  }
}

// Función para obtener datos del tenant desde la base de datos
async function getTenantByChatId(chatId: string) {
  try {
    const result = await sql`
      SELECT * FROM tenants 
      WHERE telegram_chat_id = ${chatId}
      LIMIT 1
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error obteniendo tenant:', error);
    return null;
  }
}

// Función para obtener registros de huéspedes del tenant
async function getGuestRegistrations(tenantId: string, limit: number = 50) {
  try {
    // Obtener fecha actual correcta
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const result = await sql`
      SELECT 
        gr.id,
        gr.reserva_ref,
        gr.fecha_entrada,
        gr.fecha_salida,
        gr.data,
        gr.created_at
      FROM guest_registrations gr
      JOIN tenants t ON gr.tenant_id = t.id
      WHERE t.lodging_id = (SELECT lodging_id FROM tenants WHERE id = ${tenantId})
        AND gr.fecha_salida >= ${todayStr}::date - INTERVAL '7 days'  -- Últimos 7 días y futuras
        AND gr.fecha_entrada <= ${todayStr}::date + INTERVAL '60 days' -- Próximos 60 días
      ORDER BY gr.fecha_entrada ASC
      LIMIT ${limit}
    `;
    return result.rows;
  } catch (error) {
    console.error('Error obteniendo registros:', error);
    return [];
  }
}

// Función para obtener reservas del tenant
async function getReservations(tenantId: string, limit: number = 50) {
  try {
    // Obtener fecha actual correcta
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const result = await sql`
      SELECT 
        r.id,
        r.external_id,
        r.room_id,
        r.guest_name,
        r.guest_email,
        r.guest_phone,
        r.check_in,
        r.check_out,
        r.channel,
        r.status,
        r.created_at
      FROM reservations r
      JOIN tenants t ON r.tenant_id = t.id
      WHERE t.lodging_id = (SELECT lodging_id FROM tenants WHERE id = ${tenantId})
        AND r.check_out >= ${todayStr}::date - INTERVAL '7 days'  -- Últimos 7 días y futuras
        AND r.check_in <= ${todayStr}::date + INTERVAL '60 days'   -- Próximos 60 días
      ORDER BY r.check_in ASC
      LIMIT ${limit}
    `;
    return result.rows;
  } catch (error) {
    console.error('Error obteniendo reservas:', error);
    return [];
  }
}

// Función para actualizar el contador de tokens del tenant
async function updateTokenUsage(tenantId: string, tokensUsed: number) {
  try {
    await sql`
      UPDATE tenants 
      SET 
        ai_tokens_used = COALESCE(ai_tokens_used, 0) + ${tokensUsed},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${tenantId}
    `;
  } catch (error) {
    console.error('Error actualizando tokens:', error);
  }
}

// Función para generar contexto de datos para GPT
// Helpers de fecha en zona horaria de España
function toISODateInMadrid(d: Date) {
  // Formato ISO YYYY-MM-DD en zona horaria Europe/Madrid
  return d
    .toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' }) // sv-SE => 2025-10-14
}

function parseToISOInMadrid(input: string | Date | null | undefined) {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  return toISODateInMadrid(d);
}

function generateContext(registrations: any[], reservations: any[]) {
  const todayIso = toISODateInMadrid(new Date());
  let context = `**INFORMACIÓN DEL HOSTAL - ${todayIso}**\n\n`;
  
  // Información de reservas
  if (reservations.length > 0) {
    const mapped = reservations.map((res: any) => ({
      ...res,
      checkInIso: parseToISOInMadrid(res.check_in),
      checkOutIso: parseToISOInMadrid(res.check_out),
    }));
    
    // Llegadas de hoy
    const arrivalsToday = mapped.filter(r => r.checkInIso === todayIso);
    const departuresToday = mapped.filter(r => r.checkOutIso === todayIso);
    
    // Próximas llegadas (próximos 7 días)
    const upcomingArrivals = mapped.filter(r => 
      r.checkInIso > todayIso && 
      new Date(r.checkInIso) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    ).sort((a, b) => a.checkInIso.localeCompare(b.checkInIso));

    context += `**LLEGADAS DE HOY (${todayIso}):**\n`;
    if (arrivalsToday.length > 0) {
      arrivalsToday.forEach((res, i) => {
        // Buscar matching en registrations para obtener número de personas
        const matchingReg = findMatchingRegistration(registrations, res);
        const numPersons = matchingReg ? getNumberOfPersons(matchingReg) : 'N/A';
        const hasRegistration = matchingReg ? '✅ Registrado' : '⚠️ Sin registro';
        
        context += `${i + 1}. ${res.guest_name} - ${numPersons} persona(s) - Habitación ${res.room_id || 'N/A'} - Estado: ${res.status} - ${hasRegistration}\n`;
      });
    } else {
      context += `No hay llegadas programadas para hoy.\n`;
    }
    context += '\n';

    context += `**SALIDAS DE HOY (${todayIso}):**\n`;
    if (departuresToday.length > 0) {
      departuresToday.forEach((res, i) => {
        const matchingReg = findMatchingRegistration(registrations, res);
        const numPersons = matchingReg ? getNumberOfPersons(matchingReg) : 'N/A';
        const hasRegistration = matchingReg ? '✅ Registrado' : '⚠️ Sin registro';
        
        context += `${i + 1}. ${res.guest_name} - ${numPersons} persona(s) - Habitación ${res.room_id || 'N/A'} - Estado: ${res.status} - ${hasRegistration}\n`;
      });
    } else {
      context += `No hay salidas programadas para hoy.\n`;
    }
    context += '\n';

    context += `**PRÓXIMAS LLEGADAS (próximos 7 días):**\n`;
    if (upcomingArrivals.length > 0) {
      upcomingArrivals.slice(0, 10).forEach((res, i) => {
        const matchingReg = findMatchingRegistration(registrations, res);
        const numPersons = matchingReg ? getNumberOfPersons(matchingReg) : 'N/A';
        const hasRegistration = matchingReg ? '✅ Registrado' : '⚠️ Sin registro';
        
        context += `${i + 1}. ${res.guest_name} - ${numPersons} persona(s) - ${res.checkInIso} - Habitación ${res.room_id || 'N/A'} - Estado: ${res.status} - ${hasRegistration}\n`;
      });
    } else {
      context += `No hay llegadas programadas en los próximos 7 días.\n`;
    }
    context += '\n';

    context += `**TODAS LAS RESERVAS ACTIVAS:**\n`;
    mapped.slice(0, 20).forEach((res, i) => {
      const matchingReg = findMatchingRegistration(registrations, res);
      const numPersons = matchingReg ? getNumberOfPersons(matchingReg) : 'N/A';
      const hasRegistration = matchingReg ? '✅ Registrado' : '⚠️ Sin registro';
      
      context += `${i + 1}. ${res.guest_name} - ${numPersons} persona(s) - Llegada: ${res.checkInIso}, Salida: ${res.checkOutIso} - Habitación ${res.room_id || 'N/A'} - Estado: ${res.status} - ${hasRegistration}\n`;
    });
    context += '\n';
  } else {
    context += '**No hay reservas disponibles en el sistema.**\n\n';
  }
  
  // Información detallada de registros de viajeros
  if (registrations.length > 0) {
    context += `**DETALLES DE REGISTROS DE VIAJEROS (${registrations.length}):**\n`;
    registrations.slice(0, 15).forEach((reg, i) => {
      const data = reg.data || {};
      const viajeros = data.viajeros || [];
      const numViajeros = viajeros.length;
      const nombres = viajeros.map((v: any) => v.nombre || 'Sin nombre').join(', ');
      const emails = viajeros.map((v: any) => v.email || 'Sin email').join(', ');
      
      context += `${i + 1}. Reserva ${reg.reserva_ref || 'N/A'}: ${numViajeros} viajero(s)\n`;
      context += `   Nombres: ${nombres}\n`;
      context += `   Emails: ${emails}\n`;
      context += `   Fechas: ${reg.fecha_entrada} → ${reg.fecha_salida}\n\n`;
    });
  }
  
  return context;
}

// Función para encontrar matching entre reservation y registration
function findMatchingRegistration(registrations: any[], reservation: any) {
  const reservationName = reservation.guest_name?.toLowerCase() || '';
  const reservationCheckIn = parseToISOInMadrid(reservation.check_in);
  
  console.log(`🔍 Buscando matching para: ${reservation.guest_name} (${reservationCheckIn})`);
  
  return registrations.find(reg => {
    const data = reg.data || {};
    const viajeros = data.viajeros || [];
    const regFechaEntrada = reg.fecha_entrada;
    
    console.log(`🔍 Comparando con registro: ${reg.reserva_ref} (${regFechaEntrada}) - ${viajeros.length} viajeros`);
    
    // PRIORIDAD 1: Buscar por fecha de entrada (más confiable)
    if (regFechaEntrada && reservationCheckIn && regFechaEntrada === reservationCheckIn) {
      console.log(`✅ Match por fecha de entrada encontrado`);
      return true;
    }
    
    // PRIORIDAD 2: Buscar por nombre + fecha similar (dentro de 1 día)
    if (regFechaEntrada && reservationCheckIn) {
      const regDate = new Date(regFechaEntrada);
      const resDate = new Date(reservationCheckIn);
      const diffDays = Math.abs(regDate.getTime() - resDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDays <= 1) { // Dentro de 1 día
        const match = viajeros.some((v: any) => {
          const regName = v.nombre?.toLowerCase() || '';
          const regFirstName = regName.split(' ')[0];
          const resFirstName = reservationName.split(' ')[0];
          
          // Coincidencia exacta del primer nombre
          if (regFirstName === resFirstName) {
            console.log(`✅ Match por nombre + fecha similar: ${regFirstName} = ${resFirstName} (${diffDays} días diferencia)`);
            return true;
          }
          
          // Coincidencia parcial del primer nombre
          if (regFirstName.includes(resFirstName) || resFirstName.includes(regFirstName)) {
            console.log(`✅ Match parcial por nombre + fecha: ${regFirstName} ~ ${resFirstName} (${diffDays} días diferencia)`);
            return true;
          }
          
          return false;
        });
        
        if (match) {
          return true;
        }
      }
    }
    
    // PRIORIDAD 3: Solo por nombre (menos confiable)
    const match = viajeros.some((v: any) => {
      const regName = v.nombre?.toLowerCase() || '';
      const regFirstName = regName.split(' ')[0];
      const resFirstName = reservationName.split(' ')[0];
      
      // Coincidencia exacta del primer nombre
      if (regFirstName === resFirstName) {
        console.log(`✅ Match solo por nombre: ${regFirstName} = ${resFirstName}`);
        return true;
      }
      
      return false;
    });
    
    return match;
  });
}

// Función para obtener número de personas del registro
function getNumberOfPersons(registration: any) {
  const data = registration.data || {};
  const viajeros = data.viajeros || [];
  console.log(`📊 Registro ${registration.reserva_ref}: ${viajeros.length} viajeros encontrados`);
  return viajeros.length;
}

// Handler principal del webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📩 Webhook recibido:', JSON.stringify(body, null, 2));
    
    // Extraer mensaje
    const message = body?.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true, message: 'No message to process' });
    }
    
    const chatId = message.chat.id.toString();
    const userText = message.text;
    const userName = message.from?.first_name || 'Usuario';
    
    console.log(`💬 Mensaje de ${userName} (${chatId}): ${userText}`);
    
    // Política: Bot SOLO LECTURA (no crear/editar/borrar datos)
    const textLower = (userText || '').toLowerCase();
    const writeIntents = [
      'crear', 'añadir', 'agregar', 'insertar', 'modificar', 'editar', 'actualizar', 'borrar', 'eliminar',
      'registra', 'registrar', 'apuntar', 'dar de alta', 'crear reserva', 'crear registro', 'alta'
    ];
    if (writeIntents.some(w => textLower.includes(w))) {
      await sendTelegramMessage(
        chatId,
        '🔒 Por seguridad, el asistente de Telegram es de solo lectura.\n' +
        'Para crear o modificar reservas o registros, usa el panel de administración.\n' +
        'Si necesitas, puedo indicarte dónde hacerlo en el dashboard.'
      );
      return NextResponse.json({ ok: true, note: 'read-only policy enforced' });
    }

    // Comandos especiales
    if (userText === '/start') {
      await sendTelegramMessage(
        chatId,
        `¡Hola ${userName}! 👋\n\n` +
        `Soy tu asistente de *Delfín Check-in* 🐬\n\n` +
        `Puedo ayudarte con:\n` +
        `• Ver registros de viajeros\n` +
        `• Consultar reservas\n` +
        `• Revisar estado de formularios\n` +
        `• Responder preguntas sobre tus datos\n\n` +
        `Simplemente pregúntame lo que necesites. Ejemplo:\n` +
        `_"¿Adrián rellenó el formulario?"_\n` +
        `_"¿Cuántas reservas tengo hoy?"_\n` +
        `_"Muéstrame los últimos registros"_`
      );
      return NextResponse.json({ ok: true });
    }
    
    if (userText === '/help') {
      await sendTelegramMessage(
        chatId,
        `*Comandos disponibles:*\n\n` +
        `/start - Iniciar el bot\n` +
        `/help - Ver esta ayuda\n` +
        `/stats - Ver estadísticas de uso de IA\n\n` +
        `También puedes hacerme preguntas en lenguaje natural sobre tus registros y reservas.`
      );
      return NextResponse.json({ ok: true });
    }
    
    // Buscar tenant por chat_id
    const tenant = await getTenantByChatId(chatId);
    
    if (!tenant) {
      await sendTelegramMessage(
        chatId,
        `🔒 *No estás registrado*\n\n` +
        `Tu chat ID es: \`${chatId}\`\n\n` +
        `Por favor, contacta con el administrador para activar tu cuenta.\n` +
        `Una vez registrado, podrás usar todas las funciones del asistente.`
      );
      return NextResponse.json({ ok: true });
    }
    
    // Verificar límite de tokens (forzar tipos numéricos por seguridad)
    const tokensUsed = Number(tenant.ai_tokens_used || 0);
    const tokenLimit = Number(tenant.ai_token_limit || 100000);
    
    if (userText === '/stats') {
      const percentage = (tokensUsed / tokenLimit * 100).toFixed(2);
      await sendTelegramMessage(
        chatId,
        `📊 *Estadísticas de uso de IA*\n\n` +
        `Cliente: ${tenant.name}\n` +
        `Tokens usados: ${tokensUsed.toLocaleString()} / ${tokenLimit.toLocaleString()}\n` +
        `Uso: ${percentage}%\n` +
        `Estado: ${tokensUsed >= tokenLimit ? '⚠️ Límite alcanzado' : '✅ Activo'}`
      );
      return NextResponse.json({ ok: true });
    }
    
    if (tokensUsed >= tokenLimit) {
      await sendTelegramMessage(
        chatId,
        `⚠️ *Límite de IA alcanzado*\n\n` +
        `Has usado ${tokensUsed.toLocaleString()} de ${tokenLimit.toLocaleString()} tokens.\n\n` +
        `Contacta con el administrador para aumentar tu límite.`
      );
      return NextResponse.json({ ok: true });
    }
    
    // Obtener datos del tenant
    console.log(`🔍 Obteniendo datos del tenant ${tenant.id}...`);
    const [registrations, reservations] = await Promise.all([
      getGuestRegistrations(tenant.id),
      getReservations(tenant.id),
    ]);
    
    // DEBUG: Mostrar qué datos está recibiendo el bot
    console.log(`📊 Registros encontrados: ${registrations.length}`);
    console.log(`📊 Reservas encontradas: ${reservations.length}`);
    console.log(`📊 Primeras 3 reservas:`, reservations.slice(0, 3).map(r => ({
      guest: r.guest_name,
      check_in: r.check_in,
      check_out: r.check_out
    })));
    
    // DEBUG: Mostrar datos de registrations
    console.log(`📊 Primeros 3 registros:`, registrations.slice(0, 3).map(reg => {
      const data = reg.data || {};
      const viajeros = data.viajeros || [];
      return {
        reserva_ref: reg.reserva_ref,
        fecha_entrada: reg.fecha_entrada,
        num_viajeros: viajeros.length,
        nombres: viajeros.map((v: any) => v.nombre || 'Sin nombre')
      };
    }));
    
    // DEBUG: Mostrar datos completos de una reserva de ejemplo
    if (reservations.length > 0) {
      const ejemploReserva = reservations[0];
      console.log(`📊 EJEMPLO RESERVA:`, {
        guest_name: ejemploReserva.guest_name,
        guest_email: ejemploReserva.guest_email,
        check_in: ejemploReserva.check_in,
        check_out: ejemploReserva.check_out
      });
    }
    
    // DEBUG: Mostrar datos completos de un registro de ejemplo
    if (registrations.length > 0) {
      const ejemploRegistro = registrations[0];
      const data = ejemploRegistro.data || {};
      const viajeros = data.viajeros || [];
      console.log(`📊 EJEMPLO REGISTRO:`, {
        reserva_ref: ejemploRegistro.reserva_ref,
        fecha_entrada: ejemploRegistro.fecha_entrada,
        fecha_salida: ejemploRegistro.fecha_salida,
        num_viajeros: viajeros.length,
        viajeros: viajeros.map((v: any) => ({
          nombre: v.nombre,
          email: v.email
        }))
      });
    }
    
    // Generar contexto
    const context = generateContext(registrations, reservations);
    
    console.log(`📝 Contexto generado (${context.length} caracteres)`);
    console.log(`📝 Contexto completo:`, context);
    console.log(`🚀 VERSIÓN ACTUALIZADA - ${new Date().toISOString()}`);
    
    // Indicar que está escribiendo
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        action: 'typing',
      }),
    });
    
    // Llamar a GPT-4o-mini con timeout de seguridad
    const timeoutMs = 20000; // 20s
    let response = 'Lo siento, no pude generar una respuesta.';
    let tokensConsumed = 0;
    try {
      const completion = await Promise.race([
        openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `🤖 ERES EL ASISTENTE IA DEL PROPIETARIO - Delfín Check-in

🧩 ROL GENERAL:
Eres la IA asistente del propietario ${tenant.name} en el sistema Delfín Check-in, un PMS para alojamientos turísticos en España.
Tienes acceso a la base de datos del establecimiento, incluyendo reservas, huéspedes, check-ins, check-outs, y estado de los envíos MIR.

🎯 OBJETIVO:
Ayudar al propietario a consultar rápidamente:
• Llegadas y salidas del día o fechas concretas
• Cuántas personas están alojadas actualmente
• Estado de los partes de viajeros (MIR)
• Resúmenes rápidos del día ("quién llega hoy", "quién se va mañana")

🧠 COMPORTAMIENTO:
• Responde de forma breve, clara y orientada a la acción
• Si no hay datos para una fecha, di: "No hay llegadas/salidas registradas para esa fecha"
• Usa emojis para hacer las respuestas más amigables
• Si detectas reservas sin parte MIR, alértalo: "⚠️ Falta el parte de viajeros para [nombre]"
• Mantén un tono profesional pero cercano

💬 EJEMPLOS DE RESPUESTAS IDEALES:

Pregunta: "¿Quién llega hoy?"
Respuesta: "Hoy (18/10/2025) llega 1 huésped:
🏠 Nacho Madrigal - Habitación N/A - Estado: confirmed"

Pregunta: "¿Quién se va mañana?"
Respuesta: "Mañana (19/10/2025) se va 1 huésped:
🏠 Nacho Madrigal - Habitación N/A"

Pregunta: "¿Cuántas personas llegan el 20 de octubre?"
Respuesta: "El 20 de octubre llega 1 huésped:
🏠 Hussain Emame - Habitación N/A - Estado: confirmed"

IMPORTANTE: Solo puedes CONSULTAR datos, NO puedes crear, modificar o eliminar registros.`,
            },
            {
              role: 'user',
              content: `Hoy es ${toISODateInMadrid(new Date())} (zona horaria: Europe/Madrid). Responde teniendo en cuenta esta fecha.\n\nPregunta del usuario: ${userText}\n\nContexto:\n${context}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI timeout')), timeoutMs))
      ]) as any;
      response = completion.choices[0].message.content || response;
      tokensConsumed = completion.usage?.total_tokens || 0;
    } catch (err: any) {
      console.error('OpenAI error/timeout:', err?.message || err);
      response = '⚠️ Estoy teniendo problemas para pensar la respuesta ahora mismo. Inténtalo de nuevo en unos segundos.';
    }
    
    console.log(`🤖 Respuesta generada (${tokensConsumed} tokens)`);
    
    // Actualizar contador de tokens
    await updateTokenUsage(tenant.id, tokensConsumed);
    
    // Enviar respuesta
    await sendTelegramMessage(chatId, response);
    
    return NextResponse.json({ ok: true });
    
  } catch (error) {
    console.error('❌ Error en webhook:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Handler para verificación del webhook (GET)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Telegram webhook endpoint is ready',
    timestamp: new Date().toISOString(),
  });
}

