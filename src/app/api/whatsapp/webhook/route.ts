import { NextRequest, NextResponse } from 'next/server';
import { updateSentMessageStatus } from '@/lib/db';

// GET - Verificación del webhook
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      return new NextResponse(challenge, { status: 200 });
    }

    return new NextResponse('Forbidden', { status: 403 });
  } catch (error) {
    console.error('Webhook verification error:', error);
    return new NextResponse('Error', { status: 500 });
  }
}

// POST - Recibir actualizaciones del webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verificar que es un mensaje válido
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      
      if (changes?.field === 'messages') {
        const messages = changes.value?.messages || [];
        const statuses = changes.value?.statuses || [];
        
        // Procesar estados de mensajes
        for (const status of statuses) {
          await handleMessageStatus(status);
        }
        
        // Procesar mensajes recibidos (opcional)
        for (const message of messages) {
          await handleIncomingMessage(message);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// Función para manejar estados de mensajes
async function handleMessageStatus(status: any) {
  try {
    const messageId = status.id;
    const statusType = status.status; // sent, delivered, read, failed
    
    // Buscar mensaje en base de datos por whatsapp_message_id
    // y actualizar su estado
    
    console.log(`Message ${messageId} status: ${statusType}`);
    
    // Aquí podrías implementar la lógica para actualizar
    // el estado del mensaje en la base de datos
    
  } catch (error) {
    console.error('Error handling message status:', error);
  }
}

// Función para manejar mensajes entrantes
async function handleIncomingMessage(message: any) {
  try {
    const from = message.from;
    const text = message.text?.body || '';
    
    console.log(`Message from ${from}: ${text}`);
    
    // Aquí podrías implementar lógica para responder automáticamente
    // o procesar comandos específicos
    
  } catch (error) {
    console.error('Error handling incoming message:', error);
  }
}
