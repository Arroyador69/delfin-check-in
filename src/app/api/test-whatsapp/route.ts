import { NextRequest, NextResponse } from 'next/server';
import { sendAutomatedMessage } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { trigger_type, guest_phone, guest_name, room_id } = body;
    
    if (!trigger_type || !guest_phone || !guest_name || !room_id) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos: trigger_type, guest_phone, guest_name, room_id' },
        { status: 400 }
      );
    }

    // Datos de prueba
    const testData = {
      guest_name: guest_name || 'Juan Pérez',
      guest_phone: guest_phone,
      guest_email: 'test@example.com',
      room_id: room_id || 'room_1',
      check_in: '2024-02-15',
      check_out: '2024-02-17',
      guest_count: 2
    };

    console.log(`🧪 Enviando mensaje de prueba para trigger: ${trigger_type}`);
    
    const result = await sendAutomatedMessage(trigger_type, testData);
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Mensaje de prueba enviado' : 'Error enviando mensaje',
      details: result.error || result.messageId,
      trigger_type,
      test_data: testData
    });

  } catch (error) {
    console.error('Error testing WhatsApp:', error);
    return NextResponse.json(
      { success: false, error: 'Error en prueba de WhatsApp' },
      { status: 500 }
    );
  }
}
