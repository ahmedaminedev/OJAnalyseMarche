import { describe, it, expect } from 'vitest';
import { performReconciliation } from '../utils/reconciliation';
import { ObjectId } from 'mongodb';

describe('Reconciliation Engine', () => {
  it('validates exact matching rowCount and numeric sums with zero discrepancy', async () => {
    const datasetId = new ObjectId();

    // Mock Collection simulating MongoDB driver aggregation
    const mockRowsCol: any = {
      countDocuments: async () => 2500,
      aggregate: () => ({
        toArray: async () => [
          {
            sum_0: 154200.5,
            sum_1: 45000,
          },
        ],
      }),
    };

    const checksums = [
      { column: 'ventes', sum: 154200.5 },
      { column: 'volume', sum: 45000 },
    ];

    const result = await performReconciliation(
      mockRowsCol,
      datasetId,
      2500,
      checksums
    );

    expect(result.ok).toBe(true);
    expect(result.actualRows).toBe(2500);
    expect(result.expectedRows).toBe(2500);
    expect(result.checksums).toHaveLength(2);
    expect(result.checksums[0].ok).toBe(true);
    expect(result.checksums[1].ok).toBe(true);
    expect(result.errorMessage).toBeUndefined();
  });

  it('detects row count discrepancies and reports an explicit error message', async () => {
    const datasetId = new ObjectId();

    const mockRowsCol: any = {
      countDocuments: async () => 2450, // 50 missing rows
      aggregate: () => ({
        toArray: async () => [{ sum_0: 1000 }],
      }),
    };

    const result = await performReconciliation(
      mockRowsCol,
      datasetId,
      2500,
      [{ column: 'ventes', sum: 1000 }]
    );

    expect(result.ok).toBe(false);
    expect(result.actualRows).toBe(2450);
    expect(result.expectedRows).toBe(2500);
    expect(result.errorMessage).toContain('attendu 2500, réel stocké 2450');
  });

  it('detects column checksum sum discrepancies accurately', async () => {
    const datasetId = new ObjectId();

    const mockRowsCol: any = {
      countDocuments: async () => 1000,
      aggregate: () => ({
        toArray: async () => [{ sum_0: 98500 }], // Discrepancy: expected 100000
      }),
    };

    const result = await performReconciliation(
      mockRowsCol,
      datasetId,
      1000,
      [{ column: 'chiffre_affaires', sum: 100000 }]
    );

    expect(result.ok).toBe(false);
    expect(result.checksums[0].ok).toBe(false);
    expect(result.checksums[0].expected).toBe(100000);
    expect(result.checksums[0].actual).toBe(98500);
    expect(result.errorMessage).toContain('chiffre_affaires');
    expect(result.errorMessage).toContain('attendu 100000, obtenu 98500');
  });

  it('tolerates minor floating point precision differences', async () => {
    const datasetId = new ObjectId();

    const mockRowsCol: any = {
      countDocuments: async () => 100,
      aggregate: () => ({
        toArray: async () => [{ sum_0: 0.30000000000000004 }], // 0.1 + 0.2 float artifact
      }),
    };

    const result = await performReconciliation(
      mockRowsCol,
      datasetId,
      100,
      [{ column: 'taux', sum: 0.3 }]
    );

    expect(result.ok).toBe(true);
    expect(result.checksums[0].ok).toBe(true);
  });
});
