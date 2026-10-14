import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/db';
import { getAIProvider } from '@/lib/ai/provider';
import { telegramBot } from '@/lib/telegram/bot';
import { formatUndoConfirmation } from '@/lib/telegram/formatter';
import { subMonths, format as formatDate } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { CHILE_TIMEZONE } from '@/lib/chilean-parser/dates';

export async function POST(req: NextRequest) {
  try {
    // 1. Verificación del Secret Token de Telegram (Seguridad contra suplantación)
    const secretHeader = req.headers.get('x-telegram-bot-api-secret-token');
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (expectedSecret && secretHeader !== expectedSecret) {
      console.warn('[Webhook] Petición rechazada: Secret token no coincide.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const update = await req.json();
    if (!update || typeof update.update_id !== 'number') {
      return NextResponse.json({ ok: false, error: 'Invalid update' }, { status: 400 });
    }

    // 2. Extraer usuario y chat
    const fromUser = update.message?.from || update.callback_query?.from;
    const chat = update.message?.chat || update.callback_query?.message?.chat;

    if (!fromUser || !chat) {
      return NextResponse.json({ ok: true });
    }

    const userId = fromUser.id;
    const chatId = chat.id;

    // 3. Verificación de Seguridad: Allowlist de usuarios
    if (!telegramBot.isUserAllowed(userId)) {
      console.warn(`[Webhook Seguridad] Intento de acceso de usuario no autorizado. ID: ${userId}, Username: ${fromUser.username || 'N/A'}`);
      // Respondemos 200 a Telegram para no generar reintentos, pero no procesamos ni divulgamos información
      return NextResponse.json({ ok: true, message: 'User not authorized' });
    }

    // 4. Verificación de Idempotencia (Previene duplicados por reintentos de red o webhook)
    const rawText = update.message?.text || update.callback_query?.data || '';
    const isFirstTime = await dbService.registerTelegramUpdate(update.update_id, userId, chatId, rawText);
    if (!isFirstTime) {
      console.info(`[Webhook Idempotencia] Update ${update.update_id} ya procesado anteriormente. Omitiendo duplicado.`);
      return NextResponse.json({ ok: true, deduplicated: true });
    }

    // 5. Manejo de Callback Queries (Botones Inline: Deshacer)
    if (update.callback_query) {
      const cb = update.callback_query;
      const data: string = cb.data || '';

      if (data.startsWith('undo:')) {
        const txId = data.replace('undo:', '');
        const existingTx = await dbService.getTransactionById(txId);

        if (existingTx) {
          await dbService.deleteTransaction(txId);
          await telegramBot.answerCallbackQuery(cb.id, '✓ Registro eliminado');
          if (cb.message) {
            const undoText = formatUndoConfirmation(existingTx.description, existingTx.amount);
            await telegramBot.editMessageText(chatId, cb.message.message_id, undoText);
          }
        } else {
          await telegramBot.answerCallbackQuery(cb.id, 'La transacción ya no existe');
        }
      }
      return NextResponse.json({ ok: true });
    }

    // 6. Manejo de Mensajes de Texto
    const text: string = update.message?.text?.trim() || '';
    if (!text) {
      return NextResponse.json({ ok: true });
    }

    // Comandos informativos
    const lowerText = text.toLowerCase();
    if (lowerText === '/start' || lowerText === '/help') {
      const welcome = `👋 *¡Hola! Soy tu Agente Personal de Finanzas.*\n\nPuedes registrar gastos o hacerme preguntas en lenguaje natural chileno:\n\n*Ejemplos de registro:*\n• _"Gasté 14.500 en almuerzo"_\n• _"Compré 38 lucas en el Líder"_\n• _"Ayer cargué 25 mil de bencina"_\n• _"El sábado gasté 45 lucas en un bar"_\n• _"Me depositaron 780 lucas de arriendo"_\n\n*Ejemplos de consultas:*\n• _"¿Cuánto llevo gastado este mes?"_\n• _"¿En qué estoy gastando más?"_\n• _"Muéstrame mis últimos movimientos"_\n• _"Compara este mes con el anterior"_\n\n*Comandos útiles:*\n• /dashboard - Abre tu panel web analítico en el teléfono o PC\n\nTodo lo que escribas queda registrado de inmediato y visible en tu Dashboard 24/7.`;
      await telegramBot.sendMessage(chatId, welcome);
      return NextResponse.json({ ok: true });
    }

    if (lowerText === '/dashboard' || lowerText === '/link' || lowerText === 'dashboard' || lowerText === 'link') {
      const appUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://control-finanzas-personales-psi.vercel.app');
      const dashboardMsg = `📊 *Tu Dashboard Web de Finanzas:*\n\n👉 [${appUrl}/dashboard](${appUrl}/dashboard)\n\n🔑 *Contraseña:* \`admin\`\n\n📱 *Para usarlo como App en tu teléfono:*\nAbre el enlace en Safari (iPhone) o Chrome (Android) y selecciona *\"Agregar a la pantalla de inicio\"*.`;
      await telegramBot.sendMessage(chatId, dashboardMsg, {
        replyMarkup: {
          inline_keyboard: [
            [{ text: '📊 Abrir Dashboard Web', url: `${appUrl}/dashboard` }]
          ]
        }
      });
      return NextResponse.json({ ok: true });
    }

    // Pipeline de Clasificación de Intención (IA + Reglas)
    const aiProvider = getAIProvider();
    const intent = await aiProvider.classifyIntent(text);

    if (intent.type === 'CLARIFICATION_NEEDED') {
      await telegramBot.sendMessage(chatId, `🤔 ${intent.question}\n\n_Ejemplo: "Gasté 15 lucas en el almuerzo"_`);
      return NextResponse.json({ ok: true });
    }

    if (intent.type === 'FINANCIAL_QUERY') {
      // Determinismo Matemático: Cálculo SQL/Código de los datos reales
      const nowChile = toZonedTime(new Date(), CHILE_TIMEZONE);
      const currentPeriod = formatDate(nowChile, 'yyyy-MM');
      const prevPeriod = formatDate(subMonths(nowChile, 1), 'yyyy-MM');

      const currentSummary = await dbService.getFinancialSummary(currentPeriod);
      const prevSummary = intent.targetPeriod === 'previous' || text.toLowerCase().includes('compara') || text.toLowerCase().includes('pasado')
        ? await dbService.getFinancialSummary(prevPeriod)
        : null;

      // Explicación en lenguaje natural basada estrictamente en los números calculados
      const explanation = await aiProvider.explainFinancialQuery(text, currentSummary, prevSummary);
      await telegramBot.sendMessage(chatId, explanation);
      return NextResponse.json({ ok: true });
    }

    if (intent.type === 'RECORD_TRANSACTION') {
      for (const candidate of intent.candidates) {
        const createdTx = await dbService.createTransaction({
          type: candidate.type,
          amount: candidate.amount,
          currency: candidate.currency,
          date: candidate.date,
          description: candidate.description,
          categoryName: candidate.category,
          merchantName: candidate.merchant,
          paymentMethod: candidate.paymentMethod,
          confidence: candidate.confidence,
          source: 'telegram',
          sourceId: String(update.message.message_id),
          rawText: text,
        });

        // Envía confirmación con botón inline para Deshacer
        await telegramBot.sendTransactionConfirmation(chatId, createdTx);
      }
      return NextResponse.json({ ok: true });
    }

    // Default fallback
    await telegramBot.sendMessage(chatId, 'No pude interpretar el mensaje. ¿Puedes describirlo de otra forma?');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Webhook Error Fatal]', err);
    // Respondemos 200 OK a Telegram para evitar bucles de reintento en caso de bug interno
    return NextResponse.json({ ok: true, error: 'Internal processing error handled' });
  }
}
