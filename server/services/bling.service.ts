import BlingClass from 'bling-erp-api';

const Bling = (BlingClass as any).default || BlingClass;
type BlingInstanceType = InstanceType<typeof BlingClass>;

export class BlingService {
  /**
   * Generates localized instance of Bling Client V3 in a lazy way
   */
  public static getClient(token: string): BlingInstanceType {
    if (!token) {
      throw new Error('Formato ou conteúdo de token inválido.');
    }
    return new Bling(token);
  }

  /**
   * Gets raw products from Bling ERP API v3
   */
  public static async getRawProducts(
    token: string,
    params: { pagina?: number; limite?: number; nome?: string }
  ) {
    const client = this.getClient(token);
    return client.produtos.get(params);
  }

  /**
   * Updates raw product prices on Bling ERP API v3
   */
  public static async updateRawPrice(
    token: string,
    payload: {
      idProduto: number;
      nome: string;
      tipo: string;
      situacao: string;
      formato: string;
      preco: number;
    }
  ) {
    const client = this.getClient(token);
    return client.produtos.update(payload as any);
  }

  /**
   * Fetches registered active stock deposits from Bling ERP API v3
   */
  public static async getRawDeposits(token: string) {
    const client = this.getClient(token);
    return client.depositos.get();
  }

  /**
   * Balances absolute stock levels on Bling ERP API v3
   */
  public static async adjustRawStock(
    token: string,
    payload: {
      idProduto: number;
      depositId: number;
      quantidade: number;
    }
  ) {
    const client = this.getClient(token);
    return client.estoques.create({
      produto: { id: payload.idProduto },
      deposito: { id: payload.depositId },
      operacao: 'B',
      quantidade: payload.quantidade,
      observacoes: 'Ajuste de estoque feito via Gerenciador de Produtos Bling v3'
    });
  }
}
