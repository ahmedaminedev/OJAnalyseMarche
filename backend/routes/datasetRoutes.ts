import { Router } from 'express';
import {
  getDatasets,
  getDatasetById,
  updateDataset,
  deleteDataset,
  getDatasetRows,
} from '../controllers/datasetController';

const router = Router();

// GET /api/datasets - List of datasets (light projection)
router.get('/', getDatasets);

// GET /api/datasets/:id - Detailed metadata & columns
router.get('/:id', getDatasetById);

// PATCH /api/datasets/:id - Rename, modify mapping or column role/label
router.patch('/:id', updateDataset);

// DELETE /api/datasets/:id - Delete dataset and all its rows
router.delete('/:id', deleteDataset);

// GET /api/datasets/:id/rows - Paginated rows retrieval (max pageSize 200)
router.get('/:id/rows', getDatasetRows);

export default router;
