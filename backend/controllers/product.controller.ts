import { Response } from 'express';
import { BlingRequest } from '../middleware/auth.middleware';
import { ProductRepository } from '../repositories/product.repository';
import { BlingService } from '../services/bling.service';
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

  /**
   * POST /api/products/update
   * Updates all editable metadata fields of a product, and optionally sets stock balance
   */
  public static async updateProduct(req: BlingRequest, res: Response) {
    try {
      const token = req.blingToken!;
      const { 
        idProduto, 
        nome, 
        codigo, 
        preco, 
        precoCusto, 
        tipo, 
        situacao, 
        formato, 
        descricaoCurta, 
        imagemURL, 
        pesoLiquido, 
        pesoBruto, 
        unidade, 
        marca, 
        gtin, 
        localizacao, 
        dimensoes, 
        estoqueValue 
      } = req.body;

      if (!idProduto) {
        return res.status(400).json({ error: 'O idProduto é um campo obrigatório.' });
      }
      if (!nome) {
        return res.status(400).json({ error: 'O nome do produto é obrigatório.' });
      }

      logger.log('info', `Atualizando produto ID ${idProduto} com novos metadados...`);

      // 1. Update Core Product Metadata via Bling API Product Repository
      const updatePayload: any = {
        idProduto: Number(idProduto),
        nome: String(nome),
        tipo: tipo ? String(tipo) : undefined,
        situacao: situacao ? String(situacao) : undefined,
        formato: formato ? String(formato) : undefined,
      };

      if (codigo !== undefined) updatePayload.codigo = String(codigo);
      if (preco !== undefined) updatePayload.preco = Number(preco);
      if (precoCusto !== undefined) updatePayload.precoCusto = Number(precoCusto);
      if (descricaoCurta !== undefined) updatePayload.descricaoCurta = String(descricaoCurta);
      if (imagemURL !== undefined) updatePayload.imagemURL = String(imagemURL);
      if (pesoLiquido !== undefined) updatePayload.pesoLiquido = Number(pesoLiquido);
      if (pesoBruto !== undefined) updatePayload.pesoBruto = Number(pesoBruto);
      if (unidade !== undefined) updatePayload.unidade = String(unidade);
      if (marca !== undefined) updatePayload.marca = String(marca);
      if (gtin !== undefined) updatePayload.gtin = String(gtin);
      if (localizacao !== undefined) updatePayload.localizacao = String(localizacao);
      if (dimensoes !== undefined) updatePayload.dimensoes = dimensoes;

      const metadataResult = await ProductRepository.updateProduct(token, updatePayload);

      // 2. Optionally align stock levels if provided
      let stockResult = null;
      if (estoqueValue !== undefined && !isNaN(Number(estoqueValue))) {
        const qty = Number(estoqueValue);
        if (qty >= 0) {
          logger.log('info', `Alinhando estoque do produto ID ${idProduto} para saldo ${qty}...`);
          stockResult = await ProductRepository.updateStock(token, Number(idProduto), qty);
        }
      }

      logger.log('success', `Produto ID ${idProduto} updated with complete success.`);

      // Invalidate caches to guarantee lists refresh nicely
      productsCache.delete(token);
      statsCache.delete(token);

      return res.json({ 
        ok: true, 
        metadataResult, 
        stockResult 
      });
    } catch (error: any) {
      return handleException(error, res, 'atualizar produto');
    }
  }

  /**
   * POST /api/products/create
   * Creates a new product and optionally adjust its stock level
   */
  public static async createProduct(req: BlingRequest, res: Response) {
    try {
      const token = req.blingToken!;
      const { 
        nome, 
        codigo, 
        preco, 
        precoCusto, 
        tipo, 
        situacao, 
        formato, 
        descricaoCurta, 
        descricaoComplementar,
        imagemURL, 
        imagens,
        pesoLiquido, 
        pesoBruto, 
        unidade, 
        marca, 
        gtin, 
        ncm,
        localizacao, 
        categoria, 
        estoqueInicial 
      } = req.body;

      if (!nome) {
        return res.status(400).json({ error: 'O nome do produto é obrigatório.' });
      }
      if (!codigo) {
        return res.status(400).json({ error: 'O SKU (código) do produto é obrigatório.' });
      }

      logger.log('info', `Iniciando criação de produto no Bling: SKU "${codigo}"...`);

      const createPayload: any = {
        nome: String(nome),
        codigo: String(codigo),
        tipo: tipo ? String(tipo) : undefined,
        situacao: situacao ? String(situacao) : undefined,
        formato: formato ? String(formato) : undefined,
        preco: preco !== undefined ? Number(preco) : 0,
        precoCusto: precoCusto !== undefined ? Number(precoCusto) : undefined,
        descricaoCurta: descricaoCurta ? String(descricaoCurta) : undefined,
        descricaoComplementar: descricaoComplementar ? String(descricaoComplementar) : undefined,
        imagemURL: imagemURL ? String(imagemURL) : undefined,
        imagens: imagens || undefined,
        pesoLiquido: pesoLiquido !== undefined ? Number(pesoLiquido) : undefined,
        pesoBruto: pesoBruto !== undefined ? Number(pesoBruto) : undefined,
        unidade: unidade ? String(unidade) : undefined,
        marca: marca ? String(marca) : undefined,
        gtin: gtin ? String(gtin) : undefined,
        ncm: ncm ? String(ncm) : undefined,
        localizacao: localizacao ? String(localizacao) : undefined,
        categoria: categoria || undefined
      };

      const createResult = await ProductRepository.createProduct(token, createPayload);
      const idProduto = createResult?.data?.id;

      let stockResult = null;
      if (idProduto && estoqueInicial !== undefined && !isNaN(Number(estoqueInicial))) {
        const qty = Number(estoqueInicial);
        if (qty >= 0) {
          logger.log('info', `Definindo estoque inicial de ${qty} para o produto criado ID ${idProduto}...`);
          try {
            stockResult = await ProductRepository.updateStock(token, Number(idProduto), qty);
          } catch (stErr: any) {
            logger.log('error', `Falha ao definir o estoque inicial do produto ${idProduto}: ${stErr.message}`);
          }
        }
      }

      logger.log('success', `Produto criado com êxito! SKU: ${codigo}, ID: ${idProduto}`);

      // Invalidate caches
      productsCache.delete(token);
      statsCache.delete(token);

      return res.json({
        ok: true,
        id: idProduto,
        nome,
        sku: codigo,
        createResult,
        stockResult
      });
    } catch (error: any) {
      return handleException(error, res, 'criar produto');
    }
  }

  /**
   * GET /api/products/check-sku/:sku
   * Verifies if a product with the given SKU already exists
   */
  public static async checkSku(req: BlingRequest, res: Response) {
    try {
      const token = req.blingToken!;
      const sku = req.params.sku;
      if (!sku) {
        return res.status(400).json({ error: 'O SKU é obrigatório.' });
      }

      logger.log('info', `Verificando SKU "${sku}" no Bling...`);

      const client = BlingService.getClient(token);
      let exists = false;
      let existingId: number | undefined = undefined;
      let existingName: string | undefined = undefined;
      
      try {
        const blingRes = await client.produtos.get({ limite: 5, codigo: [sku] } as any);
        const items = blingRes.data || [];
        const found = items.find((p: any) => String(p.codigo).toLowerCase() === sku.toLowerCase());
        if (found) {
          exists = true;
          existingId = found.id;
          existingName = found.nome;
        }
      } catch (e: any) {
        if (e?.status === 404 || e?.statusCode === 404) {
          exists = false;
        } else {
          throw e;
        }
      }

      return res.json({ exists, id: existingId, nome: existingName });
    } catch (error: any) {
      logger.log('error', `Falha ao verificar SKU "${req.params.sku}": ${error.message}`);
      return res.json({ exists: false, error: error.message });
    }
  }
}
