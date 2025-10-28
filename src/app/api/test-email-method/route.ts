import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { to } = await req.json();
    
    if (!to) {
      return NextResponse.json(
        { error: 'Email requerido' },
        { status: 400 }
      );
    }

    console.log('🧪 Probando método de envío de email...');
    
    const result = await sendEmail({
      to: to,
      subject: 'Test de Método de Envío - Zoho vs SMTP',
      html: `
        <h1>🧪 Test de Método de Envío</h1>
        <p>Este email se envió para verificar qué método se está usando:</p>
        <ul>
          <li>🔵 Zoho Mail API (OAuth 2.0)</li>
          <li>🟡 Resend API</li>
          <li>🟢 SMTP directo</li>
        </ul>
        <p>Revisa los logs de Vercel para ver qué método se usó.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      `,
      text: 'Test de método de envío - Revisa los logs para ver qué método se usó'
    });

    return NextResponse.json({
      success: true,
      result: result,
      message: 'Email enviado. Revisa los logs para ver qué método se usó.'
    });

  } catch (error) {
    console.error('❌ Error en test-email-method:', error);
    return NextResponse.json(
      { error: 'Error enviando email', details: error.message },
      { status: 500 }
    );
  }
}
