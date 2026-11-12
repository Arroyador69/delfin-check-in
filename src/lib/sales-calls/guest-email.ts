import { sendEmail } from '@/lib/email';
import { salesCallPublicBase } from './constants';

export function salesCallManageUrl(token: string): string {
  return `${salesCallPublicBase()}/es/reserva-llamada/gestionar?token=${encodeURIComponent(token)}`;
}

function wrap(body: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px 24px;color:#0f172a;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#0284c7;">Delfín Check-in</p>
    ${body}
    <p style="margin:28px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">Equipo comercial · llamadas de 15 min · hora de Madrid</p>
  </div></body></html>`;
}

export async function sendSalesCallConfirmationEmail(opts: {
  to: string;
  name: string;
  dateLabel: string;
  timeLabel: string;
  meetingUrl: string;
  manageToken: string;
}): Promise<boolean> {
  const manageUrl = salesCallManageUrl(opts.manageToken);
  const html = wrap(`
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">Llamada confirmada</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#334155;">
      Hola ${escapeHtml(opts.name.split(' ')[0] || opts.name)}, tu llamada de <strong>15 minutos</strong> queda así:
    </p>
    <p style="margin:0 0 20px;padding:14px 16px;background:#f0f9ff;border-radius:10px;font-size:15px;line-height:1.5;">
      <strong>${escapeHtml(opts.dateLabel)}</strong><br/>
      <strong style="font-size:18px;">${escapeHtml(opts.timeLabel)}</strong> <span style="color:#64748b;">(Madrid)</span>
    </p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#475569;">
      Es puntual: empezamos a la hora en punto. Si llegas tarde puede que hayamos pasado a la siguiente cita.
    </p>
    ${
      opts.meetingUrl && !opts.meetingUrl.startsWith('Te enviaremos')
        ? `<p style="margin:0 0 20px;"><a href="${escapeAttr(opts.meetingUrl)}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:10px;">Abrir videollamada</a></p>`
        : ''
    }
    <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;">
      ¿Necesitas <strong>cambiar de hora</strong> o <strong>cancelar</strong>? Usa este enlace (importante para no ocupar el hueco):<br/>
      <a href="${escapeAttr(manageUrl)}" style="color:#0284c7;">${escapeHtml(manageUrl)}</a>
    </p>
  `);

  const r = await sendEmail({
    to: opts.to,
    subject: `Confirmada: llamada ${opts.dateLabel} · ${opts.timeLabel}`,
    html,
    text: `Llamada confirmada: ${opts.dateLabel} ${opts.timeLabel} (Madrid). Videollamada: ${opts.meetingUrl}. Cambiar/cancelar: ${manageUrl}`,
    skipSuppression: true,
  });
  return r.success;
}

export async function sendSalesCallReminderEmail(opts: {
  to: string;
  name: string;
  dateLabel: string;
  timeLabel: string;
  meetingUrl: string;
  manageToken: string;
}): Promise<boolean> {
  const manageUrl = salesCallManageUrl(opts.manageToken);
  const html = wrap(`
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">Recordatorio · en ~1 hora</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#334155;">
      Hola ${escapeHtml(opts.name.split(' ')[0] || opts.name)}, te esperamos en la llamada de 15 min:
    </p>
    <p style="margin:0 0 20px;padding:14px 16px;background:#f0f9ff;border-radius:10px;font-size:15px;line-height:1.5;">
      <strong>${escapeHtml(opts.dateLabel)}</strong> · <strong style="font-size:18px;">${escapeHtml(opts.timeLabel)}</strong>
    </p>
    ${
      opts.meetingUrl && !opts.meetingUrl.startsWith('Te enviaremos')
        ? `<p style="margin:0 0 20px;"><a href="${escapeAttr(opts.meetingUrl)}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:10px;">Entrar a la videollamada</a></p>`
        : ''
    }
    <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;">
      Si no puedes, cancela o cambia la hora aquí para liberar el hueco:<br/>
      <a href="${escapeAttr(manageUrl)}" style="color:#0284c7;">Gestionar reserva</a>
    </p>
  `);

  const r = await sendEmail({
    to: opts.to,
    subject: `En ~1 h: llamada ${opts.timeLabel} · Delfín Check-in`,
    html,
    text: `Recordatorio llamada ~1h: ${opts.dateLabel} ${opts.timeLabel}. Link: ${opts.meetingUrl}. Gestionar: ${manageUrl}`,
    skipSuppression: true,
  });
  return r.success;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}
