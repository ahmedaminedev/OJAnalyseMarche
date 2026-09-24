import { VariantMergeRule } from '../types/wizard';

/**
 * Normalizes text for similarity comparison (lowercase, trimmed, strip accents)
 */
export function normalizeForComparison(val: string): string {
  if (!val) return '';
  return val
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_.\s]+/g, ' ');
}

/**
 * Calculates Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // insertion / deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Capitalizes string (Title Case: First letter uppercase, rest lowercase)
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
}

/**
 * Analyzes string column values and detects near-variants (e.g. "OMODA", "Omoda ", "omoda")
 */
export function detectColumnVariants(
  columnKey: string,
  columnName: string,
  values: string[]
): VariantMergeRule[] {
  // Count frequency of each raw distinct value
  const counts = new Map<string, number>();
  for (const v of values) {
    if (v === null || v === undefined) continue;
    const str = String(v);
    counts.set(str, (counts.get(str) || 0) + 1);
  }

  const distincts = Array.from(counts.keys());
  if (distincts.length < 2 || distincts.length > 500) {
    return [];
  }

  const rules: VariantMergeRule[] = [];
  const processed = new Set<string>();

  // Group by normalized key
  const normalizedGroups = new Map<string, string[]>();
  for (const raw of distincts) {
    const norm = normalizeForComparison(raw);
    if (!norm) continue;
    const list = normalizedGroups.get(norm) || [];
    list.push(raw);
    normalizedGroups.set(norm, list);
  }

  // Find exact-normalized groups with multiple distinct raw representations (case/accents/spaces)
  for (const [, variants] of normalizedGroups.entries()) {
    if (variants.length > 1) {
      // Pick the most frequent variant as canonical
      variants.sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0));
      const canonical = variants[0];

      for (let i = 1; i < variants.length; i++) {
        const variant = variants[i];
        processed.add(variant);
        rules.push({
          id: `${columnKey}_${variant}`,
          columnKey,
          columnName,
          variantValue: variant,
          targetCanonicalValue: canonical,
          count: counts.get(variant) || 1,
          enabled: true,
        });
      }
    }
  }

  // Also check Levenshtein distance <= 1 or 2 for small typos among items
  for (let i = 0; i < distincts.length; i++) {
    const a = distincts[i];
    if (processed.has(a) || a.length < 4) continue;
    const normA = normalizeForComparison(a);

    for (let j = i + 1; j < distincts.length; j++) {
      const b = distincts[j];
      if (processed.has(b) || b.length < 4) continue;
      const normB = normalizeForComparison(b);

      if (normA !== normB && Math.abs(normA.length - normB.length) <= 2) {
        const dist = levenshteinDistance(normA, normB);
        if (dist <= 1 || (dist === 2 && normA.length >= 6)) {
          // Choose the more frequent as canonical
          const countA = counts.get(a) || 0;
          const countB = counts.get(b) || 0;
          const [canonical, variant] = countA >= countB ? [a, b] : [b, a];
          processed.add(variant);

          rules.push({
            id: `${columnKey}_lev_${variant}`,
            columnKey,
            columnName,
            variantValue: variant,
            targetCanonicalValue: canonical,
            count: counts.get(variant) || 1,
            enabled: true,
          });
        }
      }
    }
  }

  return rules;
}
