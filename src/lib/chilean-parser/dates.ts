import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { subDays, subWeeks, setDay, isAfter, parse, isValid } from 'date-fns';

export const CHILE_TIMEZONE = 'America/Santiago';

const DAYS_OF_WEEK: Record<string, number> = {
  'domingo': 0,
  'lunes': 1,
  'martes': 2,
  'miercoles': 3,
  'miércoles': 3,
  'jueves': 4,
  'viernes': 5,
  'sabado': 6,
  'sábado': 6,
};

const MONTHS: Record<string, number> = {
  'enero': 0,
  'febrero': 1,
  'marzo': 2,
  'abril': 3,
  'mayo': 4,
  'junio': 5,
  'julio': 6,
  'agosto': 7,
  'septiembre': 8,
  'setiembre': 8,
  'octubre': 9,
  'noviembre': 10,
  'diciembre': 11,
};

export interface ExtractedDate {
  raw: string;
  isoDate: string; // YYYY-MM-DD in America/Santiago
  confidence: number;
}

/**
 * Obtiene la fecha actual en la zona horaria de Chile (America/Santiago)
 */
export function getNowInChile(referenceDate: Date = new Date()): Date {
  return toZonedTime(referenceDate, CHILE_TIMEZONE);
}

/**
 * Formatea una fecha como string ISO YYYY-MM-DD
 */
export function formatIsoDate(date: Date): string {
  return formatTz(date, 'yyyy-MM-dd', { timeZone: CHILE_TIMEZONE });
}

/**
 * Resuelve una fecha a partir de lenguaje natural chileno en relación con la fecha actual de Santiago.
 */
export function parseChileanDate(text: string, referenceDate: Date = new Date()): ExtractedDate {
  const chileNow = getNowInChile(referenceDate);
  const lower = text.toLowerCase();

  // 1. "hoy"
  if (/\bhoy\b/i.test(lower)) {
    return {
      raw: 'hoy',
      isoDate: formatIsoDate(chileNow),
      confidence: 1.0,
    };
  }

  // 2. "anteayer" / "antier"
  if (/\b(anteayer|antier)\b/i.test(lower)) {
    const target = subDays(chileNow, 2);
    return {
      raw: 'anteayer',
      isoDate: formatIsoDate(target),
      confidence: 1.0,
    };
  }

  // 3. "ayer"
  if (/\bayer\b/i.test(lower)) {
    const target = subDays(chileNow, 1);
    return {
      raw: 'ayer',
      isoDate: formatIsoDate(target),
      confidence: 1.0,
    };
  }

  // 4. "el finde" / "el fin de semana"
  if (/\b(el\s+finde|el\s+fin\s+de\s+semana)\b/i.test(lower)) {
    // Tomar el sábado más reciente
    const currentDay = chileNow.getDay();
    // Si hoy es domingo (0), sábado fue ayer (1 día atrás)
    // Si hoy es sábado (6), fue hoy
    // Si hoy es lunes a viernes, el sábado anterior
    const daysSinceSaturday = (currentDay + 1) % 7;
    const target = subDays(chileNow, daysSinceSaturday === 0 ? 7 : daysSinceSaturday);
    return {
      raw: 'el finde',
      isoDate: formatIsoDate(target),
      confidence: 0.9,
    };
  }

  // 5. "la semana pasada"
  if (/\bla\s+semana\s+pasada\b/i.test(lower)) {
    const target = subWeeks(chileNow, 1);
    return {
      raw: 'la semana pasada',
      isoDate: formatIsoDate(target),
      confidence: 0.85,
    };
  }

  // 6. "hace X días"
  const haceXDiasMatch = /\bhace\s+(\d+|un|dos|tres|cuatro|cinco)\s+d[ií]as\b/i.exec(lower);
  if (haceXDiasMatch) {
    const rawVal = haceXDiasMatch[1];
    let days = parseInt(rawVal, 10);
    if (isNaN(days)) {
      const wordMap: Record<string, number> = { un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5 };
      days = wordMap[rawVal] || 1;
    }
    const target = subDays(chileNow, days);
    return {
      raw: haceXDiasMatch[0],
      isoDate: formatIsoDate(target),
      confidence: 0.95,
    };
  }

  // 7. Días de la semana ("el sábado", "el viernes", "el lunes", etc.)
  for (const [dayName, dayIndex] of Object.entries(DAYS_OF_WEEK)) {
    const dayRegex = new RegExp(`\\b(?:el\\s+)?${dayName}\\b`, 'i');
    if (dayRegex.test(lower)) {
      const currentDay = chileNow.getDay();
      let diff = currentDay - dayIndex;
      if (diff <= 0) {
        diff += 7; // El día de la semana anterior más reciente
      }
      const target = subDays(chileNow, diff);
      return {
        raw: dayName,
        isoDate: formatIsoDate(target),
        confidence: 0.95,
      };
    }
  }

  // 8. Fecha explícita tipo "14 de octubre" o "14 de oct"
  const explicitMonthMatch = /\b(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+de\s+(\d{4}))?\b/i.exec(lower);
  if (explicitMonthMatch) {
    const day = parseInt(explicitMonthMatch[1], 10);
    const monthStr = explicitMonthMatch[2];
    const year = explicitMonthMatch[3] ? parseInt(explicitMonthMatch[3], 10) : chileNow.getFullYear();
    const monthIndex = MONTHS[monthStr];
    if (monthIndex !== undefined && day >= 1 && day <= 31) {
      const candidateDate = new Date(year, monthIndex, day);
      if (isValid(candidateDate)) {
        return {
          raw: explicitMonthMatch[0],
          isoDate: formatIsoDate(candidateDate),
          confidence: 0.98,
        };
      }
    }
  }

  // 9. Formatos numéricos: "DD/MM/YYYY" o "DD/MM" o "YYYY-MM-DD"
  const isoMatch = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(lower);
  if (isoMatch) {
    return {
      raw: isoMatch[0],
      isoDate: isoMatch[0],
      confidence: 1.0,
    };
  }

  const slashMatch = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(lower);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    let year = slashMatch[3] ? parseInt(slashMatch[3], 10) : chileNow.getFullYear();
    if (year < 100) year += 2000;
    const candidateDate = new Date(year, month, day);
    if (isValid(candidateDate)) {
      return {
        raw: slashMatch[0],
        isoDate: formatIsoDate(candidateDate),
        confidence: 0.95,
      };
    }
  }

  // Por defecto: hoy en Chile
  return {
    raw: 'hoy',
    isoDate: formatIsoDate(chileNow),
    confidence: 0.7, // Confianza media porque no se especificó fecha
  };
}
