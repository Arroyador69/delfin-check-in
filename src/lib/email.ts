/**
 * 📧 SISTEMA DE ENVÍO DE EMAILS CON ZOHO MAIL
 * 
 * Funcionalidades:
 * - Envío de emails de recuperación de contraseña
 * - Integración con Zoho Mail API
 * - Templates HTML responsivos
 * - Manejo de errores y fallbacks
 */

interface EmailConfig {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface RecoveryEmailData {
  to: string;
  userName: string;
  recoveryCode: string;
  tenantName: string;
}

// Configuración de Zoho Mail
const ZOHO_CONFIG = {
  apiUrl: process.env.ZOHO_MAIL_API_URL || 'https://mail.zoho.com/api/accounts',
  apiKey: process.env.ZOHO_MAIL_API_KEY || '',
  fromEmail: process.env.ZOHO_FROM_EMAIL || 'noreply@delfincheckin.com',
  fromName: process.env.ZOHO_FROM_NAME || 'Delfin Check-in'
};

/**
 * Envía un email usando Zoho Mail API
 */
async function sendEmail(config: EmailConfig): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Si no hay configuración de Zoho, simular envío
    if (!ZOHO_CONFIG.apiKey) {
      console.log('📧 Simulando envío de email (Zoho no configurado):', {
        to: config.to,
        subject: config.subject
      });
      
      return {
        success: true,
        messageId: `sim_${Date.now()}`,
        error: 'Email simulado - configura Zoho Mail API'
      };
    }

    // Preparar payload para Zoho Mail API
    const payload = {
      fromAddress: ZOHO_CONFIG.fromEmail,
      toAddress: config.to,
      subject: config.subject,
      htmlContent: config.html,
      textContent: config.text || config.subject
    };

    // Enviar email a través de Zoho Mail API
    const response = await fetch(`${ZOHO_CONFIG.apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${ZOHO_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Zoho Mail API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const result = await response.json();
    
    console.log(`✅ Email enviado exitosamente a ${config.to}:`, result.messageId);
    
    return {
      success: true,
      messageId: result.messageId
    };

  } catch (error) {
    console.error('❌ Error enviando email:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Genera el HTML para email de recuperación de contraseña
 */
function generateRecoveryEmailHTML(data: RecoveryEmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Código de Recuperación - ${data.tenantName}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .code-box { background: #fff; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
        .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Código de Recuperación</h1>
          <p>${data.tenantName}</p>
        </div>
        
        <div class="content">
          <h2>Hola ${data.userName},</h2>
          
          <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>${data.tenantName}</strong>.</p>
          
          <p>Utiliza el siguiente código de verificación para continuar:</p>
          
          <div class="code-box">
            <div class="code">${data.recoveryCode}</div>
          </div>
          
          <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul>
              <li>Este código expira en <strong>15 minutos</strong></li>
              <li>Si no solicitaste este cambio, ignora este email</li>
              <li>Nunca compartas este código con nadie</li>
            </ul>
          </div>
          
          <p>Si tienes problemas, contacta con el soporte técnico.</p>
          
          <p>Saludos,<br>
          <strong>Equipo de ${data.tenantName}</strong></p>
        </div>
        
        <div class="footer">
          <p>Este email fue enviado automáticamente. Por favor, no respondas a este mensaje.</p>
          <p>© ${new Date().getFullYear()} ${data.tenantName} - Delfin Check-in</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Envía email de recuperación de contraseña
 */
export async function sendRecoveryEmail(data: RecoveryEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const subject = `🔐 Código de recuperación - ${data.tenantName}`;
  const html = generateRecoveryEmailHTML(data);
  
  const textVersion = `
Código de Recuperación - ${data.tenantName}

Hola ${data.userName},

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.

Código de verificación: ${data.recoveryCode}

Este código expira en 15 minutos.

Si no solicitaste este cambio, ignora este email.

Saludos,
Equipo de ${data.tenantName}
  `.trim();

  return await sendEmail({
    from: ZOHO_CONFIG.fromEmail,
    to: data.to,
    subject: subject,
    html: html,
    text: textVersion
  });
}

/**
 * Verifica la configuración de email
 */
export function checkEmailConfig(): { configured: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!ZOHO_CONFIG.apiKey) {
    issues.push('ZOHO_MAIL_API_KEY no configurado');
  }
  
  if (!ZOHO_CONFIG.fromEmail) {
    issues.push('ZOHO_FROM_EMAIL no configurado');
  }
  
  return {
    configured: issues.length === 0,
    issues
  };
}
