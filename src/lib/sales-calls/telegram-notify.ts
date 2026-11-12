import { sendTelegramMessage } from '@/lib/telegram';

export async function notifySalesCallBooked(opts: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  comments: string | null;
  dateLabel: string;
  timeLabel: string;
  meetingUrl: string;
  source: string | null;
}): Promise<boolean> {
  const lines = [
    `📞 <b>Nueva reserva de llamada · Delfín</b>`,
    ``,
    `<b>Cuándo:</b> ${escapeHtml(opts.dateLabel)} · <b>${escapeHtml(opts.timeLabel)}</b> (Madrid) · 15 min`,
    `<b>Nombre:</b> ${escapeHtml(opts.name)}`,
    `<b>Email:</b> ${escapeHtml(opts.email)}`,
    opts.phone ? `<b>Tel:</b> ${escapeHtml(opts.phone)}` : null,
    opts.source ? `<b>Origen:</b> ${escapeHtml(opts.source)}` : null,
    opts.comments
      ? `<b>Comentarios:</b> ${escapeHtml(opts.comments.slice(0, 500))}`
      : null,
    `<b>Reunión:</b> ${escapeHtml(opts.meetingUrl)}`,
    `<i>Puntualidad estricta · huecos cada 30 min</i>`,
    `<code>${escapeHtml(opts.id)}</code>`,
  ].filter(Boolean);

  return sendTelegramMessage(lines.join('\n'));
}

export async function notifySalesCallReminder(opts: {
  name: string;
  email: string;
  dateLabel: string;
  timeLabel: string;
  meetingUrl: string;
}): Promise<boolean> {
  return sendTelegramMessage(
    [
      `⏰ <b>Llamada en ~1 h · Delfín</b>`,
      ``,
      `<b>${escapeHtml(opts.dateLabel)} · ${escapeHtml(opts.timeLabel)}</b> (Madrid)`,
      `<b>${escapeHtml(opts.name)}</b> · ${escapeHtml(opts.email)}`,
      `<b>Zoom:</b> ${escapeHtml(opts.meetingUrl)}`,
    ].join('\n')
  );
}

export async function notifySalesCallCancelled(opts: {
  name: string;
  email: string;
  dateLabel: string;
  timeLabel: string;
}): Promise<boolean> {
  return sendTelegramMessage(
    [
      `❌ <b>Llamada cancelada · Delfín</b>`,
      ``,
      `<b>${escapeHtml(opts.dateLabel)} · ${escapeHtml(opts.timeLabel)}</b>`,
      `${escapeHtml(opts.name)} · ${escapeHtml(opts.email)}`,
    ].join('\n')
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
