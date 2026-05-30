import React, { useState } from 'react';
import { 
  ArrowLeft, Save, Box, Tag, Scale, MapPin, Layers, LayoutGrid, Barcode, Image, Trash2, Globe
} from 'lucide-react';
import { BlingProduct } from '../../shared/types';

interface ProductDetailViewProps {
  product: BlingProduct;
  onBack: () => void;
  onSave: () => Promise<void>;
  theme: 'light' | 'dark';
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

type FormTab = 'geral' | 'logistica' | 'dimensoes' | 'marketing';

export default function ProductDetailView({
  product,
  onBack,
  onSave,
  theme,
  addToast
}: ProductDetailViewProps) {
  const [activeTab, setActiveTab] = useState<FormTab>('geral');
  const [saving, setSaving] = useState(false);

  // Form states based on BlingProduct model
  const [nome, setNome] = useState(product.nome);
  const [codigo, setCodigo] = useState(product.codigo || '');
  const [preco, setPreco] = useState(product.preco !== undefined ? String(product.preco) : '');
  const [precoCusto, setPrecoCusto] = useState(product.precoCusto !== undefined ? String(product.precoCusto) : '');
  const [estoqueValue, setEstoqueValue] = useState(product.estoqueValue !== undefined ? String(product.estoqueValue) : '');
  const [tipo, setTipo] = useState(product.tipo || 'P');
  const [situacao, setSituacao] = useState(product.situacao || 'A');
  const [formato, setFormato] = useState(product.formato || 'S');
  const [descricaoCurta, setDescricaoCurta] = useState(product.descricaoCurta || '');
  const [imagemURL, setImagemURL] = useState(product.imagemURL || '');
  const [categoria, setCategoria] = useState(product.categoria || 'Geral');
  
  const [pesoLiquido, setPesoLiquido] = useState(product.pesoLiquido !== undefined ? String(product.pesoLiquido) : '');
  const [pesoBruto, setPesoBruto] = useState(product.pesoBruto !== undefined ? String(product.pesoBruto) : '');
  const [unidade, setUnidade] = useState(product.unidade || 'UN');
  const [marca, setMarca] = useState(product.marca || '');
  const [gtin, setGtin] = useState(product.gtin || '');
  const [localizacao, setLocalizacao] = useState(product.localizacao || '');

  // Dimensions
  const [largura, setLargura] = useState(product.dimensoes?.largura !== undefined ? String(product.dimensoes.largura) : '');
  const [altura, setAltura] = useState(product.dimensoes?.altura !== undefined ? String(product.dimensoes.altura) : '');
  const [profundidade, setProfundidade] = useState(product.dimensoes?.profundidade !== undefined ? String(product.dimensoes.profundidade) : '');
  const [unidadeMedida, setUnidadeMedida] = useState(product.dimensoes?.unidadeMedida !== undefined ? String(product.dimensoes.unidadeMedida) : '1');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      addToast('O campo Nome é obrigatório.', 'error');
      return;
    }

