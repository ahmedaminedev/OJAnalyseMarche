import { ImportRecordModel } from '../models/ImportRecord';
import { isMongoConnected, connectDB } from '../config/db';

// Unified memory store when MongoDB is in-memory or connecting
export const memoryImportsStore: any[] = [];

/**
 * Retrieves all imported files from MongoDB or in-memory fallback
 */
export async function getAllImportedFiles(): Promise<any[]> {
  try {
    if (!isMongoConnected()) {
      await connectDB();
    }
    if (isMongoConnected()) {
      const docs = await ImportRecordModel.find().sort({ importedAt: -1 }).lean();
      if (docs && docs.length > 0) {
        return docs;
      }
    }
  } catch (err) {
    console.warn('Error reading imports from MongoDB:', err);
  }
  return memoryImportsStore;
}

/**
 * Retrieves an imported file by ID, or the most recent if no ID provided
 */
export async function getTargetImportedFile(importId?: string): Promise<any | null> {
  try {
    if (!isMongoConnected()) {
      await connectDB();
    }
    if (isMongoConnected()) {
      if (importId) {
        const found = await ImportRecordModel.findOne({ id: importId }).lean();
        if (found) return found;
      }
      const latest = await ImportRecordModel.findOne().sort({ importedAt: -1 }).lean();
      if (latest) return latest;
    }
  } catch (err) {
    console.warn('Error querying MongoDB for target imported file:', err);
  }

  // Check memory store
  if (importId) {
    const foundMem = memoryImportsStore.find((item) => item.id === importId);
    if (foundMem) return foundMem;
  }
  return memoryImportsStore[0] || null;
}

/**
 * Saves a new import record into MongoDB and synchronizes with memory store
 */
export async function saveImportedFile(record: any): Promise<any> {
  // Always update memory store
  const existingIdx = memoryImportsStore.findIndex((r) => r.id === record.id);
  if (existingIdx >= 0) {
    memoryImportsStore[existingIdx] = record;
  } else {
    memoryImportsStore.unshift(record);
  }

  try {
    if (!isMongoConnected()) {
      await connectDB();
    }
    if (isMongoConnected()) {
      const doc = new ImportRecordModel(record);
      await doc.save();
      return doc.toObject();
    }
  } catch (err) {
    console.warn('Could not save to MongoDB, kept in memory store:', err);
  }

  return record;
}

/**
 * Deletes an import record
 */
export async function deleteImportedFile(importId: string): Promise<boolean> {
  const memIdx = memoryImportsStore.findIndex((r) => r.id === importId);
  if (memIdx >= 0) {
    memoryImportsStore.splice(memIdx, 1);
  }

  try {
    if (isMongoConnected()) {
      await ImportRecordModel.deleteOne({ id: importId });
      return true;
    }
  } catch (err) {
    console.warn('Error deleting import from MongoDB:', err);
  }
  return memIdx >= 0;
}
