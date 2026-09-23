import { Router } from 'express';
import { getMarketStats, generateMarketInsights } from '../controllers/marketStatsController';

const router = Router();

router.get('/', getMarketStats);
router.post('/insights', generateMarketInsights);

export default router;
