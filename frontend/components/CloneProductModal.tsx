import React, { useState } from 'react';
import { X, Check, RefreshCw, Copy, AlertCircle } from 'lucide-react';
import { BlingProduct } from '../../shared/types';

interface CloneProductModalProps {
  product: BlingProduct;
  onClose: () => void;
  token: string;
  loadProducts: () => void;
  loadStats: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  theme: 'light' | 'dark';
}

export default function CloneProductModal({
  product,
  onClose,
  token,
  loadProducts,
  loadStats,
  addToast,
  theme
}: CloneProductModalProps) {
  const [novoNome, setNovoNome] = useState(`${product.nome} (Cópia)`);
  const [novoSku, setNovoSku] = useState(`${product.codigo || ''}-DOP`);
  
  const [skuCheckStatus, setSkuCheckStatus] = useState<'idle' | 'checking' | 'available' | 'duplicate'>('idle');
  const [existingDuplicateInfo, setExistingDuplicateInfo] = useState<{ id?: number; nome?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    if (!novoNome.trim()) {
      errors.nome = 'O nome do produto é obrigatório.';
    }
    if (!novoSku.trim()) {
      errors.sku = 'O SKU (código) é obrigatório.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const triggerSkuVerification = async (skuStr: string) => {
    if (!skuStr.trim()) return;
    setSkuCheckStatus('checking');
    try {
      const res = await fetch(`/api/products/check-sku/${encodeURIComponent(skuStr.trim())}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.exists) {
        setSkuCheckStatus('duplicate');
        setExistingDuplicateInfo({ id: data.id, nome: data.nome });
        addToast('Aviso: Já existe um produto cadastrado com este SKU.', 'info');
      } else {
        setSkuCheckStatus('available');
        setExistingDuplicateInfo(null);
      }
    } catch {
      setSkuCheckStatus('idle');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      addToast('Por favor, corrija os erros no formulário antes de continuar.', 'error');
      return;
    }

    if (skuCheckStatus === 'duplicate') {
      const confirmForce = window.confirm(
        `Já existe um produto com o SKU "${novoSku}" (${existingDuplicateInfo?.nome || 'N/A'}). Deseja alterar o SKU antes de continuar?`
      );
      if (confirmForce) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/products/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nome: novoNome.trim(),
          codigo: novoSku.trim(),
          preco: product.preco,
          precoCusto: product.precoCusto,
          tipo: product.tipo,
          situacao: product.situacao,
          formato: product.formato,
          descricaoCurta: product.descricaoCurta,
          categoria: product.categoria || 'Geral',
          marca: product.marca,
          gtin: product.gtin,
          pesoLiquido: product.pesoLiquido,
          pesoBruto: product.pesoBruto,
          unidade: product.unidade,
          localizacao: product.localizacao,
          imagemURL: product.imagemURL,
          estoqueInicial: 0 // Default to zero for cloned item
        })
      });

      const resData = await response.json();
      if (response.ok && resData.ok) {
        addToast(`Produto duplicado com sucesso! Código SKU: ${novoSku}`, 'success');
        loadProducts();
        loadStats();
        onClose();
      } else {
        addToast(`Bling: ${resData.error || 'Não foi possível duplicar o produto.'}`, 'error');
      }
    } catch (err) {
      addToast('Ocorreu uma falha na conexão de rede para duplicar.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col transition-all">
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/55 dark:bg-slate-950/20 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide text-slate-800 dark:text-slate-100 uppercase">
                Duplicar Produto
              </h2>
              <p className="text-[9px] text-slate-550 uppercase tracking-wider font-extrabold mt-0.5">
                Clonagem Rápida no Bling ERP
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-10 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-705 dark:hover:text-slate-300 cursor-pointer text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* WORKSPACE FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="p-3 border border-indigo-200/40 bg-indigo-500/[0.02] dark:bg-indigo-950/20 rounded-xl space-y-1">
            <p className="text-[10px] uppercase font-black tracking-widest text-indigo-600 dark:text-indigo-400">
              Produto de Origem
            </p>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {product.nome}
            </p>
            <p className="text-[10px] font-mono text-slate-400">
              SKU: {product.codigo || 'SEM COD.'} | Preço: R$ {product.preco?.toFixed(2) || '0.00'}
            </p>
          </div>

          <div className="space-y-4">
            {/* NOVO NOME */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Novo nome do produto *
              </label>
              <input
                type="text"
                required
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className={`w-full bg-slate-50 dark:bg-slate-950 border ${
                  formErrors.nome ? 'border-rose-500 font-bold' : 'border-slate-200 dark:border-slate-850'
                } text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                placeholder="Informe o nome para o clone"
              />
              {formErrors.nome && <p className="text-[10px] text-rose-500 font-semibold">{formErrors.nome}</p>}
            </div>

            {/* NOVO SKU */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Novo SKU (Código Interno) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={novoSku}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setNovoSku(val);
                    setSkuCheckStatus('idle');
                  }}
                  onBlur={(e) => triggerSkuVerification(e.target.value)}
                  className={`w-full bg-slate-50 dark:bg-slate-950 border ${
                    formErrors.sku ? 'border-rose-500 font-bold' : 'border-slate-200 dark:border-slate-850'
                  } text-xs font-semibold p-2.5 pr-10 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono`}
                  placeholder="Novo SKU do clone"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                  {skuCheckStatus === 'checking' && <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
                  {skuCheckStatus === 'available' && <Check className="w-3.5 h-3.5 text-emerald-500" title="SKU Disponível" />}
                  {skuCheckStatus === 'duplicate' && (
                    <div className="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-rose-500 text-white font-black text-3xs" title="SKU duplicado!">!</div>
                  )}
                </div>
              </div>
              {formErrors.sku && <p className="text-[10px] text-rose-500 font-semibold">{formErrors.sku}</p>}
              {skuCheckStatus === 'duplicate' && (
                <p className="text-[10px] text-rose-500 font-semibold">
                  Já existe um produto com o SKU "{novoSku}" no Bling.
                </p>
              )}
            </div>
          </div>

          {/* READONLY METADATA TO INFORM AUTOMATIC CLONING SCOPE */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-150 dark:border-slate-850 space-y-1.5 text-[10px]">
            <p className="font-extrabold uppercase tracking-wide text-slate-400">
              Copiar automaticamente:
            </p>
            <div className="grid grid-cols-2 gap-1 font-mono text-[9px] uppercase text-slate-500">
              <div>• Categoria: {product.categoria || 'Geral'}</div>
              <div>• Preço: R$ {product.preco?.toFixed(2) || '0.00'}</div>
              <div>• Descrição: {product.descricaoCurta ? 'Sim' : 'Não'}</div>
              <div>• Marca: {product.marca || 'Nao def.'}</div>
              <div>• Peso Lq: {product.pesoLiquido ?? '0'} kg</div>
              <div>• Unidade: {product.unidade || 'UN'}</div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl text-slate-600 dark:text-slate-350 font-bold hover:bg-slate-105 dark:hover:bg-slate-800 transition-all uppercase text-3xs tracking-wider cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold uppercase text-3xs tracking-widest shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Duplicando...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Confirmar Clonagem
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
