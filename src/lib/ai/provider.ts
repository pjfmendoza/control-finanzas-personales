import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { TransactionCandidate, TransactionCandidateSchema, FinancialSummary } from '@/types';
import { SYSTEM_PROMPT_FINANCIAL_PARSER, SYSTEM_PROMPT_FINANCIAL_EXPLAINER } from './prompts';
import { formatIsoDate, CHILE_TIMEZONE } from '../chilean-parser/dates';
import { toZonedTime } from 'date-fns-tz';
import { tryParseWithRules } from '../rules/rules-engine';
import { formatCLP } from '../chilean-parser/currency';
import { z } from 'zod';

export interface AIParserContext {
  referenceDate?: Date;
  userTimezone?: string;
}

export type UserIntent = 
  | { type: 'RECORD_TRANSACTION'; candidates: TransactionCandidate[] }
  | { type: 'FINANCIAL_QUERY'; queryTopic: string; targetPeriod?: string }
  | { type: 'CLARIFICATION_NEEDED'; question: string }
  | { type: 'UNKNOWN'; message: string };

export interface AIProvider {
  name: string;
  parseTransactions(text: string, context?: AIParserContext): Promise<TransactionCandidate[]>;
  classifyIntent(text: string, context?: AIParserContext): Promise<UserIntent>;
  explainFinancialQuery(query: string, summary: FinancialSummary, compareSummary?: FinancialSummary | null): Promise<string>;
}

// ============================================================================
// GEMINI AI PROVIDER IMPLEMENTATION (Google AI Studio)
// ============================================================================

