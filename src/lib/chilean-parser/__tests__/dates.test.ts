import { describe, it, expect } from 'vitest';
import { parseChileanDate } from '../dates';

describe('Chilean Natural Date Parser', () => {
  // Miércoles 14 de Octubre de 2026
  const refDate = new Date('2026-10-14T15:00:00-03:00');

  it('parses "hoy" correctly', () => {
    const res = parseChileanDate('Compré 10 lucas hoy en el Líder', refDate);
    expect(res.isoDate).toBe('2026-10-14');
  });

  it('parses "ayer" correctly', () => {
    const res = parseChileanDate('Ayer gasté 25 mil en bencina', refDate);
    expect(res.isoDate).toBe('2026-10-13');
  });

  it('parses "anteayer" correctly', () => {
    const res = parseChileanDate('Anteayer pagué la luz', refDate);
    expect(res.isoDate).toBe('2026-10-12');
  });

  it('parses "el sábado" as the most recent past Saturday', () => {
    // 14 de Octubre es Miércoles -> El sábado anterior fue 10 de Octubre
    const res = parseChileanDate('El sábado gasté 45 lucas en un bar', refDate);
    expect(res.isoDate).toBe('2026-10-10');
  });

  it('parses "el finde" correctly', () => {
    const res = parseChileanDate('Salí el finde y gasté 30 lucas', refDate);
    expect(res.isoDate).toBe('2026-10-10');
  });

  it('parses "la semana pasada" correctly', () => {
    const res = parseChileanDate('La semana pasada compré en Falabella', refDate);
    expect(res.isoDate).toBe('2026-10-07');
  });

  it('parses explicit Chilean dates like "10 de octubre"', () => {
    const res = parseChileanDate('Compré el 10 de octubre', refDate);
    expect(res.isoDate).toBe('2026-10-10');
  });

  it('parses slash dates like "12/10/2026"', () => {
    const res = parseChileanDate('Gasto del 12/10/2026', refDate);
    expect(res.isoDate).toBe('2026-10-12');
  });
});
