import { Request, Response } from 'express';
import { logger } from '../services/logger.service';

export class LogController {
  /**
   * GET /api/logs
   * Fetches real-time log history to display on UI panels
   */
  public static getLogs(req: Request, res: Response) {
    const data = logger.getLogs();
    return res.json(data);
  }

  /**
   * POST /api/logs/clear
   * Flush all logs and append clear audit log
   */
  public static clearLogs(req: Request, res: Response) {
    logger.clearLogs();
    return res.json({ ok: true });
  }
}
