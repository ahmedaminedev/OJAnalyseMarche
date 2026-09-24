import { ObjectId, Collection } from 'mongodb';
import { DatasetColumn, RowDocument, SemanticMapping } from '../types/dataset';

/**
 * Creates optimal compound indexes on the "rows" collection:
 * - Primary date column { datasetId: 1, "data.<key>": 1 }
 * - Each dimension column whose distinctCount <= 500
 * - Max 8 indexes per dataset
 * - High cardinality columns (> 500) are skipped to preserve index efficiency.
 */
export async function createDatasetIndexes(
  rowsCol: Collection<RowDocument>,
  datasetId: ObjectId,
  columns: DatasetColumn[],
  mapping?: SemanticMapping
): Promise<string[]> {
  const createdIndexKeys: string[] = [];
  const MAX_INDEXES = 8;

  // 1. Identify primary date column
  let primaryDateKey: string | null = null;
  if (mapping?.date && columns.some((c) => c.key === mapping.date)) {
    primaryDateKey = mapping.date;
  } else {
    const dateCol = columns.find((c) => c.type === 'date' || c.role === 'date');
    if (dateCol) {
      primaryDateKey = dateCol.key;
    }
  }

  // 2. Identify eligible dimension columns (distinctCount <= 500)
  const candidateDimensionCols = columns.filter(
    (col) =>
      col.key !== primaryDateKey &&
      col.role === 'dimension' &&
      col.distinctCount > 0 &&
      col.distinctCount <= 500
  );

  // Sort dimensions by lowest distinct count first (highest selectivity)
  candidateDimensionCols.sort((a, b) => a.distinctCount - b.distinctCount);

  const targetKeys: string[] = [];

  // Add date key first if found
  if (primaryDateKey) {
    targetKeys.push(primaryDateKey);
  }

  // Fill up to MAX_INDEXES
  for (const col of candidateDimensionCols) {
    if (targetKeys.length >= MAX_INDEXES) break;
    targetKeys.push(col.key);
  }

  // Create compound indexes on rows collection
  for (const key of targetKeys) {
    try {
      const indexSpec = { datasetId: 1 as const, [`data.${key}`]: 1 as const };
      const indexName = `idx_${key}_dataset`;
      await rowsCol.createIndex(indexSpec as any, { name: indexName, background: true });
      createdIndexKeys.push(key);
    } catch (err: any) {
      console.warn(`⚠️ [Index] Impossible de créer l'index pour la colonne "${key}":`, err?.message);
    }
  }

  if (createdIndexKeys.length > 0) {
    console.log(`⚡ [Index] ${createdIndexKeys.length} index composés créés sur les lignes: ${createdIndexKeys.join(', ')}`);
  }

  return createdIndexKeys;
}
