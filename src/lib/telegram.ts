/**
 * ========================================
 * Telegram Notification Helper
 * ========================================
 * Envía mensajes a Telegram usando Bot API
 */

interface TelegramMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  disable_web_page_preview?: boolean;
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_WAITLIST_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_WAITLIST_CHAT_ID;

  if (!botToken || !chatId) {
    console.error('❌ Telegram Waitlist credentials not configured');
    return false;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const payload: TelegramMessage = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Telegram API error:', error);
      return false;
    }

    console.log('✅ Mensaje enviado a Telegram');
    return true;
  } catch (error) {
    console.error('❌ Error enviando mensaje a Telegram:', error);
    return false;
  }
}

export type OutreachDailyStats = {
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  signedUp: number;
  dailyCap: number;
  signupGoal: number;
};

/**
 * Formatea un mensaje de resumen diario (waitlist + captación outreach).
 * Se envía ~11:00 Europe/Madrid (tras el cron de envío ~09:00).
 */
export function formatDailyReport(data: {
  newLeads: number;
  totalLeads: number;
  newLeadsList: Array<{ email: string; name: string | null; source: string | null; created_at: string }>;
  outreach?: OutreachDailyStats | null;
}): string {
  const { newLeads, totalLeads, newLeadsList, outreach } = data;

  const fecha = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Europe/Madrid',
  });

  let message = `🐬 <b>Delfín Check-in — Informe diario 11:00</b>\n\n`;
  message += `📅 <b>Fecha:</b> ${fecha}\n\n`;

  if (outreach) {
    message += `📬 <b>Captación propietarios (outreach hoy)</b>\n`;
    message += `• Enviados: <b>${outreach.sent}</b> / ${outreach.dailyCap}\n`;
    message += `• Abiertos: <b>${outreach.opened}</b>\n`;
    message += `• Clicks (landing): <b>${outreach.clicked}</b>\n`;
    message += `• Undelivered/bounce: <b>${outreach.bounced}</b>\n`;
    message += `• Altas atribuidas: <b>${outreach.signedUp}</b> / meta ${outreach.signupGoal}\n\n`;
  }

  message += `📋 <b>Waitlist / registros</b>\n`;
  message += `• Nuevos (24h): <b>${newLeads}</b>\n`;
  message += `• Total waitlist: <b>${totalLeads}</b>\n\n`;

  if (newLeads > 0) {
    message += `✨ <b>Nuevos registros:</b>\n`;
    newLeadsList.slice(0, 15).forEach((lead, index) => {
      const name = lead.name || 'Sin nombre';
      const source = lead.source || 'landing';
      const time = new Date(lead.created_at).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Madrid',
      });
      message += `\n${index + 1}. <b>${name}</b>\n`;
      message += `   📧 ${lead.email}\n`;
      message += `   📍 Origen: ${source}\n`;
      message += `   ⏰ ${time}\n`;
    });
  } else {
    message += `ℹ️ Sin nuevos registros waitlist en las últimas 24h.\n`;
  }

  message += `\n━━━━━━━━━━━━━━━━━━\n`;
  message += `🔗 <a href="https://admin.delfincheckin.com/superadmin/public-owner-leads">Captación</a> · `;
  message += `<a href="https://admin.delfincheckin.com/superadmin/waitlist">Waitlist</a>`;

  return message;
}

/**
 * Formatea un mensaje de resumen semanal
 */
export function formatWeeklyReport(data: {
  weeklyLeads: number;
  totalLeads: number;
  dailyBreakdown: Array<{ date: string; count: number }>;
  topSources: Array<{ source: string; count: number }>;
}): string {
  const { weeklyLeads, totalLeads, dailyBreakdown, topSources } = data;
  
  let message = `🐬 <b>Delfín Check-in - Resumen Semanal</b>\n\n`;
  message += `📅 <b>Semana del:</b> ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES')} - ${new Date().toLocaleDateString('es-ES')}\n\n`;
  message += `📊 <b>Estadísticas Generales:</b>\n`;
  message += `• Nuevos registros esta semana: <b>${weeklyLeads}</b>\n`;
  message += `• Total en waitlist: <b>${totalLeads}</b>\n\n`;

  message += `📈 <b>Registros por Día:</b>\n`;
  dailyBreakdown.forEach((day) => {
    const date = new Date(day.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    const bar = '█'.repeat(Math.max(1, Math.floor(day.count / 2)));
    message += `${date}: ${bar} <b>${day.count}</b>\n`;
  });

  message += `\n🎯 <b>Top Fuentes:</b>\n`;
  topSources.forEach((source, index) => {
    message += `${index + 1}. ${source.source}: <b>${source.count}</b> registros\n`;
  });

  message += `\n━━━━━━━━━━━━━━━━━━\n`;
  message += `🔗 <a href="https://admin.delfincheckin.com/superadmin/waitlist-dashboard">Ver Dashboard Completo</a>`;

  return message;
}
