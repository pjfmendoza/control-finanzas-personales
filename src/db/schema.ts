import { pgTable, text, integer, bigint, boolean, timestamp, date, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Cuentas bancarias, tarjetas o efectivo.
 */
export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'checking' | 'cash' | 'credit' | 'savings' | 'investment'
  currency: text('currency').default('CLP').notNull(),
  initialBalance: bigint('initial_balance', { mode: 'number' }).default(0).notNull(),
  currentBalance: bigint('current_balance', { mode: 'number' }).default(0).notNull(),
  color: text('color'),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Taxonomía de categorías y subcategorías jerárquicas.
 */
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  icon: text('icon'),
  color: text('color'),
  parentId: text('parent_id'),
  type: text('type').default('expense').notNull(), // 'expense' | 'income' | 'both'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Comercios normalizados con reglas de aprendizaje ("Rules First").
 */
export const merchants = pgTable('merchants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  cleanName: text('clean_name').notNull().unique(),
  defaultCategoryId: text('default_category_id').references(() => categories.id),
  frequency: integer('frequency').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Transacciones financieras (gastos, ingresos, transferencias).
 */
export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'expense' | 'income' | 'transfer'
  amount: bigint('amount', { mode: 'number' }).notNull(),
  currency: text('currency').default('CLP').notNull(),
  date: date('date').notNull(), // YYYY-MM-DD
  accountId: text('account_id').references(() => accounts.id),
  destinationAccountId: text('destination_account_id').references(() => accounts.id),
  categoryId: text('category_id').references(() => categories.id),
  categoryName: text('category_name'),
  merchantId: text('merchant_id').references(() => merchants.id),
  merchantName: text('merchant_name'),
  description: text('description').notNull(),
  paymentMethod: text('payment_method').default('other'),
  tags: text('tags'), // Tags separados por coma
  confidence: real('confidence').default(1.0).notNull(),
  source: text('source').default('telegram').notNull(), // 'telegram' | 'dashboard' | 'bank_import'
  sourceId: text('source_id'), // Telegram message_id o UUID externo
  status: text('status').default('confirmed').notNull(), // 'confirmed' | 'pending_review'
  rawText: text('raw_text'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Control estricto de Idempotencia para Webhooks de Telegram.
 */
export const telegramUpdates = pgTable('telegram_updates', {
  id: text('id').primaryKey(),
  updateId: bigint('update_id', { mode: 'number' }).notNull().unique(),
  userId: bigint('user_id', { mode: 'number' }).notNull(),
  chatId: bigint('chat_id', { mode: 'number' }).notNull(),
  messageText: text('message_text'),
  status: text('status').default('processed').notNull(),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
});

/**
 * Presupuestos mensuales por categoría.
 */
export const budgets = pgTable('budgets', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').references(() => categories.id).notNull(),
  month: text('month').notNull(), // YYYY-MM
  amount: bigint('amount', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Relaciones Drizzle ORM
 */
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'subcategories',
  }),
  subcategories: many(categories, { relationName: 'subcategories' }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  destinationAccount: one(accounts, {
    fields: [transactions.destinationAccountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  merchant: one(merchants, {
    fields: [transactions.merchantId],
    references: [merchants.id],
  }),
}));
