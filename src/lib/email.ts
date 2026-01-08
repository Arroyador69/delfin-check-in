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
  apiUrl: process.env.ZOHO_MAIL_API_URL || 'https://mail.zoho.eu/api/accounts',
  clientId: process.env.ZOHO_CLIENT_ID || '',
  clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
  refreshToken: process.env.ZOHO_REFRESH_TOKEN || process.env.ZOHO_MAIL_API_KEY || '',
  fromEmail: process.env.ZOHO_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || 'noreply@delfincheckin.com',
  fromName: process.env.ZOHO_FROM_NAME || process.env.SMTP_FROM_NAME || 'Delfin Check-in'
};

// Configuración SMTP alternativa
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || '',
  port: process.env.SMTP_PORT || '587',
  user: process.env.SMTP_USER || '',
  password: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || ZOHO_CONFIG.fromEmail
};

/**
 * Obtiene un access token de Zoho usando el refresh token
 */
async function getZohoAccessToken(): Promise<string | null> {
  if (!ZOHO_CONFIG.clientId || !ZOHO_CONFIG.clientSecret || !ZOHO_CONFIG.refreshToken) {
    console.log('⚠️ Configuración de Zoho incompleta');
    return null;
  }

  try {
    const response = await fetch('https://accounts.zoho.eu/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: ZOHO_CONFIG.refreshToken,
        client_id: ZOHO_CONFIG.clientId,
        client_secret: ZOHO_CONFIG.clientSecret,
        grant_type: 'refresh_token'
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.access_token;
    } else {
      console.error('❌ Error obteniendo access token de Zoho:', response.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Error en getZohoAccessToken:', error);
    return null;
  }
}

/**
 * Envía un email usando múltiples métodos
 */
export async function sendEmail(config: EmailConfig): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Usar 'from' del config si viene, si no usar la configuración SMTP/Zoho
    const fromEmail = config.from || SMTP_CONFIG.from || ZOHO_CONFIG.fromEmail;
    
    console.log('📧 Configurando envío de email...', {
      to: config.to,
      from: fromEmail,
      subject: config.subject,
      hasZohoRefreshToken: !!ZOHO_CONFIG.refreshToken,
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasSmtpConfig: !!(SMTP_CONFIG.host && SMTP_CONFIG.user && SMTP_CONFIG.password),
      smtpHost: SMTP_CONFIG.host,
      smtpUser: SMTP_CONFIG.user,
      availableEnvVars: Object.keys(process.env).filter(key => 
        key.includes('SMTP') || key.includes('ZOHO') || key.includes('RESEND') || key.includes('MAIL')
      )
    });

    // MÉTODO 1: Intentar con SMTP directo PRIMERO (más confiable para Zoho)
    if (SMTP_CONFIG.host && SMTP_CONFIG.user && SMTP_CONFIG.password) {
      try {
        console.log('🔵 Intentando envío con SMTP directo (Zoho)...');
        
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
          host: SMTP_CONFIG.host,
          port: parseInt(SMTP_CONFIG.port),
          secure: SMTP_CONFIG.port === '465', // true para 465, false para otros puertos
          auth: {
            user: SMTP_CONFIG.user,
            pass: SMTP_CONFIG.password
          },
          tls: {
            // No fallar en certificados inválidos
            rejectUnauthorized: false
          }
        });

        // Verificar conexión SMTP
        await transporter.verify();
        console.log('✅ Conexión SMTP verificada correctamente');

        const info = await transporter.sendMail({
          from: fromEmail,
          to: config.to,
          subject: config.subject,
          html: config.html,
          text: config.text
        });

        console.log(`✅ Email enviado exitosamente con SMTP a ${config.to}:`, info.messageId);
        
        // Registrar en tracking
        try {
          const { trackEmail } = await import('@/lib/tracking');
          await trackEmail({
            tenantId: (config as any).tenantId,
            emailType: (config as any).emailType || 'custom',
            recipientEmail: config.to,
            subject: config.subject,
            messageId: info.messageId,
            status: 'sent',
            metadata: { provider: 'smtp' }
          });
        } catch (trackError) {
          console.error('⚠️ Error tracking email:', trackError);
        }
        
        return {
          success: true,
          messageId: info.messageId
        };
      } catch (smtpError: any) {
        console.log('⚠️ Error con SMTP:', smtpError.message || smtpError);
        // Continuar con otros métodos si SMTP falla
      }
    }

    // Método 2: Intentar con Zoho Mail API si está configurado
    console.log('🔍 Verificando Zoho Mail:', {
      hasRefreshToken: !!ZOHO_CONFIG.refreshToken,
      refreshTokenLength: ZOHO_CONFIG.refreshToken?.length || 0,
      condition: ZOHO_CONFIG.refreshToken && ZOHO_CONFIG.refreshToken.length > 10
    });
    
    if (ZOHO_CONFIG.refreshToken && ZOHO_CONFIG.refreshToken.length > 10) {
      try {
        console.log('🔵 Intentando envío con Zoho Mail...');
        
        // Obtener access token usando refresh token
        const accessToken = await getZohoAccessToken();
        if (!accessToken) {
          throw new Error('No se pudo obtener access token de Zoho');
        }
        
        const payload = {
          fromAddress: ZOHO_CONFIG.fromEmail,
          toAddress: config.to,
          subject: config.subject,
          htmlContent: config.html,
          textContent: config.text || config.subject
        };

        console.log('📧 Enviando a Zoho Mail API:', {
          url: `${ZOHO_CONFIG.apiUrl}/messages`,
          payload: payload,
          hasAccessToken: !!accessToken
        });

        const response = await fetch(`${ZOHO_CONFIG.apiUrl}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Email enviado exitosamente con Zoho a ${config.to}:`, result.messageId);
          
          // Registrar en tracking
          try {
            const { trackEmail } = await import('@/lib/tracking');
            await trackEmail({
              tenantId: (config as any).tenantId,
              emailType: (config as any).emailType || 'custom',
              recipientEmail: config.to,
              subject: config.subject,
              messageId: result.messageId,
              status: 'sent',
              metadata: { provider: 'zoho' }
            });
          } catch (trackError) {
            console.error('⚠️ Error tracking email:', trackError);
          }
          
          return {
            success: true,
            messageId: result.messageId
          };
        } else {
          const errorText = await response.text();
          console.log('⚠️ Zoho Mail falló:', response.status, errorText);
        }
      } catch (zohoError) {
        console.log('⚠️ Error con Zoho Mail:', zohoError.message);
      }
    }

    // Método 2: Usar Resend (más confiable)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        console.log('🔵 Intentando envío con Resend...');
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: ZOHO_CONFIG.fromEmail,
            to: [config.to],
            subject: config.subject,
            html: config.html,
            text: config.text
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Email enviado exitosamente con Resend a ${config.to}:`, result.id);
          
          // Registrar en tracking
          try {
            const { trackEmail } = await import('@/lib/tracking');
            await trackEmail({
              tenantId: (config as any).tenantId,
              emailType: (config as any).emailType || 'custom',
              recipientEmail: config.to,
              subject: config.subject,
              messageId: result.id,
              status: 'sent',
              metadata: { provider: 'resend' }
            });
          } catch (trackError) {
            console.error('⚠️ Error tracking email:', trackError);
          }
          
          return {
            success: true,
            messageId: result.id
          };
        }
      } catch (resendError) {
        console.log('⚠️ Error con Resend:', resendError.message);
      }
    }

    // SMTP ya se intentó primero, si llegamos aquí es que falló

    // Si llegamos aquí, ningún método funcionó
    console.log('❌ Todos los métodos de envío fallaron');
    
    // Registrar en tracking aunque haya fallado
    try {
      const { trackEmail } = await import('@/lib/tracking');
      await trackEmail({
        tenantId: (config as any).tenantId,
        emailType: (config as any).emailType || 'custom',
        recipientEmail: config.to,
        subject: config.subject,
        status: 'failed',
        metadata: { error: 'No se pudo enviar el email con ningún método disponible' }
      });
    } catch (trackError) {
      console.error('⚠️ Error tracking failed email:', trackError);
    }
    
    return {
      success: false,
      error: 'No se pudo enviar el email con ningún método disponible'
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
  
  if (!ZOHO_CONFIG.refreshToken) {
    issues.push('ZOHO_REFRESH_TOKEN no configurado');
  }
  
  if (!ZOHO_CONFIG.fromEmail) {
    issues.push('ZOHO_FROM_EMAIL no configurado');
  }
  
  return {
    configured: issues.length === 0,
    issues
  };
}
