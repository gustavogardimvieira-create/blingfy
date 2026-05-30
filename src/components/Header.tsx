import React from 'react';
import { ChevronLeft, Menu, SlidersHorizontal } from 'lucide-react';

interface HeaderProps {
  showLeftSidebar: boolean;
  setShowLeftSidebar: (v: boolean) => void;
  selectedTab: 'overview' | 'products' | 'logs' | 'settings';
  isCompact: boolean;
  setIsCompact: (v: boolean) => void;
  useCache: boolean;
  setUseCache: (v: boolean) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function Header({
  showLeftSidebar,
  setShowLeftSidebar,
  selectedTab,
  isCompact,
  setIsCompact,
  useCache,
  setUseCache,
  addToast
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-14 flex items-center justify-between px-4 sm:px-6 transition-colors w-full font-sans">
      <div className="flex items-center gap-3">
        {/* Left Sidebar toggler */}
        <button 
          onClick={() => setShowLeftSidebar(!showLeftSidebar)}
          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center border border-slate-200 dark:border-slate-800 cursor-pointer"
          title={showLeftSidebar ? "Esconder Menu Lateral" : "Surgir Menu Lateral"}
        >
          {showLeftSidebar ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        <span className="hidden xs:inline text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1 select-none">Módulo</span>
        <span className="hidden xs:inline text-slate-300 dark:text-slate-800 text-xs">/</span>
        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 tracking-tight uppercase select-all">
          {selectedTab === 'overview' && 'Painel Geral'}
          {selectedTab === 'products' && 'Produtos e Estoque'}
          {selectedTab === 'logs' && 'Logs e Auditoria'}
          {selectedTab === 'settings' && 'Preferências Bling'}
        </span>
      </div>

      <div className="flex items-center gap-2.5 font-sans">
        {/* Compact mode indicator / key shortcut */}
        <button 
          onClick={() => {
            const next = !isCompact;
            setIsCompact(next);
            addToast(next ? 'Modo compacto ativado' : 'Modo confortável ativado', 'info');
          }}
          className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
            isCompact 
              ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400' 
              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
          title="Atalho: Alt+C"
        >
          <SlidersHorizontal className="w-3 h-3 text-indigo-500" />
          <span className="hidden sm:inline">{isCompact ? 'Compacto: ON' : 'Compacto: OFF'}</span>
        </button>

        {/* Quick Cache Selector */}
        <div className="flex items-center bg-slate-50 dark:bg-slate-900 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] font-bold gap-2">
          <span className="text-slate-505 dark:text-slate-350 uppercase tracking-widest text-[9px] hidden xs:inline block">Cache Local:</span>
          <button 
            onClick={() => {
              const next = !useCache;
              setUseCache(next);
              addToast(next ? 'Utilizando cache local otimizado' : 'Utilizando requisições limpas da API', 'info');
            }}
            className={`px-2 py-0.5 rounded-lg text-[9px] font-black transition-all cursor-pointer ${
              useCache 
                ? 'bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950'
            }`}
          >
            {useCache ? 'Fast-Load' : 'API Real'}
          </button>
        </div>
      </div>
    </header>
  );
}
