import { Router } from 'express';
import { executeMultiDatasetQuery } from '../controllers/queryController';

const router = Router();

// POST /api/query/multi - Multi-dataset comparison across confirmed semantic mappings
router.post('/multi', executeMultiDatasetQuery);

export default router;
