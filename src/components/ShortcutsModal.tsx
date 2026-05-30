import React from 'react';
import { Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  onClose: () => void;
}

export default function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 relative select-none text-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
          <Keyboard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Atalhos de Teclado
        </h3>
        <p className="text-2xs text-slate-500 dark:text-slate-400 mb-4 font-semibold">Desempenho SaaS instantâneo para operação ágil.</p>

        <div className="space-y-2 text-[10.5px]">
          <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/85">
            <span className="text-slate-700 dark:text-slate-300 font-bold">Focar caixa de busca</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-2xs font-extrabold text-slate-800 dark:text-slate-200">/</kbd>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/85">
            <span className="text-slate-700 dark:text-slate-300 font-bold">Alternar Visão Geral</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-2xs font-extrabold text-slate-800 dark:text-slate-200">1</kbd>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/85">
            <span className="text-slate-700 dark:text-slate-300 font-bold">Alternar Produtos</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-2xs font-extrabold text-slate-800 dark:text-slate-200">2</kbd>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/85">
            <span className="text-slate-700 dark:text-slate-300 font-bold">Alternar Auditoria/Logs</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-2xs font-extrabold text-slate-800 dark:text-slate-200">3</kbd>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/85">
            <span className="text-slate-700 dark:text-slate-300 font-bold">Alternar Configurações</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-2xs font-extrabold text-slate-800 dark:text-slate-200">4</kbd>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/85">
            <span className="text-slate-700 dark:text-slate-300 font-bold">Modo Compacto</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-2xs font-extrabold text-slate-800 dark:text-slate-200">Alt + C</kbd>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/85">
            <span className="text-slate-700 dark:text-slate-300 font-bold">Exportar CSV</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-2xs font-extrabold text-slate-800 dark:text-slate-200">Alt + E</kbd>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/85">
            <span className="text-slate-700 dark:text-slate-300 font-bold">Sincronizar API</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-2xs font-extrabold text-slate-800 dark:text-slate-200">Alt + S</kbd>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/85">
            <span className="text-slate-700 dark:text-slate-300 font-bold">Alternar Tema Escuro</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-2xs font-extrabold text-slate-800 dark:text-slate-200">Alt + T</kbd>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/85">
            <span className="text-slate-700 dark:text-slate-300 font-bold">Sair / Fechar Painel</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-2xs font-extrabold text-slate-800 dark:text-slate-200">Esc</kbd>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition cursor-pointer"
        >
          Compreendido
        </button>
      </div>
    </div>
  );
}
