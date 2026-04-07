/**
 * ========================================
 * PLANTILLAS DE EMAIL PARA WAITLIST
 * ========================================
 * Plantillas HTML para diferentes emails de la waitlist:
 * - Email de bienvenida (ya existe en route.ts)
 * - Email "Faltan 7 días"
 * - Email "Faltan 48 horas" con fecha de lanzamiento
 * - Email final de confirmación y onboarding
 */

export interface WaitlistEmailParams {
  userName: string;
  launchDate?: string; // Para el email de 48 horas
}

/**
 * Plantilla base HTML para emails de waitlist
 */
function getBaseEmailTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #44c0ff 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
        .highlight-box { background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
        .info-box { background: #f0f9ff; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0; }
        .countdown-box { background: #dcfce7; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 20px 0; text-align: center; }
        .countdown-number { font-size: 48px; font-weight: bold; color: #16a34a; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">🐬 Delfín Check-in</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">PMS Gratis para Propietarios</p>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>© 2026 Delfín Check-in · <a href="https://delfincheckin.com" style="color: #2563eb;">delfincheckin.com</a></p>
          <p style="font-size: 12px; margin-top: 10px;">Este email fue enviado porque te registraste en nuestra lista de espera.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Email: Faltan 7 días para el lanzamiento
 */
export function getWaitlistEmail7Days(params: WaitlistEmailParams): { html: string; text: string; subject: string } {
  const { userName } = params;
  
  const html = getBaseEmailTemplate(`
    <h2 style="color: #1d4ed8; margin-top: 0;">¡Faltan solo 7 días, ${userName}!</h2>
    
    <p>Estamos muy cerca del lanzamiento de Delfín Check-in y queríamos recordarte que como <strong>Early Adopter</strong>, tendrás acceso prioritario al PMS completamente gratis.</p>
    
    <div class="countdown-box">
      <div class="countdown-number">7</div>
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #16a34a;">Días restantes</p>
    </div>
    
    <p>Esto es lo que te espera cuando lancemos:</p>
    
    <ul style="line-height: 2;">
      <li>✅ <strong>PMS completo gratis para siempre</strong> - Gestión de reservas, habitaciones y más</li>
      <li>✅ <strong>De propietarios, para propietarios</strong> - Hecho por personas que entienden tu negocio</li>
      <li>✅ <strong>Sin costes ocultos</strong> - El plan gratuito se financia con anuncios elegantes y discretos</li>
      <li>✅ <strong>App móvil</strong> - Próximamente disponible para iOS y Android</li>
    </ul>
    
    <div class="info-box">
      <p style="margin: 0;"><strong>💡 Nota importante:</strong> El módulo de check-in digital (envío al Ministerio del Interior) tendrá un coste de 2€/mes (+ IVA 21%), pero el PMS completo será gratis para siempre.</p>
    </div>
    
    <p>Te enviaremos otro email cuando falten 48 horas para que estés preparado. ¡Estamos muy emocionados de tenerte con nosotros!</p>
    
    <p>Si tienes alguna pregunta, no dudes en contactarnos en <a href="mailto:contacto@delfincheckin.com" style="color: #2563eb;">contacto@delfincheckin.com</a></p>
    
    <p style="margin-top: 30px;">¡Nos vemos pronto!</p>
    <p style="margin: 0;"><strong>El equipo de Delfín Check-in</strong></p>
  `);
  
  const text = `
¡Faltan solo 7 días, ${userName}!

Estamos muy cerca del lanzamiento de Delfín Check-in y queríamos recordarte que como Early Adopter, tendrás acceso prioritario al PMS completamente gratis.

7 DÍAS RESTANTES

Esto es lo que te espera cuando lancemos:

✅ PMS completo gratis para siempre - Gestión de reservas, habitaciones y más
✅ De propietarios, para propietarios - Hecho por personas que entienden tu negocio
✅ Sin costes ocultos - El plan gratuito se financia con anuncios elegantes y discretos
✅ App móvil - Próximamente disponible para iOS y Android

Nota importante: El módulo de check-in digital (envío al Ministerio del Interior) tendrá un coste de 2€/mes (+ IVA 21%), pero el PMS completo será gratis para siempre.

Te enviaremos otro email cuando falten 48 horas para que estés preparado. ¡Estamos muy emocionados de tenerte con nosotros!

Si tienes alguna pregunta, no dudes en contactarnos en contacto@delfincheckin.com

¡Nos vemos pronto!

El equipo de Delfín Check-in

© 2026 Delfín Check-in · delfincheckin.com
  `.trim();
  
  return {
    html,
    text,
    subject: '⏰ ¡Faltan 7 días para el lanzamiento de Delfín Check-in!'
  };
}

/**
 * Email: Faltan 48 horas con fecha de lanzamiento
 */
export function getWaitlistEmail48Hours(params: WaitlistEmailParams): { html: string; text: string; subject: string } {
  const { userName, launchDate } = params;
  
  if (!launchDate) {
    throw new Error('launchDate es requerido para el email de 48 horas');
  }
  
  const html = getBaseEmailTemplate(`
    <h2 style="color: #1d4ed8; margin-top: 0;">¡Faltan 48 horas, ${userName}!</h2>
    
    <p>¡Estamos a punto de lanzar Delfín Check-in! Como <strong>Early Adopter</strong>, tu acceso está garantizado.</p>
    
    <div class="countdown-box">
      <div class="countdown-number">48</div>
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #16a34a;">Horas restantes</p>
      <p style="margin: 10px 0 0; font-size: 16px; color: #15803d;"><strong>Fecha de lanzamiento: ${launchDate}</strong></p>
    </div>
    
    <div class="highlight-box">
      <p style="margin: 0;"><strong>🎉 ¡Tu cuenta estará lista el ${launchDate}!</strong></p>
      <p style="margin: 10px 0 0;">Recibirás un email con tu contraseña de acceso y el enlace para comenzar el onboarding. Estamos muy emocionados de tenerte con nosotros.</p>
    </div>
    
    <p>Cuando recibas el email de activación, podrás:</p>
    
    <ul style="line-height: 2;">
      <li>✅ Acceder a tu panel de administración</li>
      <li>✅ Completar el onboarding en menos de 5 minutos</li>
      <li>✅ Empezar a gestionar tus reservas inmediatamente</li>
      <li>✅ Configurar tus habitaciones y precios</li>
    </ul>
    
    <div class="info-box">
      <p style="margin: 0;"><strong>💡 Recordatorio:</strong> El módulo de check-in digital (envío al Ministerio del Interior) tendrá un coste de 2€/mes (+ IVA 21%), pero el PMS completo será gratis para siempre.</p>
    </div>
    
    <p>Si tienes alguna pregunta antes del lanzamiento, no dudes en contactarnos en <a href="mailto:contacto@delfincheckin.com" style="color: #2563eb;">contacto@delfincheckin.com</a></p>
    
    <p style="margin-top: 30px;">¡Nos vemos el ${launchDate}!</p>
    <p style="margin: 0;"><strong>El equipo de Delfín Check-in</strong></p>
  `);
  
  const text = `
¡Faltan 48 horas, ${userName}!

¡Estamos a punto de lanzar Delfín Check-in! Como Early Adopter, tu acceso está garantizado.

48 HORAS RESTANTES
Fecha de lanzamiento: ${launchDate}

🎉 ¡Tu cuenta estará lista el ${launchDate}!

Recibirás un email con tu contraseña de acceso y el enlace para comenzar el onboarding. Estamos muy emocionados de tenerte con nosotros.

Cuando recibas el email de activación, podrás:

✅ Acceder a tu panel de administración
✅ Completar el onboarding en menos de 5 minutos
✅ Empezar a gestionar tus reservas inmediatamente
✅ Configurar tus habitaciones y precios

Recordatorio: El módulo de check-in digital (envío al Ministerio del Interior) tendrá un coste de 2€/mes (+ IVA 21%), pero el PMS completo será gratis para siempre.

Si tienes alguna pregunta antes del lanzamiento, no dudes en contactarnos en contacto@delfincheckin.com

¡Nos vemos el ${launchDate}!

El equipo de Delfín Check-in

© 2026 Delfín Check-in · delfincheckin.com
  `.trim();
  
  return {
    html,
    text,
    subject: `🚀 ¡Faltan 48 horas! Tu cuenta estará lista el ${launchDate}`
  };
}

/**
 * Email: Confirmación final y onboarding (se envía cuando se activa)
 * Este email usa sendOnboardingEmail de mailer.ts, pero aquí está la estructura
 * para referencia
 */
export function getWaitlistActivationEmail(params: {
  userName: string;
  onboardingUrl: string;
  tempPassword: string;
}): { html: string; text: string; subject: string } {
  const { userName, onboardingUrl, tempPassword } = params;
  
  const html = getBaseEmailTemplate(`
    <h2 style="color: #1d4ed8; margin-top: 0;">¡Tu cuenta está lista, ${userName}!</h2>
    
    <p>¡Bienvenido a Delfín Check-in! Tu cuenta ha sido activada con el plan <strong>FREE</strong> y ya puedes empezar a gestionar tus alojamientos.</p>
    
    <div class="highlight-box">
      <p style="margin: 0;"><strong>🎉 Early Adopter:</strong> Como uno de los primeros en registrarte, tienes acceso completo al PMS de manera completamente gratuita para siempre.</p>
    </div>
    
    <p style="text-align: center;">
      <a href="${onboardingUrl}" class="button" style="color:#ffffff !important;">Comenzar Onboarding</a>
    </p>
    
    <div class="info-box">
      <p style="margin: 0 0 10px 0;"><strong>🔑 Contraseña temporal:</strong></p>
      <p style="margin: 0; font-size: 18px; font-family: monospace; letter-spacing: 2px; background: #f8f9fa; padding: 10px; border-radius: 4px; text-align: center;"><strong>${tempPassword}</strong></p>
      <p style="margin: 10px 0 0; font-size: 12px; color: #666;">Podrás cambiarla durante el proceso de onboarding.</p>
    </div>
    
    <p>El onboarding te llevará menos de 5 minutos y podrás empezar a usar el PMS inmediatamente después.</p>
    
    <p>Si tienes problemas para acceder, puedes usar este enlace directo:</p>
    <p style="word-break: break-all; color: #2563eb; font-size: 12px; background: #f8f9fa; padding: 10px; border-radius: 4px;">${onboardingUrl}</p>
    
    <div class="info-box">
      <p style="margin: 0;"><strong>⚠️ Importante:</strong> Si no ves este correo en tu bandeja de entrada, revisa la carpeta <strong>Spam/Correo no deseado</strong> y márcalo como <strong>No es spam</strong>.</p>
    </div>
    
    <p>Si tienes alguna pregunta, no dudes en contactarnos en <a href="mailto:contacto@delfincheckin.com" style="color: #2563eb;">contacto@delfincheckin.com</a></p>
    
    <p style="margin-top: 30px;">¡Esperamos que disfrutes usando Delfín Check-in!</p>
    <p style="margin: 0;"><strong>El equipo de Delfín Check-in</strong></p>
  `);
  
  const text = `
¡Tu cuenta está lista, ${userName}!

¡Bienvenido a Delfín Check-in! Tu cuenta ha sido activada con el plan FREE y ya puedes empezar a gestionar tus alojamientos.

🎉 Early Adopter: Como uno de los primeros en registrarte, tienes acceso completo al PMS de manera completamente gratuita para siempre.

Comenzar Onboarding: ${onboardingUrl}

🔑 Contraseña temporal: ${tempPassword}
Podrás cambiarla durante el proceso de onboarding.

El onboarding te llevará menos de 5 minutos y podrás empezar a usar el PMS inmediatamente después.

⚠️ Importante: Si no ves este correo en tu bandeja de entrada, revisa la carpeta Spam/Correo no deseado y márcalo como No es spam.

Si tienes alguna pregunta, no dudes en contactarnos en contacto@delfincheckin.com

¡Esperamos que disfrutes usando Delfín Check-in!

El equipo de Delfín Check-in

© 2026 Delfín Check-in · delfincheckin.com
  `.trim();
  
  return {
    html,
    text,
    subject: '🎉 ¡Tu cuenta de Delfín Check-in está lista! - Early Adopter'
  };
}

/**
 * Email: Encuesta para la waitlist (con tracking open/click)
 */
export function getWaitlistSurveyEmail(params: {
  userName: string;
  trackingId: string;
  adminBaseUrl: string;
}): { html: string; text: string; subject: string } {
  const { userName, trackingId, adminBaseUrl } = params;
  const openPixelUrl = `${adminBaseUrl}/api/track/email-open?tid=${trackingId}`;
  const surveyUrl = `https://delfincheckin.com/encuesta?tid=${encodeURIComponent(trackingId)}`;
  const clickTrackUrl = `${adminBaseUrl}/api/track/email-click?tid=${encodeURIComponent(trackingId)}&url=${encodeURIComponent(surveyUrl)}`;

  const content = `
    <img src="${openPixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />
    <h2 style="color: #1d4ed8; margin-top: 0;">¡Hola ${userName}! Nos importa tu opinión</h2>

    <p>Estás en la lista de espera de Delfín Check-in y estamos a punto de abrir el acceso. Para adaptar el software a lo que necesitas, nos ayudaría mucho que respondieras esta <strong>breve encuesta</strong> (menos de 2 minutos).</p>

    <p>Podrás decirnos:</p>
    <ul style="line-height: 1.8;">
      <li>Si te gustaría probar el software en acceso avanzado y darnos feedback</li>
      <li>Cuántas propiedades u habitaciones gestionas</li>
      <li>Qué software usas ahora y qué te gustaría que tuviera Delfín</li>
      <li>Qué plan te encajaría mejor (Básico, Check-in, Standard, Pro) y si el precio te parece adecuado</li>
    </ul>

    <p style="text-align: center; margin: 28px 0;">
      <a href="${clickTrackUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 18px;">📋 Ir a la encuesta</a>
    </p>

    <p>Gracias por ayudarnos a mejorar. Si tienes dudas, escríbenos a <a href="mailto:contacto@delfincheckin.com" style="color: #2563eb;">contacto@delfincheckin.com</a>.</p>

    <p style="margin-top: 30px;">El equipo de Delfín Check-in</p>
  `;

  const html = getBaseEmailTemplate(content);
  const text = `
¡Hola ${userName}! Nos importa tu opinión

Estás en la lista de espera de Delfín Check-in. Responde esta breve encuesta (menos de 2 minutos) para ayudarnos a adaptar el software a lo que necesitas:

${surveyUrl}

Gracias. El equipo de Delfín Check-in
  `.trim();

  return {
    html,
    text,
    subject: '📋 Encuesta Delfín Check-in – 2 minutos y nos ayudas mucho'
  };
}
