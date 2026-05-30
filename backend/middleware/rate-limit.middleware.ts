import rateLimit from 'express-rate-limit';

/**
 * Enterprise implementation of rate-limiting using the industry-standard `express-rate-limit` package.
 */
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests/minute
  standardHeaders: true, // Return rate limit info in standard headers
  legacyHeaders: false, // Hide legacy headers
  message: {
    error: 'Limite de requisições excedido',
    details: 'Muitas solicitações serão bloqueadas temporariamente para evitar sobrecarga. Por favor, aguarde e tente novamente em breve.'
  }
});

