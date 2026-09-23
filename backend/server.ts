import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { connectDB, isMongoConnected, getDatabaseInfo, DEFAULT_DB_NAME } from './config/db';
import importRoutes from './routes/importRoutes';

dotenv.config();

export async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Safe MongoDB connection in background
  connectDB().catch((err) => {
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
    console.log(`🚀 [Backend Node.js] Serveur OMODA | JAECOO actif sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
