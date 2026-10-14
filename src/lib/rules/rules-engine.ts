import { parseChileanCurrency, ExtractedAmount } from '../chilean-parser/currency';
import { parseChileanDate, ExtractedDate } from '../chilean-parser/dates';
import { TransactionCandidate } from '@/types';

/**
 * Categorías y palabras clave predeterminadas en el vocabulario chileno.
 */
export const CATEGORY_KEYWORDS: Record<string, { category: string; subcategory?: string; icon: string }> = {
  // Supermercado
  'líder': { category: 'Supermercado', icon: '🛒' },
  'lider': { category: 'Supermercado', icon: '🛒' },
  'jumbo': { category: 'Supermercado', icon: '🛒' },
  'santa isabel': { category: 'Supermercado', icon: '🛒' },
  'unimarc': { category: 'Supermercado', icon: '🛒' },
  'tottus': { category: 'Supermercado', icon: '🛒' },
  'supermercado': { category: 'Supermercado', icon: '🛒' },
  'super': { category: 'Supermercado', icon: '🛒' },

  // Alimentación & Café
  'almuerzo': { category: 'Alimentación', subcategory: 'Restaurantes', icon: '🍽️' },
  'almorzando': { category: 'Alimentación', subcategory: 'Restaurantes', icon: '🍽️' },
  'cena': { category: 'Alimentación', subcategory: 'Restaurantes', icon: '🍽️' },
  'cenando': { category: 'Alimentación', subcategory: 'Restaurantes', icon: '🍽️' },
  'desayuno': { category: 'Alimentación', subcategory: 'Café', icon: '☕' },
  'café': { category: 'Alimentación', subcategory: 'Café', icon: '☕' },
  'cafe': { category: 'Alimentación', subcategory: 'Café', icon: '☕' },
  'starbucks': { category: 'Alimentación', subcategory: 'Café', icon: '☕' },
  'mcdonalds': { category: 'Alimentación', subcategory: 'Comida Rápida', icon: '🍔' },
  'mcdonald': { category: 'Alimentación', subcategory: 'Comida Rápida', icon: '🍔' },
  'burger': { category: 'Alimentación', subcategory: 'Comida Rápida', icon: '🍔' },
  'pedidosya': { category: 'Alimentación', subcategory: 'Delivery', icon: '🛵' },
  'rappi': { category: 'Alimentación', subcategory: 'Delivery', icon: '🛵' },
  'uber eats': { category: 'Alimentación', subcategory: 'Delivery', icon: '🛵' },
  'bar': { category: 'Entretenimiento', subcategory: 'Bares', icon: '🍻' },
  'cerveza': { category: 'Entretenimiento', subcategory: 'Bares', icon: '🍻' },
  'chelas': { category: 'Entretenimiento', subcategory: 'Bares', icon: '🍻' },

  // Transporte
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
  'peaje': { category: 'Transporte', subcategory: 'Peajes', icon: '🛣️' },
  'estacionamiento': { category: 'Transporte', subcategory: 'Estacionamiento', icon: '🅿️' },

  // Servicios & Hogar
  'internet': { category: 'Servicios', subcategory: 'Telecomunicaciones', icon: '🌐' },
  'vtr': { category: 'Servicios', subcategory: 'Telecomunicaciones', icon: '🌐' },
  'movistar': { category: 'Servicios', subcategory: 'Telecomunicaciones', icon: '📱' },
  'entel': { category: 'Servicios', subcategory: 'Telecomunicaciones', icon: '📱' },
  'wom': { category: 'Servicios', subcategory: 'Telecomunicaciones', icon: '📱' },
  'luz': { category: 'Servicios', subcategory: 'Electricidad', icon: '💡' },
  'enel': { category: 'Servicios', subcategory: 'Electricidad', icon: '💡' },
  'cge': { category: 'Servicios', subcategory: 'Electricidad', icon: '💡' },
  'agua': { category: 'Servicios', subcategory: 'Agua', icon: '💧' },
  'aguas andinas': { category: 'Servicios', subcategory: 'Agua', icon: '💧' },
  'gas': { category: 'Servicios', subcategory: 'Gas', icon: '🔥' },
  'gasco': { category: 'Servicios', subcategory: 'Gas', icon: '🔥' },
  'lipigas': { category: 'Servicios', subcategory: 'Gas', icon: '🔥' },
  'arriendo': { category: 'Vivienda', subcategory: 'Arriendo', icon: '🏠' },
  'gasto común': { category: 'Vivienda', subcategory: 'Gastos Comunes', icon: '🏢' },
  'gastos comunes': { category: 'Vivienda', subcategory: 'Gastos Comunes', icon: '🏢' },

  // Salud & Farmacia
  'farmacia': { category: 'Salud', subcategory: 'Farmacia', icon: '💊' },
  'cruz verde': { category: 'Salud', subcategory: 'Farmacia', icon: '💊' },
  'ahumada': { category: 'Salud', subcategory: 'Farmacia', icon: '💊' },
  'salcobrand': { category: 'Salud', subcategory: 'Farmacia', icon: '💊' },
  'doctor': { category: 'Salud', subcategory: 'Consultas', icon: '🩺' },
  'médico': { category: 'Salud', subcategory: 'Consultas', icon: '🩺' },
  'dentista': { category: 'Salud', subcategory: 'Dental', icon: '🦷' },

  // Suscripciones
  'netflix': { category: 'Suscripciones', subcategory: 'Streaming', icon: '🎬' },
  'spotify': { category: 'Suscripciones', subcategory: 'Música', icon: '🎵' },
  'disney': { category: 'Suscripciones', subcategory: 'Streaming', icon: '📺' },
  'hbo': { category: 'Suscripciones', subcategory: 'Streaming', icon: '📺' },
  'max': { category: 'Suscripciones', subcategory: 'Streaming', icon: '📺' },
  'amazon prime': { category: 'Suscripciones', subcategory: 'Streaming', icon: '📦' },
  'youtube': { category: 'Suscripciones', subcategory: 'Streaming', icon: '▶️' },
};

