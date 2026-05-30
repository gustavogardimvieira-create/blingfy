export interface BlingProduct {
  id: number;
  nome: string;
  codigo?: string;
  preco?: number;
  precoCusto?: number;
  estoqueValue?: number;
  tipo: string;
  situacao: string;
  formato: string;
  descricaoCurta?: string;
  imagemURL?: string;
  categoria?: string;
  pesoLiquido?: number;
  pesoBruto?: number;
  unidade?: string;
  marca?: string;
  gtin?: string;
  ncm?: string;
  localizacao?: string;
  dimensoes?: {
    largura?: number;
    altura?: number;
    profundidade?: number;
    unidadeMedida?: number;
  };
}

export interface SystemLog {
  id: string;
  timestamp: string;
  type: 'error' | 'info' | 'success';
  message: string;
  details?: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface DashboardStats {
  totalCount: number;
  totalStock: number;
  outOfStockCount: number;
  lastUpdated: string;
  isCached: boolean;
}

export interface Deposit {
  id: number;
  descricao: string;
  situacao: number;
  padrao: boolean;
}
