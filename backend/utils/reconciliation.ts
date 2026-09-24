import { ObjectId, Collection } from 'mongodb';
import { RowDocument, DatasetColumn, ReconciliationReport, ColumnChecksum } from '../types/dataset';

export interface ClientChecksumInput {
  column: string; // key of column
  sum?: number;
  min?: any;
  max?: any;
}

export interface ReconciliationResult {
  ok: boolean;
  actualRows: number;
  expectedRows: number;
  checksums: ColumnChecksum[];
  errorMessage?: string;
}

/**
 * Reconciles client-side expectations against server-side database aggregations
 */
export async function performReconciliation(
  rowsCol: Collection<RowDocument>,
  datasetId: ObjectId,
  expectedRows: number,
  clientChecksums: ClientChecksumInput[] = []
): Promise<ReconciliationResult> {
  const actualRows = await rowsCol.countDocuments({ datasetId });

  const checksumResults: ColumnChecksum[] = [];
  let allOk = true;
  let firstDiscrepancy: string | null = null;

  // 1. Verify row count
  if (actualRows !== expectedRows) {
    allOk = false;
    firstDiscrepancy = `Nombre de lignes différent : attendu ${expectedRows}, réel stocké ${actualRows}`;
  }

  // 2. Aggregate sums, mins, and maxs in MongoDB for the provided columns
  if (clientChecksums.length > 0 && actualRows > 0) {
    const groupStage: Record<string, any> = { _id: null };

    clientChecksums.forEach((cs, idx) => {
      if (cs.sum !== undefined) {
        groupStage[`sum_${idx}`] = { $sum: `$data.${cs.column}` };
      }
      if (cs.min !== undefined) {
        groupStage[`min_${idx}`] = { $min: `$data.${cs.column}` };
      }
      if (cs.max !== undefined) {
        groupStage[`max_${idx}`] = { $max: `$data.${cs.column}` };
      }
    });

    const aggResults = await rowsCol
      .aggregate([{ $match: { datasetId } }, { $group: groupStage }])
      .toArray();

    const aggData = aggResults[0] || {};

    clientChecksums.forEach((cs, idx) => {
      let isColumnOk = true;
      let actualVal: any = null;
      let expectedVal: any = null;

      if (cs.sum !== undefined) {
        expectedVal = cs.sum;
        actualVal = aggData[`sum_${idx}`] ?? 0;
        // Float tolerance for rounding
        const diff = Math.abs(expectedVal - actualVal);
        const tolerance = Math.max(0.001, Math.abs(expectedVal) * 1e-6);
        if (diff > tolerance) {
          isColumnOk = false;
          if (!firstDiscrepancy) {
            firstDiscrepancy = `Écart de somme sur la colonne "${cs.column}" : attendu ${expectedVal}, obtenu ${actualVal}`;
          }
        }
      } else if (cs.min !== undefined || cs.max !== undefined) {
        expectedVal = `${cs.min} - ${cs.max}`;
        const actualMin = aggData[`min_${idx}`];
        const actualMax = aggData[`max_${idx}`];
        actualVal = `${actualMin} - ${actualMax}`;

        // Compare dates or strings
        const minMatch = cs.min === undefined || String(cs.min) === String(actualMin);
        const maxMatch = cs.max === undefined || String(cs.max) === String(actualMax);
        if (!minMatch || !maxMatch) {
          isColumnOk = false;
          if (!firstDiscrepancy) {
            firstDiscrepancy = `Écart min/max sur la colonne "${cs.column}" : attendu [${cs.min}, ${cs.max}], obtenu [${actualMin}, ${actualMax}]`;
          }
        }
      }

      if (!isColumnOk) {
        allOk = false;
      }

      checksumResults.push({
        column: cs.column,
        expected: expectedVal,
        actual: actualVal,
        ok: isColumnOk,
      });
    });
  }

  return {
    ok: allOk,
    actualRows,
    expectedRows,
    checksums: checksumResults,
    errorMessage: firstDiscrepancy || undefined,
  };
}

/**
 * Computes deep column statistics for finalized dataset:
 * nullCount, distinctCount, values (if distinctCount <= 200), min, max
 */
export async function calculateColumnStatistics(
  rowsCol: Collection<RowDocument>,
  datasetId: ObjectId,
  columns: DatasetColumn[],
  totalRows: number
): Promise<DatasetColumn[]> {
  const updatedColumns: DatasetColumn[] = [];

  for (const col of columns) {
    const key = col.key;
    const type = col.type;

    // 1. nullCount
    const nullCount = await rowsCol.countDocuments({
      datasetId,
      $or: [{ [`data.${key}`]: null }, { [`data.${key}`]: { $exists: false } }],
    });

    // 2. Distinct values aggregation (grouped with counts)
    const distinctAgg = await rowsCol
      .aggregate([
        { $match: { datasetId, [`data.${key}`]: { $ne: null } } },
        { $group: { _id: `$data.${key}`, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 201 }, // Limit to detect if <= 200
      ])
      .toArray();

    const distinctCount = distinctAgg.length;
    let values: Array<{ value: any; count: number }> | undefined = undefined;

    if (distinctCount <= 200) {
      values = distinctAgg.map((item) => ({
        value: item._id instanceof Date ? item._id.toISOString() : item._id,
        count: item.count,
      }));
    }

    // 3. Min/Max for numbers or dates
    let minVal: any = null;
    let maxVal: any = null;

    if (type === 'number' || type === 'date') {
      const minMaxAgg = await rowsCol
        .aggregate([
          { $match: { datasetId, [`data.${key}`]: { $ne: null } } },
          {
            $group: {
              _id: null,
              min: { $min: `$data.${key}` },
              max: { $max: `$data.${key}` },
            },
          },
        ])
        .toArray();

      if (minMaxAgg.length > 0 && minMaxAgg[0]) {
        const rawMin = minMaxAgg[0].min;
        const rawMax = minMaxAgg[0].max;
        minVal = rawMin instanceof Date ? rawMin.toISOString() : rawMin;
        maxVal = rawMax instanceof Date ? rawMax.toISOString() : rawMax;
      }
    }

    updatedColumns.push({
      ...col,
      nullCount,
      distinctCount,
      values,
      min: minVal,
      max: maxVal,
    });
  }

  return updatedColumns;
}
