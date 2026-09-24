import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  getDatasetsCollection,
  getRowsCollection,
  isMongoConnected,
  getDatabaseInfo,
  DEFAULT_DB_NAME,
} from '../config/db';
import {
  initImport,
  uploadChunk,
  finalizeImport,
  cancelImport,
  testConnection,
} from './importBatchController';

export {
  initImport,
  uploadChunk,
  finalizeImport,
  cancelImport,
  testConnection,
};

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
 * GET /api/imports
 * Fetch all datasets formatted for UI compatibility
 */
export async function getImports(req: Request, res: Response): Promise<void> {
  try {
    if (!checkDatabaseAvailable(res)) return;

    const datasetsCol = getDatasetsCollection();
    const datasets = await datasetsCol.find().sort({ importedAt: -1 }).toArray();

    const formatted = datasets.map((d) => ({
      ...d,
      id: d._id.toString(),
      totalRows: d.rowCount,
      totalColumns: d.columns?.length || 0,
      totalEmptyCells: d.columns?.reduce((acc, c) => acc + (c.nullCount || 0), 0) || 0,
      activeSheetName: d.sheetName,
      availableSheets: [d.sheetName],
      issuesCount: d.quality
        ? {
            errors: d.quality.errors,
            warnings: d.quality.warnings,
            info: d.quality.info,
          }
        : { errors: 0, warnings: 0, info: 0 },
      issues: d.quality?.issues || [],
      previewData: {
        columns: d.columns,
        rows: [],
      },
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error('Erreur getImports:', error);
    res.status(500).json({ error: error?.message || 'Erreur lors de la récupération des imports.' });
  }
}

/**
 * GET /api/imports/:id
 * Fetch single import with preview rows from "rows" collection
 */
export async function getImportById(req: Request, res: Response): Promise<void> {
  try {
    if (!checkDatabaseAvailable(res)) return;

    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Identifiant import invalide.' });
      return;
    }

    const datasetId = new ObjectId(id);
    const datasetsCol = getDatasetsCollection();
    const rowsCol = getRowsCollection();

    const dataset = await datasetsCol.findOne({ _id: datasetId });
    if (!dataset) {
      res.status(404).json({ error: 'Import non trouvé.' });
      return;
    }

    // Fetch preview rows (first 100)
    const previewRowsDocs = await rowsCol
      .find({ datasetId })
      .sort({ rowNumber: 1 })
      .limit(100)
      .toArray();

    const previewRows = previewRowsDocs.map((r) => r.data);

    res.json({
      ...dataset,
      id: dataset._id.toString(),
      totalRows: dataset.rowCount,
      totalColumns: dataset.columns?.length || 0,
      activeSheetName: dataset.sheetName,
      availableSheets: [dataset.sheetName],
      previewData: {
        columns: dataset.columns,
        rows: previewRows,
      },
    });
  } catch (error: any) {
    console.error('Erreur getImportById:', error);
    res.status(500).json({ error: error?.message || "Erreur lors de la recherche de l'import." });
  }
}

/**
 * DELETE /api/imports/:id
 * Delete dataset and all its rows
 */
export async function deleteImport(req: Request, res: Response): Promise<void> {
  try {
    if (!checkDatabaseAvailable(res)) return;

    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Identifiant import invalide.' });
      return;
    }

    const datasetId = new ObjectId(id);
    const datasetsCol = getDatasetsCollection();
    const rowsCol = getRowsCollection();

    const deletedRows = await rowsCol.deleteMany({ datasetId });
    await datasetsCol.deleteOne({ _id: datasetId });

    res.json({
      success: true,
      id,
      deletedRows: deletedRows.deletedCount,
    });
  } catch (error: any) {
    console.error('Erreur deleteImport:', error);
    res.status(500).json({ error: error?.message || "Erreur lors de la suppression de l'import." });
  }
}

/**
 * GET /api/imports/stats/overview
 * Real MongoDB statistics
 */
export async function getImportsStats(req: Request, res: Response): Promise<void> {
  try {
    if (!checkDatabaseAvailable(res)) return;

    const datasetsCol = getDatasetsCollection();
    const rowsCol = getRowsCollection();

    const [totalImports, totalRows] = await Promise.all([
      datasetsCol.countDocuments(),
      rowsCol.countDocuments(),
    ]);

    // Calculate total columns across datasets
    const datasets = await datasetsCol.find({}, { projection: { columns: 1 } }).toArray();
    const totalColumns = datasets.reduce((acc, d) => acc + (d.columns?.length || 0), 0);

    const dbInfo = getDatabaseInfo();

    res.json({
      totalImports,
      totalRows,
      totalColumns,
      databaseName: DEFAULT_DB_NAME,
      host: dbInfo.host,
      cluster: dbInfo.cluster,
      edition: dbInfo.edition,
      storageType: `MongoDB (${DEFAULT_DB_NAME})`,
      mongoConnected: true,
    });
  } catch (error: any) {
    console.error('Erreur getImportsStats:', error);
    res.status(500).json({ error: error?.message || 'Erreur lors du calcul des statistiques.' });
  }
}
