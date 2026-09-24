import { ImportedFileRecord, ImportStatus, SheetAnalysis, ExcelParseResult } from '../types/import';
import {
  ColumnSetting,
  QualitySummary,
  ChecksumItem,
  SemanticMappingConfig,
  UploadChunkState,
  ReconciliationReportUI,
} from '../types/wizard';

export interface BackendStats {
  totalImports: number;
  totalRows: number;
  totalColumns: number;
  storageType: string;
  mongoConnected: boolean;
  databaseName?: string;
  host?: string;
  edition?: string;
  cluster?: string;
}

export interface BackendHealth {
  status: string;
  service: string;
  database: {
    name: string;
    host: string;
    cluster: string;
    edition: string;
    connected: boolean;
    status: string;
  };
  timestamp: string;
}

export interface ChunkProgress {
  percent: number;
  currentChunk: number;
  totalChunks: number;
  insertedRows: number;
  totalRows: number;
  statusText: string;
}

export interface DuplicateFileConflict {
  isDuplicate: true;
  existingDatasetId: string;
  existingFileName: string;
  existingImportedAt: string;
  message: string;
}

export interface WizardUploadParams {
  fileName: string;
  fileHash: string;
  fileSizeBytes: number;
  sheetName: string;
  currentUserEmail: string;
  columns: ColumnSetting[];
  rows: Record<string, any>[];
  checksums: ChecksumItem[];
  qualityReport: QualitySummary;
  mapping?: SemanticMappingConfig;
  replaceIfExists?: boolean;
  onProgress?: (progress: UploadChunkState) => void;
  isCancelledRef?: { current: boolean };
}

export interface WizardUploadResult {
  datasetId: string;
  dataset: any;
  rowCount: number;
  reconciliation: ReconciliationReportUI;
  message: string;
}

/**
 * Computes SHA-256 hash of a File using Web Crypto API
 */
export async function calculateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

class ImportService {
  /**
   * Check backend health and MongoDB connectivity status
   */
  async getHealth(): Promise<BackendHealth | null> {
    try {
      const res = await fetch('/api/health');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Erreur vérification santé backend:', err);
    }
    return null;
  }

