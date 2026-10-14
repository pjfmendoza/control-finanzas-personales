export interface SeedCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'both';
  subcategories?: { id: string; name: string; slug: string; icon: string }[];
}

export const DEFAULT_ACCOUNTS = [
  {
    id: 'acc_main_checking',
    name: 'Cuenta Corriente Principal',
    type: 'checking' as const,
    currency: 'CLP',
    initialBalance: 0,
    currentBalance: 0,
    color: '#3b82f6',
    isDefault: true,
  },
  {
    id: 'acc_cash',
    name: 'Efectivo',
    type: 'cash' as const,
    currency: 'CLP',
    initialBalance: 0,
    currentBalance: 0,
    color: '#10b981',
    isDefault: false,
  },
  {
    id: 'acc_credit_card',
    name: 'Tarjeta de Crédito',
    type: 'credit' as const,
    currency: 'CLP',
    initialBalance: 0,
    currentBalance: 0,
    color: '#8b5cf6',
    isDefault: false,
  },
];

export const DEFAULT_CATEGORIES: SeedCategory[] = [
  {
    id: 'cat_alimentacion',
    name: 'Alimentación',
    slug: 'alimentacion',
    icon: '🍽️',
    color: '#f97316',
    type: 'expense',
    subcategories: [
      { id: 'sub_restaurantes', name: 'Restaurantes', slug: 'restaurantes', icon: '🍴' },
      { id: 'sub_cafe', name: 'Café', slug: 'cafe', icon: '☕' },
      { id: 'sub_delivery', name: 'Delivery', slug: 'delivery', icon: '🛵' },
    ],
  },
  {
    id: 'cat_supermercado',
    name: 'Supermercado',
    slug: 'supermercado',
    icon: '🛒',
    color: '#10b981',
    type: 'expense',
  },
  {
    id: 'cat_transporte',
    name: 'Transporte',
    slug: 'transporte',
    icon: '🚗',
    color: '#3b82f6',
    type: 'expense',
    subcategories: [
      { id: 'sub_combustible', name: 'Combustible', slug: 'combustible', icon: '⛽' },
      { id: 'sub_uber', name: 'Uber/Taxi', slug: 'uber-taxi', icon: '🚕' },
      { id: 'sub_publico', name: 'Transporte público', slug: 'transporte-publico', icon: '🚇' },
      { id: 'sub_estacionamiento', name: 'Estacionamiento', slug: 'estacionamiento', icon: '🅿️' },
    ],
  },
  {
    id: 'cat_vivienda',
    name: 'Vivienda',
    slug: 'vivienda',
    icon: '🏠',
    color: '#6366f1',
    type: 'expense',
    subcategories: [
      { id: 'sub_arriendo', name: 'Arriendo', slug: 'arriendo', icon: '🔑' },
      { id: 'sub_gastos_comunes', name: 'Gastos Comunes', slug: 'gastos-comunes', icon: '🏢' },
    ],
  },
  {
    id: 'cat_servicios',
    name: 'Servicios',
    slug: 'servicios',
    icon: '💡',
    color: '#eab308',
    type: 'expense',
    subcategories: [
      { id: 'sub_luz', name: 'Electricidad', slug: 'electricidad', icon: '⚡' },
      { id: 'sub_agua', name: 'Agua', slug: 'agua', icon: '💧' },
      { id: 'sub_telecom', name: 'Internet / Celular', slug: 'internet-celular', icon: '🌐' },
      { id: 'sub_gas', name: 'Gas', slug: 'gas', icon: '🔥' },
    ],
  },
  {
    id: 'cat_salud',
    name: 'Salud',
    slug: 'salud',
    icon: '💊',
    color: '#ec4899',
    type: 'expense',
    subcategories: [
      { id: 'sub_farmacia', name: 'Farmacia', slug: 'farmacia', icon: '🩹' },
      { id: 'sub_consultas', name: 'Consultas Médicas', slug: 'consultas-medicas', icon: '🩺' },
      { id: 'sub_dental', name: 'Dental', slug: 'dental', icon: '🦷' },
    ],
  },
  {
    id: 'cat_entretenimiento',
    name: 'Entretenimiento',
    slug: 'entretenimiento',
    icon: '🎉',
    color: '#a855f7',
    type: 'expense',
    subcategories: [
      { id: 'sub_bares', name: 'Bares & Salidas', slug: 'bares', icon: '🍻' },
      { id: 'sub_eventos', name: 'Cine & Eventos', slug: 'eventos', icon: '🎟️' },
    ],
  },
  {
    id: 'cat_suscripciones',
    name: 'Suscripciones',
    slug: 'suscripciones',
    icon: '📺',
    color: '#ef4444',
    type: 'expense',
  },
  {
    id: 'cat_sueldo',
    name: 'Sueldo & Honorarios',
    slug: 'sueldo',
    icon: '💰',
    color: '#14b8a6',
    type: 'income',
  },
  {
    id: 'cat_otros_ingresos',
    name: 'Otros Ingresos',
    slug: 'otros-ingresos',
    icon: '💵',
    color: '#06b6d4',
    type: 'income',
  },
  {
    id: 'cat_otros',
    name: 'Otros Gastos',
    slug: 'otros-gastos',
    icon: '📦',
    color: '#64748b',
    type: 'expense',
  },
];
