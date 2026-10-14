/**
 * Script de desarrollo para probar el bot de Telegram en tiempo real
 * mientras preparas el despliegue a la nube.
 */
const fs = require('fs');
const path = require('path');
const postgres = require('D:/PFM Personal/Control finanzas personales/node_modules/postgres');

// 1. Cargar variables de entorno desde .env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
const ALLOWED_USER_ID = parseInt(env.TELEGRAM_ALLOWED_USER_IDS, 10);
const DB_URL = env.DATABASE_URL;

if (!BOT_TOKEN) {
  console.error('ERROR: TELEGRAM_BOT_TOKEN no está definido en .env');
  process.exit(1);
}

const sql = postgres(DB_URL, { ssl: 'require' });

console.log('====================================================');
console.log('🤖 AGENTE DE FINANZAS - POLLER DE DESARROLLO INICIADO');
console.log(`Bot: Token configurado`);
console.log(`Usuario Autorizado ID: ${ALLOWED_USER_ID}`);
console.log(`Base de datos: Conectada a Supabase`);
console.log('Esperando mensajes en Telegram...');
console.log('====================================================\n');

// Importar reglas chilenas
function formatCLP(amount) {
  return `$${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function parseChileanMessage(text) {
  const lower = text.toLowerCase();
  let amount = null;

  // "medio palo"
  if (lower.includes('medio palo')) amount = 500000;
  // "palo" / "palos"
  const paloMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*palos?/i);
  if (paloMatch && !amount) amount = Math.round(parseFloat(paloMatch[1].replace(',', '.')) * 1000000);
  if (lower.match(/\b(un|1)\s*palo\b/i) && !amount) amount = 1000000;

  // "lucas"
  const lucaMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*lucas?/i);
  if (lucaMatch && !amount) amount = Math.round(parseFloat(lucaMatch[1].replace(',', '.')) * 1000);

  // "mil"
  const milMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*mil\b/i);
  if (milMatch && !amount) amount = Math.round(parseFloat(milMatch[1].replace(',', '.')) * 1000);

  // números directos: 14.500, 18990, $14500
  const numMatch = text.match(/(?:\$\s*)?(\b\d{1,3}(?:\.\d{3})+\b|\b\d{4,8}\b)/);
  if (numMatch && !amount) {
    const rawNum = parseInt(numMatch[1].replace(/\./g, ''), 10);
    if (!isNaN(rawNum) && rawNum > 100 && !(rawNum >= 1990 && rawNum <= 2040 && !text.includes('$') && !text.includes('.'))) {
      amount = rawNum;
    }
  }

  // Categorías
  let category = 'Otros';
  let merchant = null;
  if (lower.includes('almuerzo') || lower.includes('almorzando') || lower.includes('comida') || lower.includes('cena')) category = 'Alimentación';
  if (lower.includes('café') || lower.includes('cafe') || lower.includes('starbucks')) { category = 'Alimentación'; merchant = 'Starbucks'; }
  if (lower.includes('líder') || lower.includes('lider') || lower.includes('jumbo') || lower.includes('supermercado') || lower.includes('super')) {
    category = 'Supermercado';
    if (lower.includes('líder') || lower.includes('lider')) merchant = 'Líder';
    if (lower.includes('jumbo')) merchant = 'Jumbo';
  }
  if (lower.includes('bencina') || lower.includes('copec') || lower.includes('shell') || lower.includes('petrobras')) {
    category = 'Transporte';
    merchant = 'Copec';
  }
  if (lower.includes('uber') || lower.includes('didi') || lower.includes('taxi')) { category = 'Transporte'; merchant = 'Uber'; }
  if (lower.includes('bar') || lower.includes('cerveza') || lower.includes('chelas')) category = 'Entretenimiento';
  if (lower.includes('internet') || lower.includes('luz') || lower.includes('agua') || lower.includes('vtr')) category = 'Servicios';
  if (lower.includes('arriendo')) category = 'Vivienda';

  const type = lower.includes('depositaron') || lower.includes('sueldo') || lower.includes('pago') || lower.includes('recibí') ? 'income' : 'expense';

  // Fecha
  const today = new Date().toISOString().split('T')[0];
  let date = today;
  if (lower.includes('ayer')) {
    const d = new Date(); d.setDate(d.getDate() - 1);
    date = d.toISOString().split('T')[0];
  }

  return { amount, category, merchant, type, date, description: text };
}

async function sendTelegramMessage(chatId, text, replyMarkup) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup
      })
    });
    return await res.json();
  } catch (err) {
    console.error('Error enviando mensaje a Telegram:', err);
  }
}

async function handleUpdate(update) {
  // Manejo de botones inline (Deshacer)
  if (update.callback_query) {
    const cb = update.callback_query;
    const data = cb.data || '';
    if (data.startsWith('undo:')) {
      const txId = data.replace('undo:', '');
      const tx = await sql`SELECT * FROM transactions WHERE id = ${txId} LIMIT 1`;
      if (tx.length > 0) {
        await sql`DELETE FROM transactions WHERE id = ${txId}`;
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cb.id, text: '✓ Registro eliminado' })
        });
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id,
            text: `❌ *Operación Deshecha*\n\nSe ha eliminado el registro:\n~${tx[0].description} (${formatCLP(tx[0].amount)})~`,
            parse_mode: 'Markdown'
          })
        });
        console.log(`[UNDO] Transacción ${txId} eliminada.`);
      }
    }
    return;
  }

  const msg = update.message;
  if (!msg || !msg.text) return;

  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const text = msg.text.trim();

  console.log(`\n[MENSAJE RECIBIDO] de ${msg.from.first_name} (ID: ${userId}): "${text}"`);

  // Verificación de seguridad
  if (userId !== ALLOWED_USER_ID) {
    console.warn(`[SEGURIDAD] Usuario no autorizado ID ${userId}. Ignorando.`);
    return;
  }

  // Comando /start o /help
  if (text === '/start' || text === '/help') {
    const welcome = `👋 *¡Hola! Soy tu Agente Personal de Finanzas.*\n\nTu bot está conectado a tu base de datos Supabase.\n\n*Puedes escribirme gastos como:*\n• _"Gasté 14.500 en almuerzo"_\n• _"Compré 38 lucas en el Líder"_\n• _"Ayer cargué 25 mil de bencina"_\n• _"El sábado gasté 45 lucas en un bar"_\n• _"Me depositaron 780 lucas de arriendo"_\n\n*O preguntarme:*\n• _"¿Cuánto llevo gastado este mes?"_\n• _"¿En qué estoy gastando más?"_\n• _"Muéstrame mis últimos movimientos"_\n\n¡Pruébalo ahora mismo!`;
    await sendTelegramMessage(chatId, welcome);
    return;
  }

  const lower = text.toLowerCase();

  // Consulta Financiera: "¿Cuánto llevo gastado?", "¿En qué he gastado?", etc.
  if (lower.includes('cuánto') || lower.includes('cuanto') || lower.includes('gastado') || lower.includes('resumen') || lower.includes('movimientos')) {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const sumResult = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COUNT(*) as total_count
      FROM transactions
      WHERE date >= ${currentMonth + '-01'}
    `;

    const totalExp = parseInt(sumResult[0].total_expenses, 10);
    const totalInc = parseInt(sumResult[0].total_income, 10);
    const net = totalInc - totalExp;

    const byCat = await sql`
      SELECT category_name, SUM(amount) as amount, COUNT(*) as count
      FROM transactions
      WHERE type = 'expense' AND date >= ${currentMonth + '-01'}
      GROUP BY category_name
      ORDER BY amount DESC
      LIMIT 4
    `;

    let reply = `📊 *Resumen Financiero (${currentMonth})*\n\n`;
    reply += `• *Total Gastos:* ${formatCLP(totalExp)}\n`;
    reply += `• *Total Ingresos:* ${formatCLP(totalInc)}\n`;
    reply += `• *Ahorro Neto:* ${formatCLP(net)}\n\n`;

    if (byCat.length > 0) {
      reply += `📌 *Principales Gastos:*\n`;
      byCat.forEach(c => {
        const pct = totalExp > 0 ? Math.round((parseInt(c.amount, 10) / totalExp) * 100) : 0;
        reply += `• ${c.category_name}: *${formatCLP(c.amount)}* (${pct}%)\n`;
      });
    } else {
      reply += `_Aún no registras gastos este mes._\n`;
    }

    await sendTelegramMessage(chatId, reply);
    return;
  }

  // Registro de Gasto / Ingreso
  const parsed = parseChileanMessage(text);
  if (!parsed.amount) {
    await sendTelegramMessage(chatId, `🤔 ¿Cuánto gastaste y en qué concepto?\n\n_Ejemplo: "Gasté 15 lucas en el almuerzo"_`);
    return;
  }

  const txId = `tx_${Date.now()}`;
  await sql`
    INSERT INTO transactions (
      id, type, amount, currency, date, category_name, merchant_name, description, source, raw_text, created_at, updated_at
    ) VALUES (
      ${txId}, ${parsed.type}, ${parsed.amount}, 'CLP', ${parsed.date}, ${parsed.category}, ${parsed.merchant}, ${parsed.description}, 'telegram', ${text}, NOW(), NOW()
    )
  `;

  console.log(`[GUARDADO EN SUPABASE] ${parsed.category}: ${formatCLP(parsed.amount)}`);

  const confirmText = `✓ *${parsed.type === 'income' ? 'Ingreso Registrado' : 'Registrado'}*\n\n🏷️ *Categoría:* ${parsed.category}\n💵 *Monto:* ${formatCLP(parsed.amount)} CLP\n📅 *Fecha:* ${parsed.date}${parsed.merchant ? `\n🏪 *Comercio:* ${parsed.merchant}` : ''}\n📝 *Detalle:* _${parsed.description}_`;

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '🗑️ Deshacer', callback_data: `undo:${txId}` },
        { text: '📊 Dashboard', url: 'http://localhost:3000/dashboard' }
      ]
    ]
  };

  await sendTelegramMessage(chatId, confirmText, replyMarkup);
}

let lastUpdateId = 0;

async function poll() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
    const data = await res.json();
    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;
        await handleUpdate(update);
      }
    }
  } catch (err) {
    // console.error('Error en poll:', err.message);
  }
  setTimeout(poll, 1000);
}

poll();
