import { NextRequest, NextResponse } from 'next/server';
import { sendRecoveryEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { to } = await req.json();
    
    if (!to) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    console.log('🧪 Probando envío de email a:', to);

    const result = await sendRecoveryEmail({
      to: to,
      userName: 'Usuario de Prueba',
      recoveryCode: '123456',
      tenantName: 'Hotel Prueba'
    });

    console.log('📧 Resultado del envío:', result);

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Email enviado exitosamente' : 'Error enviando email',
      details: result
    });

  } catch (error) {
    console.error('❌ Error en test-email-simple:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
