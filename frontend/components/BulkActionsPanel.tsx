import React, { useState, useMemo } from 'react';
import { 
  X, Check, AlertTriangle, Layers, Sliders, Play, Plus, Minus, Search, Trash2, HelpCircle, AlertCircle
} from 'lucide-react';
import { BlingProduct } from '../../shared/types';

interface BulkActionsPanelProps {
  products: BlingProduct[];
  selectedProductIds: Set<number>;
  setSelectedProductIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  theme: 'light' | 'dark';
  loadProducts: () => Promise<void>;
  loadStats: () => Promise<void>;
  onClose: () => void;

  // Real-time synchronization props
  activeSelectTab: 'auto_sku' | 'guided' | 'expression';
  setActiveSelectTab: (val: 'auto_sku' | 'guided' | 'expression') => void;
  skuQuery: string;
  setSkuQuery: (val: string) => void;
  guidedFilters: GuidedFiltersState;
  setGuidedFilters: React.Dispatch<React.SetStateAction<GuidedFiltersState>>;
  expressionQuery: string;
  setExpressionQuery: (val: string) => void;
}

interface ParsedExpressionCondition {
  type: 'sku' | 'preco' | 'estoque' | 'nome';
  operator: ':' | '>' | '<' | '=';
  valStr: string;
  valNum?: number;
}

// Guided filters structure
interface GuidedFiltersState {
  skuContains: string;
  nomeContains: string;
  categoria: string;
  situacao: string;
  minPrice: string;
  maxPrice: string;
  minStock: string;
  maxStock: string;
}

