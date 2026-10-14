import { parseChileanCurrency, ExtractedAmount } from '../chilean-parser/currency';
import { parseChileanDate, ExtractedDate } from '../chilean-parser/dates';
import { TransactionCandidate } from '@/types';

/**
 * Taxonomía expandida y palabras clave enriquecidas para Chile.
 */
export const CATEGORY_KEYWORDS: Record<string, { category: string; subcategory?: string; icon: string }> = {
  // Supermercado
  'líder': { category: 'Supermercado', icon: '🛒' },
  'lider': { category: 'Supermercado', icon: '🛒' },
  'jumbo': { category: 'Supermercado', icon: '🛒' },
  'santa isabel': { category: 'Supermercado', icon: '🛒' },
  'unimarc': { category: 'Supermercado', icon: '🛒' },
  'tottus': { category: 'Supermercado', icon: '🛒' },
  'alvi': { category: 'Supermercado', icon: '🛒' },
  'mayorista 10': { category: 'Supermercado', icon: '🛒' },
  'supermercado': { category: 'Supermercado', icon: '🛒' },
  'super': { category: 'Supermercado', icon: '🛒' },
  'verdulería': { category: 'Supermercado', subcategory: 'Feria & Verdulería', icon: '🥦' },
  'verduleria': { category: 'Supermercado', subcategory: 'Feria & Verdulería', icon: '🥦' },
  'feria': { category: 'Supermercado', subcategory: 'Feria & Verdulería', icon: '🥦' },
  'carnicería': { category: 'Supermercado', subcategory: 'Carnicería', icon: '🥩' },
  'carniceria': { category: 'Supermercado', subcategory: 'Carnicería', icon: '🥩' },

  // Alimentación, Café, Panadería y Snacks
  'snack': { category: 'Alimentación', subcategory: 'Snacks & Colación', icon: '🥪' },
  'snacks': { category: 'Alimentación', subcategory: 'Snacks & Colación', icon: '🥪' },
  'proteína': { category: 'Alimentación', subcategory: 'Snacks & Colación', icon: '🥚' },
  'proteina': { category: 'Alimentación', subcategory: 'Snacks & Colación', icon: '🥚' },
  'barra de proteina': { category: 'Alimentación', subcategory: 'Snacks & Colación', icon: '🍫' },
  'huevo': { category: 'Alimentación', subcategory: 'Snacks & Colación', icon: '🥚' },
  'huevos': { category: 'Alimentación', subcategory: 'Snacks & Colación', icon: '🥚' },
  'colación': { category: 'Alimentación', subcategory: 'Snacks & Colación', icon: '🥪' },
  'colacion': { category: 'Alimentación', subcategory: 'Snacks & Colación', icon: '🥪' },
  'pan': { category: 'Alimentación', subcategory: 'Panadería', icon: '🥖' },
  'panadería': { category: 'Alimentación', subcategory: 'Panadería', icon: '🥖' },
  'panaderia': { category: 'Alimentación', subcategory: 'Panadería', icon: '🥖' },
  'marraqueta': { category: 'Alimentación', subcategory: 'Panadería', icon: '🥖' },
  'hallulla': { category: 'Alimentación', subcategory: 'Panadería', icon: '🥖' },
  'castaño': { category: 'Alimentación', subcategory: 'Panadería', icon: '🥐' },
  'castano': { category: 'Alimentación', subcategory: 'Panadería', icon: '🥐' },
  'san camilo': { category: 'Alimentación', subcategory: 'Panadería', icon: '🥐' },
  'almuerzo': { category: 'Alimentación', subcategory: 'Restaurantes', icon: '🍽️' },
  'almorzando': { category: 'Alimentación', subcategory: 'Restaurantes', icon: '🍽️' },
  'cena': { category: 'Alimentación', subcategory: 'Restaurantes', icon: '🍽️' },
  'cenando': { category: 'Alimentación', subcategory: 'Restaurantes', icon: '🍽️' },
  'comida': { category: 'Alimentación', subcategory: 'Restaurantes', icon: '🍽️' },
  'restaurante': { category: 'Alimentación', subcategory: 'Restaurantes', icon: '🍽️' },
  'desayuno': { category: 'Alimentación', subcategory: 'Café', icon: '☕' },
  'café': { category: 'Alimentación', subcategory: 'Café', icon: '☕' },
  'cafe': { category: 'Alimentación', subcategory: 'Café', icon: '☕' },
  'starbucks': { category: 'Alimentación', subcategory: 'Café', icon: '☕' },
  'sushi': { category: 'Alimentación', subcategory: 'Delivery', icon: '🍣' },
  'pizza': { category: 'Alimentación', subcategory: 'Delivery', icon: '🍕' },
  'hamburguesa': { category: 'Alimentación', subcategory: 'Comida Rápida', icon: '🍔' },
  'mcdonalds': { category: 'Alimentación', subcategory: 'Comida Rápida', icon: '🍔' },
  'mcdonald': { category: 'Alimentación', subcategory: 'Comida Rápida', icon: '🍔' },
  'burger': { category: 'Alimentación', subcategory: 'Comida Rápida', icon: '🍔' },
  'pedidosya': { category: 'Alimentación', subcategory: 'Delivery', icon: '🛵' },
  'rappi': { category: 'Alimentación', subcategory: 'Delivery', icon: '🛵' },
  'uber eats': { category: 'Alimentación', subcategory: 'Delivery', icon: '🛵' },

  // Transporte & TAG
  'bencina': { category: 'Transporte', subcategory: 'Combustible', icon: '⛽' },
  'copec': { category: 'Transporte', subcategory: 'Combustible', icon: '⛽' },
  'shell': { category: 'Transporte', subcategory: 'Combustible', icon: '⛽' },
  'petrobras': { category: 'Transporte', subcategory: 'Combustible', icon: '⛽' },
  'combustible': { category: 'Transporte', subcategory: 'Combustible', icon: '⛽' },
  'uber': { category: 'Transporte', subcategory: 'Uber/Taxi', icon: '🚗' },
  'didi': { category: 'Transporte', subcategory: 'Uber/Taxi', icon: '🚗' },
  'cabify': { category: 'Transporte', subcategory: 'Uber/Taxi', icon: '🚗' },
  'taxi': { category: 'Transporte', subcategory: 'Uber/Taxi', icon: '🚕' },
  'metro': { category: 'Transporte', subcategory: 'Transporte público', icon: '🚇' },
  'bip': { category: 'Transporte', subcategory: 'Transporte público', icon: '💳' },
  'tarjeta bip': { category: 'Transporte', subcategory: 'Transporte público', icon: '💳' },
  'carga bip': { category: 'Transporte', subcategory: 'Transporte público', icon: '💳' },
  'peaje': { category: 'Transporte', subcategory: 'TAG & Peajes', icon: '🛣️' },
  'peajes': { category: 'Transporte', subcategory: 'TAG & Peajes', icon: '🛣️' },
  'tag': { category: 'Transporte', subcategory: 'TAG & Peajes', icon: '🛣️' },
  'costanera norte': { category: 'Transporte', subcategory: 'TAG & Peajes', icon: '🛣️' },
  'vespucio': { category: 'Transporte', subcategory: 'TAG & Peajes', icon: '🛣️' },
  'autopista central': { category: 'Transporte', subcategory: 'TAG & Peajes', icon: '🛣️' },
  'autopista': { category: 'Transporte', subcategory: 'TAG & Peajes', icon: '🛣️' },
  'estacionamiento': { category: 'Transporte', subcategory: 'Estacionamiento', icon: '🅿️' },
  'parking': { category: 'Transporte', subcategory: 'Estacionamiento', icon: '🅿️' },
  'lavado de auto': { category: 'Transporte', subcategory: 'Mantenimiento Auto', icon: '🚿' },
  'taller': { category: 'Transporte', subcategory: 'Mantenimiento Auto', icon: '🔧' },
  'mecánico': { category: 'Transporte', subcategory: 'Mantenimiento Auto', icon: '🔧' },
  'mecanico': { category: 'Transporte', subcategory: 'Mantenimiento Auto', icon: '🔧' },

  // Servicios Básicos & Vivienda
  'internet': { category: 'Servicios', subcategory: 'Telecomunicaciones', icon: '🌐' },
  'vtr': { category: 'Servicios', subcategory: 'Telecomunicaciones', icon: '🌐' },
  'movistar': { category: 'Servicios', subcategory: 'Telecomunicaciones', icon: '📱' },
  'entel': { category: 'Servicios', subcategory: 'Telecomunicaciones', icon: '📱' },
  'wom': { category: 'Servicios', subcategory: 'Telecomunicaciones', icon: '📱' },
  'claro': { category: 'Servicios', subcategory: 'Telecomunicaciones', icon: '📱' },
  'luz': { category: 'Servicios', subcategory: 'Electricidad', icon: '💡' },
  'enel': { category: 'Servicios', subcategory: 'Electricidad', icon: '💡' },
  'cge': { category: 'Servicios', subcategory: 'Electricidad', icon: '💡' },
  'agua': { category: 'Servicios', subcategory: 'Agua', icon: '💧' },
  'aguas andinas': { category: 'Servicios', subcategory: 'Agua', icon: '💧' },
  'gas': { category: 'Servicios', subcategory: 'Gas', icon: '🔥' },
  'gasco': { category: 'Servicios', subcategory: 'Gas', icon: '🔥' },
  'lipigas': { category: 'Servicios', subcategory: 'Gas', icon: '🔥' },
  'abastible': { category: 'Servicios', subcategory: 'Gas', icon: '🔥' },
  'arriendo': { category: 'Vivienda', subcategory: 'Arriendo', icon: '🏠' },
  'dividendo': { category: 'Vivienda', subcategory: 'Dividendo', icon: '🏠' },
  'gasto común': { category: 'Vivienda', subcategory: 'Gastos Comunes', icon: '🏢' },
  'gastos comunes': { category: 'Vivienda', subcategory: 'Gastos Comunes', icon: '🏢' },

  // Salud, Farmacia y Deporte
  'farmacia': { category: 'Salud', subcategory: 'Farmacia', icon: '💊' },
  'cruz verde': { category: 'Salud', subcategory: 'Farmacia', icon: '💊' },
  'ahumada': { category: 'Salud', subcategory: 'Farmacia', icon: '💊' },
  'salcobrand': { category: 'Salud', subcategory: 'Farmacia', icon: '💊' },
  'dr simi': { category: 'Salud', subcategory: 'Farmacia', icon: '💊' },
  'doctor': { category: 'Salud', subcategory: 'Consultas Médicas', icon: '🩺' },
  'médico': { category: 'Salud', subcategory: 'Consultas Médicas', icon: '🩺' },
  'dentista': { category: 'Salud', subcategory: 'Dental', icon: '🦷' },
  'psicólogo': { category: 'Salud', subcategory: 'Salud Mental', icon: '🧠' },
  'remedio': { category: 'Salud', subcategory: 'Farmacia', icon: '💊' },
  'medicamento': { category: 'Salud', subcategory: 'Farmacia', icon: '💊' },
  'gimnasio': { category: 'Salud', subcategory: 'Deporte & Fitness', icon: '🏋️' },
  'gym': { category: 'Salud', subcategory: 'Deporte & Fitness', icon: '🏋️' },
  'smart fit': { category: 'Salud', subcategory: 'Deporte & Fitness', icon: '🏋️' },
  'smartfit': { category: 'Salud', subcategory: 'Deporte & Fitness', icon: '🏋️' },
  'sportlife': { category: 'Salud', subcategory: 'Deporte & Fitness', icon: '🏋️' },
  'creatina': { category: 'Salud', subcategory: 'Deporte & Fitness', icon: '💪' },

  // Mascotas
  'veterinaria': { category: 'Mascotas', subcategory: 'Salud Mascota', icon: '🐾' },
  'veterinario': { category: 'Mascotas', subcategory: 'Salud Mascota', icon: '🐾' },
  'superzoo': { category: 'Mascotas', subcategory: 'Alimento Mascota', icon: '🐶' },
  'petco': { category: 'Mascotas', subcategory: 'Alimento Mascota', icon: '🐶' },
  'comida perro': { category: 'Mascotas', subcategory: 'Alimento Mascota', icon: '🐕' },
  'comida gato': { category: 'Mascotas', subcategory: 'Alimento Mascota', icon: '🐱' },
  'cat chow': { category: 'Mascotas', subcategory: 'Alimento Mascota', icon: '🐱' },
  'dog chow': { category: 'Mascotas', subcategory: 'Alimento Mascota', icon: '🐕' },

  // Compras, Retail & Hogar
  'falabella': { category: 'Compras', subcategory: 'Retail', icon: '🛍️' },
  'ripley': { category: 'Compras', subcategory: 'Retail', icon: '🛍️' },
  'paris': { category: 'Compras', subcategory: 'Retail', icon: '🛍️' },
  'mercado libre': { category: 'Compras', subcategory: 'Online', icon: '📦' },
  'mercadolibre': { category: 'Compras', subcategory: 'Online', icon: '📦' },
  'aliexpress': { category: 'Compras', subcategory: 'Online', icon: '📦' },
  'amazon': { category: 'Compras', subcategory: 'Online', icon: '📦' },
  'zapatillas': { category: 'Compras', subcategory: 'Vestuario', icon: '👟' },
  'ropa': { category: 'Compras', subcategory: 'Vestuario', icon: '👕' },
  'sodimac': { category: 'Hogar', subcategory: 'Mejoramiento Hogar', icon: '🔨' },
  'easy': { category: 'Hogar', subcategory: 'Mejoramiento Hogar', icon: '🔨' },
  'ikea': { category: 'Hogar', subcategory: 'Muebles & Deco', icon: '🛋️' },

  // Entretenimiento & Bares
  'bar': { category: 'Entretenimiento', subcategory: 'Bares', icon: '🍻' },
  'cerveza': { category: 'Entretenimiento', subcategory: 'Bares', icon: '🍻' },
  'chelas': { category: 'Entretenimiento', subcategory: 'Bares', icon: '🍻' },
  'carrete': { category: 'Entretenimiento', subcategory: 'Salidas', icon: '🎉' },
  'cine': { category: 'Entretenimiento', subcategory: 'Cine', icon: '🎟️' },
  'cinemark': { category: 'Entretenimiento', subcategory: 'Cine', icon: '🎟️' },
  'cinehoyts': { category: 'Entretenimiento', subcategory: 'Cine', icon: '🎟️' },
  'cineplanet': { category: 'Entretenimiento', subcategory: 'Cine', icon: '🎟️' },

  // Suscripciones & Digital
  'netflix': { category: 'Suscripciones', subcategory: 'Streaming', icon: '🎬' },
  'spotify': { category: 'Suscripciones', subcategory: 'Música', icon: '🎵' },
  'disney': { category: 'Suscripciones', subcategory: 'Streaming', icon: '📺' },
  'hbo': { category: 'Suscripciones', subcategory: 'Streaming', icon: '📺' },
  'max': { category: 'Suscripciones', subcategory: 'Streaming', icon: '📺' },
  'amazon prime': { category: 'Suscripciones', subcategory: 'Streaming', icon: '📦' },
  'prime video': { category: 'Suscripciones', subcategory: 'Streaming', icon: '🎬' },
  'youtube': { category: 'Suscripciones', subcategory: 'Streaming', icon: '▶️' },
  'icloud': { category: 'Suscripciones', subcategory: 'Cloud Storage', icon: '☁️' },
  'google one': { category: 'Suscripciones', subcategory: 'Cloud Storage', icon: '☁️' },
  'chatgpt': { category: 'Suscripciones', subcategory: 'Software & IA', icon: '🤖' },

  // Ingresos & Ahorro
  'fintual': { category: 'Inversiones', subcategory: 'Ahorro & Fondos', icon: '📈' },
  'racional': { category: 'Inversiones', subcategory: 'Ahorro & Acciones', icon: '📈' },
  'depósito a plazo': { category: 'Inversiones', subcategory: 'DAP', icon: '🏦' },
};

