import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { formatReservasForTelegram, OPENAI_FACTUAL_CONFIG } from '@/lib/telegram-prompt';

/**
 * 🤖 API PARA TELEGRAM BOT
 * 
 * Endpoint que procesa comandos de Telegram y devuelve respuestas
 * usando datos estructurados para evitar alucinaciones
 */

export async function POST(request: NextRequest) {
  try {
    // Obtener el token de autenticación de las cookies
    const authToken = request.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar el token JWT
    const payload = verifyToken(authToken);
    
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { command, fecha } = await request.json();

    console.log(`🤖 Comando Telegram recibido: ${command} para fecha: ${fecha}`);

    // Procesar comando de reservas
    if (command === 'reservas' || command === 'estado') {
      // Obtener datos estructurados
      const reservasResponse = await fetch(`${request.nextUrl.origin}/api/telegram/reservas?fecha=${fecha}`, {
        headers: {
          'Cookie': `auth_token=${authToken}`
        }
      });

      if (!reservasResponse.ok) {
        return NextResponse.json({
          success: false,
          message: 'Error al obtener reservas'
        });
      }

      const reservasData = await reservasResponse.json();

      // Formatear usando función determinista (sin IA)
      const mensaje = formatReservasForTelegram(reservasData);

      return NextResponse.json({
        success: true,
        message: mensaje,
        data: reservasData
      });
    }

    // Comando de ayuda
    if (command === 'help' || command === 'ayuda') {
      const mensaje = `🤖 *Comandos disponibles:*

/reservas - Ver estado de reservas de hoy
/reservas 2025-10-25 - Ver reservas de fecha específica
/estado - Alias de /reservas
/help - Mostrar esta ayuda

*Ejemplo:*
/reservas 2025-10-24`;

      return NextResponse.json({
        success: true,
        message: mensaje
      });
    }

    // Comando no reconocido
    return NextResponse.json({
      success: false,
      message: 'Comando no reconocido. Usa /help para ver comandos disponibles.'
    });

  } catch (error) {
    console.error('❌ Error en Telegram Bot:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoint alternativo que usa OpenAI con configuración factual
 * (Solo usar si necesitas IA para procesamiento adicional)
 */
export async function PUT(request: NextRequest) {
  try {
    // Obtener el token de autenticación de las cookies
    const authToken = request.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar el token JWT
    const payload = verifyToken(authToken);
    
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { command, fecha } = await request.json();

    // Obtener datos estructurados
    const reservasResponse = await fetch(`${request.nextUrl.origin}/api/telegram/reservas?fecha=${fecha}`, {
      headers: {
        'Cookie': `auth_token=${authToken}`
      }
    });

    if (!reservasResponse.ok) {
      return NextResponse.json({
        success: false,
        message: 'Error al obtener reservas'
      });
    }

    const reservasData = await reservasResponse.json();

    // Si tienes OpenAI configurado, puedes usar esto:
    /*
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: TELEGRAM_FACTUAL_PROMPT
        },
        {
          role: "user",
          content: JSON.stringify(reservasData)
        }
      ],
      ...OPENAI_FACTUAL_CONFIG
    });

    const mensaje = completion.choices[0].message.content;
    */

    // Por ahora, usar formateo determinista
    const mensaje = formatReservasForTelegram(reservasData);

    return NextResponse.json({
      success: true,
      message: mensaje,
      data: reservasData,
      config: OPENAI_FACTUAL_CONFIG
    });

  } catch (error) {
    console.error('❌ Error en Telegram Bot con IA:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}
