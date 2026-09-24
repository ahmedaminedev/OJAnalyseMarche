import { describe, it, expect } from 'vitest';
import {
  generateColumnKey,
  convertValue,
  parseExcelSerialDate,
  sanitizeRowData,
} from '../utils/typeConverter';
import { DatasetColumn } from '../types/dataset';

describe('Type Converter & Key Sanitization', () => {
  describe('generateColumnKey', () => {
    it('generates safe ASCII slugs from accented and spaced column headers', () => {
      const keys = new Set<string>();
      expect(generateColumnKey('Ventes Totales (2026)', keys, 0)).toBe('ventes_totales_2026');
      expect(generateColumnKey('Énergie & Motorisation', keys, 1)).toBe('energie_motorisation');
      expect(generateColumnKey('Prix TTC (TND)', keys, 2)).toBe('prix_ttc_tnd');
      expect(generateColumnKey('Région / Gouvernorat', keys, 3)).toBe('region_gouvernorat');
    });

    it('handles duplicate column names by appending incrementing suffixes', () => {
      const keys = new Set<string>();
      const key1 = generateColumnKey('Modèle', keys, 0);
      const key2 = generateColumnKey('Modèle', keys, 1);
      const key3 = generateColumnKey('Modèle', keys, 2);

      expect(key1).toBe('modele');
      expect(key2).toBe('modele_2');
      expect(key3).toBe('modele_3');
      expect(keys.size).toBe(3);
    });

    it('handles empty, null, or invalid column headers with c_ index fallback', () => {
      const keys = new Set<string>();
      expect(generateColumnKey('', keys, 0)).toBe('c_1');
      expect(generateColumnKey('   ', keys, 1)).toBe('c_2');
      expect(generateColumnKey(null, keys, 2)).toBe('c_3');
    });

    it('prefixes columns starting with a digit so MongoDB field names are always valid identifiers', () => {
      const keys = new Set<string>();
      expect(generateColumnKey('2026 Ventes', keys, 0)).toBe('c_2026_ventes');
    });

    it('never produces characters like "." or "$" which break MongoDB', () => {
      const keys = new Set<string>();
      const dangerousHeader = '$amount.in.usd (Total $)';
      const key = generateColumnKey(dangerousHeader, keys, 0);
      expect(key).not.toContain('$');
      expect(key).not.toContain('.');
      expect(key).toBe('amount_in_usd_total');
    });
  });

  describe('convertValue - numbers', () => {
    it('converts french formatted numbers with comma decimals and space thousands', () => {
      expect(convertValue('1 250,50', 'number')).toBe(1250.5);
      expect(convertValue('45,80', 'number')).toBe(45.8);
      expect(convertValue('10 500', 'number')).toBe(10500);
      expect(convertValue('1250.75', 'number')).toBe(1250.75);
    });

    it('cleans currency symbols, percentages, and accounting parentheses', () => {
      expect(convertValue('1 500,00 TND', 'number')).toBe(1500);
      expect(convertValue('45,5 %', 'number')).toBe(45.5);
      expect(convertValue('(250,00)', 'number')).toBe(-250);
    });

    it('returns null for empty strings, dashes, and invalid non-numeric values', () => {
      expect(convertValue('', 'number')).toBeNull();
      expect(convertValue('   ', 'number')).toBeNull();
      expect(convertValue('-', 'number')).toBeNull();
      expect(convertValue('N/A', 'number')).toBeNull();
      expect(convertValue('Texte arbitraire', 'number')).toBeNull();
      expect(convertValue(null, 'number')).toBeNull();
    });
  });

  describe('convertValue - dates', () => {
    it('converts french date format DD/MM/YYYY into real UTC Date', () => {
      const date = convertValue('24/09/2026', 'date') as Date;
      expect(date).toBeInstanceOf(Date);
      expect(date.getUTCFullYear()).toBe(2026);
      expect(date.getUTCMonth()).toBe(8); // September (0-indexed)
      expect(date.getUTCDate()).toBe(24);
    });

    it('converts ISO dates', () => {
      const date = convertValue('2026-09-24T00:00:00.000Z', 'date') as Date;
      expect(date).toBeInstanceOf(Date);
      expect(date.getUTCFullYear()).toBe(2026);
    });

    it('parses Excel serial dates', () => {
      // 44927 corresponds to 2023-01-01
      const date = parseExcelSerialDate(44927);
      expect(date).toBeInstanceOf(Date);
      expect(date?.getUTCFullYear()).toBe(2023);
      expect(date?.getUTCMonth()).toBe(0);
      expect(date?.getUTCDate()).toBe(1);
    });

    it('returns null for invalid dates', () => {
      expect(convertValue('pas une date', 'date')).toBeNull();
      expect(convertValue('', 'date')).toBeNull();
      expect(convertValue(null, 'date')).toBeNull();
    });
  });

  describe('convertValue - booleans', () => {
    it('converts boolean variants in French and English', () => {
      expect(convertValue('vrai', 'boolean')).toBe(true);
      expect(convertValue('VRAI', 'boolean')).toBe(true);
      expect(convertValue('oui', 'boolean')).toBe(true);
      expect(convertValue('true', 'boolean')).toBe(true);
      expect(convertValue(1, 'boolean')).toBe(true);

      expect(convertValue('faux', 'boolean')).toBe(false);
      expect(convertValue('FAUX', 'boolean')).toBe(false);
      expect(convertValue('non', 'boolean')).toBe(false);
      expect(convertValue('false', 'boolean')).toBe(false);
      expect(convertValue(0, 'boolean')).toBe(false);
    });

    it('returns null for empty or ambiguous values', () => {
      expect(convertValue('', 'boolean')).toBeNull();
      expect(convertValue('peut-etre', 'boolean')).toBeNull();
    });
  });

  describe('sanitizeRowData', () => {
    it('converts full row strictly to technical keys with typed values', () => {
      const columns: DatasetColumn[] = [
        {
          key: 'marque_auto',
          label: 'Marque Automobile',
          type: 'string',
          role: 'dimension',
          nullCount: 0,
          distinctCount: 0,
        },
        {
          key: 'ventes_unites',
          label: 'Ventes (Unités)',
          type: 'number',
          role: 'measure',
          nullCount: 0,
          distinctCount: 0,
        },
        {
          key: 'date_vente',
          label: 'Date de Vente',
          type: 'date',
          role: 'date',
          nullCount: 0,
          distinctCount: 0,
        },
      ];

      const rawRow = {
        'Marque Automobile': '  OMODA  ',
        'Ventes (Unités)': '1 450,00',
        'Date de Vente': '15/05/2026',
      };

      const sanitized = sanitizeRowData(rawRow, columns);

      expect(sanitized).toHaveProperty('marque_auto', 'OMODA');
      expect(sanitized).toHaveProperty('ventes_unites', 1450);
      expect(sanitized.date_vente).toBeInstanceOf(Date);
      expect((sanitized.date_vente as Date).getUTCFullYear()).toBe(2026);
      expect((sanitized.date_vente as Date).getUTCMonth()).toBe(4);
      expect((sanitized.date_vente as Date).getUTCDate()).toBe(15);
    });
  });
});
