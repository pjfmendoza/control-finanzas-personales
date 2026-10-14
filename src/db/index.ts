import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { Transaction, FinancialSummary, Category, Account } from '@/types';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from './seeds';
import { formatIsoDate, CHILE_TIMEZONE } from '@/lib/chilean-parser/dates';
import { toZonedTime } from 'date-fns-tz';
import { startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: connectionString.includes('sslmode=require') || connectionString.includes('supabase') ? 'require' : false,
  });
  dbInstance = drizzle(client, { schema });
  return dbInstance;
}

// ============================================================================
// MEMORY REPOSITORY FALLBACK (Para desarrollo local offline, pruebas unitarias y CI)
// ============================================================================

class MemoryStore {
  transactions: Transaction[] = [];
  telegramUpdates: Set<number> = new Set();
  categories: Category[] = [];
  accounts: Account[] = [];

  constructor() {
    this.initSeeds();
  }

  private initSeeds() {
    this.accounts = DEFAULT_ACCOUNTS.map(a => ({
      ...a,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    for (const cat of DEFAULT_CATEGORIES) {
      this.categories.push({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        color: cat.color,
        parentId: null,
        type: cat.type,
        createdAt: new Date(),
      });
      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          this.categories.push({
            id: sub.id,
            name: sub.name,
            slug: sub.slug,
            icon: sub.icon,
            parentId: cat.id,
            type: cat.type,
            createdAt: new Date(),
          });
        }
      }
    }
  }
}

const memoryStore = new MemoryStore();

// ============================================================================
// SERVICIO DE ACCESO A DATOS (Abstracción PostgreSQL + In-Memory Fallback)
// ============================================================================

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: 'expense' | 'income' | 'transfer';
  categoryId?: string;
  limit?: number;
  offset?: number;
  query?: string;
}

