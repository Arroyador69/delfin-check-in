import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import OpenAI from 'openai';

/**
 * 🤖 API PARA FORMATEO CON IA - SIN ALUCINACIONES
 * 
 * Recibe datos ya estructurados y los formatea usando GPT-4o
 * con configuración factual (temperature=0) para evitar alucinaciones
 */

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
}) : null;

export async function POST(request: NextRequest) {
  try {
    // Verificar que OpenAI esté disponible
    if (!openai) {
      return NextResponse.json({ 
        error: 'Servicio de IA no disponible - OPENAI_API_KEY no configurada' 
      }, { status: 503 });
    }

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

    const body = await request.json();
    const { fecha_consulta, alojados, llegan, salen } = body;

    console.log(`🤖 Formateando con IA: ${alojados.length} alojados, ${llegan.length} llegan, ${salen.length} salen`);

    // Validación de estructura
    if (!fecha_consulta || !Array.isArray(alojados) || !Array.isArray(llegan) || !Array.isArray(salen)) {
      return NextResponse.json({ 
        error: "JSON incompleto o mal formado" 
      }, { status: 400 });
    }

    const systemPrompt = `
Eres el asistente del sistema de reservas Delfín Check-in.

Recibirás SIEMPRE un JSON con tres listas: "alojados", "llegan" y "salen".
Tu única tarea es formatear esos datos exactamente como se indica.
No inventes, no deduzcas, no mezcles listas, no corrijas fechas ni nombres.
Si una lista está vacía, escribe literalmente "—".
Si el JSON no tiene datos, responde "⚠️ No hay registros para esta fecha."

Usa exactamente este formato:

📅 Estado de reservas para el {{fecha_consulta}}

🏠 Están alojados:
{{lista de alojados o "—"}}

➡️ Entran ese día:
{{lista de llegan o "—"}}

⬅️ Salen ese día:
{{lista de salen o "—"}}

Cada línea de las listas debe ser:
• {{nombre}} | Hab. {{habitacion}} | {{personas}} pers. | entra {{check_in}} | sale {{check_out}}

REGLAS ESTRICTAS:
1. NO inventes datos
2. NO mezcles grupos
3. NO añadas reservas
4. NO cambies nombres, habitaciones o fechas
5. Si faltan datos, muestra "—" en lugar de inventar
6. Usa exactamente el formato especificado
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,  // Respuesta determinista
      max_tokens: 800,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(body, null, 2) }
      ]
    });

    const respuesta = completion.choices[0].message.content;

    return NextResponse.json({ 
      success: true,
      respuesta,
      metadata: {
        fecha_consulta,
        total_alojados: alojados.length,
        total_llegan: llegan.length,
        total_salen: salen.length,
        model: "gpt-4o-mini",
        temperature: 0
      }
    });

  } catch (error) {
    console.error('❌ Error en formateo con IA:', error);
    return NextResponse.json(
      { 
        success: false,
        error: "Error en el formateo con IA",
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoint GET para obtener datos estructurados y formateados
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];

    console.log(`🤖 Obteniendo y formateando reservas para: ${fecha}`);

    // 1. Obtener datos estructurados
    const reservasResponse = await fetch(`${request.nextUrl.origin}/api/telegram/reservas?fecha=${fecha}`, {
      headers: {
        'Cookie': `auth_token=${authToken}`
      }
    });

    if (!reservasResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener reservas estructuradas'
      });
    }

    const reservasData = await reservasResponse.json();

    // 2. Formatear con IA
    const aiResponse = await fetch(`${request.nextUrl.origin}/api/ai-reservas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_token=${authToken}`
      },
      body: JSON.stringify(reservasData)
    });

    if (!aiResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al formatear con IA'
      });
    }

    const aiData = await aiResponse.json();

    return NextResponse.json({
      success: true,
      mensaje_formateado: aiData.respuesta,
      datos_estructurados: reservasData,
      metadata: aiData.metadata
    });

  } catch (error) {
    console.error('❌ Error en flujo completo:', error);
    return NextResponse.json(
      { 
        success: false,
        error: "Error en el flujo completo"
      },
      { status: 500 }
    );
  }
}
