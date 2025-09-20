import { 
  getMessageTemplates, 
  insertSentMessage, 
  updateSentMessageStatus,
  getWhatsAppConfig 
} from './db';

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

// Función principal para enviar mensaje automático
export async function sendAutomatedMessage(
  triggerType: string,
  reservationData: {
    id?: number;
    guest_name: string;
    guest_phone: string;
    guest_email?: string;
    room_id: string;
    check_in: string;
    check_out: string;
    guest_count?: number;
  },
  additionalVariables: Record<string, any> = {}
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Obtener plantillas activas
    const templates = await getMessageTemplates();
    const template = templates.find(t => 
      t.trigger_type === triggerType && 
      t.is_active && 
      t.channel === 'whatsapp'
    );

    if (!template) {
      return { 
        success: false, 
        error: `No se encontró plantilla activa para el trigger: ${triggerType}` 
      };
    }

    // Preparar variables del mensaje
    const variables = {
      guest_name: reservationData.guest_name,
      guest_email: reservationData.guest_email || '',
      guest_phone: reservationData.guest_phone,
      guest_count: reservationData.guest_count || 1,
      room_number: getRoomNumber(reservationData.room_id),
      room_code: getRoomCode(reservationData.room_id),
      room_location: getRoomLocation(reservationData.room_id),
      bathroom_info: getBathroomInfo(reservationData.room_id),
      check_in: formatDate(reservationData.check_in),
      check_out: formatDate(reservationData.check_out),
      form_url: `${process.env.NEXT_PUBLIC_BASE_URL}/guest-registrations`,
      ...additionalVariables
    };

    // Procesar plantilla
    const messageContent = processTemplate(template.template_content, variables);

    // Registrar mensaje en base de datos
    const sentMessage = await insertSentMessage({
      template_id: template.id,
      reservation_id: reservationData.id,
      guest_phone: reservationData.guest_phone,
      guest_name: reservationData.guest_name,
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
      
      console.log(`Mensaje simulado enviado a ${reservationData.guest_phone}:`, messageContent);
      
      return {
        success: true,
        messageId: `sim_${Date.now()}`,
        error: 'Mensaje registrado (modo simulación - configura token de WhatsApp)'
      };
    }

    // Enviar mensaje por WhatsApp
    const result = await sendWhatsAppMessage(
      reservationData.guest_phone,
      messageContent,
      config.access_token
    );

    if (result.success) {
      await updateSentMessageStatus(
        sentMessage.id, 
        'sent', 
        result.messageId
      );
      
      console.log(`Mensaje enviado exitosamente a ${reservationData.guest_phone}`);
    } else {
      await updateSentMessageStatus(
        sentMessage.id, 
        'failed', 
        undefined,
        result.error
      );
      
      console.error(`Error enviando mensaje a ${reservationData.guest_phone}:`, result.error);
    }

    return result;

  } catch (error) {
    console.error('Error in sendAutomatedMessage:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

// Función para obtener número de habitación desde room_id
function getRoomNumber(roomId: string): string {
  const roomMap: Record<string, string> = {
    'room_1': '1',
    'room_2': '2', 
    'room_3': '3',
    'room_4': '4',
    'room_5': '5',
    'room_6': '6'
  };
  return roomMap[roomId] || roomId;
}

// Función para obtener código de habitación desde room_id
function getRoomCode(roomId: string): string {
  const codeMap: Record<string, string> = {
    'room_1': '8101',
    'room_2': '8102',
    'room_3': '8103', 
    'room_4': '8104',
    'room_5': '8105',
    'room_6': '8106'
  };
  return codeMap[roomId] || '8100';
}

// Función para obtener ubicación de la habitación
function getRoomLocation(roomId: string): string {
  const locationMap: Record<string, string> = {
    'room_1': 'Se encuentra subiendo las escaleras a la izquierda.',
    'room_2': 'Se encuentra subiendo las escaleras a la derecha.',
    'room_3': 'Se encuentra subiendo las escaleras a la derecha.',
    'room_4': 'Se encuentra por la misma planta que se entra a la izquierda.',
    'room_5': 'Se encuentra en la misma planta por la que se entra a la derecha.',
    'room_6': 'Se encuentra en la misma planta por la que se entra a la derecha, enfrente de la 5.'
  };
  return locationMap[roomId] || '';
}

// Función para obtener información del baño
function getBathroomInfo(roomId: string): string {
  const bathroomMap: Record<string, string> = {
    'room_1': 'Tu baño es privado y está dentro de la habitación.',
    'room_2': 'El baño está fuera de la habitación y es compartido. Hay dos baños: uno en la planta baja (al lado de la cocina) y otro en el primer piso (enfrente nada más subir las escaleras).',
    'room_3': 'El baño está fuera de la habitación y es compartido. Hay dos baños: uno en la planta baja (al lado de la cocina) y otro en el primer piso (enfrente nada más subir las escaleras).',
    'room_4': 'El baño está fuera de la habitación y es compartido. Hay dos baños: uno en la planta baja (al lado de la cocina) y otro en el primer piso (enfrente nada más subir las escaleras).',
    'room_5': 'El baño está fuera de la habitación y es compartido. Hay dos baños: uno en la planta baja (al lado de la cocina) y otro en el primer piso (enfrente nada más subir las escaleras).',
    'room_6': 'El baño está fuera de la habitación y es compartido. Hay dos baños: uno en la planta baja (al lado de la cocina) y otro en el primer piso (enfrente nada más subir las escaleras).'
  };
  return bathroomMap[roomId] || '';
}

// Función para formatear fecha
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
}

// Función para enviar mensaje de confirmación de reserva
export async function sendReservationConfirmation(reservationData: any) {
  return sendAutomatedMessage('reservation_confirmed', reservationData);
}

// Función para enviar instrucciones de check-in
export async function sendCheckinInstructions(reservationData: any) {
  return sendAutomatedMessage('checkin_instructions', reservationData);
}

// Función para enviar recordatorio 7 días antes
export async function sendReminder7Days(reservationData: any) {
  return sendAutomatedMessage('t_minus_7_days', reservationData);
}

// Función para enviar recordatorio 24 horas antes
export async function sendReminder24Hours(reservationData: any) {
  return sendAutomatedMessage('t_minus_24_hours', reservationData);
}

// Función para enviar mensaje post check-out
export async function sendPostCheckoutMessage(reservationData: any) {
  return sendAutomatedMessage('post_checkout', reservationData);
}

// Función para enviar formulario de registro
export async function sendRegistrationForm(reservationData: any) {
  return sendAutomatedMessage('send_form', reservationData);
}
