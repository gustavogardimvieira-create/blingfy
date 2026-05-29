import { Router } from 'express';
import { LogController } from '../controllers/log.controller';
import { ProductController } from '../controllers/product.controller';
import { StatsController } from '../controllers/stats.controller';
import { validateBlingToken } from '../middleware/auth.middleware';

const router = Router();

// ==========================================
// SYSTEM LOGS OPERATIONS
// ==========================================
router.get('/logs', LogController.getLogs);
router.post('/logs/clear', LogController.clearLogs);

// ==========================================
// ACCESS TOKEN CREDENTIAL VALIDATION
// ==========================================
router.post('/check-token', validateBlingToken as any, ProductController.checkToken as any);

// ==========================================
// PRODUCT & PRICES INVENTORY MUTATIONS
// ==========================================
router.get('/products', validateBlingToken as any, ProductController.getProducts as any);
router.post('/products/update-price', validateBlingToken as any, ProductController.updatePrice as any);
router.post('/products/update-stock', validateBlingToken as any, ProductController.updateStock as any);

// ==========================================
// METRICS ANALYTICS AGGREGATIONS
// ==========================================
router.get('/stats', validateBlingToken as any, StatsController.getStats as any);

export default router;
