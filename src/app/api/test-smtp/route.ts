import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { to } = await req.json();
    
    if (!to) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    console.log('🧪 Probando SMTP directamente...');

    // Configuración SMTP
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.zoho.eu',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER || 'noreply@delfincheckin.com',
        pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || ''
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    console.log('🔍 Configuración SMTP:', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      hasUser: !!smtpConfig.auth.user,
      hasPass: !!smtpConfig.auth.pass,
      user: smtpConfig.auth.user
    });

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransporter(smtpConfig);

    // Verificar conexión SMTP
    console.log('🔍 Verificando conexión SMTP...');
    await transporter.verify();
    console.log('✅ Conexión SMTP verificada');

    // Enviar email
    console.log('📧 Enviando email...');
    const info = await transporter.sendMail({
      from: `"${process.env.ZOHO_FROM_NAME || 'Delfín Check-in'}" <${smtpConfig.auth.user}>`,
      to: to,
      subject: '🧪 Test SMTP - Delfín Check-in',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🧪 Test SMTP</h2>
          <p>Este es un test directo de SMTP con Zoho.</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Desde:</strong> ${smtpConfig.auth.user}</p>
          <p><strong>Hacia:</strong> ${to}</p>
          <p><strong>Host:</strong> ${smtpConfig.host}</p>
          <p><strong>Puerto:</strong> ${smtpConfig.port}</p>
        </div>
      `,
      text: `
Test SMTP - Delfín Check-in

Este es un test directo de SMTP con Zoho.

Fecha: ${new Date().toLocaleString()}
Desde: ${smtpConfig.auth.user}
Hacia: ${to}
Host: ${smtpConfig.host}
Puerto: ${smtpConfig.port}
      `
    });

    console.log('✅ Email enviado exitosamente:', info.messageId);

    return NextResponse.json({
      success: true,
      message: 'Email enviado exitosamente con SMTP',
      messageId: info.messageId,
      details: info
    });

  } catch (error) {
    console.error('❌ Error en test-smtp:', error);
    return NextResponse.json(
      { error: 'Error enviando email con SMTP', details: error.message },
      { status: 500 }
    );
  }
}
