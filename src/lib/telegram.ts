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

/**
 * Formatea un mensaje de resumen diario
 */
export function formatDailyReport(data: {
  newLeads: number;
  totalLeads: number;
  newLeadsList: Array<{ email: string; name: string | null; source: string | null; created_at: string }>;
}): string {
  const { newLeads, totalLeads, newLeadsList } = data;
  
  let message = `🐬 <b>Delfín Check-in - Resumen Diario</b>\n\n`;
  message += `📅 <b>Fecha:</b> ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
  message += `📊 <b>Estadísticas:</b>\n`;
  message += `• Nuevos registros ayer: <b>${newLeads}</b>\n`;
  message += `• Total en waitlist: <b>${totalLeads}</b>\n\n`;

  if (newLeads > 0) {
    message += `✨ <b>Nuevos Registros:</b>\n`;
    newLeadsList.forEach((lead, index) => {
      const name = lead.name || 'Sin nombre';
      const source = lead.source || 'landing';
      const time = new Date(lead.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      message += `\n${index + 1}. <b>${name}</b>\n`;
      message += `   📧 ${lead.email}\n`;
      message += `   📍 Origen: ${source}\n`;
      message += `   ⏰ ${time}\n`;
    });
  } else {
    message += `ℹ️ No hubo nuevos registros ayer.\n`;
  }

  message += `\n━━━━━━━━━━━━━━━━━━\n`;
  message += `🔗 <a href="https://admin.delfincheckin.com/superadmin/waitlist-dashboard">Ver Dashboard Completo</a>`;

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
