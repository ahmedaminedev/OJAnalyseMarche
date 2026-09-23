import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { connectDB, isMongoConnected, getDatabaseInfo, DEFAULT_DB_NAME } from './config/db';
import importRoutes from './routes/importRoutes';
import marketRoutes from './routes/marketRoutes';
import { seedInitialDataIfNeeded } from './data/seedMarketData';

dotenv.config();

function getPort(): number {
  // 1. CLI argument (--port 3000 used by AI Studio preview container)
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const parsed = Number(process.argv[portArgIdx + 1]);
    if (!isNaN(parsed)) return parsed;
  }

  // 2. Explicit PORT in .env (if set to 3001)
  if (process.env.PORT) {
    const envPort = Number(process.env.PORT);
    if (!isNaN(envPort) && envPort !== 8080) {
      return envPort;
    }
  }

  // 3. Default port: 3001 (freeing 3000 for user's other apps)
  return 3001;
}

export async function startServer() {
  const app = express();
  const PORT = getPort();

  // Middlewares
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Safe MongoDB connection in background
  connectDB()
    .then(() => {
      seedInitialDataIfNeeded();
    })
    .catch((err) => {
      console.warn('MongoDB connection warning:', err);
    });

  // Health route
  app.get('/api/health', (_req, res) => {
    const dbInfo = getDatabaseInfo();
    res.json({
      status: 'ok',
      service: 'OMODA | JAECOO Backend API',
      database: {
        name: DEFAULT_DB_NAME,
        host: dbInfo.host,
        cluster: dbInfo.cluster,
        edition: dbInfo.edition,
        connected: isMongoConnected(),
        status: isMongoConnected() ? 'Connecté' : 'Mode Fallback Mémoire (Serveur prêt)',
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Import API Routes
  app.use('/api/imports', importRoutes);
  app.use('/api/market-stats', marketRoutes);

  // Vite middleware in development vs Static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
    console.log(`🚗 OMODA | JAECOO STATS - Serveur Unique Actif`);
    console.log(`========================================================================`);
    console.log(`⚙️  [1/2] Backend API Node.js / Express : http://localhost:${PORT}/api`);
    console.log(`🍃  [BDD] Base de données MongoDB       : ${DEFAULT_DB_NAME}`);
    console.log(`💻  [2/2] Frontend React / Vite (SPA)   : http://localhost:${PORT}`);
    console.log(`========================================================================\n`);
  });
}

startServer();
