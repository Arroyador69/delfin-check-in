import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import OpenAI from 'openai';
import { TELEGRAM_FACTUAL_PROMPT } from '@/lib/telegram-prompt';

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
    return result.rows[0] || null;
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
      await sendTelegramMessage(
        chatId,
        `🤖 *Bienvenido al asistente de ${tenant.name}*\n\n` +
        `Puedes preguntarme sobre:\n` +
        `• "Quién hay hoy?" - Ver huéspedes actuales\n` +
        `• "Quién llega mañana?" - Ver llegadas\n` +
        `• "Quién sale hoy?" - Ver salidas\n` +
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
        `• "Estado de reservas"\n\n` +
        `*Comandos:*\n` +
        `/start - Mensaje de bienvenida\n` +
        `/help - Mostrar esta ayuda\n` +
        `/stats - Ver estadísticas de uso\n\n` +
        `*Ejemplos:*\n` +
        `"Quién hay hoy?"\n` +
        `"Estado de reservas para mañana"`
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
      
      // Extraer fecha de la consulta (por defecto hoy)
      const today = new Date().toISOString().split('T')[0];
      let fecha = today;
      
      // Detectar fechas específicas en el texto
      if (userText.includes('mañana')) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        fecha = tomorrow.toISOString().split('T')[0];
      } else if (userText.includes('ayer')) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        fecha = yesterday.toISOString().split('T')[0];
      }
      
      console.log(`📅 Fecha de consulta: ${fecha}`);
      
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

        // Usar IA para formatear
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0,
          max_tokens: 800,
          messages: [
            { role: "system", content: TELEGRAM_FACTUAL_PROMPT },
            { role: "user", content: JSON.stringify(datosEstructurados, null, 2) }
          ]
        });

        const mensajeFormateado = completion.choices[0].message.content;
        
        console.log(`✅ Respuesta estructurada generada`);
        await sendTelegramMessage(chatId, mensajeFormateado);
        return NextResponse.json({ ok: true, method: 'structured-direct' });
      } catch (error) {
        console.log(`❌ Error en sistema estructurado:`, error);
      }
    }

    // Para consultas no relacionadas con reservas
    await sendTelegramMessage(
      chatId,
      '🤖 No entiendo tu consulta.\n\n' +
      'Puedes preguntarme sobre:\n' +
      '• "Quién hay hoy?"\n' +
      '• "Estado de reservas"\n' +
      '• "Quién llega mañana?"\n\n' +
      'Usa /help para ver todos los comandos disponibles.'
    );

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('❌ Error en webhook de Telegram:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
