import { Transaction } from '@/types';
import { formatCLP } from '../chilean-parser/currency';

/**
 * Formatea una confirmación de registro de transacción para Telegram.
 */
export function formatTransactionConfirmation(tx: Transaction): string {
  const emoji = tx.type === 'income' ? '💰' : tx.type === 'transfer' ? '🔄' : '✓';
  const typeText = tx.type === 'income' ? 'Ingreso Registrado' : tx.type === 'transfer' ? 'Transferencia Registrada' : 'Registrado';

  const lines = [
    `${emoji} *${typeText}*`,
    '',
    `🏷️ *Categoría:* ${tx.categoryName || 'Otros'}`,
    `💵 *Monto:* ${formatCLP(tx.amount)} ${tx.currency}`,
    `📅 *Fecha:* ${tx.date}`,
  ];

  if (tx.merchantName) {
    lines.push(`🏪 *Comercio:* ${tx.merchantName}`);
  }

  if (tx.description && tx.description !== tx.categoryName) {
    lines.push(`📝 *Detalle:* _${tx.description}_`);
  }

  return lines.join('\n');
}

/**
 * Formatea un mensaje de deshacer
 */
export function formatUndoConfirmation(description: string, amount: number): string {
  return `❌ *Operación Deshecha*\n\nSe ha eliminado el registro:\n~${description} (${formatCLP(amount)})~`;
}
