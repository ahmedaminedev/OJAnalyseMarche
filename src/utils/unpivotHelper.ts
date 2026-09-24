/**
 * Helper to detect time/period columns and perform Wide-to-Long (Unpivot)
 * transformations similar to Microsoft Power BI.
 */

// Regex patterns for common period headers
const PERIOD_PATTERNS = [
  /^(19|20)\d{2}[-_/](0[1-9]|1[0-2])$/i, // 2026-01, 2026/01
  /^(0[1-9]|1[0-2])[-_/](19|20)\d{2}$/i, // 01/2026, 01-2026
  /^(19|20)\d{2}$/,                     // 2024, 2025, 2026
  /^(jan|fév|fev|mar|avr|mai|juin|juil|aoû|aou|sep|oct|nov|déc|dec)[-_/ ]?(20)?\d{2}$/i, // Jan-26, Fév 2026
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[-_/ ]?(20)?\d{2}$/i, // Jan-26, Aug-25
  /^([tq][1-4])[-_/ ]?(20)?\d{2}$/i,     // T1 2026, Q2-2025
  /^(20)?\d{2}[-_/ ]?([tq][1-4])$/i,     // 2026-T1, 25 Q3
  /^s([0-4][0-9]|5[0-3])[-_/ ]?(20)?\d{2}$/i, // S01 2026 (semaines)
  /^w([0-4][0-9]|5[0-3])[-_/ ]?(20)?\d{2}$/i, // W01 2026
];

const FRENCH_MONTH_MAP: Record<string, string> = {
  jan: '01', fév: '02', fev: '02', mar: '03', avr: '04', mai: '05',
  juin: '06', juil: '07', aoû: '08', aou: '08', sep: '09', oct: '10',
  nov: '11', déc: '12', dec: '12',
  feb: '02', apr: '04', may: '05', jun: '06', jul: '07', aug: '08',
};

/**
 * Checks whether a column header looks like a temporal period
 */
export function isPeriodHeader(headerName: string): boolean {
  if (!headerName || typeof headerName !== 'string') return false;
  const clean = headerName.trim();
  return PERIOD_PATTERNS.some((pat) => pat.test(clean));
}

/**
 * Converts a period string (e.g. "2026-01", "Jan-26", "T1 2026") to an ISO date string "YYYY-MM-01"
 */
export function parsePeriodToIsoDate(periodStr: string): string {
  if (!periodStr) return '';
  const trimmed = periodStr.trim();

  // 1. "YYYY-MM" or "YYYY/MM"
  const ymMatch = trimmed.match(/^(19|20\d{2})[-_/](0[1-9]|1[0-2])$/);
  if (ymMatch) {
    return `${ymMatch[1]}-${ymMatch[2]}-01`;
  }

  // 2. "MM/YYYY" or "MM-YYYY"
  const myMatch = trimmed.match(/^(0[1-9]|1[0-2])[-_/](19|20\d{2})$/);
  if (myMatch) {
    return `${myMatch[2]}-${myMatch[1]}-01`;
  }

  // 3. "YYYY"
  const yMatch = trimmed.match(/^(19|20\d{2})$/);
  if (yMatch) {
    return `${yMatch[1]}-01-01`;
  }

  // 4. "Jan-26" or "Fév 2026"
  const monthMatch = trimmed.match(/^([a-zà-ÿ]{3,4})[-_/ ]?((?:20)?\d{2})$/i);
  if (monthMatch) {
    const rawMonth = monthMatch[1].toLowerCase().slice(0, 3);
    let year = monthMatch[2];
    if (year.length === 2) year = `20${year}`;
    const mNum = FRENCH_MONTH_MAP[rawMonth] || '01';
    return `${year}-${mNum}-01`;
  }

  // 5. "T1 2026" or "Q2 2026"
  const qMatch = trimmed.match(/^([tq])([1-4])[-_/ ]?((?:20)?\d{2})$/i);
  if (qMatch) {
    const qNum = parseInt(qMatch[2], 10);
    let year = qMatch[3];
    if (year.length === 2) year = `20${year}`;
    const month = String((qNum - 1) * 3 + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }

  return trimmed;
}

/**
 * Performs unpivot on raw record objects
 */
export function executeUnpivot(
  rows: Record<string, any>[],
  fixedKeys: string[],
  unpivotKeys: string[],
  attributeKey: string,
  attributeLabel: string,
  valueKey: string,
  valueLabel: string,
  parseDates: boolean = true
): Record<string, any>[] {
  const result: Record<string, any>[] = [];

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];

    // Base fixed fields
    const baseRow: Record<string, any> = {};
    for (const fk of fixedKeys) {
      baseRow[fk] = row[fk] !== undefined ? row[fk] : null;
    }

    // Expand each unpivoted column
    for (const uk of unpivotKeys) {
      const val = row[uk];
      // Skip completely null/empty unpivoted cells if desired, or keep with null
      const formattedPeriod = parseDates ? parsePeriodToIsoDate(uk) : uk;

      result.push({
        ...baseRow,
        [attributeKey]: formattedPeriod,
        [valueKey]: val !== undefined && val !== null ? val : null,
      });
    }
  }

  return result;
}
