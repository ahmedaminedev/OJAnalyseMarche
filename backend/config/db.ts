import 'dotenv/config';
import mongoose from 'mongoose';

let isConnected = false;
export const DEFAULT_DB_NAME = process.env.MONGODB_DB_NAME?.trim() || 'omoda_jaecoo_stats_db';

/**
 * Connect to MongoDB.
 * If MONGODB_URI is provided in environment variables, connect to it.
 * Otherwise, log clearly that the cloud server is running with in-memory fallback
 * until a remote MongoDB URI (like MongoDB Atlas) or tunnel is configured.
 */
export async function connectDB(): Promise<boolean> {
  const mongoUri = process.env.MONGODB_URI?.trim();

  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  if (!mongoUri) {
    console.info(`ℹ️ [Backend DB] Aucune variable MONGODB_URI configurée. Le serveur utilise le stockage résilient en mémoire. Pour connecter votre base MongoDB distante ou Atlas, définissez MONGODB_URI.`);
    isConnected = false;
    return false;
  }

  try {
    const maskedUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`🔄 [Backend DB] Tentative de connexion à MongoDB (${maskedUri}) - Base: ${DEFAULT_DB_NAME}...`);
    await mongoose.connect(mongoUri, {
      dbName: DEFAULT_DB_NAME,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`✅ [Backend DB] Connecté avec succès à MongoDB sur la base "${DEFAULT_DB_NAME}"`);
    return true;
  } catch (error: any) {
    console.warn(`⚠️ [Backend DB] Impossible de joindre MongoDB (${error.message || error}). Basculement sur le cache résilient/mémoire.`);
    isConnected = false;
    return false;
  }
}

export function isMongoConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Reconnect to a specific MongoDB URI dynamically
 */
export async function reconnectWithUri(newUri: string): Promise<{ success: boolean; message: string }> {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    const maskedUri = newUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`🔄 [Backend DB] Test de reconnexion à MongoDB (${maskedUri}) - Base: ${DEFAULT_DB_NAME}...`);
    await mongoose.connect(newUri, {
      dbName: DEFAULT_DB_NAME,
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000,
    });
    isConnected = true;
    process.env.MONGODB_URI = newUri;
    return {
      success: true,
      message: `Connexion réussie à MongoDB sur la base "${DEFAULT_DB_NAME}" !`,
    };
  } catch (error: any) {
    isConnected = false;
    return {
      success: false,
      message: error?.message || 'Impossible de joindre le serveur MongoDB.',
    };
  }
}

export function getDatabaseInfo() {
  const mongoUri = process.env.MONGODB_URI?.trim();
  let hostDisplay = 'Non connecté (Stockage mémoire)';
  let clusterDisplay = 'Cache mémoire actif';

  if (mongoUri) {
    if (mongoUri.includes('mongodb+srv://')) {
      clusterDisplay = 'MongoDB Atlas';
      hostDisplay = mongoUri.split('@')[1]?.split('/')[0] || 'Cluster Atlas';
    } else {
      clusterDisplay = 'MongoDB Distant';
      hostDisplay = mongoUri.split('@').pop()?.split('/')[0] || 'Hôte distant';
    }
  }

  return {
    databaseName: DEFAULT_DB_NAME,
    host: hostDisplay,
    cluster: clusterDisplay,
    edition: isMongoConnected() ? 'Connecté' : 'Mode Mémoire (MongoDB déconnecté)',
    connected: isMongoConnected(),
    hasCustomUri: !!mongoUri,
  };
}

