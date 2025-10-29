import nodemailer from 'nodemailer';

export function getTransport() {
  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

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

  await transporter.sendMail({
    from,
    to: params.to,
    subject: 'Tu acceso a Delfín Check-in - Completa el onboarding',
    html,
  });
}


