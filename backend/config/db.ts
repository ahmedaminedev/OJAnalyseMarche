import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { MongoClient, Db, Collection } from 'mongodb';
import { DatasetDocument, RowDocument } from '../types/dataset';
import { createLocalCollection } from './localDbStore';

export const DEFAULT_DB_NAME = process.env.MONGODB_DB_NAME?.trim() || 'omoda_jaecoo_stats_db';
export const DEFAULT_LOCAL_URI = process.env.MONGODB_URI?.trim() || `mongodb://127.0.0.1:27017/${DEFAULT_DB_NAME}`;

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = true;
let isLocalFileFallback = true;
let connectionPromise: Promise<boolean> | null = null;

// Local persistent collections when mongod is offline
const localDatasetsCol = createLocalCollection<DatasetDocument>('datasets');
const localRowsCol = createLocalCollection<RowDocument>('rows');

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
 */
export function getDatasetsCollection(): Collection<DatasetDocument> {
  if (db && isConnected && !isLocalFileFallback) {
    return db.collection<DatasetDocument>('datasets');
  }
  return localDatasetsCol as unknown as Collection<DatasetDocument>;
}

/**
 * Access the "rows" collection
 */
export function getRowsCollection(): Collection<RowDocument> {
  if (db && isConnected && !isLocalFileFallback) {
    return db.collection<RowDocument>('rows');
  }
  return localRowsCol as unknown as Collection<RowDocument>;
}

/**
 * Checks if database is available (Local MongoDB or Local File Store)
 */
export function isMongoConnected(): boolean {
  return isConnected;
}

/**
 * Setup default indexes on startup
 */
export async function initializeDatabaseIndexes(): Promise<void> {
  if (!db || isLocalFileFallback) return;
  try {
    const datasetsCol = db.collection<DatasetDocument>('datasets');
    const rowsCol = db.collection<RowDocument>('rows');

    await datasetsCol.createIndex({ fileHash: 1 });
    await datasetsCol.createIndex({ importedAt: -1 });
    await rowsCol.createIndex({ datasetId: 1, rowNumber: 1 }, { unique: true });
    console.log('✅ [MongoDB Local] Index initialisés avec succès sur la base locale.');
  } catch (err: any) {
    console.warn('⚠️ [MongoDB Local] Avertissement lors de la création des index:', err?.message);
  }
}

/**
 * Cleanup datasets left in PROCESSING for more than 1 hour on startup
 */
export async function cleanupStuckProcessingDatasets(): Promise<void> {
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
 * Connects to MongoDB on localhost (127.0.0.1:27017).
 * Falls back transparently to local file storage if mongod is not running.
 */
export async function connectDB(): Promise<boolean> {
  const targetUri = process.env.MONGODB_URI?.trim() || DEFAULT_LOCAL_URI;

  if (isConnected && (db || isLocalFileFallback)) {
    return true;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      console.log(`🔄 [MongoDB] Connexion à la base de données locale (${targetUri})...`);

      const newClient = new MongoClient(targetUri, {
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
      });

      await newClient.connect();
      await newClient.db(DEFAULT_DB_NAME).command({ ping: 1 });

      client = newClient;
      db = client.db(DEFAULT_DB_NAME);
      isConnected = true;
      isLocalFileFallback = false;

      console.log(`✅ [MongoDB] Connecté à la base locale MongoDB 127.0.0.1:27017 (Base: "${DEFAULT_DB_NAME}")`);

      await initializeDatabaseIndexes();
      await cleanupStuckProcessingDatasets();
      return true;
    } catch (error: any) {
      // Local mongod is offline or not installed -> fallback to local file persistence
      console.log(`ℹ️ [Base Locale] Serveur mongod local (127.0.0.1:27017) injoignable (${error?.message || 'timeout'}). Activation du stockage local persistant (JSON/BSON dans backend/data/local_db).`);
      client = null;
      db = null;
      isConnected = true;
      isLocalFileFallback = true;
      await cleanupStuckProcessingDatasets();
      return true;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

/**
 * Reconnect with a local MongoDB URI (ex: mongodb://127.0.0.1:27017/omoda_jaecoo_stats_db)
 */
export async function reconnectWithUri(newUri: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!newUri || typeof newUri !== 'string') {
      return { success: false, message: 'URI locale invalide.' };
    }

    const testClient = new MongoClient(newUri.trim(), {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
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
    isLocalFileFallback = false;
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
      message: `Connecté à la base locale "${DEFAULT_DB_NAME}" avec succès !`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Impossible de joindre le serveur MongoDB local.',
    };
  }
}

/**
 * Returns real database connectivity and server information (Local DB only)
 */
export function getDatabaseInfo() {
  const isMongoLocal = isConnected && !isLocalFileFallback && db !== null;

  return {
    databaseName: DEFAULT_DB_NAME,
    host: isMongoLocal ? '127.0.0.1:27017 (Local)' : 'Stockage Local Persistant',
    cluster: 'Base Locale (omoda_jaecoo_stats_db)',
    edition: isMongoLocal ? 'MongoDB Local (127.0.0.1:27017)' : 'Stockage Local Fichiers',
    connected: true,
    isLocalFallback: isLocalFileFallback,
  };
}
