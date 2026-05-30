import { Response } from 'express';
import { logger } from '../services/logger.service';

/**
 * Normalizer and standardizer for Bling and system-wide Express exceptions.
 * Prevents response data leaking while supplying precise debugging feedback to UI logs.
 */
export function handleException(error: any, res: Response, context: string) {
  console.error(`[Error Context: ${context}]`, error);
  
  const errMsg = error.message || 'Erro de comunicação com a API do Bling';
  let detailsObj: any = null;

  // Bling API returns detailed error payloads inside error.response.error
  if (error.response && error.response.error) {
    detailsObj = error.response.error;
    const desc = detailsObj.description || detailsObj.message || '';
    
    logger.log('error', `Bling API Exception em [${context}]: ${errMsg}`, {
      context,
      error: detailsObj,
      description: desc
    });
  } else {
    // General connection timeouts or other network level/logic faults
    logger.log('error', `Falha de Sistema em [${context}]: ${errMsg}`, error.stack || error);
  }

  const rawErrStr = (
    (error.message || '') + ' ' + 
    (error.response ? JSON.stringify(error.response) : '')
  ).toLowerCase();

  const isTokenError = rawErrStr.includes('access token') || 
                       rawErrStr.includes('token provided') || 
                       rawErrStr.includes('invalid or expired') || 
                       rawErrStr.includes('expired or invalid') ||
                       rawErrStr.includes('token inválido') ||
                       rawErrStr.includes('token expirado') ||
                       rawErrStr.includes('não autorizado') ||
                       rawErrStr.includes('unauthorized') ||
                       rawErrStr.includes('forbidden') ||
                       error.status === 401 ||
                       error.response?.status === 401;

  let statusCode = error.response ? 400 : 500;
  if (isTokenError) {
    statusCode = 401;
  }
  
  return res.status(statusCode).json({
    error: errMsg,
    details: detailsObj || error.toString()
  });
}
