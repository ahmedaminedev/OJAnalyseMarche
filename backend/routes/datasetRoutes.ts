import { Router } from 'express';
import {
  getDatasets,
  getDatasetById,
  updateDataset,
  deleteDataset,
  getDatasetRows,
} from '../controllers/datasetController';
import {
  executeDatasetQuery,
  getDatasetFacets,
  getColumnValues,
  exportDatasetQuery,
} from '../controllers/queryController';

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

// --- GENERIC ANALYTICS ENGINE (Power BI style) ---

// POST /api/datasets/:id/query - Executes generic query (filter tree, groupBy, measures, sort, limit, share, compare)
router.post('/:id/query', executeDatasetQuery);

// GET & POST /api/datasets/:id/facets - Calculates cascading facets for dimensions & min/max for numbers/dates
router.get('/:id/facets', getDatasetFacets);
router.post('/:id/facets', getDatasetFacets);

// GET /api/datasets/:id/columns/:key/values - High-cardinality autocomplete with search
router.get('/:id/columns/:key/values', getColumnValues);

// POST /api/datasets/:id/export - Exports query results in streaming XLSX or CSV
router.post('/:id/export', exportDatasetQuery);

export default router;
