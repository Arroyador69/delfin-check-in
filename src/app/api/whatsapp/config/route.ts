import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppConfig, updateWhatsAppConfig } from '@/lib/db';

// GET - Obtener configuración de WhatsApp
export async function GET() {
  try {
    const config = await getWhatsAppConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Error fetching WhatsApp config:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar configuración de WhatsApp
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { phone_number, access_token, webhook_verify_token, is_active } = body;
    
    const config = await updateWhatsAppConfig({
      phone_number,
      access_token,
      webhook_verify_token,
      is_active
    });

    return NextResponse.json({ 
      success: true, 
      data: config,
      message: 'Configuración actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error updating WhatsApp config:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar configuración' },
      { status: 500 }
    );
  }
}