export default function BulkActionsPanel({
  products,
  selectedProductIds,
  setSelectedProductIds,
  addToast,
  theme,
  loadProducts,
  loadStats,
  onClose,
  activeSelectTab,
  setActiveSelectTab,
  skuQuery,
  setSkuQuery,
  guidedFilters,
  setGuidedFilters,
  expressionQuery,
  setExpressionQuery
}: BulkActionsPanelProps) {

  // Bulk Edit Config Structure State
  const [editPrice, setEditPrice] = useState(false);
  const [priceMode, setPriceMode] = useState<'fixed' | 'add' | 'sub' | 'mul_add' | 'mul_sub'>('fixed');
  const [priceValue, setPriceValue] = useState('');

  const [editStock, setEditStock] = useState(false);
  const [stockMode, setStockMode] = useState<'fixed' | 'add' | 'sub'>('fixed');
  const [stockValue, setStockValue] = useState('');

  const [editSituacao, setEditSituacao] = useState(false);
  const [newValueSituacao, setNewValueSituacao] = useState<'A' | 'I'>('A');

  const [editTipo, setEditTipo] = useState(false);
  const [newValueTipo, setNewValueTipo] = useState<'P' | 'S'>('P');

  const [editFormato, setEditFormato] = useState(false);
  const [newValueFormato, setNewValueFormato] = useState<'S' | 'V' | 'E'>('S');

  // Execution modals state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [errorLogs, setErrorLogs] = useState<{ id: number; nome: string; error: string }[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);

  // Derive available categories in products
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.categoria) cats.add(p.categoria);
    });
    return ['Todas', ...Array.from(cats)].sort();
  }, [products]);

  // EXPRESSION PARSER FUNCTIONS
  const parsedExpConditions = useMemo(() => {
    if (!expressionQuery.trim()) return [];
    const tokens = expressionQuery.trim().split(/\s+/);
    const conditions: ParsedExpressionCondition[] = [];

    for (const token of tokens) {
      const lowerToken = token.toLowerCase();
      
      if (lowerToken.startsWith('sku:')) {
        conditions.push({
          type: 'sku',
          operator: ':',
          valStr: token.substring(4)
        });
        continue;
      }

      if (lowerToken.startsWith('nome:')) {
        conditions.push({
          type: 'nome',
          operator: ':',
          valStr: token.substring(5)
        });
        continue;
      }

      const precoMatch = token.match(/^preco([>=<])(\d+(?:\.\d+)?)$/i);
      if (precoMatch) {
        conditions.push({
          type: 'preco',
          operator: precoMatch[1] as any,
          valStr: precoMatch[2],
          valNum: parseFloat(precoMatch[2])
        });
        continue;
      }

      const estoqueMatch = token.match(/^estoque([>=<])(\d+)$/i);
      if (estoqueMatch) {
        conditions.push({
          type: 'estoque',
          operator: estoqueMatch[1] as any,
          valStr: estoqueMatch[2],
          valNum: parseInt(estoqueMatch[2], 10)
        });
        continue;
      }
    }
    return conditions;
  }, [expressionQuery]);

  // DERIVE MATCHES Live Preview counts
  const matchesSkuQuery = useMemo(() => {
    if (!skuQuery.trim()) return [];
    const qStr = skuQuery.toLowerCase().trim();
    return products.filter(p => (p.codigo || '').toLowerCase().includes(qStr));
  }, [products, skuQuery]);

  const matchesGuidedFilters = useMemo(() => {
    return products.filter(p => {
      const f = guidedFilters;
      if (f.skuContains.trim() && !(p.codigo || '').toLowerCase().includes(f.skuContains.toLowerCase().trim())) return false;
      if (f.nomeContains.trim() && !p.nome.toLowerCase().includes(f.nomeContains.toLowerCase().trim())) return false;
      if (f.categoria !== 'Todas' && p.categoria !== f.categoria) return false;
      if (f.situacao !== 'Todos') {
        const sit = f.situacao === 'Ativos' ? 'A' : 'I';
        if (p.situacao !== sit) return false;
      }
      if (f.minPrice.trim()) {
        const minVal = parseFloat(f.minPrice);
        if (!isNaN(minVal) && (p.preco ?? 0) < minVal) return false;
      }
      if (f.maxPrice.trim()) {
        const maxVal = parseFloat(f.maxPrice);
        if (!isNaN(maxVal) && (p.preco ?? 0) > maxVal) return false;
      }
      if (f.minStock.trim()) {
        const minVal = parseInt(f.minStock, 10);
        if (!isNaN(minVal) && (p.estoqueValue ?? 0) < minVal) return false;
      }
      if (f.maxStock.trim()) {
        const maxVal = parseInt(f.maxStock, 10);
        if (!isNaN(maxVal) && (p.estoqueValue ?? 0) > maxVal) return false;
      }
      return true;
    });
  }, [products, guidedFilters]);

  const matchesExpressionQuery = useMemo(() => {
    const conditions = parsedExpConditions;
    if (conditions.length === 0) return [];
    
    return products.filter(p => {
      for (const cond of conditions) {
        if (cond.type === 'sku') {
          const sku = (p.codigo || '').toLowerCase();
          if (!sku.includes(cond.valStr.toLowerCase())) return false;
        } else if (cond.type === 'nome') {
          const name = p.nome.toLowerCase();
          if (!name.includes(cond.valStr.toLowerCase())) return false;
        } else if (cond.type === 'preco') {
          const price = p.preco ?? 0;
          const target = cond.valNum ?? 0;
          if (cond.operator === '=') {
            if (price !== target) return false;
          } else if (cond.operator === '>') {
            if (price <= target) return false;
          } else if (cond.operator === '<') {
            if (price >= target) return false;
          }
        } else if (cond.type === 'estoque') {
          const stock = p.estoqueValue ?? 0;
          const target = cond.valNum ?? 0;
          if (cond.operator === '=') {
            if (stock !== target) return false;
          } else if (cond.operator === '>') {
            if (stock <= target) return false;
          } else if (cond.operator === '<') {
            if (stock >= target) return false;
          }
        }
      }
      return true;
    });
  }, [products, parsedExpConditions]);

  const liveMatches = useMemo(() => {
    if (activeSelectTab === 'auto_sku') return matchesSkuQuery;
    if (activeSelectTab === 'guided') return matchesGuidedFilters;
    return matchesExpressionQuery;
  }, [activeSelectTab, matchesSkuQuery, matchesGuidedFilters, matchesExpressionQuery]);

  // Selection executors (Add, Replace, Remove)
  const applySelection = (mode: 'add' | 'replace' | 'remove') => {
    const targetProducts = liveMatches;
    if (targetProducts.length === 0) {
      addToast('Nenhum correspondente encontrado para aplicar.', 'error');
      return;
    }

    setSelectedProductIds(prev => {
      const next = mode === 'replace' ? new Set<number>() : new Set<number>(prev);
      targetProducts.forEach(p => {
        if (mode === 'remove') {
          next.delete(p.id);
        } else {
          next.add(p.id);
        }
      });
      return next;
    });

    const msg = mode === 'add' 
      ? `Adicionados ${targetProducts.length} produtos à seleção atual.` 
      : mode === 'remove' 
      ? `Removidos ${targetProducts.length} produtos da seleção atual.` 
      : `Substituída a seleção com ${targetProducts.length} produtos localizados.`;

    addToast(msg, 'success');
  };

  // Bulk Operations validator
  const handleTriggerBulkExecutionSubmit = () => {
    if (selectedProductIds.size === 0) {
      addToast('Não há produtos selecionados para processamento.', 'error');
      return;
    }

    if (!editPrice && !editStock && !editSituacao && !editTipo && !editFormato) {
      addToast('Selecione pelo menos uma propriedade para editar em massa.', 'error');
      return;
    }

    if (editPrice) {
      const parsed = parseFloat(priceValue);
      if (isNaN(parsed) || parsed < 0) {
        addToast('Defina um valor numérico válido para o preço.', 'error');
        return;
      }
    }

    if (editStock) {
      const parsed = parseInt(stockValue, 10);
      if (isNaN(parsed) || parsed < 0) {
        addToast('Defina uma quantidade numérica inteira válida para o estoque.', 'error');
        return;
      }
    }

    setShowConfirmModal(true);
  };

  // SEQUENTIAL REST INTEGRATION LOOP
  const runSequenceBulkUpdate = async () => {
    setShowConfirmModal(false);
    setIsProcessing(true);
    setProgressIndex(0);
    setProcessedCount(0);
    setSuccessCount(0);
    setFailureCount(0);
    setErrorLogs([]);

    const productIdsArray = Array.from(selectedProductIds);
    const totalCount = productIdsArray.length;
    const token = localStorage.getItem('bling_token') || '';

    if (!token) {
      addToast('Token Bling não configurado ou expirou. Efetue login novamente.', 'error');
      setIsProcessing(false);
      return;
    }

    for (let i = 0; i < totalCount; i++) {
      const pId = productIdsArray[i];
      const prod = products.find(p => p.id === pId);
      setProgressIndex(i + 1);

      if (!prod) {
        setFailureCount(prev => prev + 1);
        setErrorLogs(prev => [...prev, { id: pId, nome: `ID: ${pId}`, error: 'Produto inexistente na lista carregada.' }]);
        continue;
      }

      // Compute modifications
      let finalPrice = prod.preco;
      if (editPrice) {
        const val = parseFloat(priceValue);
        if (priceMode === 'fixed') finalPrice = val;
        else if (priceMode === 'add') finalPrice = (prod.preco ?? 0) + val;
        else if (priceMode === 'sub') finalPrice = Math.max(0, (prod.preco ?? 0) - val);
        else if (priceMode === 'mul_add') finalPrice = (prod.preco ?? 0) * (1 + val / 100);
        else if (priceMode === 'mul_sub') finalPrice = Math.max(0, (prod.preco ?? 0) * (1 - val / 100));
      }

      let finalStock: number | undefined = undefined;
      if (editStock) {
        const val = parseInt(stockValue, 10);
        if (stockMode === 'fixed') finalStock = val;
        else if (stockMode === 'add') finalStock = (prod.estoqueValue ?? 0) + val;
        else if (stockMode === 'sub') finalStock = Math.max(0, (prod.estoqueValue ?? 0) - val);
      }

      // Setup fully safe payload preserving unmodified elements
      const updatePayload: any = {
        idProduto: prod.id,
        nome: prod.nome,
        codigo: prod.codigo,
        preco: finalPrice,
        situacao: editSituacao ? newValueSituacao : prod.situacao,
        tipo: editTipo ? newValueTipo : prod.tipo,
        formato: editFormato ? newValueFormato : prod.formato,
        estoqueValue: finalStock, // undefined if untouched
      };

      try {
        const response = await fetch('/api/products/update', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        });

        if (response.ok) {
          setSuccessCount(prev => prev + 1);
        } else {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error || 'Erro desconhecido na API do Bling.';
          setFailureCount(prev => prev + 1);
          setErrorLogs(prev => [...prev, { id: prod.id, nome: prod.nome, error: `${errMsg}` }]);
        }
      } catch (err: any) {
        setFailureCount(prev => prev + 1);
        setErrorLogs(prev => [...prev, { id: prod.id, nome: prod.nome, error: 'Falha na conexão de rede com o servidor.' }]);
      }

      setProcessedCount(i + 1);
    }

    setIsProcessing(false);
    setShowResultModal(true);
    addToast('Atualização em massa concluída!', 'success');

    // Reload layout assets
    setTimeout(() => {
      loadProducts();
      loadStats();
    }, 150);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-900/30 p-5 mb-5 shadow-3xs transition-all animate-fade-in text-xs">
      
      {/* Header Panel */}
      <div className="flex justify-between items-center pb-4 mb-4 border-b border-indigo-100 dark:border-indigo-950/40">
        <div className="flex items-center gap-2">
          <span className="p-1 px-2 rounded-lg bg-indigo-650 text-white font-extrabold text-[10px] tracking-wider uppercase">MODO AVANÇADO</span>
          <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 leading-none">
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Ações em Massa & Seleção Inteligente
          </h2>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer"
          title="Fechar painel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grid container layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COL 1: SELECTION CONTROLS (7cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 p-4 rounded-xl shadow-3xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1">
                🔍 Painel de Seleção Rápida e Inteligente
              </span>
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-605 dark:text-indigo-400 font-extrabold px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/10">
                Selecionados: {selectedProductIds.size} / {products.length}
              </span>
            </div>

            {/* Smart Tabs Selector */}
            <div className="flex border-b border-slate-200 dark:border-slate-850 gap-1 pb-2 mb-3.5">
              <button
                onClick={() => setActiveSelectTab('auto_sku')}
                className={`px-3 py-1.5 rounded-lg font-extrabold text-2xs cursor-pointer transition-all ${activeSelectTab === 'auto_sku' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'}`}
              >
                1. Busca por SKU
              </button>
              <button
                onClick={() => setActiveSelectTab('guided')}
                className={`px-3 py-1.5 rounded-lg font-extrabold text-2xs cursor-pointer transition-all ${activeSelectTab === 'guided' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'}`}
              >
                2. Filtros Guiados
              </button>
              <button
                onClick={() => setActiveSelectTab('expression')}
                className={`px-3 py-1.5 rounded-lg font-extrabold text-2xs cursor-pointer transition-all ${activeSelectTab === 'expression' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'}`}
              >
                3. Expressões Matemáticas
              </button>
            </div>

            {/* Content for TAB 1: Auto SKU */}
            {activeSelectTab === 'auto_sku' && (
              <div className="space-y-3">
                <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                  Selecione rapidamente em lote. Digite um trecho ou padrão e o sistema listará e aplicará marcas automaticamente aos SKUs correspondentes.
                </p>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: ABC, -PT-, 123..."
                    value={skuQuery}
                    onChange={(e) => setSkuQuery(e.target.value)}
                    className="w-full pl-9 pr-3 h-8.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-150 text-2xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <Search className="absolute left-3 top-3 h-3 w-3 text-slate-400" />
                </div>
              </div>
            )}

            {/* Content for TAB 2: Guided Advanced Filters */}
            {activeSelectTab === 'guided' && (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-450 block mb-1">SKU Contém</label>
                  <input 
                    type="text"
                    placeholder="SKU parcial..."
                    value={guidedFilters.skuContains}
                    onChange={(e) => setGuidedFilters(prev => ({ ...prev, skuContains: e.target.value }))}
                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-450 block mb-1">Nome Contém</label>
                  <input 
                    type="text"
                    placeholder="Nome..."
                    value={guidedFilters.nomeContains}
                    onChange={(e) => setGuidedFilters(prev => ({ ...prev, nomeContains: e.target.value }))}
                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-450 block mb-1">Categoria</label>
                  <select
                    value={guidedFilters.categoria}
                    onChange={(e) => setGuidedFilters(prev => ({ ...prev, categoria: e.target.value }))}
                    className="w-full p-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-[11px] font-extrabold"
                  >
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-450 block mb-1">Situação</label>
                  <select
                    value={guidedFilters.situacao}
                    onChange={(e) => setGuidedFilters(prev => ({ ...prev, situacao: e.target.value }))}
                    className="w-full p-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-[11px] font-extrabold"
                  >
                    <option value="Todos">Todos os Status</option>
                    <option value="Ativos">Ativo (A)</option>
                    <option value="Inativos">Inativo (I)</option>
                  </select>
                </div>
                <div className="col-span-2 grid grid-cols-4 gap-2 border-t border-slate-100 dark:border-slate-900 pt-2 mt-1">
                  <div className="col-span-2">
                    <label className="text-[9px] font-bold uppercase text-slate-450 block mb-1">Preço (R$ Mín / Máx)</label>
                    <div className="flex gap-1">
                      <input 
                        type="number"
                        placeholder="Mín"
                        value={guidedFilters.minPrice}
                        onChange={(e) => setGuidedFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                        className="w-full p-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-[11px]"
                      />
                      <input 
                        type="number"
                        placeholder="Máx"
                        value={guidedFilters.maxPrice}
                        onChange={(e) => setGuidedFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                        className="w-full p-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-[11px]"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] font-bold uppercase text-slate-450 block mb-1">Estoque (Qtd Mín / Máx)</label>
                    <div className="flex gap-1">
                      <input 
                        type="number"
                        placeholder="Mín"
                        value={guidedFilters.minStock}
                        onChange={(e) => setGuidedFilters(prev => ({ ...prev, minStock: e.target.value }))}
                        className="w-full p-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-[11px]"
                      />
                      <input 
                        type="number"
                        placeholder="Máx"
                        value={guidedFilters.maxStock}
                        onChange={(e) => setGuidedFilters(prev => ({ ...prev, maxStock: e.target.value }))}
                        className="w-full p-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content for TAB 3: Advanced Expressions */}
            {activeSelectTab === 'expression' && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Digite regras matemáticas inteligentes compostas separadas por espaço. 
                </p>
                <div className="bg-slate-100/90 dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-mono leading-relaxed text-slate-650 dark:text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-350">Comandos permitidos:</div>
                  <div>• <b className="text-indigo-650 dark:text-indigo-400">sku:</b> (ex: <span className="italic">sku:FERRO</span> ou <span className="italic">sku:-PT-</span>)</div>
                  <div>• <b className="text-amber-600">estoque&gt; / estoque&lt; / estoque=</b> (ex: <span className="italic">estoque=0</span> ou <span className="italic">estoque&lt;5</span>)</div>
                  <div>• <b className="text-emerald-600">preco&gt; / preco&lt; / preco=</b> (ex: <span className="italic">preco&gt;100</span>)</div>
                  <div>• <b className="text-indigo-650 dark:text-indigo-400">nome:</b> (ex: <span className="italic">nome:MADEIRA</span>)</div>
                  <div className="text-[9px] pt-1 text-slate-400 border-t border-slate-200 dark:border-slate-800 mt-1">
                    Exemplo múltiplo: <code className="bg-slate-200 dark:bg-slate-950 px-1 rounded py-0.5 text-indigo-700 dark:text-indigo-300">sku:FERRO estoque=0</code> (Combinação AND)
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="sku:FERRO estoque<5 preco>50"
                  value={expressionQuery}
                  onChange={(e) => setExpressionQuery(e.target.value)}
                  className="w-full font-mono px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-150 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Matches & Actions Footer block */}
          <div className="border-t border-slate-150 dark:border-slate-900/60 pt-4 mt-4 bg-slate-50/20 dark:bg-slate-940 p-2.5 rounded-lg">
            <div className="flex justify-between items-center mb-3 text-[11px]">
              <span className="font-extrabold text-slate-705 dark:text-slate-300 uppercase tracking-widest text-[9px]">
                Resultados correspondentes:
              </span>
              <span className="font-extrabold text-slate-900 dark:text-slate-150 font-mono text-xs">
                {liveMatches.length} itens encontrados
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => applySelection('replace')}
                disabled={liveMatches.length === 0}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 py-1.5 rounded-lg font-extrabold text-[10px] uppercase shadow-3xs cursor-pointer tracking-wider text-center"
              >
                Substituir Seleção
              </button>
              <button
                onClick={() => applySelection('add')}
                disabled={liveMatches.length === 0}
                className="flex-1 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 disabled:opacity-40 py-1.5 rounded-lg font-extrabold text-[10px] uppercase cursor-pointer tracking-wider text-center"
              >
                Adicionar
              </button>
              <button
                onClick={() => applySelection('remove')}
                disabled={liveMatches.length === 0}
                className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-305/30 py-1.5 rounded-lg font-extrabold text-[10px] uppercase disabled:opacity-40 cursor-pointer tracking-wider text-center"
              >
                Deselecionar
              </button>
            </div>
            {selectedProductIds.size > 0 && (
              <button
                onClick={() => {
                  setSelectedProductIds(new Set());
                  addToast('Seleção limpa com sucesso.', 'info');
                }}
                className="w-full mt-2 text-center text-[9px] uppercase font-bold text-slate-400 hover:text-rose-500 transition-colors"
              >
                Limpar Todos os Selecionados ({selectedProductIds.size})
              </button>
            )}
          </div>
        </div>

        {/* COL 2: EDITING ARTIFACTS AND LOGIC (5cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 p-4 rounded-xl shadow-3xs flex flex-col justify-between">
          <div className="space-y-4">
            <span className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] block mb-1">
              ✏️ Valores a Alterar em Massa
            </span>

            {/* Price section */}
            <div className="space-y-1.5 border-b border-slate-100 dark:border-slate-900 pb-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 font-extrabold text-slate-750 dark:text-slate-200 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={editPrice}
                    onChange={(e) => setEditPrice(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-indigo-650"
                  />
                  Alterar Preço
                </label>
              </div>
              {editPrice && (
                <div className="grid grid-cols-2 gap-2 animate-fade-in pt-1">
                  <select
                    value={priceMode}
                    onChange={(e: any) => setPriceMode(e.target.value)}
                    className="p-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold shrink-0 cursor-pointer"
                  >
                    <option value="fixed">Preço Fixo (R$)</option>
                    <option value="add">Somar Reais (+R$)</option>
                    <option value="sub">Subtrair Reais (-R$)</option>
                    <option value="mul_add">Aumentar por % (+%)</option>
                    <option value="mul_sub">Reduzir por % (-%)</option>
                  </select>
                  <input
                    type="number"
                    step="any"
                    placeholder="Ex: 10"
                    value={priceValue}
                    onChange={(e) => setPriceValue(e.target.value)}
                    className="p-1 px-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-mono"
                  />
                </div>
              )}
            </div>

            {/* Stock section */}
            <div className="space-y-1.5 border-b border-slate-100 dark:border-slate-900 pb-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 font-extrabold text-slate-750 dark:text-slate-200 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={editStock}
                    onChange={(e) => setEditStock(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-indigo-650"
                  />
                  Alterar Estoque
                </label>
              </div>
              {editStock && (
                <div className="grid grid-cols-2 gap-2 animate-fade-in pt-1">
                  <select
                    value={stockMode}
                    onChange={(e: any) => setStockMode(e.target.value)}
                    className="p-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold shrink-0 cursor-pointer"
                  >
                    <option value="fixed">Estoque Fixo</option>
                    <option value="add">Somar Qtd (+)</option>
                    <option value="sub">Subtrair Qtd (-)</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Ex: 5"
                    value={stockValue}
                    onChange={(e) => setStockValue(e.target.value)}
                    className="p-1 px-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-mono"
                  />
                </div>
              )}
            </div>

            {/* Situação section */}
            <div className="space-y-1.5 border-b border-slate-100 dark:border-slate-900 pb-3">
              <label className="flex items-center gap-1.5 font-extrabold text-slate-750 dark:text-slate-200 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={editSituacao}
                  onChange={(e) => setEditSituacao(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-650"
                />
                Alterar Situação (Status)
              </label>
              {editSituacao && (
                <div className="animate-fade-in pt-1">
                  <select
                    value={newValueSituacao}
                    onChange={(e: any) => setNewValueSituacao(e.target.value)}
                    className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-150 text-xs font-bold cursor-pointer"
                  >
                    <option value="A">Ativo (A)</option>
                    <option value="I">Inativo (I)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Tipo section */}
            <div className="space-y-1.5 border-b border-slate-100 dark:border-slate-900 pb-3">
              <label className="flex items-center gap-1.5 font-extrabold text-slate-750 dark:text-slate-200 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={editTipo}
                  onChange={(e) => setEditTipo(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-650"
                />
                Alterar Tipo de Produto
              </label>
              {editTipo && (
                <div className="animate-fade-in pt-1">
                  <select
                    value={newValueTipo}
                    onChange={(e: any) => setNewValueTipo(e.target.value)}
                    className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-150 text-xs font-bold cursor-pointer"
                  >
                    <option value="P">Produto Geral (P)</option>
                    <option value="S">Serviço (S)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Formato section */}
            <div className="space-y-1.5 pb-2">
              <label className="flex items-center gap-1.5 font-extrabold text-slate-750 dark:text-slate-200 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={editFormato}
                  onChange={(e) => setEditFormato(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-650"
                />
                Alterar Formato
              </label>
              {editFormato && (
                <div className="animate-fade-in pt-1">
                  <select
                    value={newValueFormato}
                    onChange={(e: any) => setNewValueFormato(e.target.value)}
                    className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-150 text-xs font-bold cursor-pointer"
                  >
                    <option value="S">Simples (S)</option>
                    <option value="V">Com Variações (V)</option>
                    <option value="E">Estrutura (E)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-150 dark:border-slate-900/60 pt-4 mt-4">
            <button
              onClick={handleTriggerBulkExecutionSubmit}
              disabled={selectedProductIds.size === 0}
              className="w-full h-10 rounded-xl bg-indigo-650 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold flex items-center justify-center gap-1.5 text-xs select-none transition-all shadow-md cursor-pointer tracking-wider uppercase leading-none"
            >
              <Play className="w-3.5 h-3.5 text-white" />
              Executar Alterações ({selectedProductIds.size})
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: CONFIRMAÇÃO DAS ALTERAÇÕES */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-5 shadow-xl">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-3 border-b border-light/10 pb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-850 dark:text-slate-100">CONFIRMAÇÃO EM MASSA</h3>
            </div>
            
            <p className="text-2xs text-slate-650 dark:text-slate-350 leading-relaxed max-w-sm">
              Você está prestes a aplicar as seguintes alterações em lote nos <b className="text-slate-900 dark:text-slate-100">{selectedProductIds.size} produtos</b> afetados:
            </p>

            <div className="mt-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-850 text-2xs space-y-2 text-slate-705 dark:text-slate-300 font-medium">
              {editPrice && (
                <div className="flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>
                    Ajuste de Preço: <b>{priceMode === 'fixed' ? `Definir R$ ${priceValue}` : priceMode === 'add' ? `Somar R$ ${priceValue}` : priceMode === 'sub' ? `Subtrair R$ ${priceValue}` : priceMode === 'mul_add' ? `+ ${priceValue}%` : `- ${priceValue}%`}</b>
                  </span>
                </div>
              )}
              {editStock && (
                <div className="flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>
                    Ajuste de Estoque: <b>{stockMode === 'fixed' ? `Definir saldo ${stockValue}` : stockMode === 'add' ? `Somar +${stockValue}` : `Subtrair -${stockValue}`}</b>
                  </span>
                </div>
              )}
              {editSituacao && (
                <div className="flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>
                    Mudar status de Situação para: <b className="uppercase">{newValueSituacao === 'A' ? 'Ativo (A)' : 'Inativo (I)'}</b>
                  </span>
                </div>
              )}
              {editTipo && (
                <div className="flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>
                    Mudar Tipo para: <b className="uppercase">{newValueTipo === 'P' ? 'Produto Geral (P)' : 'Serviço (S)'}</b>
                  </span>
                </div>
              )}
              {editFormato && (
                <div className="flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>
                    Mudar Formato para: <b className="uppercase">{newValueFormato === 'S' ? 'Simples (S)' : newValueFormato === 'V' ? 'Com Variações (V)' : 'Estrutura (E)'}</b>
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 rounded-xl font-bold text-2xs cursor-pointer text-center select-none"
              >
                Cancelar
              </button>
              <button
                onClick={runSequenceBulkUpdate}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-2xs cursor-pointer text-center select-none shadow-md"
              >
                Confirmar Alteração
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PROGRESSO EM TEMPO REAL */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans select-none">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 p-5 shadow-2xl text-center">
            <h3 className="font-extrabold text-xs uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Processando Lote</h3>
            <p className="text-[10px] text-slate-500 mb-4">Integrando com a API v3 da Bling. Evite fechar o navegador.</p>

            <span className="font-mono text-2xl font-black text-slate-850 dark:text-slate-100">
              {progressIndex} / {selectedProductIds.size}
            </span>
            <div className="text-2xs font-extrabold text-slate-505 dark:text-slate-400 my-1">
              {Math.round((progressIndex / selectedProductIds.size) * 100)}% concluído
            </div>

            {/* Gorgeous visual progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3 mb-4">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-150" 
                style={{ width: `${(progressIndex / selectedProductIds.size) * 100}%` }}
              ></div>
            </div>

            <p className="text-[9px] text-slate-400 italic">
              Atualizando metadados individuais sequencialmente com segurança contra limites de requisição.
            </p>
          </div>
        </div>
      )}

      {/* MODAL 3: RESULTADOS E DETALHAMENTO DE FALHAS */}
      {showResultModal && (
        <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 p-5 shadow-xl flex flex-col max-h-[85vh]">
            
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-light/10">
              <h3 className="font-extrabold text-xs tracking-wider uppercase text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500 font-black" />
                Relatório de Processamento
              </h3>
              <button 
                onClick={() => setShowResultModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-300/20 dark:border-emerald-900/30">
                <span className="text-[9px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 block tracking-widest leading-none mb-1">Sucessos</span>
                <span className="font-mono text-xl font-black text-emerald-700 dark:text-emerald-400 leading-none">{successCount}</span>
                <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">Editados no Bling</span>
              </div>
              <div className="text-center p-3 rounded-xl bg-rose-500/5 dark:bg-rose-950/10 border border-rose-300/20 dark:border-rose-900/30">
                <span className="text-[9px] font-extrabold uppercase text-rose-600 dark:text-rose-450 block tracking-widest leading-none mb-1">Falhas</span>
                <span className="font-mono text-xl font-black text-rose-700 dark:text-rose-400 leading-none">{failureCount}</span>
                <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">Rejeitados pela API</span>
              </div>
            </div>

            {/* Error logs */}
            <div className="flex-grow overflow-y-auto mb-4 border border-slate-100 dark:border-slate-850 rounded-xl bg-slate-50 dark:bg-slate-950 p-3 max-h-[350px]">
              <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-widest mb-2.5">
                Detalhamento dos Erros ({failureCount})
              </span>

              {errorLogs.length === 0 ? (
                <div className="text-center p-6 text-slate-400">
                  <Check className="w-6 h-6 text-emerald-500 mx-auto opacity-40 mb-1" />
                  <p className="text-[10px] font-bold">Excelente! Todos os {successCount} itens foram atualizados com 100% de sucesso.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {errorLogs.map((log, idx) => (
                    <div 
                      key={`${log.id}-${idx}`}
                      className="border border-rose-300/20 dark:border-rose-900/40 bg-rose-500/[0.02] p-2 rounded-lg flex flex-col gap-0.5 text-[10px]"
                    >
                      <div className="flex justify-between items-center text-slate-800 dark:text-slate-200">
                        <span className="font-extrabold truncate">ID: {log.id} - {log.nome}</span>
                        <span className="p-0.5 px-1 bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 font-extrabold text-[8px] rounded uppercase">ERRO</span>
                      </div>
                      <span className="text-slate-500 dark:text-slate-405 font-mono leading-relaxed select-text mt-0.5 whitespace-pre-wrap">{log.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowResultModal(false)}
              className="w-full py-2 bg-slate-150 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-2xs uppercase rounded-xl transition-all cursor-pointer text-center select-none"
            >
              Fechar Relatório
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
