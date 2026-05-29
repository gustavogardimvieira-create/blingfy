import { BlingService } from '../services/bling.service';
import { retryBlingCall } from '../utils/retry';
import { BlingProduct, DashboardStats } from '../../src/types';
import { logger } from '../services/logger.service';

export class ProductRepository {
  /**
   * Translates a raw Bling product to our app's defined BlingProduct interface
   */
  private static mapToBlingProduct(p: any): BlingProduct {
    const getProductCategory = (item: any) => {
      if (item.categoria) {
        if (typeof item.categoria === 'object') {
          return item.categoria.descricao || item.categoria.nome || `Cat ID: ${item.categoria.id}`;
        }
        return String(item.categoria);
      }
      
      const nomeUpper = (item.nome || '').toUpperCase();
      if (
        nomeUpper.includes('SHIRT') || 
        nomeUpper.includes('ROUPA') || 
        nomeUpper.includes('VESTIDO') || 
        nomeUpper.includes('TENIS') || 
        nomeUpper.includes('CALCA')
      ) return 'Moda & Vestuário';
      
      if (
        nomeUpper.includes('CABO') || 
        nomeUpper.includes('FONTE') || 
        nomeUpper.includes('CARREGADOR') || 
        nomeUpper.includes('FONE') || 
        nomeUpper.includes('USB') || 
        nomeUpper.includes('SMARTPHONE') || 
        nomeUpper.includes('TV')
      ) return 'Eletrônicos & Celulares';
      
      if (
        nomeUpper.includes('MESA') || 
        nomeUpper.includes('CADEIRA') || 
        nomeUpper.includes('SOFA') || 
        nomeUpper.includes('ARMARIO')
      ) return 'Móveis & Decoração';
      
      if (
        nomeUpper.includes('PRATO') || 
        nomeUpper.includes('COPO') || 
        nomeUpper.includes('PANELA')
      ) return 'Cozinha & Lar';
      
      return 'Geral';
    };

    return {
      id: p.id || 0,
      nome: p.nome,
      codigo: p.codigo || 'S/D',
      preco: p.preco || 0,
      precoCusto: p.precoCusto || 0,
      estoqueValue: p.estoque ? (p.estoque.saldoVirtualTotal ?? 0) : 0,
      tipo: p.tipo,
      situacao: p.situacao,
      formato: p.formato,
      descricaoCurta: p.descricaoCurta || '',
      imagemURL: p.imagemURL || '',
      categoria: getProductCategory(p)
    };
  }

  /**
   * Fetches, retries, and maps products for table view
   */
  public static async getProducts(
    token: string,
    page: number,
    limit: number,
    search?: string
  ): Promise<{ data: BlingProduct[]; total: number }> {
    const params: { pagina: number; limite: number; nome?: string } = {
      pagina: page,
      limite: limit
    };

    if (search) {
      params.nome = search;
    }

    const rawResponse = await retryBlingCall(() => 
      BlingService.getRawProducts(token, params)
    );

    const items = rawResponse.data || [];
    const mapped = items.map((item: any) => this.mapToBlingProduct(item));

    // Calculate actual total. If mapped items are fewer than limit, we reached the end
    const total = mapped.length < limit 
      ? (page - 1) * limit + mapped.length 
      : page * limit + 1; // correctly signals next page availability to frontend

    return { data: mapped, total };
  }

  /**
   * Updates product price securely with retry wrapping
   */
  public static async updatePrice(
    token: string,
    payload: {
      idProduto: number;
      nome: string;
      tipo?: string;
      situacao?: string;
      formato?: string;
      preco: number;
    }
  ) {
    return retryBlingCall(() =>
      BlingService.updateRawPrice(token, {
        idProduto: payload.idProduto,
        nome: payload.nome,
        tipo: payload.tipo || 'P',
        situacao: payload.situacao || 'A',
        formato: payload.formato || 'S',
        preco: payload.preco
      })
    );
  }

  /**
   * Connects to first available deposit and updates stock balance level (Balanço)
   */
  public static async updateStock(
    token: string,
    idProduto: number,
    quantidade: number
  ) {
    // 1. Fetch available physical deposits
    logger.log('info', 'Buscando depósitos de estoque ativos no Bling para ajuste...', { idProduto });
    const depositsResponse = await retryBlingCall(() => BlingService.getRawDeposits(token));
    const deposits = depositsResponse.data || [];

    if (deposits.length === 0) {
      throw new Error('Nenhum depósito cadastrado no Bling foi retornado para processar a operação.');
    }

    const mainDeposit = deposits[0];
    const depositId = mainDeposit.id;
    logger.log('info', `Utilizando depósito principal "${mainDeposit.descricao || 'Padrão'}" (ID: ${depositId}) para balanço.`, { depositId });

    // 2. Commit stock inventory alignment
    return retryBlingCall(() => 
      BlingService.adjustRawStock(token, {
        idProduto,
        depositId,
        quantidade
      })
    );
  }

  /**
   * Compiles dashboard stats using first 100 products
   */
  public static async getDashboardStats(token: string): Promise<DashboardStats> {
    logger.log('info', 'Buscando bloco de produtos (limite: 100) para calcular estatísticas sincronicamente...');
    const response = await retryBlingCall(() => BlingService.getRawProducts(token, { limite: 100 }));
    
    const items = response.data || [];
    const totalCount = items.length;
    let totalStock = 0;
    let outOfStockCount = 0;

    items.forEach((p: any) => {
      const stock = p.estoque ? (p.estoque.saldoVirtualTotal ?? 0) : 0;
      totalStock += stock;
      if (stock <= 0) {
        outOfStockCount++;
      }
    });

    return {
      totalCount,
      totalStock,
      outOfStockCount,
      lastUpdated: new Date().toLocaleTimeString('pt-BR'),
      isCached: false
    };
  }
}