/**
 * Intenta resolver una transacción simple de manera determinística mediante reglas.
 * Si tiene alta confianza (ej. monto claro, comercio o categoría reconocible),
 * la resuelve directamente sin requerir LLM (Rules First).
 */
export function tryParseWithRules(text: string, referenceDate: Date = new Date()): TransactionCandidate | null {
  const amounts = parseChileanCurrency(text);
  if (amounts.length !== 1) {
    // Si no hay montos o hay más de uno, delegar a LLM para parsing semántico o multi-transacción
    return null;
  }

  const amountObj = amounts[0];
  const dateObj = parseChileanDate(text, referenceDate);
  const lower = text.toLowerCase();

  // Detectar tipo: ingreso vs gasto vs transferencia
  let type: 'expense' | 'income' | 'transfer' = 'expense';
  if (/\b(me depositaron|me transfirieron|recibí|recibi|me pagaron|ingreso|sueldo|remuneración|cobré|cobre)\b/i.test(lower)) {
    type = 'income';
  } else if (/\b(transferí|transferi|traspasé|traspase|pasé a|pase a)\b/i.test(lower)) {
    type = 'transfer';
  }

  // Detectar categoría y comercio
  let matchedCategory = 'Otros';
  let matchedSubcategory: string | undefined = undefined;
  let matchedMerchant: string | undefined = undefined;
  let highestConfidence = 0.65;

  for (const [kw, info] of Object.entries(CATEGORY_KEYWORDS)) {
    const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
    if (kwRegex.test(lower)) {
      matchedCategory = info.category;
      matchedSubcategory = info.subcategory;
      if (['líder', 'lider', 'jumbo', 'santa isabel', 'unimarc', 'tottus', 'copec', 'shell', 'petrobras', 'uber', 'didi', 'cabify', 'starbucks', 'mcdonalds', 'pedidosya', 'rappi', 'netflix', 'spotify', 'vtr', 'movistar', 'entel', 'wom', 'enel', 'cge', 'aguas andinas', 'cruz verde', 'ahumada', 'salcobrand'].includes(kw)) {
        matchedMerchant = kw.charAt(0).toUpperCase() + kw.slice(1);
      }
      highestConfidence = 0.90;
      break;
    }
  }

  // Si encontramos un monto y una categoría reconocible
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
