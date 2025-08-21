import TelegramBot from 'node-telegram-bot-api';
import { telegramQueue } from './redis';

const token = process.env.TELEGRAM_BOT_TOKEN!;
const chatId = process.env.TELEGRAM_CHAT_ID!;

export const bot = new TelegramBot(token, { polling: false });

// Función para enviar notificación
export async function sendTelegramNotification(message: string, chatIdOverride?: string) {
  try {
    const targetChatId = chatIdOverride || chatId;
    await bot.sendMessage(targetChatId, message, { parse_mode: 'HTML' });
    return { success: true };
  } catch (error) {
    console.error('Error enviando notificación Telegram:', error);
    return { success: false, error };
  }
}

// Función para enviar notificación a través de la cola
export async function queueTelegramNotification(message: string, chatIdOverride?: string) {
  await telegramQueue.add('notification', {
    message,
    chatId: chatIdOverride || chatId
  });
}

// Plantillas de mensajes
export const telegramTemplates = {
  newReservation: (roomName: string, guestName: string, checkIn: string) => 
    `🏠 <b>Nueva Reserva</b>\n\n` +
    `Habitación: ${roomName}\n` +
    `Huésped: ${guestName}\n` +
    `Check-in: ${checkIn}\n\n` +
    `¡Prepara la habitación! 🧹`,

  checkinCompleted: (roomName: string, guestName: string) =>
    `✅ <b>Check-in Completado</b>\n\n` +
    `Habitación: ${roomName}\n` +
    `Huésped: ${guestName}\n\n` +
    `Documentos recibidos y firmados.`,

  cleaningPending: (roomName: string, checkOut: string) =>
    `🧹 <b>Limpieza Pendiente</b>\n\n` +
    `Habitación: ${roomName}\n` +
    `Check-out: ${checkOut}\n\n` +
    `¡Es hora de limpiar!`,

  cleaningCompleted: (roomName: string) =>
    `✨ <b>Limpieza Completada</b>\n\n` +
    `Habitación: ${roomName}\n\n` +
    `¡Lista para nuevos huéspedes!`,

  systemAlert: (message: string) =>
    `⚠️ <b>Alerta del Sistema</b>\n\n${message}`,

  dailySummary: (reservations: any[], checkouts: any[], checkins: any[]) =>
    `📊 <b>Resumen Diario</b>\n\n` +
    `Nuevas reservas: ${reservations.length}\n` +
    `Check-ins hoy: ${checkins.length}\n` +
    `Check-outs hoy: ${checkouts.length}`
};