/**
 * Normaliza nombres de comercios reconocidos en Chile.
 */
export function detectMerchant(lowerText: string): string | null {
  const merchantsList = [
    { name: 'Líder', patterns: ['líder', 'lider', 'super lider'] },
    { name: 'Jumbo', patterns: ['jumbo'] },
    { name: 'Santa Isabel', patterns: ['santa isabel'] },
    { name: 'Unimarc', patterns: ['unimarc'] },
    { name: 'Tottus', patterns: ['tottus'] },
    { name: 'Copec', patterns: ['copec', 'pronto copec'] },
    { name: 'Shell', patterns: ['shell', 'upa shell'] },
    { name: 'Petrobras', patterns: ['petrobras', 'spacio 1'] },
    { name: 'Uber', patterns: ['uber'] },
    { name: 'DiDi', patterns: ['didi'] },
    { name: 'Cabify', patterns: ['cabify'] },
    { name: 'Starbucks', patterns: ['starbucks'] },
    { name: 'Castaño', patterns: ['castaño', 'castano'] },
    { name: 'San Camilo', patterns: ['san camilo'] },
    { name: 'McDonald\'s', patterns: ['mcdonalds', 'mcdonald'] },
    { name: 'PedidosYa', patterns: ['pedidosya'] },
    { name: 'Rappi', patterns: ['rappi'] },
    { name: 'Cruz Verde', patterns: ['cruz verde'] },
    { name: 'Salcobrand', patterns: ['salcobrand'] },
    { name: 'Farmacias Ahumada', patterns: ['ahumada'] },
    { name: 'Dr. Simi', patterns: ['dr simi', 'simi'] },
    { name: 'Smart Fit', patterns: ['smart fit', 'smartfit'] },
    { name: 'Sportlife', patterns: ['sportlife'] },
    { name: 'Falabella', patterns: ['falabella'] },
    { name: 'Ripley', patterns: ['ripley'] },
    { name: 'Paris', patterns: ['tiendas paris', 'paris'] },
    { name: 'Mercado Libre', patterns: ['mercado libre', 'mercadolibre'] },
    { name: 'AliExpress', patterns: ['aliexpress'] },
    { name: 'Amazon', patterns: ['amazon'] },
    { name: 'Sodimac', patterns: ['sodimac'] },
    { name: 'Easy', patterns: ['easy'] },
    { name: 'Ikea', patterns: ['ikea'] },
    { name: 'SuperZoo', patterns: ['superzoo'] },
    { name: 'Petco', patterns: ['petco'] },
    { name: 'Netflix', patterns: ['netflix'] },
    { name: 'Spotify', patterns: ['spotify'] },
  ];

  for (const m of merchantsList) {
    if (m.patterns.some(p => new RegExp(`\\b${p}\\b`, 'i').test(lowerText))) {
      return m.name;
    }
  }
  return null;
}

