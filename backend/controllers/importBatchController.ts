import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  getDb,
  getDatasetsCollection,
  getRowsCollection,
  isMongoConnected,
  reconnectWithUri,
} from '../config/db';
import {
  DatasetDocument,
  DatasetColumn,
  ColumnType,
  ColumnRole,
  RowDocument,
} from '../types/dataset';
import {
  generateColumnKey,
  sanitizeRowData,
  convertValue,
} from '../utils/typeConverter';
import {
  performReconciliation,
  calculateColumnStatistics,
  ClientChecksumInput,
} from '../utils/reconciliation';
import { createDatasetIndexes } from '../services/indexService';

/**
 * Ensures MongoDB is connected, else responds with explicit HTTP 503
 */
function checkDatabaseAvailable(res: Response): boolean {
  if (!isMongoConnected()) {
    res.status(503).json({
      error: 'Service temporairement indisponible : la base de données MongoDB est déconnectée ou injoignable.',
      code: 'DATABASE_OFFLINE',
    });
    return false;
  }
  return true;
}

/**
 * POST /api/imports/init
 * Initializes a new dataset in "PROCESSING" status
 */
export async function initImport(req: Request, res: Response): Promise<void> {
  try {
    if (!checkDatabaseAvailable(res)) return;

    const {
      name,
      fileName,
      fileHash,
      fileSizeBytes,
      sheetName,
      importedBy,
      columns,
      quality,
      mapping,
      expectedRows,
      replace,
    } = req.body;

    if (!fileName || !fileHash || !sheetName) {
      res.status(400).json({ error: 'Données manquantes (fileName, fileHash, sheetName requis).' });
      return;
    }

    const datasetsCol = getDatasetsCollection();
    const rowsCol = getRowsCollection();

    // Check duplicate file by fileHash
    const existingDataset = await datasetsCol.findOne({
      fileHash,
      status: { $ne: 'CANCELLED' },
    });

    if (existingDataset) {
      if (!replace) {
        res.status(409).json({
          error: 'Un fichier identique a déjà été importé.',
          existingDatasetId: existingDataset._id.toString(),
          existingFileName: existingDataset.fileName,
          existingImportedAt: existingDataset.importedAt,
          status: existingDataset.status,
          message: 'Souhaitez-vous remplacer le jeu de données existant ou annuler ?',
        });
        return;
      }

      // Replace confirmed: delete existing rows and previous dataset
      await rowsCol.deleteMany({ datasetId: existingDataset._id });
      await datasetsCol.deleteOne({ _id: existingDataset._id });
    }

    // Build unique, safe technical keys for each column
    const existingKeys = new Set<string>();
    const sanitizedColumns: DatasetColumn[] = (columns || []).map(
      (col: any, idx: number) => {
        const key = col.key && !col.key.includes('.') && !col.key.includes('$')
          ? col.key.toLowerCase().replace(/[^a-z0-9_]+/g, '_')
          : generateColumnKey(col.label || col.name, existingKeys, idx);

        existingKeys.add(key);

        return {
          key,
          label: col.label || col.name || `Colonne ${idx + 1}`,
          type: (col.type as ColumnType) || 'string',
          role: (col.role as ColumnRole) || 'dimension',
          nullCount: 0,
          distinctCount: 0,
        };
      }
    );

    const newDataset: DatasetDocument = {
      _id: new ObjectId(),
      name: name || fileName.replace(/\.[^/.]+$/, ''),
      fileName,
      fileHash,
      fileSizeBytes: fileSizeBytes || 0,
      sheetName,
      importedAt: new Date(),
      importedBy: importedBy || process.env.DEFAULT_IMPORT_USER || 'utilisateur@omoda-jaecoo.tn',
      status: 'PROCESSING',
      rowCount: 0,
      columns: sanitizedColumns,
      mapping: mapping || {},
      quality: quality || { errors: 0, warnings: 0, info: 0, issues: [] },
      reconciliation: {
        expectedRows: expectedRows || 0,
        actualRows: 0,
        checksums: [],
        verified: false,
      },
    };

    await datasetsCol.insertOne(newDataset);

    res.status(201).json({
      datasetId: newDataset._id.toString(),
      columns: newDataset.columns,
      status: newDataset.status,
    });
  } catch (error: any) {
    console.error('Erreur initImport:', error);
    res.status(500).json({ error: error?.message || "Erreur lors de l'initialisation de l'import." });
  }
}

