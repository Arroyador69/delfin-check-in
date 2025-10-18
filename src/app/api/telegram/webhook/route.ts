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
        r.guest_count,
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
  
  let context = `Todas las reservas del hostal:\n`;
  
  if (reservations.length > 0) {
    const mapped = reservations.map((res: any) => ({
      ...res,
      checkInIso: parseToISOInMadrid(res.check_in),
      checkOutIso: parseToISOInMadrid(res.check_out),
    }));
    
    // Ordenar por fecha de entrada
    const sortedReservations = mapped.sort((a, b) => a.checkInIso.localeCompare(b.checkInIso));
    
    // Mostrar todas las reservas (máximo 50 para no saturar)
    sortedReservations.slice(0, 50).forEach((res, i) => {
      const numPersons = res.guest_count || 1;
      context += `${res.guest_name} - Entrada: ${res.checkInIso} - Salida: ${res.checkOutIso} - Habitación: ${res.room_id || 'N/A'} - ${numPersons} persona(s)\n`;
    });
    
    if (sortedReservations.length > 50) {
      context += `\n... y ${sortedReservations.length - 50} reservas más`;
    }
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
        guest_count: ejemploReserva.guest_count,
        guest_count_type: typeof ejemploReserva.guest_count,
        guest_count_null: ejemploReserva.guest_count === null,
        guest_count_undefined: ejemploReserva.guest_count === undefined,
        guest_email: ejemploReserva.guest_email,
        check_in: ejemploReserva.check_in,
        check_out: ejemploReserva.check_out
      });
      
      // DEBUG: Mostrar todas las columnas disponibles
      console.log(`📊 COLUMNAS DISPONIBLES:`, Object.keys(ejemploReserva));
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
    
    // TEST: Verificar si guest_count existe en la base de datos
    try {
      const testResult = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'reservations' 
        AND column_name = 'guest_count'
      `;
      console.log(`🔍 TEST guest_count column:`, testResult.rows);
    } catch (error) {
      console.log(`❌ ERROR verificando guest_count:`, error);
    }
    
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
          content: `Eres el asistente del hostal ${tenant.name}. Responde de forma natural y humana.

REGLAS CRÍTICAS:
- SIEMPRE incluye las fechas de entrada y salida en cada respuesta
- Usa EXACTAMENTE el número de personas del contexto
- Hoy es 18 de octubre de 2025 a las 22:22

ANÁLISIS DE FECHAS ESPECÍFICAS:
Cuando pregunten por una fecha específica (ej: "¿Qué reservas hay el martes 21?"), categoriza así:

🏠 ESTÁN ALOJADOS: Reservas donde fecha_entrada < fecha_pregunta < fecha_salida
⬅️ SALEN ESE DÍA: Reservas donde fecha_salida = fecha_pregunta  
➡️ ENTRAN ESE DÍA: Reservas donde fecha_entrada = fecha_pregunta

FORMATO PARA ANÁLISIS DE FECHA:
"Para el [fecha] tengo lo siguiente 👇

🏠 Están alojados:
• Nombre | Hab. X | X pers. | entra DD/MM | sale DD/MM

⬅️ Salen ese día:
• Nombre | Hab. X | X pers. | entra DD/MM | sale DD/MM

➡️ Entran ese día:
• Nombre | Hab. X | X pers. | entra DD/MM | sale DD/MM"

EJEMPLOS SIMPLES:
- "¿Quién llega hoy?" → "Hoy (18/10/2025) llega Nacho Madrigal (Habitación 2) - 2 personas - Entrada: 18/10/2025 - Salida: 19/10/2025"`,
        },
            {
              role: 'user',
              content: `Hoy es ${toISODateInMadrid(new Date())} (zona horaria: Europe/Madrid). 

⚠️ INSTRUCCIONES CRÍTICAS:
1. SIEMPRE incluye fechas de entrada y salida en cada respuesta
2. Usa EXACTAMENTE el número de personas del contexto
3. Para preguntas de fecha específica, categoriza en: 🏠 Están alojados, ⬅️ Salen ese día, ➡️ Entran ese día
4. Formato: "Nombre | Hab. X | X pers. | entra DD/MM | sale DD/MM"

Pregunta del usuario: ${userText}

Contexto:
${context}`,
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

