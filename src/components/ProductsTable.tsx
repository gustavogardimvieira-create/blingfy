import React, { useMemo } from 'react';
import { 
  Search, Filter, Sliders, RefreshCw, Download, Box, ArrowUpDown, ArrowLeft, ArrowRight 
} from 'lucide-react';
import { BlingProduct } from '../types';

interface ProductsTableProps {
  products: BlingProduct[];
  loadingProducts: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  availableCategories: string[];
  stockFilter: 'all' | 'low' | 'out';
  setStockFilter: (val: 'all' | 'low' | 'out') => void;
  autoRefreshStock: boolean;
  setAutoRefreshStock: (val: boolean) => void;
  loadProducts: () => Promise<void>;
  loadStats: () => Promise<void>;
  exportToCSV: () => void;
  isCompact: boolean;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalProducts: number;
  limit: number;
  setUseCache: (val: boolean) => void;
  handleSort: (field: 'id' | 'nome' | 'preco' | 'estoqueValue' | 'codigo') => void;
  sortField: 'id' | 'nome' | 'preco' | 'estoqueValue' | 'codigo' | null;
  sortOrder: 'asc' | 'desc';
  setEditingPriceProduct: (p: BlingProduct) => void;
  setNewPrice: (val: string) => void;
  setEditingStockProduct: (p: BlingProduct) => void;
  setNewStock: (val: string) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  theme: 'light' | 'dark';
}

const TableRowSkeleton = () => (
  <tr className="animate-pulse border-b border-slate-100 dark:border-slate-800/60 bg-transparent">
    <td className="py-3.5 px-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16"></div></td>
    <td className="py-3.5 px-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        <div className="space-y-1.5 flex-grow">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-36"></div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800/80 rounded w-16"></div>
        </div>
      </div>
    </td>
    <td className="py-3.5 px-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12 ml-auto"></div></td>
    <td className="py-3.5 px-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-8 mx-auto"></div></td>
    <td className="py-3.5 px-4"><div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-16 mx-auto"></div></td>
    <td className="py-3.5 px-4"><div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-20 mx-auto"></div></td>
  </tr>
);