export class GeminiAIProvider implements AIProvider {
  name = 'Google Gemini';
  private client: GoogleGenerativeAI | null = null;
  private modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    this.modelName = modelName || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    if (key) {
      this.client = new GoogleGenerativeAI(key);
    }
  }

  async classifyIntent(text: string, context?: AIParserContext): Promise<UserIntent> {
    const lower = text.trim().toLowerCase();

    // 1. Detección rápida de intención de consulta financiera (Preguntas)
    const isQuery = 
      /^(cu[aá]nto|qu[eé]|en qu[eé]|c[oó]mo voy|compara|cu[aá]l fue|mu[eé]strame|mis gastos|resumen|balance)/i.test(lower) ||
      lower.endsWith('?') ||
      lower.includes('llevo gastado') ||
      lower.includes('gasté en') ||
      lower.includes('gaste en');

    if (isQuery) {
      let targetPeriod: string | undefined = undefined;
      if (lower.includes('mes pasado') || lower.includes('septiembre')) {
        targetPeriod = 'previous';
      }
      return {
        type: 'FINANCIAL_QUERY',
        queryTopic: text,
        targetPeriod,
      };
    }

    // 2. Intento de registro: primero evaluar si Rules Engine puede resolverlo con alta certeza
    const ruleCandidate = tryParseWithRules(text, context?.referenceDate);
    if (ruleCandidate && ruleCandidate.confidence >= 0.85) {
      return {
        type: 'RECORD_TRANSACTION',
        candidates: [ruleCandidate],
      };
    }

    // 3. Si no hay cliente Gemini configurado, usar reglas de fallback
    if (!this.client) {
      if (ruleCandidate) {
        return {
          type: 'RECORD_TRANSACTION',
          candidates: [ruleCandidate],
        };
      }
      return {
        type: 'CLARIFICATION_NEEDED',
        question: '¿Cuánto gastaste y en qué concepto?',
      };
    }

    // 4. Invocación a Gemini Structured Output
    const candidates = await this.parseTransactions(text, context);
    if (candidates.length === 0) {
      return {
        type: 'CLARIFICATION_NEEDED',
        question: '¿Cuánto gastaste y en qué concepto?',
      };
    }

    // Si algún candidato requiere clarificación o tiene confianza muy baja
    const lowestConf = Math.min(...candidates.map(c => c.confidence));
    if (lowestConf < 0.6) {
      const ask = candidates.find(c => c.clarificationNeeded)?.clarificationNeeded || '¿Cuánto gastaste?';
      return {
        type: 'CLARIFICATION_NEEDED',
        question: ask,
      };
    }

    return {
      type: 'RECORD_TRANSACTION',
      candidates,
    };
  }

  async parseTransactions(text: string, context?: AIParserContext): Promise<TransactionCandidate[]> {
    if (!this.client) {
      // Fallback a rules engine
      const single = tryParseWithRules(text, context?.referenceDate);
      return single ? [single] : [];
    }

    const refDate = context?.referenceDate || toZonedTime(new Date(), CHILE_TIMEZONE);
    const currentDateStr = formatIsoDate(refDate);

    const model = this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
      systemInstruction: SYSTEM_PROMPT_FINANCIAL_PARSER,
    });

    const prompt = `Fecha actual de referencia en Chile: ${currentDateStr} (${CHILE_TIMEZONE}).
Mensaje del usuario: "${text}"

Devuelve un JSON array de objetos con el siguiente esquema:
[
  {
    "type": "expense" | "income" | "transfer",
    "amount": number,
    "currency": "CLP",
    "date": "YYYY-MM-DD",
    "merchant": string | null,
    "description": string,
    "category": string,
    "subcategory": string | null,
    "account": string | null,
    "confidence": number,
    "clarificationNeeded": string | null
  }
]`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const rawJson = JSON.parse(responseText);

      const items = Array.isArray(rawJson) ? rawJson : [rawJson];
      const validated: TransactionCandidate[] = [];

      for (const item of items) {
        const parsed = TransactionCandidateSchema.safeParse({
          ...item,
          currency: item.currency || 'CLP',
          date: item.date || currentDateStr,
        });
        if (parsed.success) {
          validated.push(parsed.data);
        } else {
          console.warn('Candidato descartado por validación de esquema:', parsed.error);
        }
      }

      return validated;
    } catch (err) {
      console.error('Error en Gemini AI parseTransactions, cayendo a rules engine:', err);
      const single = tryParseWithRules(text, context?.referenceDate);
      return single ? [single] : [];
    }
  }

  async explainFinancialQuery(
    query: string,
    summary: FinancialSummary,
    compareSummary?: FinancialSummary | null
  ): Promise<string> {
    // Si no hay API key, construimos respuesta determinística en español sin gastar tokens
    if (!this.client) {
      return this.buildDeterministicExplanation(query, summary, compareSummary);
    }

    try {
      const model = this.client.getGenerativeModel({
        model: this.modelName,
        generationConfig: { temperature: 0.3 },
        systemInstruction: SYSTEM_PROMPT_FINANCIAL_EXPLAINER,
      });

      const contextData = {
        preguntaUsuario: query,
        resumenPeriodo: {
          periodo: summary.period,
          totalGastos: formatCLP(summary.totalExpenses),
          totalIngresos: formatCLP(summary.totalIncome),
          ahorroNeto: formatCLP(summary.netSavings),
          tasaAhorro: `${summary.savingsRate}%`,
          desglosePorCategoria: summary.byCategory.map(c => `${c.categoryName}: ${formatCLP(c.amount)} (${c.percentage}%)`),
          topComercios: summary.topMerchants.map(m => `${m.merchantName}: ${formatCLP(m.amount)}`),
          ultimosMovimientos: summary.recentTransactions.map(t => `${t.date}: ${t.description} (${formatCLP(t.amount)})`),
        },
        comparativaPeriodoAnterior: compareSummary ? {
          periodo: compareSummary.period,
          totalGastos: formatCLP(compareSummary.totalExpenses),
          diferencia: formatCLP(summary.totalExpenses - compareSummary.totalExpenses),
        } : null,
      };

      const result = await model.generateContent(`Datos reales del usuario:\n${JSON.stringify(contextData, null, 2)}\n\nPregunta: "${query}"`);
      return result.response.text().trim();
    } catch (err) {
      console.error('Error en Gemini explainFinancialQuery, usando explicación determinística:', err);
      return this.buildDeterministicExplanation(query, summary, compareSummary);
    }
  }

  private buildDeterministicExplanation(
    query: string,
    summary: FinancialSummary,
    compareSummary?: FinancialSummary | null
  ): string {
    const q = query.toLowerCase();

    // Mayor gasto
    if (q.includes('mayor gasto') || q.includes('en qué estoy gastando más')) {
      const top = summary.byCategory[0];
      if (!top) return `No tienes gastos registrados este período (${summary.period}).`;
      return `📊 En lo que más has gastado este mes es en *${top.categoryName}* con ${formatCLP(top.amount)} (${top.percentage}% del total de tus gastos).`;
    }

    // Últimos movimientos
    if (q.includes('últimos') || q.includes('ultimos') || q.includes('movimientos')) {
      if (summary.recentTransactions.length === 0) return 'No tienes movimientos recientes registrados.';
      const list = summary.recentTransactions
        .slice(0, 5)
        .map(t => `• ${t.date} — ${t.description}: *${formatCLP(t.amount)}*`)
        .join('\n');
      return `📋 *Tus últimos movimientos:*\n\n${list}`;
    }

    // Comparación
    if (compareSummary && (q.includes('compara') || q.includes('mes pasado'))) {
      const diff = summary.totalExpenses - compareSummary.totalExpenses;
      const isMore = diff > 0;
      return `⚖️ *Comparativa de Gastos*\n\n• Este mes (${summary.period}): *${formatCLP(summary.totalExpenses)}*\n• Mes anterior (${compareSummary.period}): *${formatCLP(compareSummary.totalExpenses)}*\n\n${isMore ? `⚠️ Llevas gastado *${formatCLP(Math.abs(diff))}* más que el mes pasado.` : `👏 Llevas gastado *${formatCLP(Math.abs(diff))}* menos que el mes pasado.`}`;
    }

    // Total general por defecto
    const topCats = summary.byCategory.slice(0, 3).map(c => `• ${c.categoryName}: ${formatCLP(c.amount)} (${c.percentage}%)`).join('\n');
    return `💰 *Resumen de ${summary.period}:*\n\n• *Total Gastos:* ${formatCLP(summary.totalExpenses)}\n• *Total Ingresos:* ${formatCLP(summary.totalIncome)}\n• *Ahorro Neto:* ${formatCLP(summary.netSavings)} (${summary.savingsRate}%)\n\n📌 *Principales categorías:*\n${topCats || 'Sin registros aún'}`;
  }
}

