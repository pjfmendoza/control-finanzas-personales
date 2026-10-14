import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from '@/db';
import { GeminiAIProvider } from '@/lib/ai/provider';
import { parseChileanCurrency } from '@/lib/chilean-parser/currency';
import { parseChileanDate } from '@/lib/chilean-parser/dates';

describe('End-to-End Vertical Slice Integration', () => {
  const provider = new GeminiAIProvider('');

  beforeEach(() => {
    // Reset or clean up
  });

  it('handles the complete lifecycle: Chilean message -> Parsing -> DB -> Query -> Delete', async () => {
    // 1. Mensaje en jerga chilena
    const rawMessage = 'Gasté 14.500 en almuerzo';

    // 2. Clasificación e interpretación
    const intent = await provider.classifyIntent(rawMessage);
    expect(intent.type).toBe('RECORD_TRANSACTION');

    if (intent.type === 'RECORD_TRANSACTION') {
      const candidate = intent.candidates[0];
      expect(candidate.amount).toBe(14_500);
      expect(candidate.category).toBe('Alimentación');

      // 3. Inserción determinística en base de datos
      const tx = await dbService.createTransaction({
        type: candidate.type,
        amount: candidate.amount,
        date: candidate.date,
        description: candidate.description,
        categoryName: candidate.category,
        merchantName: candidate.merchant,
        source: 'telegram',
      });

      expect(tx.id).toBeDefined();
      expect(tx.amount).toBe(14_500);

      // 4. Consulta determinística: "¿Cuánto llevo gastado este mes?"
      const summary = await dbService.getFinancialSummary(candidate.date);
      expect(summary.totalExpenses).toBeGreaterThanOrEqual(14_500);
      expect(summary.byCategory.some(c => c.categoryName === 'Alimentación')).toBe(true);

      // 5. Explicación en lenguaje natural (sin alucinaciones)
      const answer = await provider.explainFinancialQuery('¿Cuánto llevo gastado este mes?', summary);
      expect(answer).toContain('$14.500');

      // 6. Acción Deshacer (Undo)
      const deleted = await dbService.deleteTransaction(tx.id);
      expect(deleted).toBe(true);

      // Verificar que ya no existe
      const checkedTx = await dbService.getTransactionById(tx.id);
      expect(checkedTx).toBeNull();
    }
  });

  it('guarantees webhook idempotency (duplicate update_id is rejected)', async () => {
    const updateId = 99887766;
    const userId = 12345;
    const chatId = 12345;

    // Primer intento
    const firstAttempt = await dbService.registerTelegramUpdate(updateId, userId, chatId, 'primer envío');
    expect(firstAttempt).toBe(true);

    // Segundo intento (simulando reintento por timeout de red)
    const secondAttempt = await dbService.registerTelegramUpdate(updateId, userId, chatId, 'reintento');
    expect(secondAttempt).toBe(false);
  });

  it('processes multi-transaction message extracting all distinct amounts', () => {
    const complexMessage = 'Ayer fui al Líder y gasté 42 lucas, después cargué 30 mil de bencina y hoy compré un café de 3200.';
    const amounts = parseChileanCurrency(complexMessage);

    expect(amounts).toHaveLength(3);
    expect(amounts[0].amount).toBe(42_000);
    expect(amounts[1].amount).toBe(30_000);
    expect(amounts[2].amount).toBe(3_200);
  });
});