/**
 * POST /api/imports/:id/chunks
 * Receives a chunk of rows (max 2000 per request), converts types, and upserts idempotently
 */
export async function uploadChunk(req: Request, res: Response): Promise<void> {
  try {
    if (!checkDatabaseAvailable(res)) return;

    const { id } = req.params;
    const { chunkIndex, rows } = req.body;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Identifiant dataset invalide.' });
      return;
    }

    if (!Array.isArray(rows) || typeof chunkIndex !== 'number') {
      res.status(400).json({ error: 'Format du lot invalide (chunkIndex et rows[] requis).' });
      return;
    }

    if (rows.length > 2000) {
      res.status(400).json({ error: 'Taille de lot trop volumineuse (maximum 2000 lignes par lot).' });
      return;
    }

    const datasetId = new ObjectId(id);
    const datasetsCol = getDatasetsCollection();
    const dataset = await datasetsCol.findOne({ _id: datasetId });

    if (!dataset) {
      res.status(404).json({ error: 'Dataset non trouvé.' });
      return;
    }

    if (dataset.status !== 'PROCESSING') {
      res.status(400).json({ error: `Le dataset n'est plus en cours de traitement (statut actuel: ${dataset.status}).` });
      return;
    }

    const rowsCol = getRowsCollection();

    // Prepare bulk operations with updateOne upsert to guarantee idempotency
    const bulkOps = rows.map((r: any) => {
      const rowNumber = typeof r.rowNumber === 'number' ? r.rowNumber : 1;
      const rawData = r.data || r;
      const sanitizedData = sanitizeRowData(rawData, dataset.columns);

      return {
        updateOne: {
          filter: { datasetId, rowNumber },
          update: {
            $set: {
              datasetId,
              rowNumber,
              chunkIndex,
              data: sanitizedData,
            },
          },
          upsert: true,
        },
      };
    });

    if (bulkOps.length > 0) {
      await rowsCol.bulkWrite(bulkOps, { ordered: false });
    }

    res.json({
      success: true,
      chunkIndex,
      receivedCount: rows.length,
    });
  } catch (error: any) {
    console.error('Erreur uploadChunk:', error);
    res.status(500).json({ error: error?.message || "Erreur lors de l'enregistrement du lot de lignes." });
  }
}

/**
 * POST /api/imports/:id/finalize
 * Performs checksum and row count reconciliation, calculates column statistics, creates indexes,
 * and sets status to SUCCESS (or deletes rows & marks ERROR if discrepancy found).
 */
