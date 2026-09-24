import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { MongoClient, Db, Collection, ServerApiVersion } from 'mongodb';
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
 * Returns the active Db instance.
 * Throws 503 error if database is not reachable.
 */
export function getDb(): Db {
  if (!db || !isConnected) {
    const error: any = new Error('Base de données MongoDB non disponible ou non configurée.');
    error.status = 503;
    error.statusCode = 503;
    throw error;
  }
  return db;
}

/**
 * Access the "datasets" collection
 */
export function getDatasetsCollection(): Collection<DatasetDocument> {
  return getDb().collection<DatasetDocument>('datasets');
}

/**
 * Access the "rows" collection
 */
export function getRowsCollection(): Collection<RowDocument> {
  return getDb().collection<RowDocument>('rows');
}

/**
 * Checks if MongoDB is currently connected and active
 */
export function isMongoConnected(): boolean {
  return isConnected && db !== null;
}

/**
 * Setup default indexes on startup
 */
export async function initializeDatabaseIndexes(): Promise<void> {
  if (!db) return;
  try {
    const datasetsCol = db.collection<DatasetDocument>('datasets');
    const rowsCol = db.collection<RowDocument>('rows');

    // Index on datasets
    await datasetsCol.createIndex({ fileHash: 1 });
    await datasetsCol.createIndex({ importedAt: -1 });

    // Compound unique index on rows to guarantee idempotency per dataset row
    await rowsCol.createIndex({ datasetId: 1, rowNumber: 1 }, { unique: true });
    console.log('✅ [MongoDB] Index de base initialisés avec succès ({ datasetId: 1, rowNumber: 1 }).');
  } catch (err: any) {
    console.warn('⚠️ [MongoDB] Avertissement lors de la création des index de base:', err?.message);
  }
}

/**
 * Cleanup datasets left in PROCESSING for more than 1 hour on startup
 */
export async function cleanupStuckProcessingDatasets(): Promise<void> {
  if (!db) return;
  try {
    const datasetsCol = db.collection<DatasetDocument>('datasets');
    const rowsCol = db.collection<RowDocument>('rows');

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const stuckDatasets = await datasetsCol
      .find({
        status: 'PROCESSING',
        importedAt: { $lt: oneHourAgo },
      })
      .toArray();

    if (stuckDatasets.length > 0) {
      console.log(`🧹 [Nettoyage] Détection de ${stuckDatasets.length} import(s) interrompu(s) (> 1 heure)...`);
      for (const stuck of stuckDatasets) {
        // Delete orphaned rows
        const deletedRows = await rowsCol.deleteMany({ datasetId: stuck._id });
        // Mark dataset as ERROR
        await datasetsCol.updateOne(
          { _id: stuck._id },
          {
            $set: {
              status: 'ERROR',
              errorMessage: `Import interrompu : délai de traitement dépassé (> 1 heure). ${deletedRows.deletedCount} lignes nettoyées.`,
            },
          }
        );
      }
      console.log(`✅ [Nettoyage] Nettoyage terminé pour ${stuckDatasets.length} import(s).`);
    }
  } catch (err: any) {
    console.warn('⚠️ [Nettoyage] Avertissement lors du nettoyage des imports interrompus:', err?.message);
  }
}

/**
 * Connects to MongoDB using official mongodb driver.
 * Strict mode: No fake in-memory fallback.
 */
export async function connectDB(): Promise<boolean> {
  const mongoUri = process.env.MONGODB_URI?.trim();

  if (!mongoUri) {
    isConnected = false;
    db = null;
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
      const maskedUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
      console.log(`🔄 [MongoDB] Connexion au serveur (${maskedUri}) - Base: ${DEFAULT_DB_NAME}...`);

      const newClient = new MongoClient(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });

      await newClient.connect();
      // Test ping
      await newClient.db(DEFAULT_DB_NAME).command({ ping: 1 });

      client = newClient;
      db = client.db(DEFAULT_DB_NAME);
      isConnected = true;

      console.log(`✅ [MongoDB] Connecté avec succès via le driver officiel "mongodb" (Base: "${DEFAULT_DB_NAME}")`);

      // Initialize base indexes & cleanup interrupted imports
      await initializeDatabaseIndexes();
      await cleanupStuckProcessingDatasets();

      return true;
    } catch (error: any) {
      console.warn(`❌ [MongoDB] Impossible de joindre MongoDB (${error?.message || 'Erreur réseau'}).`);
      isConnected = false;
      db = null;
      if (client) {
        try {
          await client.close();
        } catch {
          // ignore
        }
        client = null;
      }
      return false;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

/**
 * Dynamically test and reconnect with a user-provided MongoDB URI
 */
export async function reconnectWithUri(newUri: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!newUri || typeof newUri !== 'string') {
      return { success: false, message: 'URI de connexion invalide.' };
    }

    const testClient = new MongoClient(newUri.trim(), {
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000,
    });

    await testClient.connect();
    await testClient.db(DEFAULT_DB_NAME).command({ ping: 1 });

    // Disconnect old client if present
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
      // Ignored if file write restricted
    }

    await initializeDatabaseIndexes();
    await cleanupStuckProcessingDatasets();

    return {
      success: true,
      message: `Connexion établie avec succès à la base "${DEFAULT_DB_NAME}" !`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Impossible de joindre le serveur MongoDB avec cette URI.',
    };
  }
}

/**
 * Returns real database connectivity and server information (strictly without fake success)
 */
export function getDatabaseInfo() {
  const mongoUri = process.env.MONGODB_URI?.trim();
  let hostDisplay = 'Non configuré';
  let clusterDisplay = 'Aucun';

  if (mongoUri) {
    try {
      if (mongoUri.includes('mongodb+srv://')) {
        clusterDisplay = 'MongoDB Atlas';
        hostDisplay = mongoUri.split('@')[1]?.split('/')[0] || 'Cluster Atlas';
      } else {
        clusterDisplay = 'MongoDB Distant';
        hostDisplay = mongoUri.split('@').pop()?.split('/')[0] || 'Serveur distant';
      }
    } catch {
      hostDisplay = 'URI personnalisée';
    }
  }

  return {
    databaseName: DEFAULT_DB_NAME,
    host: hostDisplay,
    cluster: clusterDisplay,
    edition: isConnected ? 'MongoDB (Driver officiel actif)' : 'Déconnecté (En attente de connexion)',
    connected: isConnected,
    hasCustomUri: !!mongoUri,
  };
}
