import { Router } from 'express';
import {
  getImports,
  getImportById,
  createImport,
  deleteImport,
  getImportsStats,
  updateImportStatus,
  testMongoConnection,
} from '../controllers/importController';
import { validateImportPayload } from '../middleware/validation';

const router = Router();

// Routes
router.get('/stats/overview', getImportsStats);
router.post('/test-connection', testMongoConnection);
router.get('/', getImports);
router.get('/:id', getImportById);
router.post('/', validateImportPayload, createImport);
router.patch('/:id/status', updateImportStatus);
router.delete('/:id', deleteImport);

export default router;

