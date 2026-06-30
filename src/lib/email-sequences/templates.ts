import {
  MIR_CREDENTIALS_VIDEO_ID,
  MIR_CREDENTIALS_VIDEO_URL,
  ONBOARDING_VIDEO_ID,
  ONBOARDING_VIDEO_URL,
} from '@/lib/email-sequences/constants';
import { getMirVideoThumbnailUrl, getOnboardingVideoThumbnailUrl } from '@/lib/email-sequences/schema';

export interface LifecycleTemplateParams {
  ownerName: string;
  onboardingUrl: string;
  billingUrl: string;
  /** Checkout Plan Check-in (Fase 2 — upsell principal). */
  checkinUpgradeUrl: string;
  unsubscribeUrl: string;
  daysSinceSignup?: number;
  onboardingStatus?: string | null;
  currentRooms?: number;
}

export interface LifecycleEmailContent {
  subject: string;
  html: string;
  text: string;
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(value: string): string {
  return esc(value);
}

function firstName(fullName: string): string {
  const n = fullName.trim().split(/\s+/)[0];
  return n || 'Propietario';
}

function wrapEmail(body: string, unsubscribeUrl: string): string {
  const unsub = escAttr(unsubscribeUrl);
  const unsubPlain = esc(unsubscribeUrl);
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06);">
        <tr>
          <td style="background:linear-gradient(135deg,#44c0ff 0%,#2563eb 100%);padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:26px;font-weight:700;color:#ffffff;">🐬 Delfín Check-in</p>
          </td>
        </tr>
        ${body}
        <!-- LIFECYCLE_ANTIVIRUS_BLOCK -->
        <tr>
          <td style="padding:24px 32px 28px 32px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#64748b;text-align:center;">
            <p style="margin:0 0 8px 0;">© 2026 Delfín Check-in · <a href="https://delfincheckin.com" style="color:#2563eb;">delfincheckin.com</a></p>
            <p style="margin:0 0 8px 0;">Recibes este email porque creaste una cuenta en Delfín Check-in.</p>
            <p style="margin:0;"><a href="${unsub}" target="_blank" rel="noopener noreferrer" style="color:#64748b;">Darme de baja de estos recordatorios</a></p>
            <p style="margin:8px 0 0 0;font-size:11px;color:#94a3b8;word-break:break-all;">${unsubPlain}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px auto;">
    <tr><td style="border-radius:8px;background:#2563eb;">
      <a href="${escAttr(href)}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(label)}</a>
    </td></tr>
  </table>`;
}

function contentBlock(inner: string): string {
  return `<tr><td style="padding:28px 32px 8px 32px;font-size:16px;line-height:1.65;color:#334155;">${inner}</td></tr>`;
}

function infoBox(inner: string, color = '#eff6ff', border = '#2563eb'): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${color};border-left:4px solid ${border};border-radius:6px;margin:16px 0;">
    <tr><td style="padding:16px 18px;font-size:14px;line-height:1.55;color:#1e293b;">${inner}</td></tr>
  </table>`;
}

