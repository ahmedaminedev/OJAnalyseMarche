import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  connectDB,
  isMongoConnected,
  getDatabaseInfo,
  DEFAULT_DB_NAME,
} from './config/db';
import datasetRoutes from './routes/datasetRoutes';
import importRoutes from './routes/importRoutes';
import marketRoutes from './routes/marketRoutes';
import assistantRoutes from './routes/assistantRoutes';
import queryRoutes from './routes/queryRoutes';
import { cleanupLegacyDefaultData } from './data/seedMarketData';

dotenv.config();

function getPort(): number {
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const parsed = Number(process.argv[portArgIdx + 1]);
    if (!isNaN(parsed)) return parsed;
  }

  if (process.env.PORT) {
    const envPort = Number(process.env.PORT);
    if (!isNaN(envPort) && envPort !== 8080) {
      return envPort;
    }
  }

  return 3000;
}

export async function startServer() {
  const app = express();
  const PORT = getPort();

  // Middlewares: JSON limit 10MB for chunk uploads
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Connect to MongoDB on startup
  connectDB()
    .then((connected) => {
      if (connected) {
        cleanupLegacyDefaultData();
      }
    })
    .catch((err) => {
      console.warn('MongoDB connection error:', err?.message || err);
    });

  // Health route - Real database status
  app.get('/api/health', (_req, res) => {
    const dbInfo = getDatabaseInfo();
    const connected = isMongoConnected();
    res.json({
      status: connected ? 'ok' : 'degraded',
      service: 'OMODA | JAECOO Backend API',
      database: dbInfo,
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/api/datasets', datasetRoutes);
  app.use('/api/query', queryRoutes);
  app.use('/api/imports', importRoutes);
  app.use('/api/market-stats', marketRoutes);
  app.use('/api/assistant', assistantRoutes);

  // Database error handling middleware - Strict HTTP 503 on database disconnection
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (
      err.status === 503 ||
      err.statusCode === 503 ||
      err.name === 'MongoServerSelectionError' ||
      err.name === 'MongoNetworkError' ||
      err.name === 'MongoTimeoutError' ||
      err.name === 'MongoNotConnectedError'
    ) {
      console.warn('⚠️ [MongoDB Error Handler]:', err.message);
      return res.status(503).json({
        error: 'Service non disponible : la base de données MongoDB est injoignable ou non connectée.',
        code: 'DATABASE_OFFLINE',
        details: err.message,
      });
    }
    next(err);
  });

  // Explicit JSON 404 for unhandled API routes (prevents Vite SPA fallback from returning HTML)
  app.all('/api/*', (_req, res) => {
    res.status(404).json({
      error: 'Route API introuvable',
      code: 'API_ROUTE_NOT_FOUND',
    });
  });

  // Vite middleware in development vs Static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n========================================================================`);
    console.log(`🚗 OMODA | JAECOO STATS - Moteur d'Analyse Universel`);
    console.log(`========================================================================`);
    console.log(`⚙️  [1/2] Backend API Node.js / Express : http://localhost:${PORT}/api`);
    console.log(`🍃  [BDD] Driver MongoDB Officiel       : Base "${DEFAULT_DB_NAME}"`);
    console.log(`💻  [2/2] Frontend React / Vite (SPA)   : http://localhost:${PORT}`);
    console.log(`========================================================================\n`);
  });
}

startServer();
