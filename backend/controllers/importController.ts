import { Request, Response } from 'express';
import { ImportRecordModel } from '../models/ImportRecord';
import {
  isMongoConnected,
  connectDB,
  reconnectWithUri,
  getDatabaseInfo,
  DEFAULT_DB_NAME,
} from '../config/db';
import {
  getAllImportedFiles,
  getTargetImportedFile,
  saveImportedFile,
  deleteImportedFile,
  memoryImportsStore,
} from '../data/importsStore';

/**
 * GET /api/imports
 * Fetch all imports strictly from backend storage
 */
export async function getImports(req: Request, res: Response): Promise<void> {
  try {
    const records = await getAllImportedFiles();
    res.json(records);
  } catch (error) {
    console.error('Erreur getImports:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des imports.' });
  }
}

/**
 * GET /api/imports/:id
 * Fetch single import by ID
 */
export async function getImportById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const record = await getTargetImportedFile(id);
    if (!record) {
      res.status(404).json({ error: 'Import non trouvé.' });
      return;
    }
    res.json(record);
  } catch (error) {
    console.error('Erreur getImportById:', error);
    res.status(500).json({ error: "Erreur lors de la recherche de l'import." });
  }
}

/**
 * POST /api/imports
 * Save a new import into the backend database
 */
export async function createImport(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body;
    const newRecord = {
      ...payload,
      id: payload.id || `imp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      importedAt: payload.importedAt || new Date().toISOString(),
    };

    const saved = await saveImportedFile(newRecord);
    res.status(201).json(saved);
  } catch (error) {
    console.error('Erreur createImport:', error);
    res.status(500).json({ error: "Erreur lors de l'enregistrement de l'import dans la base de données." });
  }
}

/**
 * PATCH /api/imports/:id/status
 * Update the status of an import
 */
export async function updateImportStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Statut requis.' });
      return;
    }

    if (!isMongoConnected()) {
      await connectDB();
    }

    if (isMongoConnected()) {
      const updated = await ImportRecordModel.findOneAndUpdate({ id }, { status }, { new: true }).lean();
      if (!updated) {
        res.status(404).json({ error: 'Import non trouvé.' });
        return;
      }
      res.json(updated);
      return;
    }

    const item = memoryImportsStore.find((i) => i.id === id);
    if (!item) {
      res.status(404).json({ error: 'Import non trouvé.' });
      return;
    }
    item.status = status;
    res.json(item);
  } catch (error) {
    console.error('Erreur updateImportStatus:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du statut.' });
  }
}

/**
 * DELETE /api/imports/:id
 * Delete an import by ID
 */
export async function deleteImport(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await deleteImportedFile(id);
    if (!deleted) {
      res.status(404).json({ error: 'Import non trouvé.' });
      return;
    }
    res.json({ success: true, id });
  } catch (error) {
    console.error('Erreur deleteImport:', error);
    res.status(500).json({ error: "Erreur lors de la suppression de l'import." });
  }
}

/**
 * GET /api/imports/stats/overview
 * Global summary stats for imports directly from backend
 */
export async function getImportsStats(req: Request, res: Response): Promise<void> {
  try {
    if (!isMongoConnected()) {
      await connectDB();
    }

    const isMongo = isMongoConnected();
    let totalImports = 0;
    let totalRows = 0;
    let totalColumns = 0;

    if (isMongo) {
      totalImports = await ImportRecordModel.countDocuments();
      const rowsAgg = await ImportRecordModel.aggregate([
        { $group: { _id: null, totalRows: { $sum: '$totalRows' }, totalColumns: { $sum: '$totalColumns' } } },
      ]);
      if (rowsAgg.length > 0) {
        totalRows = rowsAgg[0].totalRows || 0;
        totalColumns = rowsAgg[0].totalColumns || 0;
      }
    } else {
      totalImports = fallbackMemoryStore.length;
      totalRows = fallbackMemoryStore.reduce((acc, curr) => acc + (curr.totalRows || 0), 0);
      totalColumns = fallbackMemoryStore.reduce((acc, curr) => acc + (curr.totalColumns || 0), 0);
    }

    const dbInfo = getDatabaseInfo();

    res.json({
      totalImports,
      totalRows,
      totalColumns,
      databaseName: DEFAULT_DB_NAME,
      host: dbInfo.host,
      cluster: dbInfo.cluster,
      edition: dbInfo.edition,
      storageType: isMongo ? `MongoDB (${DEFAULT_DB_NAME})` : `Stockage Backend (Base cible: ${DEFAULT_DB_NAME})`,
      mongoConnected: isMongo,
    });
  } catch (error) {
    console.error('Erreur getImportsStats:', error);
    res.status(500).json({ error: 'Erreur lors du calcul des statistiques.' });
  }
}

/**
 * POST /api/imports/test-connection
 * Tests a MongoDB connection string and applies it if successful
 */
export async function testMongoConnection(req: Request, res: Response): Promise<void> {
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
        databaseName: DEFAULT_DB_NAME,
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
    console.error('Erreur testMongoConnection:', error);
    res.status(500).json({ error: error?.message || 'Erreur lors du test de connexion.' });
  }
}


