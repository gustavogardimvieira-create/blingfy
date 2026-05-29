import { Request, Response, NextFunction } from 'express';

const ipRequests = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 60000; // 1 minute
const MAX_LIMIT = 120; // 120 requests/min is SaaS standard and robust

/**
 * Lightweight, zero-dependency, in-memory IP Rate Limiter
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let clientRecord = ipRequests.get(ip);
  
  if (!clientRecord || now > clientRecord.resetTime) {
    clientRecord = {
      count: 1,
      resetTime: now + WINDOW_MS
    };
    ipRequests.set(ip, clientRecord);
    return next();
  }

  clientRecord.count++;
  if (clientRecord.count > MAX_LIMIT) {
    console.warn(`[Rate Limiter Blocked] Blocked IP: ${ip} (Requests: ${clientRecord.count}/${MAX_LIMIT} per min)`);
    return res.status(429).json({
      error: 'Limite de requisições excedido',
      details: 'Muitas solicitações detectadas a partir deste IP. Por favor, aguarde um minuto e tente novamente.'
    });
  }

  next();
}