  /**
   * POST /api/imports/test-connection
   */
  async testMongoConnection(uri: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch('/api/imports/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri }),
      });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      }
      return { success: false, error: 'Réponse serveur inattendue.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur réseau de test.' };
    }
  }

  /**
   * GET /api/imports/stats/overview
   */
  async getStatsOverview(): Promise<BackendStats> {
    try {
      const response = await fetch('/api/imports/stats/overview');
      if (response.status === 503) {
        console.warn('MongoDB est actuellement déconnecté (503).');
      } else if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }
      }
    } catch (err) {
      console.warn('Erreur récupération stats backend:', err);
    }

    return {
      totalImports: 0,
      totalRows: 0,
      totalColumns: 0,
      databaseName: 'omoda_jaecoo_stats_db',
      host: 'Déconnecté',
      cluster: 'Aucun',
      edition: 'Déconnecté',
      storageType: 'MongoDB',
      mongoConnected: false,
    };
  }

  /**
   * GET /api/datasets or GET /api/imports
   */
  async getAllImports(): Promise<ImportedFileRecord[]> {
    try {
      const response = await fetch('/api/imports');
      if (response.status === 503) {
        console.warn('MongoDB est actuellement déconnecté (503).');
        return [];
      }
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        }
      }
    } catch (error) {
      console.warn('Erreur réseau lors de la récupération des imports:', error);
    }
    return [];
  }

  /**
   * GET /api/imports/:id
   */
  async getImportById(id: string): Promise<ImportedFileRecord | null> {
    try {
      const response = await fetch(`/api/imports/${encodeURIComponent(id)}`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }
      }
    } catch (error) {
      console.error('Erreur récupération import par ID:', error);
    }
    return null;
  }

  /**
   * DELETE /api/datasets/:id
   */
  async deleteImport(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/datasets/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Erreur suppression dataset:', error);
      return false;
    }
  }

  /**
   * High-Performance Chunked Batch Import Flow:
   * 1. Calculates SHA-256 hash
   * 2. Inits dataset via POST /api/imports/init (handles 409 duplicate detection)
   * 3. Sends rows in chunks of up to 1500 rows via POST /api/imports/:id/chunks
   * 4. Finalizes via POST /api/imports/:id/finalize with client sums and min/max checksums
   */
  async importInBatches(options: {
    file: File;
    parseResult: ExcelParseResult;
    activeSheetName: string;
    sheetAnalysis: SheetAnalysis;
    currentUserEmail: string;
    replaceIfExists?: boolean;
    onProgress?: (progress: ChunkProgress) => void;
  }): Promise<ImportedFileRecord> {
    const {
      file,
      parseResult,
      activeSheetName,
      sheetAnalysis,
      currentUserEmail,
      replaceIfExists = false,
      onProgress,
    } = options;

    // 1. Calculate SHA-256 hash of file
    onProgress?.({
      percent: 5,
      currentChunk: 0,
      totalChunks: 1,
      insertedRows: 0,
      totalRows: sheetAnalysis.rowCount,
      statusText: 'Calcul de l’empreinte de sécurité SHA-256...',
    });

    const fileHash = await calculateFileHash(file);

    // 2. Prepare column definitions
    const columnsPayload = sheetAnalysis.columns.map((col) => {
      let role: 'dimension' | 'measure' | 'date' | 'id' = 'dimension';
      if (col.detectedType === 'number') role = 'measure';
      else if (col.detectedType === 'date') role = 'date';
      else if (/id|code|immat|vin/i.test(col.name)) role = 'id';

      let type: 'string' | 'number' | 'date' | 'boolean' = 'string';
      if (col.detectedType === 'number') type = 'number';
      else if (col.detectedType === 'date') type = 'date';
      else if (col.detectedType === 'boolean') type = 'boolean';

      return {
        key: col.key,
        label: col.name,
        type,
        role,
      };
    });

    // 3. Calculate client checksums across previewRows / sheet rows
    const allRows = sheetAnalysis.previewRows || [];
    const expectedRows = sheetAnalysis.rowCount;

    const checksums: Array<{ column: string; sum?: number; min?: any; max?: any }> = [];
    columnsPayload.forEach((col) => {
      if (col.type === 'number') {
        let sum = 0;
        allRows.forEach((r) => {
          const val = r[col.label] ?? r[col.key];
          if (val !== undefined && val !== null) {
            const num = typeof val === 'number' ? val : Number(String(val).replace(',', '.').replace(/[^\d.-]/g, ''));
            if (!isNaN(num) && isFinite(num)) {
              sum += num;
            }
          }
        });
        checksums.push({ column: col.key, sum: Math.round(sum * 100) / 100 });
      }
    });

    onProgress?.({
      percent: 15,
      currentChunk: 0,
      totalChunks: 1,
      insertedRows: 0,
      totalRows: expectedRows,
      statusText: 'Initialisation du dataset sur MongoDB...',
    });

    // 4. POST /api/imports/init
    const initResponse = await fetch('/api/imports/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileHash,
        fileSizeBytes: file.size,
        sheetName: activeSheetName,
        importedBy: currentUserEmail,
        columns: columnsPayload,
        expectedRows,
        replace: replaceIfExists,
        quality: {
          errors: sheetAnalysis.issues.filter((i) => i.severity === 'error').length,
          warnings: sheetAnalysis.issues.filter((i) => i.severity === 'warning').length,
          info: sheetAnalysis.issues.filter((i) => i.severity === 'info').length,
          issues: sheetAnalysis.issues,
        },
      }),
    });

    if (initResponse.status === 409) {
      const conflictData = await initResponse.json();
      const err: any = new Error(conflictData.error || 'Fichier déjà importé');
      err.isDuplicate = true;
      err.existingDatasetId = conflictData.existingDatasetId;
      err.existingFileName = conflictData.existingFileName;
      err.existingImportedAt = conflictData.existingImportedAt;
      throw err;
    }

    if (!initResponse.ok) {
      let msg = "Erreur lors de l'initialisation du dataset";
      try {
        const errJson = await initResponse.json();
        if (errJson.error) msg = errJson.error;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }

    const { datasetId, columns: serverColumns } = await initResponse.json();

    // 5. Upload rows in chunks of max 1500 rows
    const CHUNK_SIZE = 1500;
    const totalChunks = Math.max(1, Math.ceil(allRows.length / CHUNK_SIZE));

    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      const startIdx = chunkIdx * CHUNK_SIZE;
      const endIdx = Math.min((chunkIdx + 1) * CHUNK_SIZE, allRows.length);
      const chunkSlice = allRows.slice(startIdx, endIdx);

      const chunkRows = chunkSlice.map((row, idx) => ({
        rowNumber: startIdx + idx + 1,
        data: row,
      }));

      const chunkRes = await fetch(`/api/imports/${datasetId}/chunks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chunkIndex: chunkIdx,
          rows: chunkRows,
        }),
      });

      if (!chunkRes.ok) {
        // Cancel on chunk failure
        try {
          await fetch(`/api/imports/${datasetId}/cancel`, { method: 'POST' });
        } catch {
          // ignore
        }
        let chunkErrMsg = `Échec de l'envoi du lot ${chunkIdx + 1}/${totalChunks}`;
        try {
          const errData = await chunkRes.json();
          if (errData.error) chunkErrMsg = errData.error;
        } catch {
          // ignore
        }
        throw new Error(chunkErrMsg);
      }

      const currentProgressPercent = Math.min(
        85,
        15 + Math.round(((chunkIdx + 1) / totalChunks) * 70)
      );

      onProgress?.({
        percent: currentProgressPercent,
        currentChunk: chunkIdx + 1,
        totalChunks,
        insertedRows: endIdx,
        totalRows: expectedRows,
        statusText: `Transfert du lot ${chunkIdx + 1}/${totalChunks} (${endIdx}/${expectedRows} lignes)...`,
      });
    }

    // 6. Finalize import & server reconciliation
    onProgress?.({
      percent: 90,
      currentChunk: totalChunks,
      totalChunks,
      insertedRows: allRows.length,
      totalRows: expectedRows,
      statusText: 'Réconciliation serveur ($count, $sum) et calcul des index...',
    });

    const finalizeRes = await fetch(`/api/imports/${datasetId}/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedRows,
        checksums,
      }),
    });

    if (!finalizeRes.ok) {
      let finalErrMsg = 'Erreur lors de la finalisation et de la réconciliation serveur';
      try {
        const errJson = await finalizeRes.json();
        if (errJson.error) finalErrMsg = errJson.error;
      } catch {
        // ignore
      }
      throw new Error(finalErrMsg);
    }

    const finalizeData = await finalizeRes.json();

    onProgress?.({
      percent: 100,
      currentChunk: totalChunks,
      totalChunks,
      insertedRows: expectedRows,
      totalRows: expectedRows,
      statusText: 'Importation et réconciliation validées avec succès !',
    });

    return {
      id: datasetId,
      fileName: file.name,
      fileSize: file.size,
      fileSizeBytes: file.size,
      importedAt: new Date().toISOString(),
      importedBy: currentUserEmail,
      status: 'SUCCESS',
      availableSheets: parseResult.sheetNames,
      activeSheetName,
      totalRows: expectedRows,
      totalColumns: serverColumns.length,
      totalEmptyCells: sheetAnalysis.totalEmptyCells,
      issuesCount: {
        errors: sheetAnalysis.issues.filter((i) => i.severity === 'error').length,
        warnings: sheetAnalysis.issues.filter((i) => i.severity === 'warning').length,
        info: sheetAnalysis.issues.filter((i) => i.severity === 'info').length,
      },
      sheetSummaries: parseResult.sheetNames.map((n) => ({
        name: n,
        rows: parseResult.sheets[n]?.rowCount || 0,
        columns: parseResult.sheets[n]?.columnCount || 0,
      })),
      previewData: {
        columns: sheetAnalysis.columns,
        rows: sheetAnalysis.previewRows.slice(0, 100),
      },
      issues: sheetAnalysis.issues,
    };
  }

  /**
   * Legacy single-shot adapter delegating to batch flow or direct fetch
   */
  async createImport(payload: any): Promise<ImportedFileRecord> {
    const response = await fetch('/api/imports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = "Erreur lors de l'enregistrement dans la base de données backend.";
      try {
        const errorData = await response.json();
        if (errorData.error) errorMessage = errorData.error;
      } catch {
        // ignore
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  /**
   * High-performance chunked upload wizard with retry logic, cancellation,
   * client-side checksums and server reconciliation
   */
  async uploadWizardDataset(params: WizardUploadParams): Promise<WizardUploadResult> {
    const {
      fileName,
      fileHash,
      fileSizeBytes,
      sheetName,
      currentUserEmail,
      columns,
      rows,
      checksums,
      qualityReport,
      mapping,
      replaceIfExists = false,
      onProgress,
      isCancelledRef,
    } = params;

    const totalRowsCount = rows.length;

    // 1. Initial progress update
    onProgress?.({
      chunkIndex: 0,
      totalChunks: Math.max(1, Math.ceil(totalRowsCount / 2000)),
      sentRows: 0,
      totalRows: totalRowsCount,
      percent: 5,
      retries: 0,
      statusText: 'Initialisation du jeu de données sur le serveur...',
      isCancelled: false,
    });

    if (isCancelledRef?.current) {
      throw new Error('Importation annulée.');
    }

    // 2. Prepare columns payload
    const columnsPayload = columns.map((col) => ({
      key: col.key,
      label: col.label,
      type: col.type,
      role: col.role,
    }));

    // 3. POST /api/imports/init
    const initRes = await fetch('/api/imports/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        fileHash,
        fileSizeBytes,
        sheetName,
        importedBy: currentUserEmail,
        columns: columnsPayload,
        expectedRows: totalRowsCount,
        replace: replaceIfExists,
        mapping: mapping || {},
        quality: {
          errors: qualityReport.errors,
          warnings: qualityReport.warnings,
          info: qualityReport.infos,
          issues: qualityReport.issues,
        },
      }),
    });

    if (initRes.status === 409) {
      const conflictData = await initRes.json();
      const err: any = new Error(conflictData.error || 'Un fichier identique a déjà été importé.');
      err.isDuplicate = true;
      err.existingDatasetId = conflictData.existingDatasetId;
      err.existingFileName = conflictData.existingFileName;
      err.existingImportedAt = conflictData.existingImportedAt;
      err.message = conflictData.message || 'Ce fichier a déjà été importé. Souhaitez-vous le remplacer ?';
      throw err;
    }

    if (!initRes.ok) {
      let msg = "Erreur lors de l'initialisation de l'import.";
      try {
        const json = await initRes.json();
        if (json.error) msg = json.error;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }

    const { datasetId } = await initRes.json();

    // 4. Chunked upload (lots de 2000 lignes)
    const CHUNK_SIZE = 2000;
    const totalChunks = Math.max(1, Math.ceil(totalRowsCount / CHUNK_SIZE));

    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      if (isCancelledRef?.current) {
        try {
          await fetch(`/api/imports/${datasetId}/cancel`, { method: 'POST' });
        } catch {
          // ignore
        }
        throw new Error('Importation annulée par l’utilisateur.');
      }

      const startIdx = chunkIdx * CHUNK_SIZE;
      const endIdx = Math.min((chunkIdx + 1) * CHUNK_SIZE, totalRowsCount);
      const chunkRows = rows.slice(startIdx, endIdx).map((r, i) => ({
        rowNumber: startIdx + i + 1,
        data: r,
      }));

      // Retry up to 3 times on network failure
      const MAX_RETRIES = 3;
      let attempt = 0;
      let chunkSuccess = false;
      let lastChunkError: any = null;

      while (attempt <= MAX_RETRIES && !chunkSuccess) {
        if (isCancelledRef?.current) {
          try {
            await fetch(`/api/imports/${datasetId}/cancel`, { method: 'POST' });
          } catch {
            // ignore
          }
          throw new Error('Importation annulée par l’utilisateur.');
        }

        try {
          if (attempt > 0) {
            onProgress?.({
              chunkIndex: chunkIdx + 1,
              totalChunks,
              sentRows: startIdx,
              totalRows: totalRowsCount,
              percent: Math.round(15 + (chunkIdx / totalChunks) * 70),
              retries: attempt,
              statusText: `Tentative ${attempt}/${MAX_RETRIES} pour le lot ${chunkIdx + 1}/${totalChunks}...`,
              isCancelled: false,
            });
            await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
          }

          const chunkRes = await fetch(`/api/imports/${datasetId}/chunks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chunkIndex: chunkIdx,
              rows: chunkRows,
            }),
          });

          if (!chunkRes.ok) {
            let errMsg = `Échec de l'envoi du lot ${chunkIdx + 1}/${totalChunks}`;
            try {
              const errData = await chunkRes.json();
              if (errData.error) errMsg = errData.error;
            } catch {
              // ignore
            }
            throw new Error(errMsg);
          }

          chunkSuccess = true;
        } catch (err: any) {
          lastChunkError = err;
          attempt++;
        }
      }

      if (!chunkSuccess) {
        try {
          await fetch(`/api/imports/${datasetId}/cancel`, { method: 'POST' });
        } catch {
          // ignore
        }
        throw new Error(
          `Échec persistant après ${MAX_RETRIES} tentatives pour le lot ${chunkIdx + 1}/${totalChunks}: ${lastChunkError?.message || 'Erreur réseau'}`
        );
      }

      const percent = Math.min(85, Math.round(15 + ((chunkIdx + 1) / totalChunks) * 70));
      onProgress?.({
        chunkIndex: chunkIdx + 1,
        totalChunks,
        sentRows: endIdx,
        totalRows: totalRowsCount,
        percent,
        retries: 0,
        statusText: `Lot ${chunkIdx + 1}/${totalChunks} envoyé (${endIdx}/${totalRowsCount} lignes)`,
        isCancelled: false,
      });
    }

    // 5. Finalize & Server-side Reconciliation
    onProgress?.({
      chunkIndex: totalChunks,
      totalChunks,
      sentRows: totalRowsCount,
      totalRows: totalRowsCount,
      percent: 90,
      retries: 0,
      statusText: 'Réconciliation serveur de l’intégrité des données ($count, totaux de contrôle)...',
      isCancelled: false,
    });

    const finalizeRes = await fetch(`/api/imports/${datasetId}/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedRows: totalRowsCount,
        checksums: checksums.map((c) => ({
          column: c.column,
          sum: c.sum,
          min: c.min,
          max: c.max,
        })),
      }),
    });

    const finalizeJson = await finalizeRes.json();

    if (!finalizeRes.ok) {
      const rec = finalizeJson.reconciliation;
      const recReport: ReconciliationReportUI = {
        ok: false,
        expectedRows: totalRowsCount,
        actualRows: rec?.actualRows || 0,
        checksums: (rec?.checksums || []).map((cs: any) => ({
          column: cs.column,
          label: columns.find((c) => c.key === cs.column)?.label || cs.column,
          expected: cs.expected,
          actual: cs.actual,
          ok: cs.ok,
        })),
        errorMessage: finalizeJson.error || 'Écart détecté lors de la réconciliation serveur.',
      };

      const err: any = new Error(recReport.errorMessage);
      err.reconciliation = recReport;
      throw err;
    }

    const dataset = finalizeJson.dataset;
    const recReport: ReconciliationReportUI = {
      ok: true,
      expectedRows: totalRowsCount,
      actualRows: dataset?.rowCount || totalRowsCount,
      checksums: (dataset?.reconciliation?.checksums || []).map((cs: any) => ({
        column: cs.column,
        label: columns.find((c) => c.key === cs.column)?.label || cs.column,
        expected: cs.expected,
        actual: cs.actual,
        ok: cs.ok,
      })),
    };

    onProgress?.({
      chunkIndex: totalChunks,
      totalChunks,
      sentRows: totalRowsCount,
      totalRows: totalRowsCount,
      percent: 100,
      retries: 0,
      statusText: `Import vérifié : ${totalRowsCount} lignes enregistrées, intégrité confirmée !`,
      isCancelled: false,
    });

    return {
      datasetId,
      dataset,
      rowCount: totalRowsCount,
      reconciliation: recReport,
      message: finalizeJson.message || `Import vérifié : ${totalRowsCount} lignes enregistrées et conformes.`,
    };
  }
}

export const importService = new ImportService();
