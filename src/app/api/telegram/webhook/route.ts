import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import OpenAI from 'openai';
import { TELEGRAM_FACTUAL_PROMPT } from '@/lib/telegram-prompt';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// Verificar token al inicio
if (!TELEGRAM_TOKEN) {
  console.error('❌ TELEGRAM_TOKEN no está configurado');
} else {
  console.log(`✅ TELEGRAM_TOKEN configurado: ${TELEGRAM_TOKEN.substring(0, 10)}...`);
}

// Función para enviar mensaje a Telegram
async function sendTelegramMessage(chatId: string, text: string) {
  try {
    console.log(`📤 Enviando a Telegram API: ${TELEGRAM_API}/sendMessage`);
    console.log(`📤 Chat ID: ${chatId}`);
    console.log(`📤 Texto: ${text.substring(0, 100)}...`);
    
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
      }),
    });
    
    const result = await response.json();
    console.log(`📤 Status: ${response.status}`);
    console.log(`📤 Response:`, result);
    
    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status} - ${JSON.stringify(result)}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error enviando mensaje a Telegram:', error);
    throw error;
  }
}

// Función para obtener datos del tenant desde la base de datos
async function getTenantByChatId(chatId: string) {
  try {
    // Primero buscar en tenant_users (usuarios compartidos)
    const userResult = await sql`
      SELECT 
        tu.tenant_id,
        tu.role,
        tu.telegram_chat_id,
        t.name,
        t.email,
        t.telegram_enabled,
        t.ai_tokens_used,
        t.ai_token_limit,
        tu.auth_token
      FROM tenant_users tu
      JOIN tenants t ON tu.tenant_id = t.id
      WHERE tu.telegram_chat_id = ${chatId}
      LIMIT 1
    `;
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      return {
        id: user.tenant_id,
        name: user.name,
        email: user.email,
        telegram_chat_id: user.telegram_chat_id,
        telegram_enabled: user.telegram_enabled,
        ai_tokens_used: user.ai_tokens_used,
        ai_token_limit: user.ai_token_limit,
        auth_token: user.auth_token,
        role: user.role
      };
    }
    
    // Si no se encuentra en tenant_users, buscar en tenants (propietarios)
    const tenantResult = await sql`
      SELECT 
        t.id,
        t.name,
        t.email,
        t.telegram_chat_id,
        t.telegram_enabled,
        t.ai_tokens_used,
        t.ai_token_limit,
        tu.auth_token
      FROM tenants t
      LEFT JOIN tenant_users tu ON t.id = tu.tenant_id AND tu.role = 'owner'
      WHERE t.telegram_chat_id = ${chatId}
      LIMIT 1
    `;
    
    if (tenantResult.rows.length > 0) {
      const tenant = tenantResult.rows[0];
      return {
        ...tenant,
        role: 'owner'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error obteniendo tenant:', error);
    return null;
  }
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
    
    // 🔍 LOG DETALLADO PARA OBTENER CHAT_ID
    console.log('🔍 ===== INFORMACIÓN COMPLETA DEL USUARIO =====');
    console.log('📱 Chat ID:', chatId);
    console.log('👤 Usuario completo:', JSON.stringify(message.from, null, 2));
    console.log('💬 Chat completo:', JSON.stringify(message.chat, null, 2));
    console.log('📝 Texto:', userText);
    console.log('🔍 ============================================');
    
    console.log(`💬 Mensaje de ${userName} (${chatId}): ${userText}`);
    
    // Obtener tenant
    const tenant = await getTenantByChatId(chatId);
    if (!tenant) {
      await sendTelegramMessage(
        chatId,
        '❌ No tienes acceso a este bot.\n' +
        'Contacta con el administrador para configurar tu acceso.'
      );
      return NextResponse.json({ ok: true, error: 'Tenant not found' });
    }

    console.log(`🏢 Tenant encontrado: ${tenant.name} (${tenant.id})`);

    // Comandos especiales
    if (userText === '/start') {
      const roleText = tenant.role === 'staff' ? ' (Acceso Compartido)' : '';
      await sendTelegramMessage(
        chatId,
        `🤖 *Bienvenido al asistente de ${tenant.name}${roleText}*\n\n` +
        `Puedes preguntarme sobre:\n` +
        `• "Quién hay hoy?" - Ver huéspedes actuales\n` +
        `• "Quién llega mañana?" - Ver llegadas\n` +
        `• "Quién sale hoy?" - Ver salidas\n` +
        `• "Reservas del 27" - Ver cualquier fecha\n` +
        `• "Quién hay el 30 de octubre?" - Fecha específica\n` +
        `• "Estado de reservas" - Resumen completo\n\n` +
        `*Comandos:*\n` +
        `/help - Mostrar esta ayuda\n` +
        `/stats - Ver estadísticas de uso`
      );
      return NextResponse.json({ ok: true });
    }

    if (userText === '/help') {
      await sendTelegramMessage(
        chatId,
        `🤖 *Comandos disponibles:*\n\n` +
        `*Consultas de reservas:*\n` +
        `• "Quién hay hoy?"\n` +
        `• "Quién llega mañana?"\n` +
        `• "Quién sale hoy?"\n` +
        `• "Reservas del 27"\n` +
        `• "Quién hay el 30 de octubre?"\n` +
        `• "Estado de reservas"\n\n` +
        `*Comandos:*\n` +
        `/start - Mensaje de bienvenida\n` +
        `/help - Mostrar esta ayuda\n` +
        `/stats - Ver estadísticas de uso\n\n` +
        `*Ejemplos:*\n` +
        `"Quién hay hoy?"\n` +
        `"Estado de reservas para mañana"\n` +
        `"Reservas del 15"\n` +
        `"Quién llega el 25 de octubre?"`
      );
      return NextResponse.json({ ok: true });
    }

    // Política: Bot SOLO LECTURA
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

    // 🤖 SISTEMA ANTI-ALUCINACIONES
    console.log(`🔍 Usando sistema estructurado para tenant ${tenant.id}...`);
    
    // Detectar si es una consulta de reservas
    const isReservasQuery = /quién hay|quién está|reservas|hoy|mañana|estado|alojados|llegadas|salidas/i.test(userText);
    
    if (isReservasQuery) {
      console.log(`📅 Consulta de reservas detectada: "${userText}"`);
      
      // Usar el parser inteligente de fechas
      const { parseDateFromText, formatDateForUser } = await import('@/lib/date-parser');
      const fechaParseada = parseDateFromText(userText);
      const fecha = fechaParseada.fecha;
      
      console.log(`📅 Fecha extraída: ${fecha} (tipo: ${fechaParseada.tipo})`);
    
    // Indicar que está escribiendo
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        action: 'typing',
      }),
    });
    
      // Usar nuestro sistema estructurado
      try {
        // Ya no necesitamos token para llamadas HTTP externas
        
        // Obtener datos estructurados directamente (evitar llamadas HTTP externas)
        console.log(`🔍 Obteniendo datos estructurados para fecha ${fecha}...`);
        
        // Usar directamente el tenant_id del usuario (ya sea owner o shared_user)
        console.log(`🔍 Consultando reservas para tenant: ${tenant.id} (rol: ${tenant.role})`);
        
        const alojadosResult = await sql`
          SELECT 
            guest_name as nombre, room_id as habitacion, guest_count as personas, 
            check_in::date as check_in, check_out::date as check_out
          FROM reservations
          WHERE tenant_id = ${tenant.id} AND status = 'confirmed'
            AND ${fecha}::date >= DATE(check_in) AND ${fecha}::date < DATE(check_out)
          ORDER BY check_in
        `;

        const lleganResult = await sql`
          SELECT 
            guest_name as nombre, room_id as habitacion, guest_count as personas, 
            check_in::date as check_in, check_out::date as check_out
          FROM reservations
          WHERE tenant_id = ${tenant.id} AND status = 'confirmed'
            AND DATE(check_in) = ${fecha}::date
          ORDER BY check_in
        `;

        const salenResult = await sql`
          SELECT 
            guest_name as nombre, room_id as habitacion, guest_count as personas, 
            check_in::date as check_in, check_out::date as check_out
          FROM reservations
          WHERE tenant_id = ${tenant.id} AND status = 'confirmed'
            AND DATE(check_out) = ${fecha}::date
          ORDER BY check_in
        `;

        // Mapear resultados
        console.log(`📊 Resultados de consulta para ${fecha}:`);
        console.log(`  - Alojados: ${alojadosResult.rows.length} registros`);
        console.log(`  - Llegan: ${lleganResult.rows.length} registros`);
        console.log(`  - Salen: ${salenResult.rows.length} registros`);
        
        const alojados = alojadosResult.rows.map(r => ({
          nombre: r.nombre,
          habitacion: r.habitacion,
          personas: r.personas,
          check_in: r.check_in,
          check_out: r.check_out
        }));

        const llegan = lleganResult.rows.map(r => ({
          nombre: r.nombre,
          habitacion: r.habitacion,
          personas: r.personas,
          check_in: r.check_in,
          check_out: r.check_out
        }));

        const salen = salenResult.rows.map(r => ({
          nombre: r.nombre,
          habitacion: r.habitacion,
          personas: r.personas,
          check_in: r.check_in,
          check_out: r.check_out
        }));

        const datosEstructurados = {
          fecha_consulta: fecha,
          alojados,
          llegan,
          salen
        };

        console.log(`📊 Datos obtenidos: ${alojados.length} alojados, ${llegan.length} llegan, ${salen.length} salen`);

        // Formatear fecha para mostrar al usuario
        const fechaFormateada = formatDateForUser(fecha);
        const datosConFechaFormateada = {
          ...datosEstructurados,
          fecha_consulta_formateada: fechaFormateada
        };

        // Usar IA para formatear
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0,
          max_tokens: 800,
          messages: [
            { role: "system", content: TELEGRAM_FACTUAL_PROMPT },
            { role: "user", content: JSON.stringify(datosConFechaFormateada, null, 2) }
          ]
        });

        const mensajeFormateado = completion.choices[0].message.content;
        
        console.log(`✅ Respuesta estructurada generada:`, mensajeFormateado);
        console.log(`📤 Enviando mensaje a chat ${chatId}...`);
        
        const telegramResponse = await sendTelegramMessage(chatId, mensajeFormateado);
        console.log(`📤 Respuesta de Telegram:`, telegramResponse);
        
        return NextResponse.json({ ok: true, method: 'structured-direct' });
      } catch (error) {
        console.log(`❌ Error en sistema estructurado:`, error);
        
        // Enviar mensaje de error como fallback
        try {
          await sendTelegramMessage(
            chatId,
            '❌ Error procesando la consulta. Por favor, inténtalo de nuevo.'
          );
        } catch (fallbackError) {
          console.error('❌ Error en fallback:', fallbackError);
        }
      }
    }

    // Para consultas no relacionadas con reservas
    await sendTelegramMessage(
      chatId,
      '🤖 No entiendo tu consulta.\n\n' +
      'Puedes preguntarme sobre:\n' +
      '• "Quién hay hoy?"\n' +
      '• "Estado de reservas"\n' +
      '• "Quién llega mañana?"\n' +
      '• "Reservas del 27"\n' +
      '• "Quién hay el 30 de octubre?"\n\n' +
      'Usa /help para ver todos los comandos disponibles.'
    );
    
    return NextResponse.json({ ok: true });
    
  } catch (error) {
    console.error('❌ Error en webhook de Telegram:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
