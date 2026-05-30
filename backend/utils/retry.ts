import { logger } from '../services/logger.service';

/**
 * Custom retry mechanism for Bling API v3
 * Retries on HTTP 429 (Rate Limits) and general network / connection timeouts.
 * Ignores API logical errors (400 bad requests, etc.) to optimize execution time.
 */
export async function retryBlingCall<T>(
  fn: () => Promise<T>,
  retries = 3,
  initialDelayMs = 1500,
  factor = 2
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      if (attempt > retries) {
        throw error;
      }

      const status = error.response?.status || error.status;
      const errorCode = error.code || '';
      
      const errMsg = error.message || '';
      const errRespStr = error.response ? JSON.stringify(error.response) : '';
      const errorCombined = (errMsg + ' ' + errRespStr).toLowerCase();

      // Check if this is an authentication/token issue
      const isTokenError = errorCombined.includes('access token') || 
                           errorCombined.includes('token provided') || 
                           errorCombined.includes('invalid or expired') || 
                           errorCombined.includes('expired or invalid') ||
                           errorCombined.includes('token inválido') ||
                           errorCombined.includes('token expirado') ||
                           errorCombined.includes('não autorizado') ||
                           errorCombined.includes('unauthorized') ||
                           errorCombined.includes('forbidden') ||
                           status === 401 ||
                           status === 403;

      // Check for rate limit indicators in status, message, or response
      const isRateLimit = status === 429 || 
                          errorCombined.includes('limite') || 
                          errorCombined.includes('requisições') || 
                          errorCombined.includes('exceeded') ||
                          errorCombined.includes('429');

      // Check for common connection/network transient errors
      const isNetworkError = !isTokenError && (
                               !status || 
                               [502, 503, 504].includes(status) ||
                               ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND', 'EAI_AGAIN'].includes(errorCode) ||
                               errorCombined.includes('network error') ||
                               errorCombined.includes('timeout')
                             );

      const shouldRetry = (isRateLimit || isNetworkError) && !isTokenError;

      if (!shouldRetry) {
        // Immediate rejection for authentication, authorization, or malformed payloads
        throw error;
      }

      const delay = initialDelayMs * Math.pow(factor, attempt - 1);
      
      console.warn(`[Bling Retry] Attempt ${attempt} failed. Retrying in ${delay}ms... (ErrorCode: ${errorCode}, Status: ${status})`);
      logger.log(
        'info',
        `Tentativa ${attempt} falhou. Limite ou rede instável. Retentando em ${delay}ms...`,
        { errorCode, status, error: errMsg, retriesLeft: retries - attempt }
      );
      
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
