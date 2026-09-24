import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { MongoClient, Db, Collection } from 'mongodb';
import { DatasetDocument, RowDocument } from '../types/dataset';

export const DEFAULT_DB_NAME = process.env.MONGODB_DB_NAME?.trim() || 'omoda_jaecoo_stats_db';

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;
let connectionPromise: Promise<boolean> | null = null;

/**
 * Returns the currently active MongoClient instance
 */
export function getMongoClient(): MongoClient | null {
  return client;
}

/**
 * Returns the active Db instance if MongoDB is connected, else null
 */
export function getDb(): Db | null {
  return db;
}

/**
 * Access the "datasets" collection
 * Throws explicit error if MongoDB is not connected
 */
export function getDatasetsCollection(): Collection<DatasetDocument> {
  if (!db || !isConnected) {
    throw new Error('Base de données MongoDB non connectée ou injoignable.');
  }
  return db.collection<DatasetDocument>('datasets');
}

/**
 * Access the "rows" collection
 * Throws explicit error if MongoDB is not connected
 */
export function getRowsCollection(): Collection<RowDocument> {
  if (!db || !isConnected) {
    throw new Error('Base de données MongoDB non connectée ou injoignable.');
  }
  return db.collection<RowDocument>('rows');
}

/**
 * Checks if real MongoDB is connected
 */
export function isMongoConnected(): boolean {
  return isConnected && db !== null;
}

/**
 * Setup default indexes on startup
 */
export async function initializeDatabaseIndexes(): Promise<void> {
  if (!db || !isConnected) return;
  try {
    const datasetsCol = db.collection<DatasetDocument>('datasets');
    const rowsCol = db.collection<RowDocument>('rows');

    await datasetsCol.createIndex({ fileHash: 1 });
    await datasetsCol.createIndex({ importedAt: -1 });
    await rowsCol.createIndex({ datasetId: 1, rowNumber: 1 }, { unique: true });
    console.log('✅ [MongoDB] Index initialisés avec succès sur la base.');
  } catch (err: any) {
    console.warn('⚠️ [MongoDB] Avertissement lors de la création des index:', err?.message);
  }
}

/**
 * Cleanup datasets left in PROCESSING for more than 1 hour on startup
 */
export async function cleanupStuckProcessingDatasets(): Promise<void> {
  if (!db || !isConnected) return;
  try {
    const datasetsCol = getDatasetsCollection();
    const rowsCol = getRowsCollection();

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const stuckDatasets = await datasetsCol
      .find({
        status: 'PROCESSING',
        importedAt: { $lt: oneHourAgo },
      })
      .toArray();

    if (stuckDatasets.length > 0) {
      console.log(`🧹 [Nettoyage] Détection de ${stuckDatasets.length} import(s) interrompu(s)...`);
      for (const stuck of stuckDatasets) {
        await rowsCol.deleteMany({ datasetId: stuck._id });
        await datasetsCol.updateOne(
          { _id: stuck._id },
          {
            $set: {
              status: 'ERROR',
              errorMessage: 'Import interrompu : délai de traitement dépassé.',
            },
          }
        );
      }
    }
  } catch (err: any) {
    console.warn('⚠️ [Nettoyage] Avertissement lors du nettoyage:', err?.message);
  }
}

/**
 * Connects to MongoDB using official driver.
 * Strict behavior: if MongoDB is unreachable or MONGODB_URI is not provided,
 * isConnected is set to false (no silent fallback).
 */
export async function connectDB(): Promise<boolean> {
  const targetUri = process.env.MONGODB_URI?.trim();

  if (!targetUri) {
    console.warn('⚠️ [MongoDB] MONGODB_URI non configuré dans .env. MongoDB est déconnecté.');
    isConnected = false;
    db = null;
    client = null;
    return false;
  }

  if (isConnected && db) {
    return true;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      console.log(`🔄 [MongoDB] Connexion au cluster MongoDB...`);

      const newClient = new MongoClient(targetUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });

      await newClient.connect();
      await newClient.db(DEFAULT_DB_NAME).command({ ping: 1 });

      client = newClient;
      db = client.db(DEFAULT_DB_NAME);
      isConnected = true;

      console.log(`✅ [MongoDB] Connecté avec succès à la base MongoDB "${DEFAULT_DB_NAME}"`);

      await initializeDatabaseIndexes();
      await cleanupStuckProcessingDatasets();
      return true;
    } catch (error: any) {
      console.warn(`❌ [MongoDB] Échec de connexion à MongoDB (${error?.message || error}). Aucun fallback simulé.`);
      client = null;
      db = null;
      isConnected = false;
      return false;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

/**
 * Reconnect with a MongoDB URI
 */
export async function reconnectWithUri(newUri: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!newUri || typeof newUri !== 'string') {
      return { success: false, message: 'URI MongoDB invalide.' };
    }

    const testClient = new MongoClient(newUri.trim(), {
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000,
    });

    await testClient.connect();
    await testClient.db(DEFAULT_DB_NAME).command({ ping: 1 });

    if (client) {
      try {
        await client.close();
      } catch {
        // ignore
      }
    }

    client = testClient;
    db = client.db(DEFAULT_DB_NAME);
    isConnected = true;
    process.env.MONGODB_URI = newUri.trim();

    try {
      const envPath = path.resolve(process.cwd(), '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      if (envContent.includes('MONGODB_URI=')) {
        envContent = envContent.replace(/MONGODB_URI=.*/, `MONGODB_URI="${newUri.trim()}"`);
      } else {
        envContent += `\nMONGODB_URI="${newUri.trim()}"\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
    } catch {
      // Ignored
    }

    await initializeDatabaseIndexes();
    await cleanupStuckProcessingDatasets();

    return {
      success: true,
      message: `Connecté à la base MongoDB "${DEFAULT_DB_NAME}" avec succès !`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Impossible de joindre le serveur MongoDB.',
    };
  }
}

/**
 * Returns real database connectivity and server information
 */
export function getDatabaseInfo() {
  const connected = isConnected && db !== null;

  return {
    databaseName: DEFAULT_DB_NAME,
    host: connected ? (process.env.MONGODB_URI ? 'MongoDB Atlas' : '127.0.0.1:27017') : 'Non connecté',
    cluster: connected ? `Base active (${DEFAULT_DB_NAME})` : 'Déconnecté',
    edition: connected ? 'Driver Officiel MongoDB' : 'Injoignable (HTTP 503)',
    connected,
    status: connected
      ? `Connecté à MongoDB (${DEFAULT_DB_NAME})`
      : 'Déconnecté : configurez MONGODB_URI dans les variables d’environnement.',
  };
}