/**
 * Resuelve una transacción determinísticamente mediante reglas enriquecidas.
 */
export function tryParseWithRules(text: string, referenceDate: Date = new Date()): TransactionCandidate | null {
  const amounts = parseChileanCurrency(text);
  if (amounts.length !== 1) {
    return null;
  }

  const amountObj = amounts[0];
  const dateObj = parseChileanDate(text, referenceDate);
  const lower = text.toLowerCase();

  // Detectar tipo
  let type: 'expense' | 'income' | 'transfer' = 'expense';
  if (/\b(me depositaron|me transfirieron|recibí|recibi|me pagaron|ingreso|sueldo|remuneración|cobré|cobre|honorarios)\b/i.test(lower)) {
    type = 'income';
  } else if (/\b(transferí|transferi|traspasé|traspase|pasé a|pase a)\b/i.test(lower)) {
    type = 'transfer';
  }

  let matchedCategory = 'Otros';
  let matchedSubcategory: string | undefined = undefined;
  let highestConfidence = 0.65;

  // Buscar coincidencia en categorías (priorizar frases más largas primero)
  const sortedKeywords = Object.entries(CATEGORY_KEYWORDS).sort((a, b) => b[0].length - a[0].length);

  for (const [kw, info] of sortedKeywords) {
    const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
    if (kwRegex.test(lower)) {
      matchedCategory = info.category;
      matchedSubcategory = info.subcategory;
      highestConfidence = 0.95;
      break;
    }
  }

  // Detectar comercio
  const matchedMerchant = detectMerchant(lower);

  return {
    type,
    amount: amountObj.amount,
    currency: 'CLP',
    date: dateObj.isoDate,
    merchant: matchedMerchant || null,
    description: text.trim(),
    category: matchedCategory,
    subcategory: matchedSubcategory || null,
    account: null,
    paymentMethod: 'other',
    confidence: highestConfidence,
    clarificationNeeded: null,
  };
}
