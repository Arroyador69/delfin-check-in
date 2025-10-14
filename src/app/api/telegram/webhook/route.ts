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
    const result = await sql`
      SELECT 
        id,
        reserva_ref,
        fecha_entrada,
        fecha_salida,
        data,
        created_at
      FROM guest_registrations
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
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
    const result = await sql`
      SELECT 
        id,
        external_id,
        room_id,
        guest_name,
        guest_email,
        guest_phone,
        check_in,
        check_out,
        channel,
        status,
        created_at
      FROM reservations
      WHERE tenant_id = ${tenantId}
      ORDER BY check_in DESC
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
function generateContext(registrations: any[], reservations: any[]) {
  let context = '**DATOS DEL SISTEMA:**\n\n';
  
  // Información de registros de viajeros
  if (registrations.length > 0) {
    context += `**Registros de Viajeros Recientes (${registrations.length}):**\n`;
    registrations.slice(0, 10).forEach((reg, i) => {
      const data = reg.data || {};
      const viajeros = data.viajeros || [];
      const nombres = viajeros.map((v: any) => v.nombre || 'Sin nombre').join(', ');
      context += `${i + 1}. Reserva ${reg.reserva_ref || 'N/A'}: ${nombres} (Entrada: ${reg.fecha_entrada}, Salida: ${reg.fecha_salida})\n`;
    });
    context += '\n';
  } else {
    context += '**Registros de Viajeros:** No hay registros recientes.\n\n';
  }
  
  // Información de reservas
  if (reservations.length > 0) {
    context += `**Reservas Recientes (${reservations.length}):**\n`;
    reservations.slice(0, 10).forEach((res, i) => {
      context += `${i + 1}. ${res.guest_name} - Habitación ${res.room_id} (${res.check_in} → ${res.check_out}) - Estado: ${res.status}\n`;
    });
    context += '\n';
  } else {
    context += '**Reservas:** No hay reservas recientes.\n\n';
  }
  
  return context;
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
    
    // Generar contexto
    const context = generateContext(registrations, reservations);
    
    console.log(`📝 Contexto generado (${context.length} caracteres)`);
    
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
              content: `Eres un asistente inteligente de Delfín Check-in, un sistema de gestión hotelera.
Tu trabajo es ayudar al propietario ${tenant.name} a consultar información sobre sus registros de viajeros y reservas.

IMPORTANTE:
- Responde en español de forma clara y concisa
- Usa emojis para hacer las respuestas más amigables
- Si no encuentras la información exacta, dilo claramente
- Sugiere alternativas cuando sea apropiado
- Mantén un tono profesional pero cercano
- Si te preguntan por un nombre específico, busca en los datos proporcionados`,
            },
            {
              role: 'user',
              content: `${userText}\n\n${context}`,
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