export const dbService = {
  /**
   * Verifica y registra el ID de actualización de Telegram para garantizar idempotencia.
   * Retorna true si es la primera vez que se procesa, false si es duplicado.
   */
  async registerTelegramUpdate(
    updateId: number,
    userId: number,
    chatId: number,
    messageText?: string
  ): Promise<boolean> {
    const db = getDb();
    if (db) {
      try {
        const existing = await db
          .select()
          .from(schema.telegramUpdates)
          .where(eq(schema.telegramUpdates.updateId, updateId))
          .limit(1);

        if (existing.length > 0) {
          return false; // Ya fue procesado
        }

        await db.insert(schema.telegramUpdates).values({
          id: `upd_${Date.now()}_${updateId}`,
          updateId,
          userId,
          chatId,
          messageText: messageText || null,
          status: 'processed',
        });
        return true;
      } catch (err: any) {
        // En caso de conflicto de clave única (concurrencia)
        if (err.code === '23505') {
          return false;
        }
        console.error('Error registrando telegram update en DB:', err);
      }
    }

    // Fallback en memoria
    if (memoryStore.telegramUpdates.has(updateId)) {
      return false;
    }
    memoryStore.telegramUpdates.add(updateId);
    return true;
  },

  /**
   * Crea una nueva transacción financiera
   */
  async createTransaction(data: {
    type: 'expense' | 'income' | 'transfer';
    amount: number;
    currency?: string;
    date: string; // YYYY-MM-DD
    description: string;
    categoryName?: string | null;
    merchantName?: string | null;
    paymentMethod?: any;
    confidence?: number;
    source?: 'telegram' | 'dashboard' | 'bank_import';
    sourceId?: string | null;
    rawText?: string | null;
  }): Promise<Transaction> {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const currency = data.currency || 'CLP';
    const confidence = data.confidence !== undefined ? data.confidence : 1.0;
    const source = data.source || 'telegram';
    const now = new Date();

    const record: Transaction = {
      id,
      type: data.type,
      amount: Math.round(data.amount),
      currency,
      date: data.date,
      description: data.description,
      categoryName: data.categoryName || 'Otros',
      merchantName: data.merchantName || null,
      paymentMethod: data.paymentMethod || 'other',
      confidence,
      source,
      sourceId: data.sourceId || null,
      createdAt: now,
      updatedAt: now,
    };

    const db = getDb();
    if (db) {
      try {
        await db.insert(schema.transactions).values({
          id: record.id,
          type: record.type,
          amount: record.amount,
          currency: record.currency,
          date: record.date,
          description: record.description,
          categoryName: record.categoryName,
          merchantName: record.merchantName,
          paymentMethod: record.paymentMethod,
          confidence: record.confidence,
          source: record.source,
          sourceId: record.sourceId,
          rawText: data.rawText || null,
        });
      } catch (err) {
        console.error('Error insertando transacción en DB, guardando en memoria:', err);
      }
    }

    // Siempre persistir en memoria local para sincronía inmediata
    memoryStore.transactions.unshift(record);
    return record;
  },

  /**
   * Obtiene la lista de transacciones con filtros
   */
  async getTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
    const db = getDb();
    if (db) {
      try {
        const conditions = [];
        if (filters.startDate) conditions.push(gte(schema.transactions.date, filters.startDate));
        if (filters.endDate) conditions.push(lte(schema.transactions.date, filters.endDate));
        if (filters.type) conditions.push(eq(schema.transactions.type, filters.type));

        const result = await db
          .select()
          .from(schema.transactions)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(schema.transactions.date), desc(schema.transactions.createdAt))
          .limit(filters.limit || 100);

        return result.map(r => ({
          ...r,
          type: r.type as 'expense' | 'income' | 'transfer',
          source: r.source as 'telegram' | 'dashboard' | 'bank_import' | 'recurring',
          paymentMethod: r.paymentMethod as any,
          tags: r.tags ? r.tags.split(',') : undefined,
        }));
      } catch (err) {
        console.error('Error consultando transacciones de DB, usando memoria:', err);
      }
    }

    // Fallback memoria
    let list = [...memoryStore.transactions];
    if (filters.startDate) list = list.filter(t => t.date >= filters.startDate!);
    if (filters.endDate) list = list.filter(t => t.date <= filters.endDate!);
    if (filters.type) list = list.filter(t => t.type === filters.type);
    if (filters.query) {
      const q = filters.query.toLowerCase();
      list = list.filter(t => 
        t.description.toLowerCase().includes(q) ||
        (t.categoryName && t.categoryName.toLowerCase().includes(q)) ||
        (t.merchantName && t.merchantName.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.getTime() - a.createdAt.getTime());
    return list.slice(filters.offset || 0, (filters.offset || 0) + (filters.limit || 100));
  },

  /**
   * Elimina una transacción por ID (para Deshacer o CRUD)
   */
  async deleteTransaction(id: string): Promise<boolean> {
    const db = getDb();
    if (db) {
      try {
        await db.delete(schema.transactions).where(eq(schema.transactions.id, id));
      } catch (err) {
        console.error('Error eliminando en DB:', err);
      }
    }
    const idx = memoryStore.transactions.findIndex(t => t.id === id);
    if (idx !== -1) {
      memoryStore.transactions.splice(idx, 1);
      return true;
    }
    return false;
  },

  /**
   * Obtiene una transacción por ID
   */
  async getTransactionById(id: string): Promise<Transaction | null> {
    const db = getDb();
    if (db) {
      try {
        const rows = await db.select().from(schema.transactions).where(eq(schema.transactions.id, id)).limit(1);
        if (rows.length > 0) {
          const r = rows[0];
          return {
            ...r,
            type: r.type as any,
            source: r.source as any,
            paymentMethod: r.paymentMethod as any,
            tags: r.tags ? r.tags.split(',') : undefined,
          };
        }
      } catch (err) {
        console.error('Error consultando por ID en DB:', err);
      }
    }
    return memoryStore.transactions.find(t => t.id === id) || null;
  },

  /**
   * Actualiza los datos o categoría de una transacción
   */
  async updateTransaction(id: string, updates: { categoryName?: string; description?: string; amount?: number }): Promise<boolean> {
    const db = getDb();
    if (db) {
      try {
        await db.update(schema.transactions).set({
          ...updates,
          updatedAt: new Date(),
        }).where(eq(schema.transactions.id, id));
      } catch (err) {
        console.error('Error actualizando transacción en DB:', err);
      }
    }

    const tx = memoryStore.transactions.find(t => t.id === id);
    if (tx) {
      if (updates.categoryName) tx.categoryName = updates.categoryName;
      if (updates.description) tx.description = updates.description;
      if (updates.amount) tx.amount = updates.amount;
      tx.updatedAt = new Date();
      return true;
    }
    return true;
  },

  /**
   * Obtiene el resumen financiero determinístico (Cálculo 100% matemático en código/SQL)
   * NUNCA calculado por IA.
   */
  async getFinancialSummary(periodOrDate?: string): Promise<FinancialSummary> {
    // Si no se indica fecha, tomar hoy en Santiago
    const now = toZonedTime(new Date(), CHILE_TIMEZONE);
    let targetDate = now;
    if (periodOrDate) {
      try {
        targetDate = parseISO(periodOrDate.length === 7 ? `${periodOrDate}-01` : periodOrDate);
      } catch {
        targetDate = now;
      }
    }

    const start = formatIsoDate(startOfMonth(targetDate));
    const end = formatIsoDate(endOfMonth(targetDate));
    const period = start.substring(0, 7); // YYYY-MM

    // Obtener transacciones del mes
    const monthTxs = await this.getTransactions({ startDate: start, endDate: end, limit: 1000 });

    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryTotals: Record<string, { amount: number; count: number }> = {};
    const merchantTotals: Record<string, { amount: number; count: number }> = {};

    for (const tx of monthTxs) {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpenses += tx.amount;

        // Por categoría
        const cat = tx.categoryName || 'Otros';
        if (!categoryTotals[cat]) categoryTotals[cat] = { amount: 0, count: 0 };
        categoryTotals[cat].amount += tx.amount;
        categoryTotals[cat].count += 1;

        // Por comercio
        if (tx.merchantName) {
          if (!merchantTotals[tx.merchantName]) merchantTotals[tx.merchantName] = { amount: 0, count: 0 };
          merchantTotals[tx.merchantName].amount += tx.amount;
          merchantTotals[tx.merchantName].count += 1;
        }
      }
    }

    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    const byCategory = Object.entries(categoryTotals)
      .map(([categoryName, data]) => ({
        categoryName,
        amount: data.amount,
        percentage: totalExpenses > 0 ? Math.round((data.amount / totalExpenses) * 100) : 0,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    const topMerchants = Object.entries(merchantTotals)
      .map(([merchantName, data]) => ({
        merchantName,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Métricas de Tendencia Diaria y Proyección a Fin de Mes (Run-rate)
    const endOfMonthDate = endOfMonth(targetDate);
    const daysInMonth = endOfMonthDate.getDate();
    const isCurrentMonth = formatIsoDate(targetDate).substring(0, 7) === formatIsoDate(now).substring(0, 7);
    const elapsedDays = isCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;

    // Agrupar gastos por día
    const expensesByDate: Record<string, number> = {};
    let maxExpense: { amount: number; description: string; categoryName: string; date: string } | null = null;

    for (const tx of monthTxs) {
      if (tx.type === 'expense') {
        const txDate = tx.date;
        expensesByDate[txDate] = (expensesByDate[txDate] || 0) + tx.amount;
        if (!maxExpense || tx.amount > maxExpense.amount) {
          maxExpense = {
            amount: tx.amount,
            description: tx.description,
            categoryName: tx.categoryName || 'Otros',
            date: tx.date,
          };
        }
      }
    }

    const dailyTrend: { date: string; day: number; amount: number; cumulativeAmount: number }[] = [];
    let cumulative = 0;
    let daysWithZeroExpenses = 0;

    for (let day = 1; day <= elapsedDays; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const isoDate = `${period}-${dayStr}`;
      const dayAmount = expensesByDate[isoDate] || 0;
      cumulative += dayAmount;
      if (dayAmount === 0) daysWithZeroExpenses++;

      dailyTrend.push({
        date: isoDate,
        day,
        amount: dayAmount,
        cumulativeAmount: cumulative,
      });
    }

    const dailyAverage = elapsedDays > 0 ? Math.round(totalExpenses / elapsedDays) : 0;
    const remainingDays = Math.max(daysInMonth - elapsedDays, 0);
    const projectedEndMonthExpenses = isCurrentMonth ? totalExpenses + (dailyAverage * remainingDays) : totalExpenses;

    return {
      period,
      startDate: start,
      endDate: end,
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      dailyTrend,
      dailyAverage,
      projectedEndMonthExpenses,
      daysInMonth,
      elapsedDays,
      maxExpense,
      noSpendDays: daysWithZeroExpenses,
      byCategory,
      topMerchants,
      recentTransactions: monthTxs.slice(0, 15),
    };
  },

  /**
   * Categorías disponibles
   */
  async getCategories(): Promise<Category[]> {
    return memoryStore.categories;
  },

  /**
   * Cuentas disponibles
   */
  async getAccounts(): Promise<Account[]> {
    return memoryStore.accounts;
  },
};
