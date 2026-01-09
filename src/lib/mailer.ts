import nodemailer from 'nodemailer';

// Usar el mismo transporter que funciona en booking (email-notifications.ts)
// Esto asegura consistencia y que funcione igual que los emails de reservas
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
  },
});

export function getTransport() {
  // Validar que SMTP esté configurado
  const host = process.env.SMTP_HOST || '';
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';

  if (!host || !user || !pass) {
    const missing = [];
    if (!host) missing.push('SMTP_HOST');
    if (!user) missing.push('SMTP_USER');
    if (!pass) missing.push('SMTP_PASS o SMTP_PASSWORD');
    
    throw new Error(`❌ SMTP no configurado correctamente. Faltan: ${missing.join(', ')}`);
  }

  return transporter;
}

export async function sendOnboardingEmail(params: {
  to: string;
  onboardingUrl: string;
  tempPassword?: string;
}) {
  try {
    // Validar que SMTP esté configurado antes de intentar enviar
    const transporter = getTransport();
    
    // Email específico para onboarding de propietarios (admin)
    const from = process.env.SMTP_FROM_ONBOARDING || process.env.SMTP_FROM || `Delfín Check-in <noreply@delfincheckin.com>`;

    // HTML mejorado similar al de booking para evitar spam
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bienvenido a Delfín Check-in</title>
      <style>
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #1d4ed8; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #e5e7eb; }
        .password-box { background: #f8f9fa; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; color: #856404; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🐬 Bienvenido a Delfín Check-in</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Tu plataforma de gestión de alojamientos</p>
        </div>
        <div class="content">
          <h2>¡Bienvenido a Delfín Check-in!</h2>
          <p>Tu cuenta ha sido creada exitosamente. Para completar tu configuración inicial y acceder a tu panel de administración, haz clic en el siguiente botón:</p>
          <p style="text-align: center;">
            <a href="${params.onboardingUrl}" class="button">Comenzar Onboarding</a>
          </p>
          ${params.tempPassword ? `
          <div class="password-box">
            <p style="margin: 0 0 10px 0;"><strong>🔑 Contraseña temporal:</strong></p>
            <p style="margin: 0; font-size: 18px; font-family: monospace; letter-spacing: 2px;"><strong>${params.tempPassword}</strong></p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">Podrás cambiarla durante el proceso de onboarding.</p>
          </div>
          ` : ''}
          <div class="warning">
            <p style="margin: 0;"><strong>⚠️ Importante:</strong> Si no ves este correo en tu bandeja de entrada, revisa la carpeta <strong>Spam/Correo no deseado</strong> y márcalo como <strong>No es spam</strong>.</p>
          </div>
          <p>Si tienes problemas para acceder, puedes usar este enlace directo:</p>
          <p style="word-break: break-all; color: #2563eb; font-size: 12px;">${params.onboardingUrl}</p>
        </div>
        <div class="footer">
          <p style="margin: 0;">Este es un email automático, por favor no respondas a este mensaje.</p>
          <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} Delfín Check-in. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>`;

    console.log('📧 [SEND ONBOARDING EMAIL] Intentando enviar email:', {
      to: params.to,
      from,
      hasOnboardingUrl: !!params.onboardingUrl,
      onboardingUrlPrefix: params.onboardingUrl.substring(0, 50) + '...',
      smtpHost: process.env.SMTP_HOST,
      smtpUser: process.env.SMTP_USER,
      smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.SMTP_PASSWORD))
    });

    // Agregar versión texto plano para mejor deliverability
    const text = `
🐬 Bienvenido a Delfín Check-in

¡Bienvenido a Delfín Check-in!

Tu cuenta ha sido creada exitosamente. Para completar tu configuración inicial, visita:

${params.onboardingUrl}

${params.tempPassword ? `\n🔑 Contraseña temporal: ${params.tempPassword}\n` : ''}

Si tienes problemas, revisa tu carpeta de Spam/Correo no deseado.

© ${new Date().getFullYear()} Delfín Check-in
    `.trim();

    const result = await transporter.sendMail({
      from,
      to: params.to,
      subject: '🐬 Bienvenido a Delfín Check-in - Completa tu configuración',
      html,
      text, // Versión texto plano para mejor deliverability
      // Headers adicionales para evitar spam
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
      },
    });

    console.log('✅ [SEND ONBOARDING EMAIL] Email enviado exitosamente:', {
      messageId: result.messageId,
      to: params.to,
      accepted: result.accepted,
      rejected: result.rejected
    });

    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('❌ [SEND ONBOARDING EMAIL] Error enviando email de onboarding:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      to: params.to,
      smtpHost: process.env.SMTP_HOST,
      smtpUser: process.env.SMTP_USER,
      smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.SMTP_PASSWORD))
    });
    
    // Re-lanzar el error para que el webhook pueda manejarlo
    throw error;
  }
}

export async function sendPaymentNotificationEmail(params: {
  to: string;
  type: 'payment_failed' | 'suspended' | 'payment_succeeded';
  tenantName: string;
  amount: number;
  retryCount?: number;
  remainingAttempts?: number;
  invoiceUrl?: string | null;
}) {
  const transporter = getTransport();
  const from = process.env.SMTP_FROM || `Delfín Check-in <noreply@delfincheckin.com>`;

  let subject = '';
  let html = '';

  if (params.type === 'payment_failed') {
    subject = `⚠️ Pago fallido - Delfín Check-in (Intento ${params.retryCount}/3)`;
    html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.6; max-width:600px; margin:0 auto;">
      <h2 style="color:#dc2626;">⚠️ Pago Fallido</h2>
      <p>Hola ${params.tenantName},</p>
      <p>No hemos podido procesar el pago de tu suscripción a Delfín Check-in.</p>
      <div style="background:#fee2e2; border-left:4px solid #dc2626; padding:16px; margin:20px 0; border-radius:4px;">
        <p style="margin:0;"><strong>Importe:</strong> ${params.amount.toFixed(2)}€</p>
        <p style="margin:8px 0 0 0;"><strong>Intento:</strong> ${params.retryCount}/3</p>
        <p style="margin:8px 0 0 0;"><strong>Intentos restantes:</strong> ${params.remainingAttempts}</p>
      </div>
      <p>Si no actualizas tu método de pago, se intentará cobrar automáticamente ${params.remainingAttempts} ${params.remainingAttempts === 1 ? 'vez más' : 'veces más'}.</p>
      <p><strong>⚠️ Importante:</strong> Si después de 3 intentos fallidos no se puede cobrar, los servicios de Delfín Check-in serán suspendidos automáticamente.</p>
      ${params.invoiceUrl ? `<p><a href="${params.invoiceUrl}" target="_blank" style="background:#2563eb;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">Actualizar método de pago</a></p>` : ''}
      <p>Puedes acceder a tu panel de administración para actualizar tu método de pago y ver tus facturas pendientes.</p>
      <hr style="margin:30px 0; border:none; border-top:1px solid #e5e7eb;"/>
      <p style="color:#6b7280; font-size:14px;">Si ya has actualizado tu método de pago, por favor ignora este mensaje.</p>
    </div>`;
  } else if (params.type === 'suspended') {
    subject = '🚫 Servicios Suspendidos - Delfín Check-in';
    html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.6; max-width:600px; margin:0 auto;">
      <h2 style="color:#dc2626;">🚫 Servicios Suspendidos</h2>
      <p>Hola ${params.tenantName},</p>
      <p>Después de 3 intentos fallidos de pago, hemos suspendido temporalmente los servicios de Delfín Check-in.</p>
      <div style="background:#fee2e2; border-left:4px solid #dc2626; padding:16px; margin:20px 0; border-radius:4px;">
        <p style="margin:0;"><strong>Importe pendiente:</strong> ${params.amount.toFixed(2)}€</p>
      </div>
      <p><strong>¿Qué significa esto?</strong></p>
      <ul>
        <li>Puedes acceder a tu panel de administración para ver tus datos</li>
        <li><strong>No podrás crear nuevos registros de viajeros</strong></li>
        <li><strong>No podrás usar el canal de comunicación</strong></li>
        <li><strong>No se procesarán nuevas reservas</strong></li>
      </ul>
      <p>Para reactivar tus servicios, por favor actualiza tu método de pago y realiza el pago pendiente.</p>
      ${params.invoiceUrl ? `<p><a href="${params.invoiceUrl}" target="_blank" style="background:#dc2626;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">Pagar factura pendiente</a></p>` : ''}
      <p>Una vez que el pago se procese correctamente, tus servicios se reactivarán automáticamente.</p>
      <hr style="margin:30px 0; border:none; border-top:1px solid #e5e7eb;"/>
      <p style="color:#6b7280; font-size:14px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
    </div>`;
  } else if (params.type === 'payment_succeeded') {
    subject = '✅ Pago Exitoso - Delfín Check-in';
    html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.6; max-width:600px; margin:0 auto;">
      <h2 style="color:#059669;">✅ Pago Procesado Exitosamente</h2>
      <p>Hola ${params.tenantName},</p>
      <p>Tu pago de ${params.amount.toFixed(2)}€ ha sido procesado correctamente.</p>
      <p>Tu suscripción a Delfín Check-in está activa y todos los servicios están disponibles.</p>
      <p>Gracias por confiar en nosotros.</p>
    </div>`;
  }

  await transporter.sendMail({
    from,
    to: params.to,
    subject,
    html,
  });
}


