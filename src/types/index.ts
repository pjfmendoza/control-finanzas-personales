import { z } from 'zod';

export type TransactionType = 'expense' | 'income' | 'transfer';

export type PaymentMethod = 
  | 'cash' 
  | 'debit_card' 
  | 'credit_card' 
  | 'bank_transfer' 
  | 'other';

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'cash' | 'credit' | 'savings' | 'investment';
  currency: string;
  initialBalance: number;
  currentBalance: number;
  color?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  parentId?: string | null;
  type: 'expense' | 'income' | 'both';
  createdAt: Date;
}

export interface Merchant {
  id: string;
  name: string;
  cleanName: string;
  defaultCategoryId?: string | null;
  frequency: number;
  createdAt: Date;
  updatedAt: Date;
}

// Zod Schema for Structured Output from AI and validation
export const TransactionCandidateSchema = z.object({
  type: z.enum(['expense', 'income', 'transfer']).default('expense'),
  amount: z.number().int().positive({ message: 'El monto debe ser un entero positivo' }),
  currency: z.string().default('CLP'),
  date: z.string().describe('Fecha en formato ISO YYYY-MM-DD en timezone America/Santiago'),
  merchant: z.string().nullable().optional().describe('Nombre del comercio o establecimiento si aplica'),
  description: z.string().describe('Descripción breve y clara del movimiento'),
  category: z.string().describe('Categoría principal sugerida (ej. Alimentación, Supermercado, Transporte, Vivienda, etc.)'),
  subcategory: z.string().nullable().optional().describe('Subcategoría específica si aplica'),
  account: z.string().nullable().optional().describe('Nombre o tipo de cuenta si fue mencionada'),
  paymentMethod: z.enum(['cash', 'debit_card', 'credit_card', 'bank_transfer', 'other']).optional(),
  confidence: z.number().min(0).max(1).describe('Nivel de certeza de la interpretación entre 0.0 y 1.0'),
  clarificationNeeded: z.string().nullable().optional().describe('Pregunta breve al usuario si la confianza es baja (<0.6)'),
});

export type TransactionCandidate = z.infer<typeof TransactionCandidateSchema>;

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  merchantId?: string | null;
  merchantName?: string | null;
  description: string;
  categoryId?: string | null;
  categoryName?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  destinationAccountId?: string | null; // For transfers
  paymentMethod?: PaymentMethod;
  tags?: string[];
  confidence: number;
  source: 'telegram' | 'dashboard' | 'bank_import' | 'recurring';
  sourceId?: string | null; // e.g. telegram_message_id
  createdAt: Date;
  updatedAt: Date;
}

export interface TelegramUpdateRecord {
  id: string;
  updateId: number;
  userId: number;
  chatId: number;
  messageText?: string | null;
  processedAt: Date;
  status: 'processed' | 'ignored' | 'failed';
}

export interface FinancialSummary {
  period: string; // e.g. '2026-10'
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number; // percentage
  previousPeriodExpenses?: number;
  expensesChangePercentage?: number;
  byCategory: {
    categoryName: string;
    amount: number;
    percentage: number;
    count: number;
  }[];
  dailyTrend: {
    date: string;
    day: number;
    amount: number;
    cumulativeAmount: number;
  }[];
  dailyAverage: number;
  projectedEndMonthExpenses: number;
  daysInMonth: number;
  elapsedDays: number;
  maxExpense: {
    amount: number;
    description: string;
    categoryName: string;
    date: string;
  } | null;
  noSpendDays: number;
  topMerchants: {
    merchantName: string;
    amount: number;
    count: number;
  }[];
  recentTransactions: Transaction[];
}
