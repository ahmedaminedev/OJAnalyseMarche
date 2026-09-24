/**
 * Utilities for automatic CSV separator and encoding detection,
 * SHA-256 hashing, and matrix parsing.
 */

export interface CsvDetectionResult {
  delimiter: string;
  encoding: string;
  confidence: number;
}

/**
 * Calculates SHA-256 hash of a File using Web Crypto API
 */
export async function calculateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Detects delimiter by counting candidate occurrences in the first lines
 */
export function detectCsvDelimiter(text: string): string {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0).slice(0, 15);
  if (lines.length === 0) return ';';

  const candidates = [';', ',', '\t', '|'];
  const counts: Record<string, number[]> = { ';': [], ',': [], '\t': [], '|': [] };

  for (const line of lines) {
    for (const cand of candidates) {
      let count = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === cand && !inQuotes) count++;
      }
      counts[cand].push(count);
    }
  }

  // Calculate consistency and median count
  let bestCandidate = ';';
  let bestScore = -1;

  for (const cand of candidates) {
    const list = counts[cand];
    const nonZero = list.filter((c) => c > 0);
    if (nonZero.length === 0) continue;

    // Check consistency: how close is min and max count across lines
    const avg = list.reduce((a, b) => a + b, 0) / list.length;
    const variance = list.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / list.length;
    const consistencyScore = avg / (1 + Math.sqrt(variance));

    if (consistencyScore > bestScore) {
      bestScore = consistencyScore;
      bestCandidate = cand;
    }
  }

  return bestCandidate;
}

/**
 * Parses raw CSV text into a 2D array of cells respecting quotes and escaped characters
 */
export function parseCsvText(text: string, delimiter: string = ';'): unknown[][] {
  const rows: unknown[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        // Escaped quote
        currentCell += '"';
        i += 2;
        continue;
      } else {
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    }

    if (!inQuotes && char === delimiter) {
      currentRow.push(currentCell);
      currentCell = '';
      i++;
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      i++;
      continue;
    }

    currentCell += char;
    i++;
  }

  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  // Clean empty trailing lines
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c === '')) {
    rows.pop();
  }

  return rows;
}
