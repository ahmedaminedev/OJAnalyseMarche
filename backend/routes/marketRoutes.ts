import { Router } from 'express';
import {
  getMarketStats,
  generateMarketInsights,
  getSchemaAnalysis,
  getSearchSuggestions,
} from '../controllers/marketStatsController';

const router = Router();

router.get('/', getMarketStats);
router.get('/suggestions', getSearchSuggestions);
router.get('/schema-analysis', getSchemaAnalysis);
router.post('/insights', generateMarketInsights);

export default router;

