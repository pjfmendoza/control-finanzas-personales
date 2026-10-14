import { Transaction } from '@/types';
import { formatTransactionConfirmation, formatUndoConfirmation } from './formatter';

export class TelegramBotClient {
  private token: string;
  private baseUrl: string;

  constructor(token?: string) {
    this.token = token || process.env.TELEGRAM_BOT_TOKEN || '';
    this.baseUrl = `https://api.telegram.org/bot${this.token}`;
  }

  /**
   * Verifica si el ID de usuario de Telegram está en la lista blanca permitida.
   */
  isUserAllowed(userId: number): boolean {
    const rawAllowed = process.env.TELEGRAM_ALLOWED_USER_IDS || '';
    if (!rawAllowed.trim()) {
      // Si no se ha configurado la lista blanca, en modo estricto nadie no autorizado pasa
      return false;
    }
    const allowedIds = rawAllowed.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    return allowedIds.includes(userId);
  }

  /**
   * Envía un mensaje de texto simple o con teclado inline.
   */
  async sendMessage(
    chatId: number,
    text: string,
    options?: {
      replyMarkup?: any;
      parseMode?: 'Markdown' | 'HTML';
    }
  ): Promise<any> {
    if (!this.token) {
      console.warn('[TelegramBot] No hay TELEGRAM_BOT_TOKEN configurado. Mensaje simulado:', text);
      return { ok: true, simulated: true };
    }

    try {
      const res = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: options?.parseMode || 'Markdown',
          reply_markup: options?.replyMarkup,
        }),
      });
      return await res.json();
    } catch (err) {
      console.error('[TelegramBot] Error al enviar mensaje:', err);
      return { ok: false, error: err };
    }
  }

  /**
   * Envía la tarjeta de confirmación de una transacción con botón para Deshacer.
   */
  async sendTransactionConfirmation(chatId: number, tx: Transaction): Promise<any> {
    const text = formatTransactionConfirmation(tx);
    const appUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://control-finanzas-personales-psi.vercel.app');

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '🗑️ Deshacer', callback_data: `undo:${tx.id}` },
          { text: '📊 Dashboard', url: `${appUrl}/dashboard` },
        ],
      ],
    };

    return this.sendMessage(chatId, text, {
      replyMarkup,
      parseMode: 'Markdown',
    });
  }

  /**
   * Responde a una pulsación de botón inline (Callback Query).
   */
  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<any> {
    if (!this.token) return { ok: true, simulated: true };
    try {
      const res = await fetch(`${this.baseUrl}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text || 'Listo',
        }),
      });
      return await res.json();
    } catch (err) {
      console.error('[TelegramBot] Error en answerCallbackQuery:', err);
      return { ok: false };
    }
  }

  /**
   * Modifica el texto de un mensaje existente (por ejemplo tras Deshacer).
   */
  async editMessageText(
    chatId: number,
    messageId: number,
    text: string,
    replyMarkup?: any
  ): Promise<any> {
    if (!this.token) return { ok: true, simulated: true };
    try {
      const res = await fetch(`${this.baseUrl}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text,
          parse_mode: 'Markdown',
          reply_markup: replyMarkup || { inline_keyboard: [] },
        }),
      });
      return await res.json();
    } catch (err) {
      console.error('[TelegramBot] Error editMessageText:', err);
      return { ok: false };
    }
  }
}

export const telegramBot = new TelegramBotClient();
