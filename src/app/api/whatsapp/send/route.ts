import { NextRequest, NextResponse } from 'next/server';
import { 
  getMessageTemplate, 
  insertSentMessage, 
  updateSentMessageStatus,
  getWhatsAppConfig 
} from '@/lib/db';

// Función para procesar plantilla con variables
function processTemplate(template: string, variables: Record<string, any>): string {
  let processed = template;
  
  Object.keys(variables).forEach(key => {
    const placeholder = `{{${key}}}`;
    const value = variables[key] || '';
    processed = processed.replace(new RegExp(placeholder, 'g'), value);
  });
  
  return processed;
}

// Función para enviar mensaje por WhatsApp Business API
async function sendWhatsAppMessage(
  phoneNumber: string, 
  message: string, 
  accessToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          body: message
        }
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      return { 
        success: true, 
        messageId: data.messages?.[0]?.id 
      };
    } else {
      return { 
        success: false, 
        error: data.error?.message || 'Error desconocido' 
      };
    }
  } catch (error) {
    console.error('WhatsApp API error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error de conexión' 
    };
  }
}

// POST - Enviar mensaje de WhatsApp
export async function POST(request: NextRequest) {
  try {
    // Obtener tenant_id del header (enviado por el middleware)
    const tenantId = request.headers.get('x-tenant-id');
    
    if (tenantId) {
      // Verificar si el tenant puede realizar operaciones (no está suspendido)
      const { requireActiveTenant } = await import('@/lib/payment-middleware');
      const paymentCheck = await requireActiveTenant(request, tenantId);
      if (paymentCheck) {
        return NextResponse.json(
          { 
            success: false,
            error: paymentCheck.error,
            code: paymentCheck.code,
            reason: paymentCheck.reason
          },
          { status: paymentCheck.status }
        );
      }
    }

    const body = await request.json();
    
    const { 
      templateId, 
      reservationId, 
      guestPhone, 
      guestName, 
      variables = {} 
    } = body;
    
    if (!templateId || !guestPhone) {
      return NextResponse.json(
        { success: false, error: 'Template ID y teléfono del huésped son requeridos' },
        { status: 400 }
      );
    }

    // Obtener plantilla
    const template = await getMessageTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }

    if (!template.is_active) {
      return NextResponse.json(
        { success: false, error: 'Plantilla inactiva' },
        { status: 400 }
      );
    }

    // Procesar plantilla con variables
    const messageContent = processTemplate(template.template_content, {
      guest_name: guestName || 'Huésped',
      ...variables
    });

    // Registrar mensaje en base de datos
    const sentMessage = await insertSentMessage({
      template_id: templateId,
      reservation_id: reservationId,
      guest_phone: guestPhone,
      guest_name: guestName,
      message_content: messageContent,
      status: 'pending'
    });

    // Obtener configuración de WhatsApp
    const config = await getWhatsAppConfig();
    if (!config?.access_token) {
      // Simular envío si no hay token configurado
      await updateSentMessageStatus(
        sentMessage.id, 
        'sent', 
        `sim_${Date.now()}`
      );
      
      return NextResponse.json({
        success: true,
        message: 'Mensaje registrado (modo simulación - configura token de WhatsApp)',
        data: {
          messageId: `sim_${Date.now()}`,
          content: messageContent
        }
      });
    }

    // Enviar mensaje por WhatsApp
    const result = await sendWhatsAppMessage(
      guestPhone,
      messageContent,
      config.access_token
    );

    if (result.success) {
      await updateSentMessageStatus(
        sentMessage.id, 
        'sent', 
        result.messageId
      );
      
      return NextResponse.json({
        success: true,
        message: 'Mensaje enviado exitosamente',
        data: {
          messageId: result.messageId,
          content: messageContent
        }
      });
    } else {
      await updateSentMessageStatus(
        sentMessage.id, 
        'failed', 
        undefined,
        result.error
      );
      
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return NextResponse.json(
      { success: false, error: 'Error al enviar mensaje' },
      { status: 500 }
    );
  }
}
