/**
 * Parser especializado en expresiones monetarias chilenas (CLP).
 * Soporta modismos: "lucas", "palo/s", "medio palo", "mil", puntos de miles ("14.500"), etc.
 */

const WORD_NUMBERS: Record<string, number> = {
  'medio': 0.5,
  'media': 0.5,
  'un': 1,
  'una': 1,
  'uno': 1,
  'dos': 2,
  'tres': 3,
  'cuatro': 4,
  'cinco': 5,
  'seis': 6,
  'siete': 7,
  'ocho': 8,
  'nueve': 9,
  'diez': 10,
  'once': 11,
  'doce': 12,
  'trece': 13,
  'catorce': 14,
  'quince': 15,
  'dieciseis': 16,
  'dieciséis': 16,
  'diecisiete': 17,
  'dieciocho': 18,
  'diecinueve': 19,
  'veinte': 20,
  'veinticinco': 25,
  'treinta': 30,
  'cuarenta': 40,
  'cincuenta': 50,
  'sesenta': 60,
  'setenta': 70,
  'ochenta': 80,
  'noventa': 90,
  'cien': 100,
  'ciento': 100,
  'doscientos': 200,
  'trescientos': 300,
  'cuatrocientos': 400,
  'quinientos': 500,
};

export interface ExtractedAmount {
  raw: string;
  amount: number;
  currency: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Normaliza y convierte un número textual o decimal chileno a valor flotante.
 * Ej: "1,5" -> 1.5, "1.5" -> 1.5, "veinte" -> 20
 */
function parseQuantity(rawQty: string): number | null {
  const clean = rawQty.trim().toLowerCase();
  if (WORD_NUMBERS[clean] !== undefined) {
    return WORD_NUMBERS[clean];
  }

  // Si tiene coma decimal (ej. "1,5"):
  const normalized = clean.replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

/**
 * Extrae montos monetarios en CLP a partir de texto en español chileno.
 */
export function parseChileanCurrency(text: string): ExtractedAmount[] {
  const results: ExtractedAmount[] = [];
  const lower = text.toLowerCase();

  // 1. "medio palo" / "media luca"
  const specialPatterns = [
    { regex: /\bmedio\s+palo\b/gi, value: 500_000 },
    { regex: /\bmedia\s+luca\b/gi, value: 500 },
  ];

  for (const { regex, value } of specialPatterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(lower)) !== null) {
      results.push({
        raw: match[0],
        amount: value,
        currency: 'CLP',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  // 2. Patrones con "palo" / "palos" (ej. "1 palo", "2 palos", "1.5 palos", "dos palos")
  const paloRegex = /\b(\d+(?:[.,]\d+)?|[a-záéíóú]+)\s+palos?\b/gi;
  let match: RegExpExecArray | null;
  while ((match = paloRegex.exec(lower)) !== null) {
    // Si ya fue tomado por "medio palo", continuar
    if (results.some(r => r.startIndex <= match!.index && r.endIndex >= match!.index + match![0].length)) {
      continue;
    }
    const qty = parseQuantity(match[1]);
    if (qty !== null && qty > 0) {
      results.push({
        raw: match[0],
        amount: Math.round(qty * 1_000_000),
        currency: 'CLP',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  // 3. Patrones con "luca" / "lucas" (ej. "10 lucas", "1 luca", "veinte lucas", "1.5 lucas")
  const lucaRegex = /\b(\d+(?:[.,]\d+)?|[a-záéíóú]+)\s+lucas?\b/gi;
  while ((match = lucaRegex.exec(lower)) !== null) {
    if (results.some(r => r.startIndex <= match!.index && r.endIndex >= match!.index + match![0].length)) {
      continue;
    }
    const qty = parseQuantity(match[1]);
    if (qty !== null && qty > 0) {
      results.push({
        raw: match[0],
        amount: Math.round(qty * 1_000),
        currency: 'CLP',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  // 4. Patrones con "mil" (ej. "25 mil", "30 mil", "veinte mil")
  const milRegex = /\b(\d+(?:[.,]\d+)?|[a-záéíóú]+)\s+mil\b/gi;
  while ((match = milRegex.exec(lower)) !== null) {
    if (results.some(r => r.startIndex <= match!.index && r.endIndex >= match!.index + match![0].length)) {
      continue;
    }
    const qty = parseQuantity(match[1]);
    if (qty !== null && qty > 0) {
      results.push({
        raw: match[0],
        amount: Math.round(qty * 1_000),
        currency: 'CLP',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  // 5. Cifras directas con signo peso o formato de miles chileno
  // Ej: "$14.500", "$ 14.500", "14.500", "18.990", "$14500", "14500"
  // Solo consideramos números puros si tienen signo $ o si tienen formato de miles (14.500) o son >= 500 y no son un año (1900-2099)
  const numericPattern = /(?:\$\s*)?(\b\d{1,3}(?:\.\d{3})+(?:\b|\s)|(?:\$\s*)(\d{3,8})\b|\b(\d{4,8})\b)/g;
  while ((match = numericPattern.exec(text)) !== null) {
    const fullMatch = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;

    // Verificar si se solapa con algo ya encontrado
    const overlaps = results.some(r => 
      (startIndex >= r.startIndex && startIndex < r.endIndex) ||
      (endIndex > r.startIndex && endIndex <= r.endIndex)
    );
    if (overlaps) continue;

    // Extraer dígitos limpiando puntos y signos
    const digitsOnly = fullMatch.replace(/[^\d]/g, '');
    const num = parseInt(digitsOnly, 10);

    if (isNaN(num) || num <= 0) continue;

    // Filtro para evitar interpretar años como montos (ej. 2024, 2025, 2026) a menos que lleven signo $
    const hasDollarSign = fullMatch.includes('$');
    const isYearLike = num >= 1990 && num <= 2040;
    if (isYearLike && !hasDollarSign && !fullMatch.includes('.')) {
      continue;
    }

    results.push({
      raw: fullMatch.trim(),
      amount: num,
      currency: 'CLP',
      startIndex,
      endIndex,
    });
  }

  // Ordenar por posición en el texto original
  return results.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Formatea un entero CLP al estándar chileno: $14.500
 */
export function formatCLP(amount: number): string {
  const formatted = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${formatted}`;
}