// ============================================================================
// MOCK AI PROVIDER FOR UNIT TESTING
// ============================================================================

export class MockAIProvider implements AIProvider {
  name = 'Mock AI';

  async parseTransactions(text: string, context?: AIParserContext): Promise<TransactionCandidate[]> {
    const single = tryParseWithRules(text, context?.referenceDate);
    return single ? [single] : [];
  }

  async classifyIntent(text: string, context?: AIParserContext): Promise<UserIntent> {
    const isQuery = /^(cu[aá]nto|qu[eé]|compara|mu[eé]strame)/i.test(text.trim());
    if (isQuery) {
      return { type: 'FINANCIAL_QUERY', queryTopic: text };
    }
    const single = tryParseWithRules(text, context?.referenceDate);
    if (single) {
      return { type: 'RECORD_TRANSACTION', candidates: [single] };
    }
    return { type: 'CLARIFICATION_NEEDED', question: '¿Cuánto gastaste?' };
  }

  async explainFinancialQuery(query: string, summary: FinancialSummary): Promise<string> {
    return `Llevas gastado ${formatCLP(summary.totalExpenses)} este mes.`;
  }
}

// Singleton factory
let currentProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (currentProvider) return currentProvider;
  currentProvider = new GeminiAIProvider();
  return currentProvider;
}

export function setAIProvider(provider: AIProvider) {
  currentProvider = provider;
}
