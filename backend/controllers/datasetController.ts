import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  getDatasetsCollection,
  getRowsCollection,
  isMongoConnected,
} from '../config/db';
import { DatasetDocument, ColumnRole } from '../types/dataset';

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
 * GET /api/datasets
 * Returns lightweight list of datasets (WITHOUT heavy rows or large distinct value arrays),
 * sorted by importedAt descending.
 */
export async function getDatasets(req: Request, res: Response): Promise<void> {
  try {
    if (!checkDatabaseAvailable(res)) return;

    const datasetsCol = getDatasetsCollection();

    // Light projection
    const datasets = await datasetsCol
      .find(
        {},
        {
          projection: {
            _id: 1,
            name: 1,
            fileName: 1,
            fileHash: 1,
            fileSizeBytes: 1,
            sheetName: 1,
            importedAt: 1,
            importedBy: 1,
            status: 1,
            rowCount: 1,
            errorMessage: 1,
            quality: 1,
            reconciliation: 1,
            'columns.key': 1,
            'columns.label': 1,
            'columns.type': 1,
            'columns.role': 1,
            'columns.nullCount': 1,
            'columns.distinctCount': 1,
          },
        }
      )
      .sort({ importedAt: -1 })
      .toArray();

    // Map _id to id as string for client convenience
    const formatted = datasets.map((d) => ({
      ...d,
      id: d._id.toString(),
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error('Erreur getDatasets:', error);
    res.status(500).json({ error: error?.message || 'Erreur lors de la récupération des datasets.' });
  }
}

/**
 * GET /api/datasets/:id
 * Returns full metadata, columns, and stats for a single dataset
 */
export async function getDatasetById(req: Request, res: Response): Promise<void> {
  try {
    if (!checkDatabaseAvailable(res)) return;

    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Identifiant dataset invalide.' });
      return;
    }

    const datasetsCol = getDatasetsCollection();
    const dataset = await datasetsCol.findOne({ _id: new ObjectId(id) });

    if (!dataset) {
      res.status(404).json({ error: 'Dataset non trouvé.' });
      return;
    }

    res.json({
      ...dataset,
      id: dataset._id.toString(),
    });
  } catch (error: any) {
    console.error('Erreur getDatasetById:', error);
    res.status(500).json({ error: error?.message || 'Erreur lors de la récupération du dataset.' });
  }
}

/**
 * PATCH /api/datasets/:id
 * Allows renaming, modifying semantic mapping, or updating role/label of specific columns
 */
export async function updateDataset(req: Request, res: Response): Promise<void> {
  try {
    if (!checkDatabaseAvailable(res)) return;

    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Identifiant dataset invalide.' });
      return;
    }

    const datasetId = new ObjectId(id);
    const datasetsCol = getDatasetsCollection();
    const dataset = await datasetsCol.findOne({ _id: datasetId });

    if (!dataset) {
      res.status(404).json({ error: 'Dataset non trouvé.' });
      return;
    }

    const { name, mapping, columnUpdates } = req.body;
    const updateFields: any = { updatedAt: new Date() };

    // 1. Rename
    if (typeof name === 'string' && name.trim().length > 0) {
      updateFields.name = name.trim();
    }

    // 2. Semantic mapping update
    if (mapping && typeof mapping === 'object') {
      updateFields.mapping = {
        ...(dataset.mapping || {}),
        ...mapping,
      };
    }

    // 3. Column role and label modifications
    let updatedColumns = [...dataset.columns];
    if (Array.isArray(columnUpdates)) {
      for (const update of columnUpdates) {
        if (!update.key) continue;
        const colIdx = updatedColumns.findIndex((c) => c.key === update.key);
        if (colIdx >= 0) {
          updatedColumns[colIdx] = {
            ...updatedColumns[colIdx],
            label: typeof update.label === 'string' ? update.label.trim() : updatedColumns[colIdx].label,
            role: (update.role as ColumnRole) || updatedColumns[colIdx].role,
          };
        }
      }
      updateFields.columns = updatedColumns;
    }

    await datasetsCol.updateOne({ _id: datasetId }, { $set: updateFields });

    const updated = await datasetsCol.findOne({ _id: datasetId });
    res.json({
      success: true,
      dataset: updated ? { ...updated, id: updated._id.toString() } : null,
      message: 'Dataset mis à jour avec succès.',
    });
  } catch (error: any) {
    console.error('Erreur updateDataset:', error);
    res.status(500).json({ error: error?.message || 'Erreur lors de la mise à jour du dataset.' });
  }
}

/**
 * DELETE /api/datasets/:id
 * Deletes the dataset document AND all its associated rows from "rows" collection
 */
export async function deleteDataset(req: Request, res: Response): Promise<void> {
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

    const dataset = await datasetsCol.findOne({ _id: datasetId });
    if (!dataset) {
      res.status(404).json({ error: 'Dataset non trouvé.' });
      return;
    }

    const deletedRows = await rowsCol.deleteMany({ datasetId });
    await datasetsCol.deleteOne({ _id: datasetId });

    res.json({
      success: true,
      id,
      deletedRowsCount: deletedRows.deletedCount,
      message: `Dataset et ${deletedRows.deletedCount} lignes supprimés avec succès.`,
    });
  } catch (error: any) {
    console.error('Erreur deleteDataset:', error);
    res.status(500).json({ error: error?.message || 'Erreur lors de la suppression du dataset.' });
  }
}

/**
 * GET /api/datasets/:id/rows
 * Server-side paginated retrieval of rows (pageSize max 200, default 50).
 */
export async function getDatasetRows(req: Request, res: Response): Promise<void> {
  try {
    if (!checkDatabaseAvailable(res)) return;

    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Identifiant dataset invalide.' });
      return;
    }

    const datasetId = new ObjectId(id);
    const rowsCol = getRowsCollection();

    // Query parameters
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const requestedPageSize = parseInt(req.query.pageSize as string, 10) || 50;
    const pageSize = Math.min(200, Math.max(1, requestedPageSize));
    const skip = (page - 1) * pageSize;

    // Sorting
    const sortField = req.query.sort as string;
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    let sortOptions: Record<string, 1 | -1> = { rowNumber: 1 };

    if (sortField) {
      sortOptions = { [`data.${sortField}`]: sortOrder, rowNumber: 1 };
    }

    // Filter
    const filterQuery: any = { datasetId };
    if (req.query.filter && typeof req.query.filter === 'string') {
      try {
        const parsedFilter = JSON.parse(req.query.filter);
        if (typeof parsedFilter === 'object' && parsedFilter !== null) {
          for (const [colKey, filterVal] of Object.entries(parsedFilter)) {
            if (Array.isArray(filterVal) && filterVal.length > 0) {
              filterQuery[`data.${colKey}`] = { $in: filterVal };
            } else if (filterVal !== undefined && filterVal !== null && filterVal !== '') {
              filterQuery[`data.${colKey}`] = filterVal;
            }
          }
        }
      } catch {
        // ignore filter parse errors
      }
    }

    const [total, rows] = await Promise.all([
      rowsCol.countDocuments(filterQuery),
      rowsCol
        .find(filterQuery)
        .sort(sortOptions)
        .skip(skip)
        .limit(pageSize)
        .toArray(),
    ]);

    const formattedRows = rows.map((r) => ({
      _id: r._id?.toString(),
      rowNumber: r.rowNumber,
      data: r.data,
    }));

    res.json({
      datasetId: id,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      rows: formattedRows,
    });
  } catch (error: any) {
    console.error('Erreur getDatasetRows:', error);
    res.status(500).json({ error: error?.message || 'Erreur lors de la récupération des lignes.' });
  }
}
