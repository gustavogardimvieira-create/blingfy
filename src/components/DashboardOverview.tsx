import React from 'react';
import { 
  RefreshCw, Box, ShoppingCart, Database, AlertCircle, AlertTriangle, Layers, BarChart3, Sliders 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { BlingProduct, DashboardStats } from '../types';

interface DashboardOverviewProps {
  stats: DashboardStats | null;
  loadingStats: boolean;
  loadStats: () => Promise<void>;
  loadProducts: (silent?: boolean) => Promise<void>;
  theme: 'light' | 'dark';
  products: BlingProduct[];
  setSelectedTab: (tab: 'overview' | 'products' | 'logs' | 'settings') => void;
  setStockFilter: (filter: 'all' | 'low' | 'out') => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const StatsCardSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 animate-pulse space-y-3">
    <div className="flex justify-between items-center">
      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800"></div>
    </div>
    <div className="h-7 w-20 bg-slate-300 dark:bg-slate-700 rounded select-none"></div>
    <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded"></div>
  </div>
);

export default function DashboardOverview({
  stats,
  loadingStats,
  loadStats,
  loadProducts,
  theme,
  products,
  setSelectedTab,
  setStockFilter,
  addToast
}: DashboardOverviewProps) {
  
  const lowStockCount = React.useMemo(() => {
    return products.filter(p => p.estoqueValue !== undefined && p.estoqueValue > 0 && p.estoqueValue <= 5).length;
  }, [products]);

  const barChartData = React.useMemo(() => {
    return [...products]
      .filter(p => p.nome && p.preco !== undefined)
      .sort((a, b) => (b.preco || 0) - (a.preco || 0))
      .slice(0, 10)
      .map(p => ({
        name: p.nome.length > 15 ? p.nome.substring(0, 12) + '...' : p.nome,
        "Estoque": p.estoqueValue || 0,
        "Preço (R$)": p.preco || 0
      }));
  }, [products]);

  const pieChartData = React.useMemo(() => {
    return [
      { 
        name: 'Sem Estoque (Z)', 
        value: stats?.outOfStockCount || 0,
        color: '#ef4444' 
      },
      { 
        name: 'Estoque Crítico (L)', 
        value: products.filter(p => (p.estoqueValue || 0) > 0 && (p.estoqueValue || 0) <= 5).length,
        color: '#f59e0b' 
      },
      { 
        name: 'Estoque Regular (R)', 
        value: products.filter(p => (p.estoqueValue || 0) > 5).length,
        color: '#10b981' 
      }
    ].filter(item => item.value > 0);
  }, [products, stats]);

  return (
    <div className="space-y-6">
      
      {/* HEADING SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight font-sans">Estatísticas Gerais do Estoque</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
            Sincronização instantânea de métricas extraídas diretamente da carteira do Bling ERP v3.
          </p>
        </div>
        <div className="flex items-center gap-2 select-none">
          <button 
            onClick={() => {
              loadStats();
              loadProducts();
              addToast('Atualizando métricas do Dashboard...', 'info');
            }}
            className="p-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 hover:dark:bg-indigo-950/75 text-indigo-700 dark:text-indigo-400 border border-slate-200 dark:border-indigo-900/30 rounded-xl transition-all cursor-pointer"
            title="Novo Sync"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-[10px] font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 px-3 py-2 rounded-xl">
            Atualizado: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleTimeString() : 'Pendente'}
          </span>
        </div>
      </div>

      {/* DASHBOARD CARDS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loadingStats ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            {/* Stat card 1 */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex justify-between items-start transition-all hover:border-indigo-500/20 shadow-xs">
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-350 uppercase tracking-widest font-sans">Produtos Monitorados</p>
                <div className="space-y-1">
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 font-sans">
                    {stats ? stats.totalCount : '0'}
                  </h3>
                  <p className="text-2xs text-slate-600 dark:text-slate-300 flex items-center gap-1 font-semibold font-sans">
                    <Layers className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    Itens registrados no Bling (API)
                  </p>
                </div>
              </div>
              <div className="p-3 bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Box className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            {/* Stat card 2 */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex justify-between items-start transition-all hover:border-indigo-500/20 shadow-xs">
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-350 uppercase tracking-widest font-sans">Volume em Estoque</p>
                <div className="space-y-1">
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 font-sans">
                    {stats ? stats.totalStock : '0'}
                  </h3>
                  <p className="text-2xs text-slate-600 dark:text-slate-300 flex items-center gap-1 font-semibold font-sans">
                    <ShoppingCart className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Unidades físicas em depósitos
                  </p>
                </div>
              </div>
              <div className="p-3 bg-emerald-50/80 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl">
                <Database className="w-5 h-5" />
              </div>
            </div>

            {/* Stat card 3 */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex justify-between items-start transition-all hover:border-rose-500/10 shadow-xs">
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-350 uppercase tracking-widest font-sans">Rupturas Críticas (Sem Estoque)</p>
                <div className="space-y-1">
                  <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-sans">
                    {stats ? stats.outOfStockCount : '0'}
                  </h3>
                  <p className="text-2xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 font-sans">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-605" />
                    {stats && stats.outOfStockCount > 0 ? `${stats.outOfStockCount} produtos precisam de reabastecimento` : 'Nenhuma ruptura ativa no ERP'}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-rose-50/85 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* LOW STOCK HIGHLIGHT SUMMARY BANNER (Extra Requested) */}
      {lowStockCount > 0 && (
        <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-3xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg">
              <Sliders className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-sans">Atenção: Itens em Nível Crítico (Baixo Estoque)</h4>
              <p className="text-2xs text-slate-600 dark:text-slate-300 font-sans">
                Existem atualmente <strong>{lowStockCount} produtos</strong> com disponibilidade entre 1 e 5 unidades. Evite possíveis perdas de vendas no ERP.
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              setSelectedTab('products');
              setStockFilter('low');
              addToast('Exibindo produtos que precisam de reposição', 'info');
            }}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600 text-white font-bold text-2xs rounded-xl shadow-xs cursor-pointer select-none transition-all font-sans"
          >
            Examinar Alertas
          </button>
        </div>
      )}

      {/* TWO COLUMN CHARTS & ANALYTICS PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* STOCKS AND PRICE BAR CHART COLUMN */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs transition-all space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-850 pb-3 gap-2">
            <div className="space-y-0.5">
              <h2 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider font-sans">Análise de Estoque e Precificação</h2>
              <p className="text-2xs text-slate-600 dark:text-slate-300 font-sans">Top 10 produtos de maior avaliação comercial.</p>
            </div>
            <span className="text-[9.5px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/30 px-2.5 py-1 rounded-lg">
              Consumo Seguro
            </span>
          </div>

          {products && products.length > 0 && (
            <div className="h-72 w-full font-sans text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                  <XAxis 
                    dataKey="name" 
                    stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke={theme === 'dark' ? '#64748b' : '#94a3b8'}
                    tickLine={false} 
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                      borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                      fontSize: '11px',
                      fontFamily: 'sans-serif',
                      border: '1px solid'
                    }}
                    itemStyle={{
                      color: theme === 'dark' ? '#cbd5e1' : '#334155'
                    }}
                    labelStyle={{
                      color: theme === 'dark' ? '#94a3b8' : '#64748b',
                      fontWeight: '605'
                    }}
                  />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="Estoque" fill="#635bff" radius={[4, 4, 0, 0]} name="Saldo Físico" />
                  <Bar dataKey="Preço (R$)" fill="#00d46a" radius={[4, 4, 0, 0]} name="Preço de Venda (R$)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* PIE CHART / CATEGORY HEALTH SUMMARY (Extra Requested: Gráfico de estoque) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs transition-all space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-3">
            <div className="space-y-0.5">
              <h2 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider font-sans">Distribuição do Estoque</h2>
              <p className="text-2xs text-slate-600 dark:text-slate-300 font-sans">Proporção por grupos de produtos.</p>
            </div>
          </div>

          {products && products.length > 0 ? (
            <div className="space-y-4">
              <div className="h-44 w-full flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 text-[10.5px] font-sans">
                <div className="flex justify-between items-center p-2 rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold">
                  <span>Estoque Saudável (&gt;5 un):</span>
                  <span>{products.filter(p => (p.estoqueValue || 0) > 5).length} produtos</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 font-bold">
                  <span>Nível de Atenção (1-5 un):</span>
                  <span>{products.filter(p => (p.estoqueValue || 0) > 0 && (p.estoqueValue || 0) <= 5).length} produtos</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 font-bold">
                  <span>Sem Estoque (Zerado):</span>
                  <span>{stats?.outOfStockCount || '0'} produtos</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col justify-center items-center text-slate-400 text-center">
              <Sliders className="w-10 h-10 text-slate-300 dark:text-slate-800 animate-pulse mb-1" />
              <p className="text-2xs">Gráfico circular aguardando integração.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