function videoBlock(videoUrl: string, thumbnailUrl: string, label: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;">
    <tr><td align="center">
      <a href="${escAttr(videoUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:block;">
        <img src="${escAttr(thumbnailUrl)}" alt="${escAttr(label)}" width="520" style="max-width:100%;border-radius:8px;border:0;display:block;" />
      </a>
      <p style="margin:10px 0 0 0;font-size:14px;color:#2563eb;text-align:center;">
        <a href="${escAttr(videoUrl)}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;font-weight:600;">▶ ${esc(label)}</a>
      </p>
    </td></tr>
  </table>`;
}

function onboardingStepsBox(): string {
  return infoBox(
    `<strong>Los 6 pasos del onboarding</strong> (≈15 min, también desde el móvil):<br/>
    1️⃣ Contraseña segura<br/>
    2️⃣ Datos del alojamiento<br/>
    3️⃣ Plan y pago (si aplica)<br/>
    4️⃣ Credenciales MIR (vídeo incluido)<br/>
    5️⃣ Primera unidad / habitación<br/>
    6️⃣ Cobros con Stripe (opcional)`,
    '#f0f9ff',
    '#0284c7'
  );
}

const TEMPLATES: Record<
  string,
  (p: LifecycleTemplateParams) => LifecycleEmailContent
> = {
  p1_welcome: (p) => {
    const name = firstName(p.ownerName);
    const thumb = getOnboardingVideoThumbnailUrl();
    const subject = `${name}, termina la configuración de tu alojamiento (6 pasos)`;
    const body = contentBlock(`
      <h1 style="margin:0 0 16px 0;font-size:22px;color:#0f172a;">Hola ${esc(name)},</h1>
      <p style="margin:0 0 12px 0;">Creaste tu cuenta en <strong>Delfín Check-in</strong> pero aún no has terminado de <strong>configurar tu alojamiento</strong>. Es un asistente guiado de 6 pasos — no hace falta ser técnico.</p>
      ${onboardingStepsBox()}
      ${videoBlock(ONBOARDING_VIDEO_URL, thumb, 'Ver vídeo: recorrido del onboarding (≈2 min)')}
      ${infoBox('<strong>Plan gratuito:</strong> puedes configurar tu alojamiento y las credenciales MIR para el parte de viajeros sin coste de suscripción.')}
      ${ctaButton(p.onboardingUrl, 'Continuar mi configuración')}
      <p style="margin:16px 0 0 0;font-size:13px;color:#64748b;">Si el botón no funciona, copia este enlace en el navegador del móvil:<br/><span style="word-break:break-all;">${esc(p.onboardingUrl)}</span></p>
    `);
    return {
      subject,
      html: wrapEmail(body, p.unsubscribeUrl),
      text: `Hola ${name},\n\nContinúa tu configuración en Delfín Check-in:\n${p.onboardingUrl}\n\nBaja: ${p.unsubscribeUrl}`,
    };
  },

  p1_video: (p) => {
    const name = firstName(p.ownerName);
    const thumb = getOnboardingVideoThumbnailUrl();
    const subject = `${name}, te enseño en 2 minutos cómo completar el onboarding`;
    const body = contentBlock(`
      <h1 style="margin:0 0 16px 0;font-size:22px;color:#0f172a;">${esc(name)}, no hace falta ser técnico</h1>
      <p style="margin:0 0 12px 0;">Preparé un vídeo corto donde te muestro paso a paso cómo completar el onboarding de Delfín Check-in: datos del negocio, unidades e integración con el registro de viajeros.</p>
      ${videoBlock(ONBOARDING_VIDEO_URL, thumb, 'Ver vídeo: completar onboarding (≈2 min)')}
      ${infoBox('No enviamos nada al SES/MIR hasta que tú lo confirmes. Configuras primero, pruebas cuando quieras.')}
      ${ctaButton(p.onboardingUrl, 'Abrir mi onboarding')}
    `);
    return {
      subject,
      html: wrapEmail(body, p.unsubscribeUrl),
      text: `Hola ${name},\n\nVídeo onboarding: ${ONBOARDING_VIDEO_URL}\n\nContinuar: ${p.onboardingUrl}\n\nBaja: ${p.unsubscribeUrl}`,
    };
  },

  p1_mir_video: (p) => {
    const name = firstName(p.ownerName);
    const thumb = getMirVideoThumbnailUrl();
    const subject = `${name}, configura tus credenciales MIR (parte de viajeros)`;
    const body = contentBlock(`
      <h1 style="margin:0 0 16px 0;font-size:22px;color:#0f172a;">El paso clave: credenciales MIR</h1>
      <p style="margin:0 0 12px 0;">Para enviar el <strong>parte de viajeros</strong> al registro oficial (SES/MIR) necesitas conectar tus credenciales. En el <strong>plan gratuito</strong> también puedes configurarlo y probarlo cuando quieras.</p>
      ${videoBlock(MIR_CREDENTIALS_VIDEO_URL, thumb, 'Ver vídeo: configurar credenciales MIR paso a paso')}
      ${infoBox('<strong>Importante:</strong> Delfín Check-in no envía nada al MIR hasta que tú lo confirmes. Primero configuras, luego pruebas con calma.', '#f0fdf4', '#16a34a')}
      ${ctaButton(p.onboardingUrl, 'Configurar credenciales MIR ahora')}
    `);
    return {
      subject,
      html: wrapEmail(body, p.unsubscribeUrl),
      text: `Hola ${name},\n\nVídeo credenciales MIR: ${MIR_CREDENTIALS_VIDEO_URL}\n\nOnboarding: ${p.onboardingUrl}\n\nBaja: ${p.unsubscribeUrl}`,
    };
  },

  p1_social_proof: (p) => {
    const name = firstName(p.ownerName);
    const subject = `${name}, check-in digital + parte de viajeros automático`;
    const body = contentBlock(`
      <h1 style="margin:0 0 16px 0;font-size:22px;color:#0f172a;">Tus huéspedes rellenan el formulario solos</h1>
      <p style="margin:0 0 12px 0;">Con Delfín Check-in el huésped recibe un enlace, completa sus datos desde el móvil y tú recibes el parte listo para el <strong>registro de viajeros</strong> — sin papeles ni perseguir documentación.</p>
      ${infoBox('<strong>En plan gratuito consigues:</strong><br/>✓ Formulario digital para huéspedes<br/>✓ Panel para gestionar reservas y unidades<br/>✓ Conexión MIR para enviar el parte de viajeros<br/>✓ Vídeo guía MIR: <a href="' + escAttr(MIR_CREDENTIALS_VIDEO_URL) + '" style="color:#2563eb;">Ver tutorial</a>', '#f0fdf4', '#16a34a')}
      ${ctaButton(p.onboardingUrl, 'Configurar mi primera unidad')}
    `);
    return {
      subject,
      html: wrapEmail(body, p.unsubscribeUrl),
      text: `Hola ${name},\n\nConfigura tu primera unidad: ${p.onboardingUrl}\n\nBaja: ${p.unsubscribeUrl}`,
    };
  },

  p1_resume: (p) => {
    const name = firstName(p.ownerName);
    const statusLabel =
      p.onboardingStatus === 'in_progress'
        ? 'a medias'
        : 'sin empezar';
    const subject = `${name}, retoma tu configuración (${statusLabel})`;
    const body = contentBlock(`
      <h1 style="margin:0 0 16px 0;font-size:22px;color:#0f172a;">¿Te quedaste a medias?</h1>
      <p style="margin:0 0 12px 0;">Tu configuración está <strong>${esc(statusLabel)}</strong>. Retómala con un clic: el asistente te indica qué hacer en cada paso (también desde el móvil).</p>
      ${onboardingStepsBox()}
      ${videoBlock(ONBOARDING_VIDEO_URL, getOnboardingVideoThumbnailUrl(), 'Ver vídeo del onboarding')}
      ${infoBox('Tu cuenta sigue activa. Terminar la configuración no tiene coste adicional en plan gratuito.')}
      ${ctaButton(p.onboardingUrl, 'Retomar donde lo dejé')}
    `);
    return {
      subject,
      html: wrapEmail(body, p.unsubscribeUrl),
      text: `Hola ${name},\n\nRetoma tu onboarding: ${p.onboardingUrl}\n\nBaja: ${p.unsubscribeUrl}`,
    };
  },

  p1_help: (p) => {
    const name = firstName(p.ownerName);
    const subject = `${name}, ¿te ayudamos 15 minutos a configurarlo?`;
    const body = contentBlock(`
      <h1 style="margin:0 0 16px 0;font-size:22px;color:#0f172a;">Estamos aquí para ayudarte</h1>
      <p style="margin:0 0 12px 0;">Si algo del onboarding o del registro de viajeros te genera dudas, podemos hacer una llamada rápida de 15 minutos y dejarlo listo contigo.</p>
      ${infoBox('Escríbenos a <a href="mailto:soporte@delfincheckin.com" style="color:#2563eb;">soporte@delfincheckin.com</a> con el asunto <strong>Ayuda onboarding</strong> y te proponemos horario.')}
      ${ctaButton(p.onboardingUrl, 'Intentarlo de nuevo ahora')}
    `);
    return {
      subject,
      html: wrapEmail(body, p.unsubscribeUrl),
      text: `Hola ${name},\n\nAyuda: soporte@delfincheckin.com\n\nOnboarding: ${p.onboardingUrl}\n\nBaja: ${p.unsubscribeUrl}`,
    };
  },

  p1_last_push: (p) => {
    const name = firstName(p.ownerName);
    const subject = `${name}, tu cuenta sigue esperándote (≈10 min)`;
    const body = contentBlock(`
      <h1 style="margin:0 0 16px 0;font-size:22px;color:#0f172a;">Último recordatorio amable</h1>
      <p style="margin:0 0 12px 0;">Tu cuenta en Delfín Check-in sigue activa, pero sin completar la configuración no puedes usar el check-in digital ni cumplir cómodamente con el registro de viajeros.</p>
      ${infoBox('Recuerda: con el plan gratuito puedes configurar tus credenciales MIR y enviar el parte de viajeros. Te dejamos el vídeo por si te ayuda: <a href="' + escAttr(MIR_CREDENTIALS_VIDEO_URL) + '" style="color:#2563eb;">Configurar credenciales MIR</a>')}
      ${ctaButton(p.onboardingUrl, 'Terminar ahora (≈10 min)')}
      <p style="margin:16px 0 0 0;font-size:13px;color:#64748b;">Vídeos guía: <a href="${escAttr(ONBOARDING_VIDEO_URL)}" style="color:#2563eb;">Onboarding</a> · <a href="${escAttr(MIR_CREDENTIALS_VIDEO_URL)}" style="color:#2563eb;">Credenciales MIR</a></p>
    `);
    return {
      subject,
      html: wrapEmail(body, p.unsubscribeUrl),
      text: `Hola ${name},\n\nTermina tu configuración: ${p.onboardingUrl}\n\nVídeo: ${ONBOARDING_VIDEO_URL}\n\nBaja: ${p.unsubscribeUrl}`,
    };
  },

  p1_reengagement: (p) => {
    const name = firstName(p.ownerName);
    const subject = `¿Viste nuestro mensaje, ${name}? Tu acceso sigue activo`;
    const body = contentBlock(`
      <h1 style="margin:0 0 16px 0;font-size:22px;color:#0f172a;">Te escribimos de nuevo por si se perdió el anterior</h1>
      <p style="margin:0 0 12px 0;">Queríamos asegurarnos de que recibiste la invitación para completar tu configuración en Delfín Check-in.</p>
      ${videoBlock(ONBOARDING_VIDEO_URL, getOnboardingVideoThumbnailUrl(), 'Ver vídeo: completar onboarding')}
      ${ctaButton(p.onboardingUrl, 'Acceder a mi cuenta')}
    `);
    return {
      subject,
      html: wrapEmail(body, p.unsubscribeUrl),
      text: `Hola ${name},\n\nAccede: ${p.onboardingUrl}\n\nBaja: ${p.unsubscribeUrl}`,
    };
  },

  p2_unlock: (p) => {
    const name = firstName(p.ownerName);
    const subject = `${name}, activa el envío automático al Ministerio del Interior`;
    const body = contentBlock(`
      <h1 style="margin:0 0 16px 0;font-size:22px;color:#0f172a;">¡Enhorabuena, ${esc(name)}!</h1>
      <p style="margin:0 0 12px 0;">Ya tienes tu alojamiento configurado en Delfín Check-in. El siguiente paso natural para muchos propietarios es <strong>automatizar el parte de viajeros</strong> y el envío al registro oficial (SES/MIR, RD 933/2021).</p>
      ${infoBox('<strong>Plan gratuito:</strong> formulario digital, panel y credenciales MIR para probar el flujo.<br/><strong>Plan Check-in:</strong> envío automático al Ministerio del Interior, check-in digital completo y soporte prioritario — desde <strong>2€/mes + 2€/propiedad</strong>.', '#f0fdf4', '#16a34a')}
      ${ctaButton(p.checkinUpgradeUrl, 'Activar Plan Check-in')}
      <p style="margin:16px 0 0 0;font-size:13px;color:#64748b;">¿Solo quieres comparar? <a href="${escAttr(p.billingUrl)}" style="color:#2563eb;">Ver todos los planes en el panel</a></p>
    `);
    return {
      subject,
      html: wrapEmail(body, p.unsubscribeUrl),
      text: `Hola ${name},\n\nActiva Plan Check-in: ${p.checkinUpgradeUrl}\n\nVer todos los planes: ${p.billingUrl}\n\nBaja: ${p.unsubscribeUrl}`,
    };
  },

  p2_use_case: (p) => {
    const name = firstName(p.ownerName);
    const rooms = Math.max(1, p.currentRooms ?? 1);
    const multiUnit = rooms > 1;
    const subject = multiUnit
      ? `${name}, automatiza el MIR en tus ${rooms} unidades`
      : `${name}, tus huéspedes rellenan el formulario — Delfín envía al MIR`;
    const growthNote = multiUnit
      ? '<br/><br/>Con varias unidades, el <strong>Plan Check-in</strong> centraliza el envío legal. Si más adelante quieres más propiedades sin anuncios, en el panel verás Standard y Pro.'
      : '';
    const body = contentBlock(`
      <h1 style="margin:0 0 16px 0;font-size:22px;color:#0f172a;">Menos papeles, más cumplimiento</h1>
      <p style="margin:0 0 12px 0;">El huésped recibe un enlace, completa sus datos desde el móvil y tú recibes el parte listo. Con el <strong>Plan Check-in</strong>, Delfín puede enviarlo al <strong>Ministerio del Interior</strong> por ti, sin perseguir documentación ni hacerlo a mano.</p>
      ${infoBox('<strong>Ideal si:</strong> quieres cumplir con el registro de viajeros sin complicarte · necesitas el envío MIR automático · ya usas el panel y quieres dar el siguiente paso.' + growthNote, '#eff6ff', '#2563eb')}
      ${ctaButton(p.checkinUpgradeUrl, 'Ver Plan Check-in')}
    `);
    return {
      subject,
      html: wrapEmail(body, p.unsubscribeUrl),
      text: `Hola ${name},\n\nPlan Check-in: ${p.checkinUpgradeUrl}\n\nBaja: ${p.unsubscribeUrl}`,
    };
  },

  p2_offer: (p) => {
    const name = firstName(p.ownerName);
    const subject = `${name}, Plan Check-in — envío MIR automático desde 2€/mes`;
    const body = contentBlock(`
      <h1 style="margin:0 0 16px 0;font-size:22px;color:#0f172a;">El plan que encaja cuando ya usas Delfín</h1>
      <p style="margin:0 0 12px 0;">Recomendamos el <strong>Plan Check-in</strong> como primer paso de pago: check-in digital, envío automático al Ministerio del Interior y soporte prioritario.</p>
      ${infoBox('✓ Parte de viajeros automatizado<br/>✓ Envío al registro oficial (MIR)<br/>✓ Desde 2€/mes + 2€ por propiedad adicional<br/>✓ Pago seguro en la web (Polar) — sin sorpresas', '#fef3c7', '#f59e0b')}
      ${ctaButton(p.checkinUpgradeUrl, 'Activar Plan Check-in ahora')}
      <p style="margin:16px 0 0 0;font-size:13px;color:#64748b;">¿Gestionas muchas unidades o quieres funciones avanzadas? <a href="${escAttr(p.billingUrl)}" style="color:#2563eb;">Comparar Standard y Pro</a> · ¿Dudas? soporte@delfincheckin.com</p>
    `);
    return {
      subject,
      html: wrapEmail(body, p.unsubscribeUrl),
      text: `Hola ${name},\n\nActivar Check-in: ${p.checkinUpgradeUrl}\n\nComparar planes: ${p.billingUrl}\n\nBaja: ${p.unsubscribeUrl}`,
    };
  },

  p2_questions: (p) => {
    const name = firstName(p.ownerName);
    const subject = `${name}, ¿qué plan necesitas? Te orientamos`;
    const body = contentBlock(`
      <h1 style="margin:0 0 16px 0;font-size:22px;color:#0f172a;">Estamos a un email de distancia</h1>
      <p style="margin:0 0 12px 0;">Resumen rápido:</p>
      ${infoBox('<strong>Solo cumplir con el parte de viajeros / MIR</strong> → Plan Check-in (nuestra recomendación para empezar)<br/><strong>Varias propiedades sin anuncios</strong> → Plan Standard<br/><strong>Google, reputación y reservas directas avanzadas</strong> → Plan Pro', '#f8fafc', '#64748b')}
      <p style="margin:0 0 12px 0;">Cuéntanos cuántas unidades gestionas y te orientamos sin compromiso.</p>
      ${infoBox('Email: <a href="mailto:soporte@delfincheckin.com" style="color:#2563eb;">soporte@delfincheckin.com</a>')}
      ${ctaButton(p.checkinUpgradeUrl, 'Empezar con Plan Check-in')}
      <p style="margin:12px 0 0 0;font-size:13px;color:#64748b;"><a href="${escAttr(p.billingUrl)}" style="color:#2563eb;">Ver comparativa completa en el panel</a></p>
    `);
    return {
      subject,
      html: wrapEmail(body, p.unsubscribeUrl),
      text: `Hola ${name},\n\nPlan Check-in: ${p.checkinUpgradeUrl}\n\nComparar: ${p.billingUrl}\n\nBaja: ${p.unsubscribeUrl}`,
    };
  },
};

export function renderLifecycleTemplate(
  templateKey: string,
  params: LifecycleTemplateParams
): LifecycleEmailContent {
  const fn = TEMPLATES[templateKey];
  if (!fn) {
    throw new Error(`Plantilla lifecycle desconocida: ${templateKey}`);
  }
  return fn(params);
}

export { ONBOARDING_VIDEO_URL, ONBOARDING_VIDEO_ID };
