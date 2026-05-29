import { Response } from 'express';
import { BlingRequest } from '../middleware/auth.middleware';
import { ProductRepository } from '../repositories/product.repository';
import { productsCache, statsCache } from '../services/cache.service';
import { logger } from '../services/logger.service';
import { handleException } from '../utils/error-handler';

export class ProductController {
  /**
   * POST /api/check-token
   * Validates Bling API access token credentials by querying a single product
   */
  public static async checkToken(req: BlingRequest, res: Response) {
    try {
      const token = req.blingToken!;
      logger.log('info', 'Iniciando validação de token de acesso com o Bling...');
      
      const result = await ProductRepository.getProducts(token, 1, 1);
      
      logger.log('success', 'Token de acesso validado com êxito.', { 
        count: result.data ? result.data.length : 0 
      });
      
      return res.json({ ok: true, message: 'Bling conectado com sucesso.' });
    } catch (error: any) {
      return handleException(error, res, 'validação de token');
    }
  }

  /**
   * GET /api/products
   * Fetches paginated products list with keyword searching, optional server caching
   */
  public static async getProducts(req: BlingRequest, res: Response) {
    try {
      const token = req.blingToken!;
      
      // Sanitization & Parsing
      const pageRaw = parseInt(req.query.page as string || '1', 10);
      const limitRaw = parseInt(req.query.limit as string || '10', 10);
      
      const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
      const limit = isNaN(limitRaw) || limitRaw < 1 || limitRaw > 100 ? 10 : limitRaw;
      
      const search = String(req.query.search || '').trim();
      const useCache = req.query.cache !== 'false';

      logger.log('info', `Buscando produtos do Bling (Pág: ${page}, Limite: ${limit}, Busca: "${search}")`);

      // Snappy cache read for first page lists without active filter searches
      if (useCache && !search && page === 1) {
        const cached = productsCache.get(token);
        if (cached) {
          logger.log('info', 'Produtos retornados do cache local (snappy load).');
          return res.json({
            data: cached.slice(0, limit),
            total: cached.length,
            page,
            limit,
            cached: true
          });
        }
      }

      // Fetch from API via Repository
      const { data, total } = await ProductRepository.getProducts(token, page, limit, search);

      // Cache mapping results on pristine first page reads
      if (!search && page === 1) {
        productsCache.set(token, data);
      }

      return res.json({
        data,
        total,
        page,
        limit,
        cached: false
      });
    } catch (error: any) {
      return handleException(error, res, 'lista de produtos');
    }
  }

  /**
   * POST /api/products/update-price
   * Rewrites current price list on a product ID
   */
  public static async updatePrice(req: BlingRequest, res: Response) {
    try {
      const token = req.blingToken!;
      const { idProduto, nome, tipo, situacao, formato, preco } = req.body;

      if (!idProduto) {
        return res.status(400).json({ error: 'O idProduto é um campo obrigatório.' });
      }
      if (!nome) {
        return res.status(400).json({ error: 'O nome do produto é obrigatório para atualização de preço.' });
      }
      if (preco === undefined || isNaN(Number(preco))) {
        return res.status(400).json({ error: 'Preço inválido ou ausente.' });
      }

      const parsedPrice = Number(preco);
      if (parsedPrice < 0) {
        return res.status(400).json({ error: 'O valor do preço não pode ser negativo.' });
      }

      logger.log('info', `Atualizando preço do produto ID ${idProduto} para R$ ${parsedPrice}`);

      const result = await ProductRepository.updatePrice(token, {
        idProduto: Number(idProduto),
        nome: String(nome),
        tipo: tipo ? String(tipo) : undefined,
        situacao: situacao ? String(situacao) : undefined,
        formato: formato ? String(formato) : undefined,
        preco: parsedPrice
      });

      logger.log('success', `Preço do produto ID ${idProduto} atualizado com êxito.`);
      
      // Invalidate caches to guarantee list consistency
      productsCache.delete(token);
      statsCache.delete(token);

      return res.json({ ok: true, result });
    } catch (error: any) {
      return handleException(error, res, 'atualizar preço do produto');
    }
  }

  /**
   * POST /api/products/update-stock
   * Rewrites absolute virtual balance (Balanço) of standard products
   */
  public static async updateStock(req: BlingRequest, res: Response) {
    try {
      const token = req.blingToken!;
      const { idProduto, quantidade } = req.body;

      if (!idProduto) {
        return res.status(400).json({ error: 'O idProduto é obrigatório.' });
      }
      if (quantidade === undefined || isNaN(Number(quantidade))) {
        return res.status(400).json({ error: 'Quantidade de estoque inválida ou em falta.' });
      }

      const parsedQty = Number(quantidade);
      if (parsedQty < 0) {
        return res.status(400).json({ error: 'A quantidade de estoque não pode ser negativa.' });
      }

      logger.log('info', `Iniciando atualização de estoque do produto ID ${idProduto} para saldo ${parsedQty}`);

      const result = await ProductRepository.updateStock(token, Number(idProduto), parsedQty);

      logger.log('success', `Estoque do produto ID ${idProduto} atualizado com êxito para saldo ${parsedQty}.`);
      
      // Prune caches to prevent stale items showing up on dashboard refresh
      productsCache.delete(token);
      statsCache.delete(token);

      return res.json({ ok: true, result });
    } catch (error: any) {
      return handleException(error, res, 'atualizar estoque');
    }
  }
}
