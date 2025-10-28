import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, business, message } = body;

    // Validar campos requeridos
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Enviar email de contacto
    const emailResult = await sendEmail({
      to: 'contacto@delfincheckin.com',
      subject: `Nuevo mensaje de contacto - ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Nuevo mensaje de contacto</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e40af;">Información del contacto:</h3>
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            ${phone ? `<p><strong>Teléfono:</strong> ${phone}</p>` : ''}
            ${business ? `<p><strong>Negocio:</strong> ${business}</p>` : ''}
          </div>
          
          <div style="background: #ffffff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #1e40af;">Mensaje:</h3>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #2563eb;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              <strong>Responder a:</strong> ${email}
            </p>
          </div>
        </div>
      `,
      text: `
Nuevo mensaje de contacto

Información del contacto:
- Nombre: ${name}
- Email: ${email}
${phone ? `- Teléfono: ${phone}` : ''}
${business ? `- Negocio: ${business}` : ''}

Mensaje:
${message}

Responder a: ${email}
      `
    });

    if (emailResult.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Mensaje enviado correctamente' 
      });
    } else {
      console.error('Error enviando email de contacto:', emailResult.error);
      return NextResponse.json(
        { error: 'Error enviando el mensaje' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error en API de contacto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
