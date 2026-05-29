import { Response } from 'express';
import { BlingRequest } from '../middleware/auth.middleware';
import { ProductRepository } from '../repositories/product.repository';
import { statsCache } from '../services/cache.service';
import { logger } from '../services/logger.service';
import { handleException } from '../utils/error-handler';

export class StatsController {
  /**
   * GET /api/stats
   * Gathers and aggregates real product metrics to populate dashboard widgets
   */
  public static async getStats(req: BlingRequest, res: Response) {
    try {
      const token = req.blingToken!;

      // Check stats cache first to avoid repetitive API requests and respect rate limits
      const cachedStats = statsCache.get(token);
      if (cachedStats) {
        logger.log('info', 'Estatísticas do dashboard retornadas do cache local (snappy load).');
        return res.json({
          ...cachedStats,
          isCached: true
        });
      }

      logger.log('info', 'Buscando métricas operacionais para o Dashboard...');
      
      const stats = await ProductRepository.getDashboardStats(token);

      // Cache the statistics outcome
      statsCache.set(token, stats);

      logger.log('success', 'Estatísticas do dashboard calculadas com sucesso.', stats);
      
      return res.json(stats);
    } catch (error: any) {
      return handleException(error, res, 'carregar métricas do dashboard');
    }
  }
}
