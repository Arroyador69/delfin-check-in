import nodemailer from 'nodemailer';

export function getTransport() {
  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';

  // Validar que SMTP esté configurado
  if (!host || !user || !pass) {
    const missing = [];
    if (!host) missing.push('SMTP_HOST');
    if (!user) missing.push('SMTP_USER');
    if (!pass) missing.push('SMTP_PASS o SMTP_PASSWORD');
    
    throw new Error(`❌ SMTP no configurado correctamente. Faltan: ${missing.join(', ')}`);
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
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

    const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.6;">
      <h2>🐬 Bienvenido a Delfín Check-in</h2>
      <p>Gracias por tu compra. Para completar tu configuración inicial, por favor haz clic en el siguiente enlace:</p>
      <p><a href="${params.onboardingUrl}" target="_blank" style="background:#2563eb;color:white;padding:10px 16px;border-radius:6px;text-decoration:none;">Comenzar Onboarding</a></p>
      ${params.tempPassword ? `<p>Contraseña temporal: <b>${params.tempPassword}</b></p>` : ''}
      <hr/>
      <p><b>Importante:</b> Si no ves este correo en tu bandeja de entrada, revisa la carpeta <i>Spam/Correo no deseado</i> y márcalo como <i>No es spam</i>.</p>
    </div>`;

    console.log('📧 [SEND ONBOARDING EMAIL] Intentando enviar email:', {
      to: params.to,
      from,
      hasOnboardingUrl: !!params.onboardingUrl,
      onboardingUrlPrefix: params.onboardingUrl.substring(0, 50) + '...',
      smtpHost: process.env.SMTP_HOST,
      smtpUser: process.env.SMTP_USER,
      smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.SMTP_PASSWORD))
    });

    const result = await transporter.sendMail({
      from,
      to: params.to,
      subject: 'Tu acceso a Delfín Check-in - Completa el onboarding',
      html,
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


