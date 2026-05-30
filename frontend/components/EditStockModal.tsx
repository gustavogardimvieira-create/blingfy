import React from 'react';
import { RefreshCw } from 'lucide-react';
import { BlingProduct } from '../../shared/types';

interface EditStockModalProps {
  product: BlingProduct;
  newStock: string;
  setNewStock: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  onClose: () => void;
}

export default function EditStockModal({
  product,
  newStock,
  setNewStock,
  onSubmit,
  submitting,
  onClose
}: EditStockModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 relative select-none text-xs">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mb-1 font-sans">
          Ajustar Saldo Real do Estoque
        </h3>
        <p className="text-2xs text-slate-500 dark:text-slate-400 mb-4 truncate font-semibold">
          {product.nome}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-2xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1.5 font-sans">
              Estoque de Destino (Saldo Total Final)
            </label>
            <input
              type="number"
              step="1"
              required
              autoFocus
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:ring-2 focus:ring-indigo-500/15 focus:outline-none font-mono text-xs text-slate-950 dark:text-white"
            />
            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal block mt-2.5 font-medium font-sans">
              Informação: Executará um lançador com operação de <strong className="text-indigo-600 dark:text-indigo-400 font-mono">Balanço (B)</strong>, subscrevendo o valor do estoque no depósito padrão indicado pelo Bling ERP v3 para a quantidade inserida.
            </span>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-2xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-2 text-2xs font-bold rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              {submitting && <RefreshCw className="animate-spin w-3 h-3" />}
              Atualizar Estoque
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
