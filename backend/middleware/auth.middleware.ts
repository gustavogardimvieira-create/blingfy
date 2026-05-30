import { Request, Response, NextFunction } from 'express';

/**
 * Custom Extended Request context to house sanitized Bling Token values
 */
export interface BlingRequest extends Request {
  blingToken?: string;
}

/**
 * Central Authorization Middleware to validate and sanitize standard Bearer OAuth credentials
 */
export function validateBlingToken(
  req: BlingRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      error: 'Acesso Não Autorizado',
      details: 'Nenhum accessToken do Bling foi fornecido no cabeçalho Authorization.'
    });
  }

  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  if (!token) {
    return res.status(401).json({
      error: 'Token Inválido',
      details: 'Token de acesso do Bling está vazio ou formatado incorretamente.'
    });
  }

  // Token sanitization: prevent header injection or shell escapes by discarding malicious chars
  const safeTokenRegex = /^[a-zA-Z0-9_\-\.\/\|\+:=]+$/;
  if (!safeTokenRegex.test(token)) {
    return res.status(400).json({
      error: 'Formato de Token Inseguro',
      details: 'O token fornecido contém caracteres ilegais ou suspeitos.'
    });
  }

  // Inject sanitized token into Request context
  req.blingToken = token;
  next();
}