    setSaving(true);
    try {
      const parsedPreco = preco === '' ? undefined : parseFloat(preco);
      const parsedPrecoCusto = precoCusto === '' ? undefined : parseFloat(precoCusto);
      const parsedEstoque = estoqueValue === '' ? undefined : parseInt(estoqueValue, 10);
      const parsedPesoLiquido = pesoLiquido === '' ? undefined : parseFloat(pesoLiquido);
      const parsedPesoBruto = pesoBruto === '' ? undefined : parseFloat(pesoBruto);
      const parsedLargura = largura === '' ? undefined : parseFloat(largura);
      const parsedAltura = altura === '' ? undefined : parseFloat(altura);
      const parsedProfundidade = profundidade === '' ? undefined : parseFloat(profundidade);
      const parsedUnidadeMedida = unidadeMedida === '' ? undefined : parseInt(unidadeMedida, 10);

      const token = localStorage.getItem('bling_token') || '';

      const response = await fetch('/api/products/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idProduto: product.id,
          nome,
          codigo,
          preco: isNaN(Number(parsedPreco)) ? undefined : parsedPreco,
          precoCusto: isNaN(Number(parsedPrecoCusto)) ? undefined : parsedPrecoCusto,
          estoqueValue: isNaN(Number(parsedEstoque)) ? undefined : parsedEstoque,
          tipo,
          situacao,
          formato,
          descricaoCurta,
          imagemURL,
          categoria,
          pesoLiquido: isNaN(Number(parsedPesoLiquido)) ? undefined : parsedPesoLiquido,
          pesoBruto: isNaN(Number(parsedPesoBruto)) ? undefined : parsedPesoBruto,
          unidade,
          marca,
          gtin,
          localizacao,
          dimensoes: (parsedLargura || parsedAltura || parsedProfundidade) ? {
            largura: parsedLargura,
            altura: parsedAltura,
            profundidade: parsedProfundidade,
            unidadeMedida: parsedUnidadeMedida
          } : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro desconhecido na sincronização.');
      }

      const result = await response.json();
      addToast(`Alterações do produto "${nome}" salvas com sucesso no Bling!`, 'success');
      await onSave(); // triggers lists/stats reload inside App parent
      onBack();
    } catch (error: any) {
      console.error(error);
      addToast(error.message || 'Falha ao salvar produto no Bling ERP.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'geral' as const, label: 'Geral & Precificação', icon: Layers },
    { id: 'logistica' as const, label: 'Físico & Estoque', icon: Scale },
    { id: 'dimensoes' as const, label: 'Dimensões (cm)', icon: LayoutGrid },
    { id: 'marketing' as const, label: 'Marketing & Mídia', icon: Image }
  ];

  return (
    <div id="product-detail-layout" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden font-sans animate-fade-in">
      {/* Header Panel */}
      <div className="border-b border-slate-250 dark:border-slate-800/80 px-6 py-4.5 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 rounded-xl transition-all cursor-pointer border border-slate-250/60 dark:border-slate-750 bg-white dark:bg-slate-850 shadow-3xs"
            title="Voltar para Lista"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-900/30">ID: {product.id}</span>
              <span className="text-[10px] font-mono font-extrabold text-amber-600 dark:text-amber-400 bg-amber-55/10 dark:bg-amber-950/20 px-2 py-0.5 rounded-md border border-amber-200/30 dark:border-amber-900/30">SKU: {codigo || 'SEM COD.'}</span>
            </div>
            <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 mt-1 max-w-sm sm:max-w-md lg:max-w-2xl truncate">{nome || 'Novo Produto'}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onBack}
            className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-250 dark:border-slate-700/80 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-3xs"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Save className={`w-3.5 h-3.5 ${saving ? 'animate-pulse' : ''}`} />
            {saving ? 'Gravando...' : 'Salvar Bling'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Navigation Tabs Rail */}
        <div className="lg:col-span-3 border-r border-slate-250 dark:border-slate-800 p-4 bg-slate-50/10 dark:bg-slate-950/10">
          <div className="space-y-1.5">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-750 dark:text-indigo-350 border border-indigo-200/50 dark:border-indigo-900/40 shadow-3xs' 
                      : 'text-slate-650 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <TabIcon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-450'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Lateral Image Thumbnail preview Card */}
          <div className="mt-6 border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-950/40 shadow-3xs text-center select-none">
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest mb-3">Encarte de Mídia</span>
            {imagemURL ? (
              <img 
                referrerPolicy="no-referrer"
                src={imagemURL} 
                alt="Encarte de Produto" 
                className="w-32 h-32 object-cover mx-auto rounded-lg border border-slate-250 dark:border-slate-750 shadow-3xs bg-slate-50"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-32 h-32 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-1 mx-auto">
                <Image className="w-9 h-9 opacity-45" />
                <span className="text-[8px] font-bold uppercase tracking-wider">Sem Imagem</span>
              </div>
            )}
            <span className="text-[10px] font-bold text-slate-500 block mt-2.5 truncate max-w-[180px] mx-auto">{nome || 'Pristine SKU'}</span>
          </div>
        </div>

        {/* Editing Panels Workspace */}
        <form onSubmit={handleSubmit} className="lg:col-span-9 p-6 sm:p-8 space-y-6">
          {activeTab === 'geral' && (
            <div className="space-y-6">
              <div className="border-b border-slate-150 dark:border-slate-800/50 pb-3">
                <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-wider">
                  <Box className="w-4 h-4 text-indigo-650" />
                  Informações Essenciais
                </h3>
                <p className="text-2xs text-slate-450 mt-1">Identificação principal do produto na árvore de cadastros ERP.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-slate-800 dark:text-slate-200">
                <div className="md:col-span-8">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Nome Completo do Produto <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    maxLength={120}
                    className="w-full h-10 px-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-sans text-xs font-bold text-slate-850 dark:text-slate-150 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                    placeholder="Ex: Camiseta Algodão Egípcio Premium G"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Código SKU Principal</label>
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-mono text-xs font-black text-slate-800 dark:text-slate-150 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                    placeholder="Ex: CAM-ALG-PRM-G"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Preço Unitário Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-mono text-xs font-extrabold text-slate-800 dark:text-slate-150 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                    placeholder="0.00"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Preço Unitário de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precoCusto}
                    onChange={(e) => setPrecoCusto(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-mono text-xs font-extrabold text-slate-800 dark:text-slate-150 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                    placeholder="0.00"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Saldo Virtual Estoque</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={estoqueValue}
                    onChange={(e) => setEstoqueValue(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-mono text-xs font-extrabold text-slate-800 dark:text-slate-150 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                    placeholder="0"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Tipo de Registro</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-sans text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                  >
                    <option value="P">📦 Produto Geral</option>
                    <option value="S">🛠️ Serviço</option>
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Formato Venda</label>
                  <select
                    value={formato}
                    onChange={(e) => setFormato(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-sans text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                  >
                    <option value="S">Simples</option>
                    <option value="V">Com Variações</option>
                    <option value="E">Estrutura (Kit)</option>
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Situação Cadastral</label>
                  <select
                    value={situacao}
                    onChange={(e) => setSituacao(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-sans text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                  >
                    <option value="A">✅ Ativo no Catálogo</option>
                    <option value="I">🛑 Inativo / Arquivado</option>
                  </select>
                </div>

                <div className="md:col-span-6">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Setor de Categoria ERP</label>
                  <input
                    type="text"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-sans text-xs font-bold text-slate-800 dark:text-slate-150 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                    placeholder="Ex: Eletrônicos & Celulares"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logistica' && (
            <div className="space-y-6">
              <div className="border-b border-slate-150 dark:border-slate-800/50 pb-3">
                <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-wider">
                  <Scale className="w-4 h-4 text-amber-550" />
                  Pesos, Localização & Logística
                </h3>
                <p className="text-2xs text-slate-450 mt-1">Definições físicas importantes para faturamento e fretes integrados.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-4">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Peso Líquido (kg)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={pesoLiquido}
                    onChange={(e) => setPesoLiquido(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-mono text-xs font-extrabold text-slate-800 dark:text-slate-150 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                    placeholder="0.000"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Peso Bruto (kg)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={pesoBruto}
                    onChange={(e) => setPesoBruto(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-mono text-xs font-extrabold text-slate-800 dark:text-slate-150 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                    placeholder="0.000"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Unidade de Medida Comercial</label>
                  <input
                    type="text"
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-sans text-xs font-bold text-slate-800 dark:text-slate-150 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                    placeholder="Ex: UN, PC, M, KG"
                  />
                </div>

                <div className="md:col-span-6">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Código de Barras EAN (GTIN)</label>
                  <div className="relative">
                    <Barcode className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={gtin}
                      onChange={(e) => setGtin(e.target.value)}
                      className="w-full h-10 pl-10 pr-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-mono text-xs font-extrabold text-slate-800 dark:text-slate-150 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                      placeholder="Ex: 7891234567890"
                    />
                  </div>
                </div>

                <div className="md:col-span-6">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Fabricante / Marca Comercial</label>
                  <input
                    type="text"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-sans text-xs font-bold text-slate-800 dark:text-slate-150 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                    placeholder="Ex: Nike, Phillips, Nestlé"
                  />
                </div>

                <div className="md:col-span-12">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Endereço de Localização Física (Prateleira / Depósito)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={localizacao}
                      onChange={(e) => setLocalizacao(e.target.value)}
                      className="w-full h-10 pl-10 pr-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-sans text-xs font-semibold text-slate-800 dark:text-slate-150 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                      placeholder="Ex: Corredor B, Estante 4, Prateleira 2"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dimensoes' && (
            <div className="space-y-6">
              <div className="border-b border-slate-150 dark:border-slate-800/50 pb-3">
                <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-wider">
                  <LayoutGrid className="w-4 h-4 text-emerald-600" />
                  Dimensões Logísticas
                </h3>
                <p className="text-2xs text-slate-450 mt-1">Cálculo volumétrico para emissão de guias de despacho ECT Correios.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Largura (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={largura}
                    onChange={(e) => setLargura(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-mono text-xs font-extrabold text-slate-800 dark:text-slate-150 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                    placeholder="0.0"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Altura (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={altura}
                    onChange={(e) => setAltura(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-mono text-xs font-extrabold text-slate-800 dark:text-slate-150 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                    placeholder="0.0"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Profundidade (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={profundidade}
                    onChange={(e) => setProfundidade(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-mono text-xs font-extrabold text-slate-800 dark:text-slate-150 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                    placeholder="0.0"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Unidade Padrão</label>
                  <select
                    value={unidadeMedida}
                    onChange={(e) => setUnidadeMedida(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-sans text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                  >
                    <option value="1">Milímetros</option>
                    <option value="2">Centímetros</option>
                    <option value="3">Metros</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'marketing' && (
            <div className="space-y-6">
              <div className="border-b border-slate-150 dark:border-slate-800/50 pb-3">
                <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-wider">
                  <Image className="w-4 h-4 text-rose-500" />
                  Mídia & Descrição Corporativa
                </h3>
                <p className="text-2xs text-slate-450 mt-1">Textos de apoio a vendas de e-commerce e portais de B2B integrados.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">URL da Imagem do Produto</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="url"
                      value={imagemURL}
                      onChange={(e) => setImagemURL(e.target.value)}
                      className="w-full h-10 pl-10 pr-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-sans text-xs font-semibold text-slate-800 dark:text-slate-150 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                      placeholder="https://exemplo.com/imagens/produto.jpg"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-350 dark:text-slate-450 block mb-1.5">Descrição Curta / Comercial HTML</label>
                  <textarea
                    rows={6}
                    value={descricaoCurta}
                    onChange={(e) => setDescricaoCurta(e.target.value)}
                    className="w-full p-4 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-sans text-xs font-medium text-slate-700 dark:text-slate-205 focus:border-indigo-500 focus:outline-none transition-all shadow-3xs"
                    placeholder="Escreva uma breve descrição informativa que será enviada para o catálogo ou integração de e-commerce..."
                  />
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