export async function finalizeImport(req: Request, res: Response): Promise<void> {
  try {
    if (!checkDatabaseAvailable(res)) return;

    const { id } = req.params;
    const { expectedRows, checksums } = req.body;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Identifiant dataset invalide.' });
      return;
    }

    if (typeof expectedRows !== 'number') {
      res.status(400).json({ error: 'Le nombre de lignes attendu (expectedRows) est requis.' });
      return;
    }

    const datasetId = new ObjectId(id);
    const datasetsCol = getDatasetsCollection();
    const rowsCol = getRowsCollection();

    const dataset = await datasetsCol.findOne({ _id: datasetId });
    if (!dataset) {
      res.status(404).json({ error: 'Dataset non trouvé.' });
      return;
    }

    if (dataset.status !== 'PROCESSING') {
      res.status(400).json({ error: `Statut invalide pour finalisation: ${dataset.status}` });
      return;
    }

    // 1. Perform server-side reconciliation
    const reconciliation = await performReconciliation(
      rowsCol,
      datasetId,
      expectedRows,
      checksums as ClientChecksumInput[]
    );

    // 2. If discrepancy detected, delete all rows and mark status ERROR
    if (!reconciliation.ok) {
      console.warn(`❌ [Réconciliation] Échec sur le dataset ${id}: ${reconciliation.errorMessage}`);
      await rowsCol.deleteMany({ datasetId });

      await datasetsCol.updateOne(
        { _id: datasetId },
        {
          $set: {
            status: 'ERROR',
            errorMessage: reconciliation.errorMessage || 'Écart de réconciliation des données.',
            reconciliation: {
              expectedRows,
              actualRows: reconciliation.actualRows,
              checksums: reconciliation.checksums,
              verified: false,
            },
          },
        }
      );

      res.status(422).json({
        success: false,
        error: reconciliation.errorMessage || 'Écart de réconciliation des données.',
        reconciliation,
      });
      return;
    }

    // 3. Reconciliation verified: calculate deep column statistics
    const updatedColumns = await calculateColumnStatistics(
      rowsCol,
      datasetId,
      dataset.columns,
      reconciliation.actualRows
    );

    // 4. Create optimized compound indexes on rows collection
    await createDatasetIndexes(rowsCol, datasetId, updatedColumns, dataset.mapping);

    // 5. Update dataset document to SUCCESS
    const finalUpdate: Partial<DatasetDocument> = {
      status: 'SUCCESS',
      rowCount: reconciliation.actualRows,
      columns: updatedColumns,
      reconciliation: {
        expectedRows,
        actualRows: reconciliation.actualRows,
        checksums: reconciliation.checksums,
        verified: true,
      },
      updatedAt: new Date(),
    };

    await datasetsCol.updateOne({ _id: datasetId }, { $set: finalUpdate });

    const finalizedDataset = await datasetsCol.findOne({ _id: datasetId });

    res.json({
      success: true,
      dataset: finalizedDataset,
      message: `Import finalisé avec succès. ${reconciliation.actualRows} lignes enregistrées et réconciliées.`,
    });
  } catch (error: any) {
    console.error('Erreur finalizeImport:', error);
    res.status(500).json({ error: error?.message || 'Erreur lors de la finalisation de l’import.' });
  }
}

/**
 * POST /api/imports/:id/cancel
 * Cancels an import in progress, deletes all already uploaded rows, and marks dataset CANCELLED
 */
export async function cancelImport(req: Request, res: Response): Promise<void> {
  try {
    if (!checkDatabaseAvailable(res)) return;

    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Identifiant dataset invalide.' });
      return;
    }

    const datasetId = new ObjectId(id);
    const datasetsCol = getDatasetsCollection();
    const rowsCol = getRowsCollection();

    // Delete rows
    const deleteResult = await rowsCol.deleteMany({ datasetId });

    // Mark as CANCELLED
    await datasetsCol.updateOne(
      { _id: datasetId },
      {
        $set: {
          status: 'CANCELLED',
          errorMessage: 'Import annulé par l’utilisateur.',
          updatedAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      message: `Import annulé et ${deleteResult.deletedCount} lignes supprimées.`,
    });
  } catch (error: any) {
    console.error('Erreur cancelImport:', error);
    res.status(500).json({ error: error?.message || "Erreur lors de l'annulation de l'import." });
  }
}

/**
 * POST /api/imports/test-connection
 * Tests custom MongoDB connection URI
 */
export async function testConnection(req: Request, res: Response): Promise<void> {
  try {
    const { uri } = req.body;
    if (!uri || typeof uri !== 'string') {
      res.status(400).json({ error: 'Chaîne de connexion URI requise.' });
      return;
    }

    const result = await reconnectWithUri(uri.trim());
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        connected: true,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
        connected: false,
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Erreur lors du test de connexion.' });
  }
}
