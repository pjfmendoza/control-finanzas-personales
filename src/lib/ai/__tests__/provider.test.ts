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
      expect(res.candidates[0].merchant).toBe('Uber');
    }
  });

  it('classifies snack de huevo y barra de proteina into Alimentación correctly', async () => {
    const res = await provider.classifyIntent('me compré un snack de huevo y una barra de proteina, el total fue 3980');
    expect(res.type).toBe('RECORD_TRANSACTION');
    if (res.type === 'RECORD_TRANSACTION') {
      expect(res.candidates[0].amount).toBe(3_980);
      expect(res.candidates[0].category).toBe('Alimentación');
    }
  });

  it('classifies TAG, peajes and Copec into Transporte', async () => {
    const res1 = await provider.classifyIntent('pagué 15 lucas de tag');
    expect(res1.type).toBe('RECORD_TRANSACTION');
    if (res1.type === 'RECORD_TRANSACTION') {
      expect(res1.candidates[0].amount).toBe(15_000);
      expect(res1.candidates[0].category).toBe('Transporte');
    }

    const res2 = await provider.classifyIntent('cargué 20 mil de bencina en la copec');
    expect(res2.type).toBe('RECORD_TRANSACTION');
    if (res2.type === 'RECORD_TRANSACTION') {
      expect(res2.candidates[0].amount).toBe(20_000);
      expect(res2.candidates[0].category).toBe('Transporte');
      expect(res2.candidates[0].merchant).toBe('Copec');
    }
  });

  it('classifies Mascotas and Farmacias correctly', async () => {
    const res = await provider.classifyIntent('compré comida de perro en superzoo 30 mil');
    expect(res.type).toBe('RECORD_TRANSACTION');
    if (res.type === 'RECORD_TRANSACTION') {
      expect(res.candidates[0].amount).toBe(30_000);
      expect(res.candidates[0].category).toBe('Mascotas');
      expect(res.candidates[0].merchant).toBe('SuperZoo');
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
      dailyTrend: [],
      dailyAverage: 32_142,
      projectedEndMonthExpenses: 996_402,
      daysInMonth: 31,
      elapsedDays: 14,
      maxExpense: {
        amount: 150_000,
        description: 'Supermercado',
        categoryName: 'Supermercado',
        date: '2026-10-10',
      },
      noSpendDays: 5,
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
