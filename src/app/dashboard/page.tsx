'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  RefreshCw,
  Download,
  Plus,
  Trash2,
  Search,
  Filter,
  LogOut,
  CheckCircle2,
  X,
  Calendar,
  Building2,
  Tag,
  AlertCircle
} from 'lucide-react';
import { Transaction, FinancialSummary } from '@/types';
import { formatCLP } from '@/lib/chilean-parser/currency';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [showModal, setShowModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Formulario de nueva transacción manual
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('Alimentación');
  const [formMerchant, setFormMerchant] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [sumRes, txRes] = await Promise.all([
        fetch('/api/summary'),
        fetch('/api/transactions?limit=150'),
      ]);

      if (sumRes.status === 401 || txRes.status === 401) {
        router.push('/login');
        return;
      }

      const sumData = await sumRes.json();
      const txData = await txRes.json();

      setSummary(sumData.summary || null);
      setTransactions(txData.transactions || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleDelete = async (id: string, description: string) => {
    if (!confirm(`¿Eliminar la transacción "${description}"?`)) return;

    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setActionMessage('Transacción eliminada con éxito');
        setTimeout(() => setActionMessage(null), 3000);
        fetchData();
      }
    } catch (err) {
      alert('Error al eliminar la transacción');
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(formAmount.replace(/\D/g, ''), 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Por favor ingresa un monto válido');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formType,
          amount: amountNum,
          date: formDate,
          description: formDescription.trim() || formCategory,
          categoryName: formCategory,
          merchantName: formMerchant.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      setShowModal(false);
      setFormAmount('');
      setFormDescription('');
      setFormMerchant('');
      setActionMessage('Movimiento registrado correctamente');
      setTimeout(() => setActionMessage(null), 3000);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchCat = t.categoryName?.toLowerCase().includes(q);
      const matchMerch = t.merchantName?.toLowerCase().includes(q);
      return matchDesc || matchCat || matchMerch;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm">Cargando tus finanzas...</p>
        </div>
      </div>
    );
  }

  const isNetPositive = (summary?.netSavings || 0) >= 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Control de Finanzas
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Período actual: {summary?.period || 'En curso'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón de Refrescar */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Actualizar datos"
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* Exportar CSV */}
          <a
            href="/api/export?format=csv"
            title="Descargar respaldo CSV para Excel"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 text-xs font-medium transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Exportar CSV</span>
          </a>

          {/* Exportar JSON */}
          <a
            href="/api/export?format=json"
            title="Descargar respaldo completo en JSON"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 text-xs font-medium transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </a>

          {/* Cerrar sesión */}
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="p-2 bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-800 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Alerta de notificación flotante */}
      {actionMessage && (
        <div className="fixed top-16 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs shadow-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionMessage}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-8">
        {/* KPI Cards: Resumen Financiero Clave */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Balance / Ahorro */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Balance / Ahorro Neto</span>
              <div className={`p-1.5 rounded-lg ${isNetPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {formatCLP(summary?.netSavings || 0)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <span className={`font-semibold ${isNetPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {summary?.savingsRate || 0}%
              </span>
              <span>tasa de ahorro este mes</span>
            </div>
          </div>

          {/* Total Ingresos */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Ingresos Totales</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
              {formatCLP(summary?.totalIncome || 0)}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Registrados en el período
            </p>
          </div>

          {/* Total Gastos */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Gastos Totales</span>
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 tracking-tight">
              {formatCLP(summary?.totalExpenses || 0)}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Calculados determinísticamente
            </p>
          </div>
        </div>

        {/* Analítica Visual: Desglose por Categoría y Comercios */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gastos por Categoría */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white">Gastos por Categoría</h2>
                <p className="text-xs text-slate-400">¿En qué estás gastando este mes?</p>
              </div>
              <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full">
                {summary?.byCategory.length || 0} categorías activas
              </span>
            </div>

            {(!summary?.byCategory || summary.byCategory.length === 0) ? (
              <div className="py-10 text-center text-slate-500 text-sm">
                No hay gastos registrados en este período.
              </div>
            ) : (
              <div className="space-y-3.5">
                {summary.byCategory.map((cat) => (
                  <div key={cat.categoryName} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">{cat.categoryName}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{formatCLP(cat.amount)}</span>
                        <span className="text-slate-400">({cat.percentage}%)</span>
                      </div>
                    </div>
                    {/* Barra de progreso */}
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Comercios */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-white mb-1">Principales Comercios</h2>
            <p className="text-xs text-slate-400 mb-5">Lugares con mayor gasto acumulado</p>

            {(!summary?.topMerchants || summary.topMerchants.length === 0) ? (
              <div className="py-10 text-center text-slate-500 text-sm">
                Sin comercios registrados aún.
              </div>
            ) : (
              <div className="space-y-3">
                {summary.topMerchants.map((m, idx) => (
                  <div key={m.merchantName} className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800/60 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-400 bg-slate-800 rounded-full">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-medium text-slate-200">{m.merchantName}</span>
                    </div>
                    <span className="text-xs font-semibold text-rose-300">{formatCLP(m.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sección de Movimientos (CRUD Completo) */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Movimientos</h2>
              <p className="text-xs text-slate-400">Historial completo con filtros y administración directa</p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Movimiento</span>
              </button>
            </div>
          </div>

          {/* Filtros y Búsqueda */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por descripción, comercio o categoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 border border-slate-800 rounded-xl text-xs">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1 rounded-lg transition-all ${typeFilter === 'all' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setTypeFilter('expense')}
                className={`px-3 py-1 rounded-lg transition-all ${typeFilter === 'expense' ? 'bg-rose-600/80 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                Gastos
              </button>
              <button
                onClick={() => setTypeFilter('income')}
                className={`px-3 py-1 rounded-lg transition-all ${typeFilter === 'income' ? 'bg-emerald-600/80 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                Ingresos
              </button>
            </div>
          </div>

          {/* Lista de Movimientos */}
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No se encontraron movimientos con los filtros seleccionados.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60 overflow-hidden">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="py-3 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/30 px-2 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-xl text-base ${
                        tx.type === 'income'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {tx.type === 'income' ? '💰' : '💸'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-white truncate">
                          {tx.description}
                        </span>
                        {tx.source === 'telegram' && (
                          <span className="text-[10px] bg-sky-500/10 border border-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded-md hidden sm:inline">
                            Telegram
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{tx.date}</span>
                        <span>•</span>
                        <span className="text-slate-300 font-medium">{tx.categoryName || 'Otros'}</span>
                        {tx.merchantName && (
                          <>
                            <span>•</span>
                            <span>{tx.merchantName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs sm:text-sm font-bold ${
                        tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}{formatCLP(tx.amount)}
                    </span>

                    <button
                      onClick={() => handleDelete(tx.id, tx.description)}
                      title="Eliminar movimiento"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal para Crear Nuevo Movimiento */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Registrar Nuevo Movimiento</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              {/* Selector de Tipo */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormType('expense')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    formType === 'expense' ? 'bg-rose-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('income')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    formType === 'income' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Ingreso
                </button>
              </div>

              {/* Monto */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Monto (CLP)</label>
                <input
                  type="number"
                  placeholder="Ej: 14500"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Fecha</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Categoría</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Alimentación">Alimentación</option>
                  <option value="Supermercado">Supermercado</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Vivienda">Vivienda</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Salud">Salud</option>
                  <option value="Entretenimiento">Entretenimiento</option>
                  <option value="Suscripciones">Suscripciones</option>
                  <option value="Sueldo & Honorarios">Sueldo & Honorarios</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              {/* Comercio */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Comercio (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Líder, Copec, Starbucks"
                  value={formMerchant}
                  onChange={(e) => setFormMerchant(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Descripción</label>
                <input
                  type="text"
                  placeholder="Ej: Almuerzo con amigos"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20"
                >
                  {submitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
