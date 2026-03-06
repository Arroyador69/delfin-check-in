/**
 * Emails automáticos para el sistema de referidos
 * Usa SMTP Zoho configurado en @/lib/email
 */

import { sendEmail } from '@/lib/email';
import { sql } from '@/lib/db';

/**
 * Envía email cuando un nuevo referido se registra
 */
export async function sendNewReferralEmail(
  referrerEmail: string,
  referrerName: string,
  referredName: string,
  referredPlan: 'free' | 'checkin' | 'standard' | 'pro'
): Promise<{ success: boolean; error?: string }> {
  try {
    const planName = referredPlan === 'free' ? 'Plan Gratis' : referredPlan === 'checkin' ? 'Plan Check-in' : referredPlan === 'standard' ? 'Plan Standard' : 'Plan Pro';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #44c0ff 0%, #0066cc 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #44c0ff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🐬 ¡Nuevo Referido Registrado!</h1>
            </div>
            <div class="content">
              <p>Hola ${referrerName},</p>
              <p>¡Excelentes noticias! <strong>${referredName}</strong> se ha registrado en Delfín Check-in usando tu enlace de referido.</p>
              <p><strong>Plan inicial:</strong> ${planName}</p>
              <p>Sigue compartiendo tu enlace de referido para conseguir más recompensas. Cada referido cuenta para tus objetivos.</p>
              <p style="text-align: center;">
                <a href="https://admin.delfincheckin.com/referrals" class="button">Ver Mis Referidos</a>
              </p>
              <p>Saludos,<br>El equipo de Delfín Check-in</p>
            </div>
            <div class="footer">
              <p>Delfín Check-in · Software de gestión hotelera</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await sendEmail({
      to: referrerEmail,
      subject: '🐬 ¡Nuevo Referido Registrado en Delfín Check-in!',
      html,
      text: `Hola ${referrerName},\n\n¡Excelentes noticias! ${referredName} se ha registrado en Delfín Check-in usando tu enlace de referido.\n\nPlan inicial: ${planName}\n\nSigue compartiendo tu enlace de referido para conseguir más recompensas.\n\nVer tus referidos: https://admin.delfincheckin.com/referrals\n\nSaludos,\nEl equipo de Delfín Check-in`,
    });

    return result;
  } catch (error: any) {
    console.error('Error enviando email de nuevo referido:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Envía email cuando un referido activa un plan de pago
 */
export async function sendReferralActivatedPlanEmail(
  referrerEmail: string,
  referrerName: string,
  referredName: string,
  planType: 'checkin' | 'standard' | 'pro'
): Promise<{ success: boolean; error?: string }> {
  try {
    const planName = planType === 'checkin' ? 'Plan Check-in' : planType === 'standard' ? 'Plan Standard' : 'Plan Pro';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #44c0ff 0%, #0066cc 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #44c0ff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 ¡Tu Referido Activó ${planName}!</h1>
            </div>
            <div class="content">
              <p>Hola ${referrerName},</p>
              <p>¡Excelente! <strong>${referredName}</strong> ha activado el <strong>${planName}</strong>.</p>
              <div class="highlight">
                <p><strong>💰 Esto te acerca más a conseguir recompensas:</strong></p>
                <ul>
                  ${(planType === 'checkin' || planType === 'standard') ? '<li>1 referido que paga Check-in o Standard = 1 mes gratis de Plan Check-in</li>' : ''}
                  <li>3 referidos activos en Check-in = 1 mes gratis de Plan Pro</li>
                  <li>5 referidos activos en Pro = 2 meses gratis de Plan Pro</li>
                </ul>
              </div>
              <p>Sigue compartiendo tu enlace de referido para conseguir más recompensas.</p>
              <p style="text-align: center;">
                <a href="https://admin.delfincheckin.com/referrals" class="button">Ver Mis Recompensas</a>
              </p>
              <p>Saludos,<br>El equipo de Delfín Check-in</p>
            </div>
            <div class="footer">
              <p>Delfín Check-in · Software de gestión hotelera</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await sendEmail({
      to: referrerEmail,
      subject: `🎉 ¡Tu Referido Activó ${planName}!`,
      html,
      text: `Hola ${referrerName},\n\n¡Excelente! ${referredName} ha activado el ${planName}.\n\nEsto te acerca más a conseguir recompensas.\n\nVer tus recompensas: https://admin.delfincheckin.com/referrals\n\nSaludos,\nEl equipo de Delfín Check-in`,
    });

    return result;
  } catch (error: any) {
    console.error('Error enviando email de referido activado:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Envía email cuando se consigue una recompensa
 */
export async function sendRewardGrantedEmail(
  referrerEmail: string,
  referrerName: string,
  rewardType: 'checkin_month' | 'pro_month' | 'pro_2months',
  months: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const rewardName = rewardType === 'checkin_month' ? `${months} mes${months > 1 ? 'es' : ''} gratis de Plan Check-in` :
                       rewardType === 'pro_month' ? `${months} mes gratis de Plan Pro` :
                       `${months} meses gratis de Plan Pro`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #44c0ff 0%, #0066cc 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .reward-box { background: #d4edda; padding: 20px; border-left: 4px solid #28a745; margin: 20px 0; text-align: center; }
            .reward-box h2 { color: #155724; margin: 0; }
            .button { display: inline-block; padding: 12px 30px; background: #44c0ff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎁 ¡Recompensa Otorgada!</h1>
            </div>
            <div class="content">
              <p>Hola ${referrerName},</p>
              <p>¡Felicitaciones! Has conseguido una nueva recompensa gracias a tus referidos.</p>
              <div class="reward-box">
                <h2>🎉 ${rewardName}</h2>
                <p>Estos créditos se aplicarán automáticamente cuando corresponda.</p>
              </div>
              <p>Los créditos se aplicarán automáticamente a tu cuenta. Sigue compartiendo tu enlace de referido para conseguir más recompensas.</p>
              <p style="text-align: center;">
                <a href="https://admin.delfincheckin.com/referrals" class="button">Ver Mis Créditos</a>
              </p>
              <p>Saludos,<br>El equipo de Delfín Check-in</p>
            </div>
            <div class="footer">
              <p>Delfín Check-in · Software de gestión hotelera</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await sendEmail({
      to: referrerEmail,
      subject: '🎁 ¡Recompensa Otorgada en Delfín Check-in!',
      html,
      text: `Hola ${referrerName},\n\n¡Felicitaciones! Has conseguido una nueva recompensa: ${rewardName}\n\nEstos créditos se aplicarán automáticamente cuando corresponda.\n\nVer tus créditos: https://admin.delfincheckin.com/referrals\n\nSaludos,\nEl equipo de Delfín Check-in`,
    });

    return result;
  } catch (error: any) {
    console.error('Error enviando email de recompensa:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Envía email cuando se aplica un crédito
 */
export async function sendCreditAppliedEmail(
  tenantEmail: string,
  tenantName: string,
  creditType: 'checkin' | 'pro',
  months: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const planName = creditType === 'checkin' ? 'Plan Check-in' : 'Plan Pro';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #44c0ff 0%, #0066cc 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .credit-box { background: #d1ecf1; padding: 20px; border-left: 4px solid #17a2b8; margin: 20px 0; text-align: center; }
            .credit-box h2 { color: #0c5460; margin: 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Crédito Aplicado</h1>
            </div>
            <div class="content">
              <p>Hola ${tenantName},</p>
              <p>Tu crédito de referidos ha sido aplicado a tu cuenta.</p>
              <div class="credit-box">
                <h2>🎁 ${months} mes${months > 1 ? 'es' : ''} gratis de ${planName}</h2>
                <p>Este mes no se te cobrará gracias a tus créditos acumulados.</p>
              </div>
              <p>Gracias por traer nuevos usuarios a Delfín Check-in. Sigue compartiendo tu enlace de referido para conseguir más recompensas.</p>
              <p>Saludos,<br>El equipo de Delfín Check-in</p>
            </div>
            <div class="footer">
              <p>Delfín Check-in · Software de gestión hotelera</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await sendEmail({
      to: tenantEmail,
      subject: `✅ Crédito Aplicado: ${months} mes${months > 1 ? 'es' : ''} gratis de ${planName}`,
      html,
      text: `Hola ${tenantName},\n\nTu crédito de referidos ha sido aplicado: ${months} mes${months > 1 ? 'es' : ''} gratis de ${planName}\n\nEste mes no se te cobrará gracias a tus créditos acumulados.\n\nSaludos,\nEl equipo de Delfín Check-in`,
    });

    return result;
  } catch (error: any) {
    console.error('Error enviando email de crédito aplicado:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Envía email cuando un referido cancela o tiene pago fallido
 */
export async function sendReferralStatusChangedEmail(
  referrerEmail: string,
  referrerName: string,
  referredName: string,
  status: 'cancelled' | 'past_due',
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const statusText = status === 'cancelled' ? 'canceló su suscripción' : 'tuvo un pago fallido';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #44c0ff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Actualización de Referido</h1>
            </div>
            <div class="content">
              <p>Hola ${referrerName},</p>
              <p>Te informamos que <strong>${referredName}</strong> ${statusText}.</p>
              <div class="info-box">
                <p><strong>${message}</strong></p>
                ${status === 'cancelled' 
                  ? '<p>Para mantener tus recompensas, necesitas seguir trayendo nuevos propietarios a Delfín Check-in.</p>'
                  : '<p>Si el pago falla de forma permanente, las recompensas asociadas a este referido pueden ser revocadas.</p>'}
              </div>
              <p>Sigue compartiendo tu enlace de referido para conseguir nuevos referidos y mantener tus recompensas.</p>
              <p style="text-align: center;">
                <a href="https://admin.delfincheckin.com/referrals" class="button">Ver Mis Referidos</a>
              </p>
              <p>Saludos,<br>El equipo de Delfín Check-in</p>
            </div>
            <div class="footer">
              <p>Delfín Check-in · Software de gestión hotelera</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await sendEmail({
      to: referrerEmail,
      subject: `⚠️ Actualización: Tu Referido ${statusText}`,
      html,
      text: `Hola ${referrerName},\n\nTe informamos que ${referredName} ${statusText}.\n\n${message}\n\nVer tus referidos: https://admin.delfincheckin.com/referrals\n\nSaludos,\nEl equipo de Delfín Check-in`,
    });

    return result;
  } catch (error: any) {
    console.error('Error enviando email de cambio de estado:', error);
    return { success: false, error: error.message };
  }
}
