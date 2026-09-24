import { ColumnType, ColumnRole, DatasetColumn } from '../types/dataset';

/**
 * Generates a clean, technical, unique ASCII slug for a column key.
 * Never contains '.', '$', or non-ASCII characters that would break MongoDB.
 */
export function generateColumnKey(
  label: string | undefined | null,
  existingKeys: Set<string>,
  index: number
): string {
  const fallbackKey = `c_${index + 1}`;
  if (!label || typeof label !== 'string' || label.trim() === '') {
    let key = fallbackKey;
    let counter = 2;
    while (existingKeys.has(key)) {
      key = `c_${index + 1}_${counter++}`;
    }
    existingKeys.add(key);
    return key;
  }

  // Normalize: remove accents, convert to lowercase
  const normalized = label
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  // Replace all non-alphanumeric chars with underscore
  let slug = normalized.replace(/[^a-z0-9]+/g, '_');

  // Remove leading and trailing underscores
  slug = slug.replace(/^_+|_+$/g, '');

  // If slug is empty or starts with a digit, prefix with "c_"
  if (!slug || /^[0-9]/.test(slug)) {
    slug = slug ? `c_${slug}` : fallbackKey;
  }

  // Ensure key doesn't exceed 48 characters
  if (slug.length > 48) {
    slug = slug.substring(0, 48).replace(/_+$/, '');
  }

  // Ensure uniqueness
  let finalKey = slug;
  let suffix = 2;
  while (existingKeys.has(finalKey)) {
    finalKey = `${slug}_${suffix++}`;
  }

  existingKeys.add(finalKey);
  return finalKey;
}

/**
 * Parses an Excel serial date number (days since 1899-12-30) into a real UTC Date
 */
export function parseExcelSerialDate(serial: number): Date | null {
  if (typeof serial !== 'number' || isNaN(serial) || serial <= 0 || serial > 2958465) {
    return null;
  }
  // Days between 1899-12-30 and 1970-01-01 is 25569
  const utcMilliseconds = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(utcMilliseconds);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Converts a raw cell value to a typed value: Date (UTC), Number, Boolean, String (trim), or null if empty
 */
export function convertValue(
  val: any,
  targetType: ColumnType
): string | number | boolean | Date | null {
  if (val === undefined || val === null) {
    return null;
  }

  // If already matches target type
  if (targetType === 'number') {
    if (typeof val === 'number') {
      return !isNaN(val) && isFinite(val) ? val : null;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === '' || !/\d/.test(trimmed)) {
        return null;
      }
      // Handle accounting parentheses negative e.g. "(150)" -> "-150"
      let clean = trimmed;
      if (clean.startsWith('(') && clean.endsWith(')')) {
        clean = '-' + clean.substring(1, clean.length - 1);
      }
      // Replace French decimal comma with dot
      clean = clean.replace(',', '.');
      // Strip spaces, currency symbols, and letters (e.g. "TND", "DT", "EUR", "%")
      clean = clean.replace(/[\s\u00A0\u202F]/g, '').replace(/[^\d.-]/g, '');

      if (clean === '' || clean === '-' || clean === '.') {
        return null;
      }

      const num = Number(clean);
      return !isNaN(num) && isFinite(num) ? num : null;
    }
    return null;
  }

  if (targetType === 'date') {
    if (val instanceof Date) {
      return !isNaN(val.getTime()) ? val : null;
    }
    if (typeof val === 'number') {
      // Possible Excel serial date (e.g., 44927 for 2023) or epoch timestamp
      if (val > 10000 && val < 100000) {
        return parseExcelSerialDate(val);
      }
      if (val > 1000000000 && val < 2500000000000) {
        // Unix timestamp (seconds or milliseconds)
        const ms = val < 10000000000 ? val * 1000 : val;
        const d = new Date(ms);
        return !isNaN(d.getTime()) ? d : null;
      }
      return null;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed || trimmed === '-' || trimmed === 'N/A') return null;

      // French date DD/MM/YYYY or DD-MM-YYYY (or with time DD/MM/YYYY HH:mm)
      const frenchMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
      if (frenchMatch) {
        const day = parseInt(frenchMatch[1], 10);
        const month = parseInt(frenchMatch[2], 10);
        const year = parseInt(frenchMatch[3], 10);
        const hours = frenchMatch[4] ? parseInt(frenchMatch[4], 10) : 0;
        const minutes = frenchMatch[5] ? parseInt(frenchMatch[5], 10) : 0;
        const seconds = frenchMatch[6] ? parseInt(frenchMatch[6], 10) : 0;

        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
          if (!isNaN(date.getTime())) return date;
        }
      }

      // ISO date or standard format
      const parsed = Date.parse(trimmed);
      if (!isNaN(parsed)) {
        return new Date(parsed);
      }
    }
    return null;
  }

  if (targetType === 'boolean') {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val === 1 ? true : val === 0 ? false : null;
    if (typeof val === 'string') {
      const lower = val.trim().toLowerCase();
      if (['true', 'vrai', 'oui', '1', 't', 'y', 'yes'].includes(lower)) return true;
      if (['false', 'faux', 'non', '0', 'f', 'n', 'no'].includes(lower)) return false;
    }
    return null;
  }

  // String fallback
  const str = String(val).trim();
  return str === '' || str === 'null' || str === 'undefined' ? null : str;
}

/**
 * Sanitizes and converts a single row given the column definitions.
 * Returns an object whose keys are strictly technical keys and values are typed.
 */
export function sanitizeRowData(
  rawRow: Record<string, any>,
  columns: DatasetColumn[]
): Record<string, string | number | boolean | Date | null> {
  const result: Record<string, string | number | boolean | Date | null> = {};

  for (const col of columns) {
    // Look up by column label first, then column key
    let rawVal = rawRow[col.label];
    if (rawVal === undefined && col.key in rawRow) {
      rawVal = rawRow[col.key];
    }
    result[col.key] = convertValue(rawVal, col.type);
  }

  return result;
}