export default function ProductsTable({
  products,
  loadingProducts,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  availableCategories,
  stockFilter,
  setStockFilter,
  autoRefreshStock,
  setAutoRefreshStock,
  loadProducts,
  loadStats,
  exportToCSV,
  isCompact,
  currentPage,
  setCurrentPage,
  totalProducts,
  limit,
  setUseCache,
  handleSort,
  sortField,
  sortOrder,
  setEditingPriceProduct,
  setNewPrice,
  setEditingStockProduct,
  setNewStock,
  addToast,
  theme
}: ProductsTableProps) {

  // Unified data pipeline: filter, search, sort, and paginate
  const processedProducts = useMemo(() => {
    let list = [...products];

    // 1. Client-side Search Query filter (as a robust fallback/instant filter)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(p => 
        p.nome.toLowerCase().includes(query) || 
        (p.codigo && p.codigo.toLowerCase().includes(query)) ||
        p.id.toString().includes(query)
      );
    }

    // 2. Filter by category
    if (selectedCategory !== 'Todas') {
      list = list.filter(p => p.categoria === selectedCategory);
    }

    // 3. Filter by stock health state: 'low' is <= 5 (and > 0), 'out' is <= 0
    if (stockFilter === 'low') {
      list = list.filter(p => p.estoqueValue !== undefined && p.estoqueValue > 0 && p.estoqueValue <= 5);
    } else if (stockFilter === 'out') {
      list = list.filter(p => p.estoqueValue !== undefined && p.estoqueValue <= 0);
    }

    // 4. Sort safely (type-safe access using keyof BlingProduct)
    if (sortField) {
      list.sort((a, b) => {
        const aVal = a[sortField as keyof BlingProduct];
        const bVal = b[sortField as keyof BlingProduct];

        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' 
            ? aVal.localeCompare(bVal) 
            : bVal.localeCompare(aVal);
        }

        return sortOrder === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });
    }

    return list;
  }, [products, searchQuery, selectedCategory, stockFilter, sortField, sortOrder]);

  // 5. Intelligent Client-side/Server-side hybrid pagination slice
  const paginatedProducts = useMemo(() => {
    if (processedProducts.length > limit) {
      const start = (currentPage - 1) * limit;
      return processedProducts.slice(start, start + limit);
    }
    return processedProducts;
  }, [processedProducts, currentPage, limit]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
      
      {/* Dynamic Compact Filters Layout */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-50/30 dark:bg-slate-900/40">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:max-w-4xl flex-grow">
          
          {/* Real-time search with input id for key shortcuts */}
          <div className="relative w-full flex-grow">
            <input
              id="search-input"
              type="text"
              placeholder="Busca automática do Bling por nome ou SKU (aperte '/' para focar)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 text-xs transition-all font-medium"
            />
            <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-500" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 p-0.5 hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-500 rounded-lg text-2xs cursor-pointer font-bold"
              >
                limpar
              </button>
            )}
          </div>

          {/* Category Filter dropdown */}
          <div className="relative w-full sm:w-56 flex items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl h-9 px-3 focus-within:ring-2 focus-within:ring-indigo-500/15 focus-within:border-indigo-500 transition-all shrink-0">
            <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 mr-2 shrink-0 animate-pulse" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                addToast(`Filtrando produtos por: ${e.target.value}`, 'info');
              }}
              className="w-full bg-transparent border-none text-2xs font-extrabold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer tracking-wider uppercase"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs">
                  {cat === 'Todas' ? 'CATEGORIAS: TODAS' : cat.substring(0, 20).toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Stock quick filter (All vs Low stock vs Out of stock) */}
          <div className="relative w-full sm:w-44 flex items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl h-9 px-3 focus-within:ring-2 focus-within:ring-indigo-500/15 focus-within:border-indigo-500 transition-all shrink-0">
            <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 mr-2 shrink-0" />
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value as any);
                addToast(`Filtro de nível: ${e.target.value === 'all' ? 'Todos' : e.target.value === 'low' ? 'Estoque Baixo' : 'Sem Estoque'}`, 'info');
              }}
              className="w-full bg-transparent border-none text-2xs font-extrabold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer tracking-wider uppercase"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs">ESTOQUE: TODOS</option>
              <option value="low" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs">ESTOQUE: BAIXO</option>
              <option value="out" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs">ESTOQUE: ZERADO</option>
            </select>
          </div>

        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
          {/* Dynamic Auto Refresh Stock */}
          <label className="flex items-center gap-2 bg-white dark:bg-slate-950 text-2xs px-3.5 h-9 rounded-xl border border-slate-200 dark:border-slate-800 font-extrabold tracking-wider cursor-pointer text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900">
            <span className="uppercase text-[9px] text-slate-500 select-none">Auto Refresh background:</span>
            <input 
              type="checkbox" 
              checked={autoRefreshStock} 
              onChange={(e) => setAutoRefreshStock(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-indigo-600 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 cursor-pointer focus:ring-indigo-500 focus:ring-1"
            />
          </label>

          {/* Manual Refresh Trigger */}
          <button
            onClick={() => {
              loadProducts();
              loadStats();
              addToast('Sincronizando produtos com Bling API v3...', 'info');
            }}
            className="h-9 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-all text-2xs font-extrabold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            title="Novo Sync"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingProducts ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>

          {/* Export CSV action Button with Sheets Icon */}
          <button
            onClick={exportToCSV}
            className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all text-2xs font-extrabold flex items-center gap-1.5 shadow-md justify-center w-full sm:w-auto cursor-pointer"
            title="Atalho: Alt+E"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar (.csv)
          </button>
        </div>
      </div>

      {/* PRODUCTS DATA VIEW TABLE */}
      <div className="overflow-x-auto">
        {loadingProducts ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-900 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none select-none">
                <th className="py-3 px-4 w-28">ID / SKU</th>
                <th className="py-3 px-4">Nome do Produto</th>
                <th className="py-3 px-4 text-right w-32">Preço Unitário</th>
                <th className="py-3 px-4 text-center w-24">Estoque</th>
                <th className="py-3 px-4 text-center w-28">Nível Saúde</th>
                <th className="py-3 px-4 text-center w-36">Editar</th>
              </tr>
            </thead>
            <tbody>
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
            </tbody>
          </table>
        ) : products.length === 0 ? (
          <div className="p-16 flex flex-col justify-center items-center text-center">
            <Box className="w-12 h-12 text-slate-300 dark:text-slate-800 animate-bounce mb-3" />
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 font-sans">Não há produtos carregados do Bling</p>
            <p className="text-2xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm font-medium leading-relaxed font-sans">
              Verifique se seu Bearer OAuth Access Token possui privilégios de consulta ou se o cache local salvou uma lista vazia.
            </p>
            <button 
              onClick={() => { setUseCache(false); loadProducts(); }}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-2xs font-extrabold cursor-pointer font-sans shadow-sm"
            >
              Tentar via Chamada Direta (Sem Cache)
            </button>
          </div>
        ) : processedProducts.length === 0 ? (
          <div className="p-16 flex flex-col justify-center items-center text-center">
            <Filter className="w-12 h-12 text-indigo-400 dark:text-indigo-900 mb-3" />
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 font-sans">Nenhum produto atende a estes critérios de pesquisa</p>
            <p className="text-2xs text-slate-650 dark:text-slate-400 mt-1 font-sans">
              Você pode redefinir seletores de busca, status ou escolher outra categoria.
            </p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedCategory('Todas'); setStockFilter('all'); }}
              className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-2xs font-extrabold cursor-pointer font-sans"
            >
              Limpar Filtros e Resetar Lista
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-900 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider select-none leading-none">
                <th 
                  onClick={() => handleSort('codigo')}
                  className="py-3 px-4 w-28 font-mono hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 justify-start">
                    ID / SKU
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('nome')}
                  className="py-3 px-4 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    Nome Completo do Produto
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('preco')}
                  className="py-3 px-4 text-right w-32 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 justify-end">
                    Preço de Venda
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('estoqueValue')}
                  className="py-3 px-4 text-center w-24 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 justify-center">
                    Estoque
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center w-28 font-sans">Saúde</th>
                <th className="py-3 px-4 text-center w-36 font-sans">Editar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
              {paginatedProducts.map((product) => {
                const isOutOfStock = product.estoqueValue !== undefined && product.estoqueValue <= 0;
                const isLowStock = product.estoqueValue !== undefined && product.estoqueValue > 0 && product.estoqueValue <= 5;
                const pulseClass = theme === 'dark' ? 'animate-pulse-row-dark' : 'animate-pulse-row-light';
                
                // Determine modern row highlighter glow style
                let borderHighlightClass = 'border-l-transparent hover:bg-slate-50/50 dark:hover:bg-slate-900/30';
                if (isOutOfStock) {
                  borderHighlightClass = `border-l-rose-500 bg-rose-500/[0.012] ${pulseClass}`;
                } else if (isLowStock) {
                  borderHighlightClass = 'border-l-amber-500 bg-amber-500/[0.008] hover:bg-amber-500/[0.02]';
                }

                return (
                  <tr 
                    key={product.id} 
                    className={`transition-all duration-200 border-l-2 text-xs ${borderHighlightClass}`}
                  >
                    <td className={`${isCompact ? 'py-1.5' : 'py-3'} px-4 whitespace-nowrap`}>
                       <span className="text-[10px] font-mono text-slate-500 block font-semibold leading-relaxed">ID: {product.id}</span>
                       <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{product.codigo || 'S/D'}</span>
                    </td>
                    <td className={`${isCompact ? 'py-1.5' : 'py-3'} px-4`}>
                      <div className="flex items-center space-x-2.5">
                        {product.imagemURL ? (
                          <img 
                            referrerPolicy="no-referrer" 
                            src={product.imagemURL} 
                            alt={product.nome} 
                            className="w-7 h-7 object-cover rounded-lg border border-slate-200 dark:border-slate-800 shadow-3xs shrink-0 bg-slate-50" 
                          />
                        ) : (
                          <div className="w-7 h-7 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-450 font-extrabold shrink-0 text-[9px] select-none">
                            N/A
                          </div>
                        )}
                        <div className="truncate max-w-[160px] sm:max-w-xs md:max-w-md lg:max-w-xl">
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{product.nome}</p>
                          {product.categoria && (
                            <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest leading-none block mt-0.5">{product.categoria}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`${isCompact ? 'py-1.5' : 'py-3'} px-4 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100 whitespace-nowrap`}>
                      R$ {product.preco?.toFixed(2) ?? '0.00'}
                    </td>
                    <td className={`${isCompact ? 'py-1.5' : 'py-3'} px-4 text-center font-mono font-extrabold text-slate-850 dark:text-slate-200`}>
                      {product.estoqueValue ?? 0}
                    </td>
                    {/* Health Badges */}
                    <td className={`${isCompact ? 'py-1.5' : 'py-3'} px-4 text-center whitespace-nowrap`}>
                      {isOutOfStock ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-extrabold bg-rose-500/10 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-300/30 dark:border-rose-900/30 font-sans">
                          ZERADO
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-extrabold bg-amber-500/10 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-300/30 dark:border-amber-900/40 font-sans">
                          BAIXO ESTOQUE
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-extrabold bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300/20 dark:border-emerald-900/30 font-sans">
                          DISPONÍVEL
                        </span>
                      )}
                    </td>
                    {/* Modals trigger Actions */}
                    <td className={`${isCompact ? 'py-1.5' : 'py-3'} px-4 text-center whitespace-nowrap`}>
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => {
                            setEditingPriceProduct(product);
                            setNewPrice(String(product.preco || ''));
                          }}
                          className="px-2 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-400 text-[10px] font-black border border-slate-200 dark:border-indigo-900/30 transition-all cursor-pointer font-sans"
                        >
                          💲 Preço
                        </button>
                        <button
                          onClick={() => {
                            setEditingStockProduct(product);
                            setNewStock(String(product.estoqueValue ?? ''));
                          }}
                          className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-black border border-slate-200 dark:border-slate-800 transition-all cursor-pointer font-sans"
                        >
                          📦 Estoque
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* HIGH QUALITY PAGINATION BAR */}
      <div className="p-3 px-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-900/20 text-xs font-bold font-sans">
        <button
          onClick={() => {
            setCurrentPage(prev => Math.max(prev - 1, 1));
            addToast(`Acessando página ${Math.max(currentPage - 1, 1)}`, 'info');
          }}
          disabled={currentPage === 1 || loadingProducts}
          className="px-3.5 py-1.5 text-slate-700 dark:text-slate-300 font-extrabold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 disabled:opacity-40 flex items-center gap-1 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Anterior
        </button>
        <span className="font-extrabold text-slate-600 uppercase tracking-widest text-[9px] select-none">
          PÁGINA {currentPage} DE {totalProducts ? Math.ceil(totalProducts / limit) : '1'}
        </span>
        <button
          onClick={() => {
            setCurrentPage(prev => prev + 1);
            addToast(`Acessando página ${currentPage + 1}`, 'info');
          }}
          disabled={currentPage >= (totalProducts ? Math.ceil(totalProducts / limit) : 1) || loadingProducts}
          className="px-3.5 py-1.5 text-slate-700 dark:text-slate-300 font-extrabold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 disabled:opacity-40 flex items-center gap-1 transition-all cursor-pointer"
        >
          Próximo
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
