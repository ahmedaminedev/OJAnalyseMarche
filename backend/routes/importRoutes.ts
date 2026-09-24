import { Router } from 'express';
import {
  initImport,
  uploadChunk,
  finalizeImport,
  cancelImport,
  testConnection,
  getImports,
  getImportById,
  deleteImport,
  getImportsStats,
} from '../controllers/importController';

const router = Router();

// Batch Import Flow
router.post('/init', initImport);
router.post('/:id/chunks', uploadChunk);
router.post('/:id/finalize', finalizeImport);
router.post('/:id/cancel', cancelImport);
router.post('/test-connection', testConnection);

// Overview & Data Queries
router.get('/stats/overview', getImportsStats);
router.get('/', getImports);
router.get('/:id', getImportById);
router.delete('/:id', deleteImport);

export default router;
