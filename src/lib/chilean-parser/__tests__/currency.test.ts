import { describe, it, expect } from 'vitest';
import { parseChileanCurrency, formatCLP } from '../currency';

describe('Chilean Currency Parser', () => {
  it('parses "10 lucas" correctly to 10000', () => {
    const res = parseChileanCurrency('Gasté 10 lucas en almuerzo');
    expect(res).toHaveLength(1);
    expect(res[0].amount).toBe(10_000);
    expect(res[0].currency).toBe('CLP');
  });

  it('parses "25 mil" correctly to 25000', () => {
    const res = parseChileanCurrency('Ayer gasté 25 mil en bencina');
    expect(res).toHaveLength(1);
    expect(res[0].amount).toBe(25_000);
  });

  it('parses "medio palo" correctly to 500000', () => {
    const res = parseChileanCurrency('Pagué medio palo por el arriendo');
    expect(res).toHaveLength(1);
    expect(res[0].amount).toBe(500_000);
  });

  it('parses "1 palo" correctly to 1000000', () => {
    const res = parseChileanCurrency('Me depositaron 1 palo del bono');
    expect(res).toHaveLength(1);
    expect(res[0].amount).toBe(1_000_000);
  });

  it('parses "un palo" correctly to 1000000', () => {
    const res = parseChileanCurrency('Costó un palo arreglar el auto');
    expect(res).toHaveLength(1);
    expect(res[0].amount).toBe(1_000_000);
  });

  it('parses "780 lucas" correctly to 780000', () => {
    const res = parseChileanCurrency('Me depositaron 780 lucas del arriendo');
    expect(res).toHaveLength(1);
    expect(res[0].amount).toBe(780_000);
  });

  it('parses standard Chilean thousands notation "14.500" and "18.990"', () => {
    const res1 = parseChileanCurrency('Gasté 14.500 en almuerzo');
    expect(res1[0].amount).toBe(14_500);

    const res2 = parseChileanCurrency('Pagué 18.990 de internet');
    expect(res2[0].amount).toBe(18_990);

    const res3 = parseChileanCurrency('Compré un café por 3.200');
    expect(res3[0].amount).toBe(3_200);
  });

  it('parses word-numbers like "veinte lucas" and decimal multipliers like "1.5 palos"', () => {
    const res1 = parseChileanCurrency('Ayer gasté veinte lucas tomando algo');
    expect(res1[0].amount).toBe(20_000);

    const res2 = parseChileanCurrency('Ahorré 1.5 palos este año');
    expect(res2[0].amount).toBe(1_500_000);
  });

  it('formats Chilean Peso with proper dot thousands separators', () => {
    expect(formatCLP(14500)).toBe('$14.500');
    expect(formatCLP(1000000)).toBe('$1.000.000');
    expect(formatCLP(500)).toBe('$500');
  });

  it('extracts multiple amounts in the same sentence', () => {
    const res = parseChileanCurrency('Ayer fui al Líder y gasté 42 lucas, después cargué 30 mil de bencina y hoy compré un café de 3200.');
    expect(res).toHaveLength(3);
    expect(res[0].amount).toBe(42_000);
    expect(res[1].amount).toBe(30_000);
    expect(res[2].amount).toBe(3_200);
  });
});
