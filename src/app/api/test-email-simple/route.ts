import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { to } = await req.json();
    
    if (!to) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    console.log('🧪 Probando envío de email a:', to);

    const result = await sendEmail({
      to: to,
      subject: '🧪 Test de Email - Delfín Check-in',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🧪 Test de Email</h2>
          <p>Este es un email de prueba para verificar que el sistema de envío funciona correctamente.</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Desde:</strong> noreply@delfincheckin.com</p>
          <p><strong>Hacia:</strong> ${to}</p>
          <hr style="margin: 20px 0;">
          <p style="color: #64748b; font-size: 14px;">
            Si recibes este email, el sistema de envío está funcionando correctamente.
          </p>
        </div>
      `,
      text: `
Test de Email - Delfín Check-in

Este es un email de prueba para verificar que el sistema de envío funciona correctamente.

Fecha: ${new Date().toLocaleString()}
Desde: noreply@delfincheckin.com
Hacia: ${to}

Si recibes este email, el sistema de envío está funcionando correctamente.
      `
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
