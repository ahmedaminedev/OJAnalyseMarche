import { ObjectId } from 'mongodb';
import {
  getDatasetsCollection,
  getRowsCollection,
  isMongoConnected,
  connectDB,
} from '../config/db';

/**
 * Retrieves an imported dataset by ID, or the most recent SUCCESS dataset if no ID provided.
 * Populates previewData with actual rows stored in the "rows" collection.
 * Strictly no mock or in-memory fallback.
 */
export async function getTargetImportedFile(importId?: string): Promise<any | null> {
  if (!isMongoConnected()) {
    await connectDB();
  }

  if (!isMongoConnected()) {
    return null;
  }

  try {
    const datasetsCol = getDatasetsCollection();
    const rowsCol = getRowsCollection();

    let query: any = { status: 'SUCCESS' };
    if (importId && ObjectId.isValid(importId)) {
      query = { _id: new ObjectId(importId) };
    } else if (importId) {
      // Legacy id or string search
      query = { $or: [{ _id: ObjectId.isValid(importId) ? new ObjectId(importId) : null }, { fileName: importId }] };
    }

    const dataset = await datasetsCol.findOne(query, { sort: { importedAt: -1 } });
    if (!dataset) return null;

    // Fetch actual rows from the "rows" collection
    const rowsDocs = await rowsCol
      .find({ datasetId: dataset._id })
      .sort({ rowNumber: 1 })
      .limit(1000)
      .toArray();

    const formattedRows = rowsDocs.map((r) => r.data);

    return {
      ...dataset,
      id: dataset._id.toString(),
      totalRows: dataset.rowCount,
      totalColumns: dataset.columns?.length || 0,
      activeSheetName: dataset.sheetName,
      availableSheets: [dataset.sheetName],
      previewData: {
        columns: dataset.columns,
        rows: formattedRows,
      },
    };
  } catch (err) {
    console.error('Erreur lors de la récupération du dataset depuis MongoDB:', err);
    return null;
  }
}

/**
 * Retrieves all imported datasets from MongoDB
 */
export async function getAllImportedFiles(): Promise<any[]> {
  if (!isMongoConnected()) {
    await connectDB();
  }

  if (!isMongoConnected()) {
    return [];
  }

  try {
    const datasetsCol = getDatasetsCollection();
    const datasets = await datasetsCol.find().sort({ importedAt: -1 }).toArray();

    return datasets.map((d) => ({
      ...d,
      id: d._id.toString(),
      totalRows: d.rowCount,
      totalColumns: d.columns?.length || 0,
      activeSheetName: d.sheetName,
      availableSheets: [d.sheetName],
    }));
  } catch (err) {
    console.error('Erreur getAllImportedFiles:', err);
    return [];
  }
}

/**
 * Deletes an imported dataset and its rows
 */
export async function deleteImportedFile(importId: string): Promise<boolean> {
  if (!isMongoConnected() || !ObjectId.isValid(importId)) {
    return false;
  }

  try {
    const datasetId = new ObjectId(importId);
    const datasetsCol = getDatasetsCollection();
    const rowsCol = getRowsCollection();

    await rowsCol.deleteMany({ datasetId });
    const res = await datasetsCol.deleteOne({ _id: datasetId });
    return res.deletedCount > 0;
  } catch (err) {
    console.error('Erreur deleteImportedFile:', err);
    return false;
  }
}
