import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// POST: Probar envío de mensaje a Telegram
export async function POST(request: NextRequest) {
  try {
    const { chatId, message } = await request.json();
    
    if (!chatId || !message) {
      return NextResponse.json(
        { error: 'chatId y message son obligatorios' },
        { status: 400 }
      );
    }

    console.log(`🧪 TEST: Enviando mensaje de prueba a ${chatId}`);
    console.log(`🧪 TEST: Token configurado: ${TELEGRAM_TOKEN ? 'SÍ' : 'NO'}`);
    console.log(`🧪 TEST: API URL: ${TELEGRAM_API}`);
    
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🧪 Mensaje de prueba: ${message}`,
        parse_mode: 'Markdown',
      }),
    });
    
    const result = await response.json();
    
    console.log(`🧪 TEST: Status: ${response.status}`);
    console.log(`🧪 TEST: Response:`, result);
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      result,
      debug: {
        token_configured: !!TELEGRAM_TOKEN,
        api_url: TELEGRAM_API,
        chat_id: chatId,
        message: message
      }
    });
    
  } catch (error) {
    console.error('❌ Error en test de Telegram:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Error desconocido',
        debug: {
          token_configured: !!TELEGRAM_TOKEN,
          api_url: TELEGRAM_API
        }
      },
      { status: 500 }
    );
  }
}

// GET: Verificar configuración de Telegram
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      debug: {
        token_configured: !!TELEGRAM_TOKEN,
        token_preview: TELEGRAM_TOKEN ? `${TELEGRAM_TOKEN.substring(0, 10)}...` : 'NO CONFIGURADO',
        api_url: TELEGRAM_API
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

