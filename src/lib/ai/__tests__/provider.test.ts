import { describe, it, expect } from 'vitest';
import { GeminiAIProvider } from '../provider';
import { FinancialSummary } from '@/types';

describe('AI Provider & Intent Classification', () => {
  // Inicializamos sin API key para probar el pipeline local seguro
  const provider = new GeminiAIProvider('dummy-key');

  it('classifies direct Chilean expense as RECORD_TRANSACTION', async () => {
    const res = await provider.classifyIntent('Gasté 14.500 en almuerzo');
    expect(res.type).toBe('RECORD_TRANSACTION');
    if (res.type === 'RECORD_TRANSACTION') {
      expect(res.candidates[0].amount).toBe(14_500);
      expect(res.candidates[0].category).toBe('Alimentación');
    }
  });

  it('classifies Chilean slang "10 lucas en Uber" with high confidence', async () => {
    const res = await provider.classifyIntent('Me gasté 10 lucas en Uber');
    expect(res.type).toBe('RECORD_TRANSACTION');
    if (res.type === 'RECORD_TRANSACTION') {
      expect(res.candidates[0].amount).toBe(10_000);
      expect(res.candidates[0].category).toBe('Transporte');
    }
  });

  it('classifies question "¿Cuánto llevo gastado este mes?" as FINANCIAL_QUERY', async () => {
    const res = await provider.classifyIntent('¿Cuánto llevo gastado este mes?');
    expect(res.type).toBe('FINANCIAL_QUERY');
  });

  it('classifies question "Compara septiembre con octubre" as FINANCIAL_QUERY with target period', async () => {
    const res = await provider.classifyIntent('Compara septiembre con octubre');
    expect(res.type).toBe('FINANCIAL_QUERY');
  });

  it('requests clarification when amount is missing ("Compré cosas en el Líder")', async () => {
    // Sin API key ni monto en el texto -> solicita clarificación
    const localProvider = new GeminiAIProvider('');
    const res = await localProvider.classifyIntent('Compré unas cosas en el Líder');
    expect(res.type).toBe('CLARIFICATION_NEEDED');
  });

  it('generates deterministic financial explanation using exact math numbers', async () => {
    const localProvider = new GeminiAIProvider('');
    const mockSummary: FinancialSummary = {
      period: '2026-10',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      totalIncome: 1_200_000,
      totalExpenses: 450_000,
      netSavings: 750_000,
      savingsRate: 63,
      byCategory: [
        { categoryName: 'Supermercado', amount: 200_000, percentage: 44, count: 4 },
        { categoryName: 'Alimentación', amount: 150_000, percentage: 33, count: 10 },
      ],
      topMerchants: [
        { merchantName: 'Líder', amount: 180_000, count: 3 }
      ],
      recentTransactions: [],
    };

    const explanation = await localProvider.explainFinancialQuery('¿Cuánto llevo gastado este mes?', mockSummary);
    expect(explanation).toContain('$450.000');
    expect(explanation).toContain('$1.200.000');
    expect(explanation).toContain('Supermercado');
  });
});
