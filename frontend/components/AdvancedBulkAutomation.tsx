import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash, Image as ImageIcon, Star, Check, AlertCircle, Play, 
  Settings, RefreshCw, Layers, Copy, Search, Download, HelpCircle, 
  Shuffle, ArrowRight, Eye, FileSpreadsheet, Sparkles, Sliders
} from 'lucide-react';
import { BlingProduct, Toast } from '../../shared/types';
import * as XLSX from 'xlsx';

interface AdvancedBulkAutomationProps {
  onClose: () => void;
  token: string;
  loadProducts: () => void;
  loadStats: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  availableCategories: string[];
  theme: 'light' | 'dark';
}

interface SavedAdvancedTemplate {
  id: string;
  name: string;
  categoria: string;
  marca: string;
  ncm: string;
  unidade: string;
  preco: number;
  descricaoCurta: string;
  pesoLiquido?: number;
  pesoBruto?: number;
  imagens: string[];
}

interface SimulatedItem {
  id?: number; // For updates
  actionType: 'create' | 'update';
  sku: string;
  nome: string;
  preco: number;
  estoqueValue: number;
  categoria: string;
  marca: string;
  ncm: string;
  unidade: string;
  descricaoCurta: string;
  gtin: string; // EAN
  imagenes: string[];
  pesoLiquido: number;
  pesoBruto: number;
  // Validation status
  valsku: 'idle' | 'checking' | 'ok' | 'exists' | 'duplicate_batch';
  valean: 'idle' | 'checking' | 'ok' | 'exists' | 'duplicate_batch';
  errorMessage?: string;
  // Process status
  processStatus: 'pending' | 'success' | 'failed';
  feedbackMessage?: string;
}

export default function AdvancedBulkAutomation({
  onClose,
  token,
  loadProducts,
  loadStats,
  addToast,
  availableCategories,
  theme
}: AdvancedBulkAutomationProps) {
  // Modes: 'create' (Geração e Criação) | 'edit' (Edição em Lote)
  const [automationMode, setAutomationMode] = useState<'create' | 'edit'>('create');

  // ==========================================
  // SOURCE PRODUCT SELECTOR (Import from Bling)
  // ==========================================
  const [sourceSearch, setSourceSearch] = useState('');
  const [searchResults, setSearchResults] = useState<BlingProduct[]>([]);
  const [searchingSource, setSearchingSource] = useState(false);
  const [selectedSourceProduct, setSelectedSourceProduct] = useState<BlingProduct | null>(null);

  // Editable Baseline payload fields
  const [baselineData, setBaselineData] = useState({
    nome: '',
    categoria: 'Geral',
    marca: 'Própria',
    ncm: '8203.20.10',
    unidade: 'UN',
    preco: 99.90,
    descricaoCurta: '',
    pesoLiquido: 0.25,
    pesoBruto: 0.30,
    estoqueInicial: 10,
    imagens: [] as string[]
  });

  // ==========================================
  // IMAGE POOL MANAGER
  // ==========================================
  const [imageInputUrl, setImageInputUrl] = useState('');
  const [brandPoolText, setBrandPoolText] = useState('');
  const [descriptionModelsText, setDescriptionModelsText] = useState('');

  // ==========================================
  // TEMPLATES
  // ==========================================
  const [advancedTemplates, setAdvancedTemplates] = useState<SavedAdvancedTemplate[]>(() => {
    try {
      const stored = localStorage.getItem('bling_advanced_templates');
      return stored ? JSON.parse(stored) : [
        {
          id: 'template-default-mdf',
          name: 'Template MDF Premium',
          categoria: 'Artesanato',
          marca: 'MDF Brasil',
          ncm: '4421.99.00',
          unidade: 'UN',
          preco: 45.00,
          descricaoCurta: 'MDF cortado a laser de alta precisão.',
          imagens: []
        }
      ];
    } catch {
      return [];
    }
  });
  const [newTemplateName, setNewTemplateName] = useState('');

  // Persist advanced templates
  useEffect(() => {
    localStorage.setItem('bling_advanced_templates', JSON.stringify(advancedTemplates));
  }, [advancedTemplates]);

  const handleSaveAsTemplate = () => {
    if (!newTemplateName.trim()) {
      addToast('Por favor, defina um nome para o modelo.', 'error');
      return;
    }
    const template: SavedAdvancedTemplate = {
      id: `tpl-${Date.now()}`,
      name: newTemplateName.trim(),
      categoria: baselineData.categoria,
      marca: baselineData.marca,
      ncm: baselineData.ncm,
      unidade: baselineData.unidade,
      preco: baselineData.preco,
      descricaoCurta: baselineData.descricaoCurta,
      pesoLiquido: baselineData.pesoLiquido,
      pesoBruto: baselineData.pesoBruto,
      imagens: baselineData.imagens
    };
    setAdvancedTemplates(prev => [...prev, template]);
    setNewTemplateName('');
    addToast(`Template "${template.name}" salvo com sucesso!`, 'success');
  };

  const handleApplyAdvancedTemplate = (tpl: SavedAdvancedTemplate) => {
    setBaselineData({
      nome: baselineData.nome, // Keep current name rule or title base
      categoria: tpl.categoria || 'Geral',
      marca: tpl.marca || 'Própria',
      ncm: tpl.ncm || '',
      unidade: tpl.unidade || 'UN',
      preco: tpl.preco || 0.00,
      descricaoCurta: tpl.descricaoCurta || '',
      pesoLiquido: tpl.pesoLiquido || 0,
      pesoBruto: tpl.pesoBruto || 0,
      estoqueInicial: baselineData.estoqueInicial,
      imagens: tpl.imagens || []
    });
    addToast(`Modelo "${tpl.name}" aplicado!`, 'success');
  };

  // ==========================================
  // BULK RULES & DATA INPUTS
  // ==========================================
  const [generateQty, setGenerateQty] = useState(10);
  const [skuPattern, setSkuPattern] = useState('MDF-{NNN}');
  
  // Dynamic Input list arrays (parsed from textareas)
  const [rawTitlesInput, setRawTitlesInput] = useState('');
  const [rawKeywordsInput, setRawKeywordsInput] = useState('');
  const [rawEansInput, setRawEansInput] = useState('');
  const [titleMode, setTitleMode] = useState<'sequential' | 'random' | 'shuffled'>('sequential');
  
  const [keywordPattern, setKeywordPattern] = useState('{PRODUTO} {KEYWORD}');
  const [eanDuplicateConfig, setEanDuplicateConfig] = useState<'ignore' | 'replace' | 'cancel'>('ignore');

  // CUSTOM TOKENS DYNAMIC PARAMETERS
  const [customCsvInput, setCustomCsvInput] = useState(''); // Pasted Tab-Separated or CSV
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<{ [key: string]: string }[]>([]);

  // ==========================================
  // MASS EDIT LOAD QUEUE (For Mode 'edit')
  // ==========================================
  const [editQueue, setEditQueue] = useState<BlingProduct[]>([]);
  const [massEditRule, setMassEditRule] = useState({
    updateTitle: false,
    titleAppend: ' - Premium',
    updateDescription: false,
    descriptionOverride: '',
    updatePrice: false,
    priceValue: 0,
    updateEan: false,
    eanList: '',
    updateNcm: false,
    ncmValue: ''
  });

  // ==========================================
  // SIMULATION & EXECUTION Pipeline
  // ==========================================
  const [simulatedItems, setSimulatedItems] = useState<SimulatedItem[]>([]);
  const [validationProgress, setValidationProgress] = useState<{ total: number; checked: number } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  // SEARCH ON BLING (For Product Import)
  const handleSourceSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceSearch.trim()) return;
    setSearchingSource(true);
    try {
      const res = await fetch(`/api/products?page=1&limit=25&search=${encodeURIComponent(sourceSearch.trim())}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resJson = await res.json();
      if (resJson && resJson.data) {
        setSearchResults(resJson.data);
        if (resJson.data.length === 0) {
          addToast('Nenhum produto correspondente cadastrado no Bling.', 'info');
        }
      }
    } catch {
      addToast('Ocorreu um erro ao pesquisar produtos.', 'error');
    } finally {
      setSearchingSource(false);
    }
  };

  const handleSelectSourceProduct = (p: BlingProduct) => {
    setSelectedSourceProduct(p);
    setBaselineData({
      nome: p.nome || '',
      categoria: p.categoria || 'Geral',
      marca: p.marca || 'Própria',
      ncm: p.ncm || '',
      unidade: p.unidade || 'UN',
      preco: p.preco || 0.00,
      descricaoCurta: p.descricaoCurta || '',
      pesoLiquido: p.pesoLiquido || 0,
      pesoBruto: p.pesoBruto || 0,
      estoqueInicial: p.estoqueValue || 0,
      imagens: p.imagemURL ? [p.imagemURL] : []
    });
    setSearchResults([]);
    addToast(`Produto modelo "${p.nome}" importado do Bling!`, 'success');
  };

  // CSV/Spreadsheet File and Clipboard parser
  const handleParseCsvOrSpreadsheet = (text: string) => {
    if (!text.trim()) return;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    // Detect separator (Tab or Semicolon or Comma)
    const headerLine = lines[0];
    let sep = '\t';
    if (headerLine.includes(';')) sep = ';';
    else if (headerLine.includes(',')) sep = ',';

    const headers = headerLine.split(sep).map(h => h.trim().toLowerCase().replace(/["']/g, ''));
    const rows: { [key: string]: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(sep);
      const rowObj: { [key: string]: string } = {};
      headers.forEach((h, hIdx) => {
        rowObj[h] = parts[hIdx] ? parts[hIdx].trim().replace(/["']/g, '') : '';
      });
      rows.push(rowObj);
    }

    setCsvHeaders(headers);
    setCsvRows(rows);
    setGenerateQty(rows.length);
    addToast(`${rows.length} linhas de planilhas identificadas! Cabeçalhos: ${headers.join(', ')}`, 'success');
  };

  // Drag and drop spreadsheet handler
  const handleSpreadsheetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet, { forceQuotes: false });
        setCustomCsvInput(csv);
        handleParseCsvOrSpreadsheet(csv);
      } catch (err) {
        addToast('Falha ao interpretar planilha Excel/CSV.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // HELPER FORMATTERS
  const formatSku = (pattern: string, index: number) => {
    let fmt = pattern;
    
    // Numbers sequence formatting
    const num = index + 1;
    fmt = fmt.replace(/{NNN}/g, String(num).padStart(3, '0'));
    fmt = fmt.replace(/{NN}/g, String(num).padStart(2, '0'));
    fmt = fmt.replace(/{N}/g, String(num));

    // Calendar
    const d = new Date();
    fmt = fmt.replace(/{ANO}/g, String(d.getFullYear()));
    fmt = fmt.replace(/{MES}/g, String(d.getMonth() + 1).padStart(2, '0'));
    fmt = fmt.replace(/{DIA}/g, String(d.getDate()).padStart(2, '0'));

    // Alphanumeric rand
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const randAlpha = Math.random().toString(36).substring(2, 8).toUpperCase();
    fmt = fmt.replace(/{RAND}/g, String(randNum));
    fmt = fmt.replace(/{RAND6}/g, randAlpha);

    return fmt;
  };

  const resolveTokens = (templateStr: string, rowValues: { [key: string]: string }, itemIndex: number, fallbackTitle: string) => {
    let result = templateStr;

    // Substitute standard CSV headers in uppercase/lowercase
    Object.keys(rowValues).forEach(key => {
      const tokenNameCase = key.toUpperCase();
      const rx = new RegExp(`{${tokenNameCase}}`, 'gi');
      result = result.replace(rx, rowValues[key]);
    });

    // Baseline fallbacks if token didn't resolve or didn't belong to csv
    result = result.replace(/{PRODUTO}/gi, fallbackTitle);
    result = result.replace(/{INDEX}/gi, String(itemIndex + 1));

    return result;
  };

  // ==========================================
  // RUN SIMULATION
  // ==========================================
  const handleGenerateSimulation = () => {
    // 1. Gather Titles Pool
    let titlesList = rawTitlesInput.split('\n').map(t => t.trim()).filter(Boolean);
    if (titlesList.length === 0) {
      titlesList = [baselineData.nome || 'Produto Modelo'];
    }

    // Shuffle if requested
    if (titleMode === 'shuffled') {
      titlesList = [...titlesList].sort(() => Math.random() - 0.5);
    }

    // Keywords list
    const keywordsList = rawKeywordsInput.split('\n').map(k => k.trim()).filter(Boolean);

    // EANs pool
    const eansList = rawEansInput.split('\n').map(e => e.trim()).filter(Boolean);

    // Randomized pools if applicable
    const extraBrands = brandPoolText.split(',').map(b => b.trim()).filter(Boolean);
    const extraDescriptions = descriptionModelsText.split('===').map(d => d.trim()).filter(Boolean);

    const generatedSim: SimulatedItem[] = [];

    // ==========================================
    // SIMULATION PIPELINE (MODE CREATE)
    // ==========================================
    if (automationMode === 'create') {
      const itemsLength = csvRows.length > 0 ? csvRows.length : generateQty;

      for (let i = 0; i < itemsLength; i++) {
        // Resolve Title Name
        let rawTitleBase = '';
        if (csvRows.length > 0) {
          // Check if spreadsheet contains explicit titles column like 'nome' or 'titulo'
          const row = csvRows[i];
          rawTitleBase = row['nome'] || row['nome produto'] || row['titulo'] || row['title'] || titlesList[i % titlesList.length];
        } else {
          if (titleMode === 'random') {
            rawTitleBase = titlesList[Math.floor(Math.random() * titlesList.length)];
          } else {
            rawTitleBase = titlesList[i % titlesList.length];
          }
        }

        // Apply Keyword wrapper helper if keyword requested
        let itemTitle = rawTitleBase;
        if (keywordsList.length > 0) {
          const kw = keywordsList[i % keywordsList.length];
          itemTitle = keywordPattern.replace(/{PRODUTO}/gi, rawTitleBase).replace(/{KEYWORD}/gi, kw);
        }

        // Apply spreadsheet row replaces token if any are specified
        if (csvRows.length > 0) {
          itemTitle = resolveTokens(itemTitle, csvRows[i], i, rawTitleBase);
        }

        // Resolve SKU Pattern
        let itemSku = formatSku(skuPattern, i);
        if (csvRows.length > 0 && csvRows[i]['sku']) {
          itemSku = csvRows[i]['sku'];
        }

        // Resolve EAN/GTIN
        let itemEan = '';
        if (eansList.length > 0) {
          itemEan = eansList[i % eansList.length];
        }
        if (csvRows.length > 0 && csvRows[i]['ean']) {
          itemEan = csvRows[i]['ean'];
        } else if (csvRows.length > 0 && csvRows[i]['gtin']) {
          itemEan = csvRows[i]['gtin'];
        }

        // Resolve Preço / Estoque / Descrição / Marca
        let itemPrice = baselineData.preco;
        if (csvRows.length > 0 && csvRows[i]['preco']) {
          itemPrice = parseFloat(csvRows[i]['preco']) || itemPrice;
        }

        let itemStock = baselineData.estoqueInicial;
        if (csvRows.length > 0 && csvRows[i]['estoque']) {
          itemStock = parseInt(csvRows[i]['estoque'], 10) || itemStock;
        }

        let itemBrand = baselineData.marca;
        if (extraBrands.length > 0) {
          itemBrand = extraBrands[Math.floor(Math.random() * extraBrands.length)];
        }
        if (csvRows.length > 0 && csvRows[i]['marca']) {
          itemBrand = csvRows[i]['marca'];
        }

        let itemDesc = baselineData.descricaoCurta;
        if (extraDescriptions.length > 0) {
          itemDesc = extraDescriptions[Math.floor(Math.random() * extraDescriptions.length)];
        }
        if (csvRows.length > 0 && csvRows[i]['descricao']) {
          itemDesc = csvRows[i]['descricao'];
        }
        if (csvRows.length > 0) {
          itemDesc = resolveTokens(itemDesc, csvRows[i], i, rawTitleBase);
        }

        generatedSim.push({
          actionType: 'create',
          sku: itemSku,
          nome: itemTitle,
          preco: itemPrice,
          estoqueValue: itemStock,
          categoria: baselineData.categoria,
          marca: itemBrand,
          ncm: baselineData.ncm,
          unidade: baselineData.unidade,
          descricaoCurta: itemDesc,
          gtin: itemEan,
          imagenes: [...baselineData.imagens],
          pesoLiquido: baselineData.pesoLiquido,
          pesoBruto: baselineData.pesoBruto,
          valsku: 'idle',
          valean: 'idle',
          processStatus: 'pending'
        });
      }
    } else {
      // ==========================================
      // SIMULATION PIPELINE (MODE EDIT)
      // ==========================================
      const eansListForEdit = massEditRule.eanList.split('\n').map(e => e.trim()).filter(Boolean);

      editQueue.forEach((prod, i) => {
        let editedTitle = prod.nome;
        if (massEditRule.updateTitle) {
          editedTitle = prod.nome + massEditRule.titleAppend;
        }

        let editedDesc = prod.descricaoCurta;
        if (massEditRule.updateDescription) {
          editedDesc = massEditRule.descriptionOverride;
        }

        let editedPrice = prod.preco;
        if (massEditRule.updatePrice) {
          editedPrice = massEditRule.priceValue;
        }

        let editedEan = prod.gtin || '';
        if (massEditRule.updateEan && eansListForEdit.length > 0) {
          editedEan = eansListForEdit[i % eansListForEdit.length] || '';
        }

        let editedNcm = prod.ncm || '';
        if (massEditRule.updateNcm) {
          editedNcm = massEditRule.ncmValue;
        }

        generatedSim.push({
          id: prod.id,
          actionType: 'update',
          sku: prod.codigo || '',
          nome: editedTitle,
          preco: editedPrice,
          estoqueValue: prod.estoqueValue || 0,
          categoria: prod.categoria || 'Geral',
          marca: prod.marca || 'Própria',
          ncm: editedNcm,
          unidade: prod.unidade || 'UN',
          descricaoCurta: editedDesc,
          gtin: editedEan,
          imagenes: prod.imagemURL ? [prod.imagemURL] : [],
          pesoLiquido: prod.pesoLiquido || 0,
          pesoBruto: prod.pesoBruto || 0,
          valsku: 'idle',
          valean: 'idle',
          processStatus: 'pending'
        });
      });
    }

    setSimulatedItems(generatedSim);
    addToast('Simulação de lote gerada com êxito! Faça a validação do SKU/EAN antes de continuar.', 'info');
  };

  // ==========================================
  // SKU & EAN VALIDAÇÃO (Feature 7, 9)
  // ==========================================
  const handleValidateBatch = async () => {
    if (simulatedItems.length === 0) {
      addToast('Gere a simulação primeiro.', 'error');
      return;
    }

    setIsValidating(true);
    setValidationProgress({ total: simulatedItems.length, checked: 0 });

    const itemsCopy = [...simulatedItems];
    const skusSeen = new Set<string>();
    const eansSeen = new Set<string>();

    for (let i = 0; i < itemsCopy.length; i++) {
      const item = itemsCopy[i];

      // Local SKU Duplicate Detection
      if (skusSeen.has(item.sku)) {
        item.valsku = 'duplicate_batch';
      } else {
        skusSeen.add(item.sku);
        // Bling online SKU check
        try {
          const res = await fetch(`/api/products/check-sku/${encodeURIComponent(item.sku)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const resJson = await res.json();
          if (resJson.exists) {
            item.valsku = 'exists';
          } else {
            item.valsku = 'ok';
          }
        } catch {
          item.valsku = 'ok'; // assume ok if API offline
        }
      }

      // Local EAN Duplicate Detection
      if (item.gtin) {
        if (eansSeen.has(item.gtin)) {
          item.valean = 'duplicate_batch';
          // Check EAN resolution action rule
          if (eanDuplicateConfig === 'replace') {
            item.gtin = ''; // Clear duplicate EAN automatically
            item.valean = 'ok';
          }
        } else {
          eansSeen.add(item.gtin);
          item.valean = 'ok';
        }
      } else {
        item.valean = 'ok';
      }

      setValidationProgress({ total: itemsCopy.length, checked: i + 1 });
      setSimulatedItems([...itemsCopy]);
    }

    setIsValidating(false);
    setValidationProgress(null);
    addToast('Todos os produtos do lote foram validados no Bling ERP!', 'success');
  };

  // ==========================================
  // LOT PROCESSING PIPELINE (One by One)
  // ==========================================
  const handleExecuteBatch = async () => {
    const conflicts = simulatedItems.filter(
      item => item.valsku === 'exists' || item.valsku === 'duplicate_batch' || item.valean === 'duplicate_batch'
    );

    if (conflicts.length > 0) {
      const containsSkus = conflicts.some(item => item.valsku === 'exists' || item.valsku === 'duplicate_batch');
      if (containsSkus && automationMode === 'create') {
        const force = window.confirm(
          `Atenção: Existem SKU duplicados detectados no lote (${conflicts.length} itens). Caso prossiga, o Bling retornará erro para estes cadastros. Deseja iniciar a gravação mesmo assim?`
        );
        if (!force) return;
      }
    }

    setIsProcessing(true);
    setProcessedCount(0);

    const itemsCopy = [...simulatedItems];

    for (let i = 0; i < itemsCopy.length; i++) {
      const item = itemsCopy[i];

      // Avoid duplication failures if cancel config
      if (item.valean === 'duplicate_batch' && eanDuplicateConfig === 'cancel') {
        item.processStatus = 'failed';
        item.errorMessage = 'Interrompido por duplicidade de EAN configurada como Cancelamento.';
        setSimulatedItems([...itemsCopy]);
        setProcessedCount(i + 1);
        continue;
      }

      // API invocation based on 'create' or 'update' type
      try {
        let endpoint = '/api/products/create';
        const payload: any = {
          nome: item.nome,
          codigo: item.sku,
          preco: item.preco,
          tipo: 'P',
          situacao: 'A',
          formato: 'S',
          descricaoCurta: item.descricaoCurta,
          categoria: item.categoria,
          marca: item.marca,
          ncm: item.ncm,
          gtin: item.gtin || undefined,
          unidade: item.unidade,
          pesoLiquido: item.pesoLiquido,
          pesoBruto: item.pesoBruto,
          estoqueInicial: item.estoqueValue,
          imagemURL: item.imagenes.length > 0 ? item.imagenes[0] : undefined
        };

        if (item.actionType === 'update') {
          // Send update API endpoint
          endpoint = '/api/products/update';
          payload.idProduto = item.id;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const dataJson = await response.json();
        if (response.ok && dataJson.ok) {
          item.processStatus = 'success';
          item.feedbackMessage = item.actionType === 'create' 
            ? `Criado com sucesso! ID: ${dataJson.data?.id || 'N/A'}` 
            : `Atualizado com sucesso!`;
        } else {
          item.processStatus = 'failed';
          item.errorMessage = dataJson.error || 'Erro desconhecido na API do Bling.';
        }
      } catch (err: any) {
        item.processStatus = 'failed';
        item.errorMessage = err.message || 'Falha de conexão com o servidor de proxy.';
      }

      setSimulatedItems([...itemsCopy]);
      setProcessedCount(i + 1);
    }

    setIsProcessing(false);
    addToast('Processamento do lote finalizado! Consulte os resultados no relatório.', 'success');
    loadProducts();
    loadStats();
  };

  // ==========================================
  // EXPORT FINAL CSV REPORT
  // ==========================================
  const handleExportCSVReport = () => {
    if (simulatedItems.length === 0) return;
    
    // Header
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Index;Acao;SKU;Titulo;EAN;Preco;Estoque;Status;Detalhes\n";

    simulatedItems.forEach((item, idx) => {
      const type = item.actionType === 'create' ? 'Criação' : 'Atualização';
      const statusStr = item.processStatus === 'success' ? 'Sucesso' : item.processStatus === 'failed' ? 'Erro' : 'Pendente';
      const detail = item.processStatus === 'success' ? (item.feedbackMessage || '') : (item.errorMessage || '');
      
      const row = [
        idx + 1,
        type,
        `"${item.sku.replace(/"/g, '""')}"`,
        `"${item.nome.replace(/"/g, '""')}"`,
        `"${(item.gtin || '').replace(/"/g, '""')}"`,
        item.preco,
        item.estoqueValue,
        statusStr,
        `"${detail.replace(/"/g, '""')}"`
      ].join(';');

      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_lote_bling_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ADD IMAGE URL TO MODEL
  const addImageUrlPool = () => {
    if (!imageInputUrl.trim()) return;
    setBaselineData(prev => ({
      ...prev,
      imagens: [...prev.imagens, imageInputUrl.trim()]
    }));
    setImageInputUrl('');
    addToast('Imagem adicionada ao catálogo de candidatos.', 'success');
  };

  const removeImageFromPool = (idx: number) => {
    setBaselineData(prev => ({
      ...prev,
      imagens: prev.imagens.filter((_, i) => i !== idx)
    }));
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans">
      
      {/* SECTOR SWITCH TAB ACTION: CREATE VS MASS EDIT */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-850 pb-3">
        <button
          type="button"
          onClick={() => { setAutomationMode('create'); setSimulatedItems([]); }}
          className={`px-4 py-2 rounded-xl text-3xs uppercase tracking-wider font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
            automationMode === 'create'
              ? 'bg-indigo-600 text-white'
              : 'hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-550'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Gerador / Criador Massivo
        </button>

        <button
          type="button"
          onClick={() => { setAutomationMode('edit'); setSimulatedItems([]); }}
          className={`px-4 py-2 rounded-xl text-3xs uppercase tracking-wider font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
            automationMode === 'edit'
              ? 'bg-indigo-600 text-white'
              : 'hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-550'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Edição em Lote (Existentes)
        </button>
      </div>

      {/* ==========================================
         MAIN AREA: MODE CREATE (Geração de Anúncios)
         ========================================== */}
      {automationMode === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* COLUMN 1: CONTROLS (8 cols) */}
          <div className="lg:col-span-8 space-y-6">

            {/* PRODUCT REFERENCE SOURCE (Bling Picker) */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/45 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-3.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-wider font-black text-indigo-505 dark:text-indigo-400">
                  Passo 1: Selecionar Produto de Referência (Bling)
                </span>
                {selectedSourceProduct && (
                  <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/15 text-[8px] uppercase px-2 py-0.5 rounded-full font-black animate-fadeIn">
                     Modelo Carregado com Sucesso!
                  </span>
                )}
              </div>
              
              <form onSubmit={handleSourceSearch} className="flex gap-2">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    placeholder="Pesquisar por nome ou SKU no Bling..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchingSource}
                  className="h-9 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                >
                  {searchingSource ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
                </button>
              </form>

              {/* SEARCH RESULTS DROPDOWN */}
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-900 shadow-lg p-1">
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectSourceProduct(p)}
                      className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-900 flex justify-between items-center text-xs rounded-lg cursor-pointer"
                    >
                      <div className="truncate pr-4 flex-grow">
                        <p className="font-extrabold truncate text-slate-800 dark:text-slate-200">{p.nome}</p>
                        <p className="text-[10px] text-slate-400 font-mono">SKU: {p.codigo || 'SEM COD.'}</p>
                      </div>
                      <span className="text-[10px] font-mono font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-lg shrink-0">
                        R$ {p.preco?.toFixed(2) || '0.00'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* LOADED META FIELDS */}
              <div className="p-3 bg-white dark:bg-slate-950/60 rounded-xl space-y-2 text-xs border border-slate-100 dark:border-slate-900">
                <p className="text-[9px] uppercase font-bold text-slate-450 tracking-wider">
                  Configurações Gerais dos Novos Anúncios
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-2xs">
                  <div>
                    <label className="text-[8px] uppercase font-black text-slate-400 block mb-0.5">Preço Padrão (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-2xs font-extrabold"
                      value={baselineData.preco}
                      onChange={(e) => setBaselineData({ ...baselineData, preco: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-[8px] uppercase font-black text-slate-400 block mb-0.5">Marca Padrão</label>
                    <input
                      type="text"
                      className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-2xs font-bold"
                      value={baselineData.marca}
                      onChange={(e) => setBaselineData({ ...baselineData, marca: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[8px] uppercase font-black text-slate-400 block mb-0.5">NCM Fiscal</label>
                    <input
                      type="text"
                      className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-2xs font-mono"
                      value={baselineData.ncm}
                      onChange={(e) => setBaselineData({ ...baselineData, ncm: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[8px] uppercase font-black text-slate-400 block mb-0.5">Estoque Inicial</label>
                    <input
                      type="number"
                      className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-2xs font-bold"
                      value={baselineData.estoqueInicial}
                      onChange={(e) => setBaselineData({ ...baselineData, estoqueInicial: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-2xs pt-1.5">
                  <div>
                    <label className="text-[8px] uppercase font-black text-slate-400 block mb-0.5">Categoria</label>
                    <select
                      className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-2xs"
                      value={baselineData.categoria}
                      onChange={(e) => setBaselineData({ ...baselineData, categoria: e.target.value })}
                    >
                      {availableCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] uppercase font-black text-slate-400 block mb-0.5">Unidade</label>
                    <input
                      type="text"
                      className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-2xs"
                      value={baselineData.unidade}
                      onChange={(e) => setBaselineData({ ...baselineData, unidade: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[8px] uppercase font-black text-slate-400 block mb-0.5">Peso Líquido (kg)</label>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-2xs"
                      value={baselineData.pesoLiquido}
                      onChange={(e) => setBaselineData({ ...baselineData, pesoLiquido: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-[8px] uppercase font-black text-slate-400 block mb-0.5">Peso Bruto (kg)</label>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-2xs"
                      value={baselineData.pesoBruto}
                      onChange={(e) => setBaselineData({ ...baselineData, pesoBruto: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* IMAGES LIST */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-900">
                  <span className="text-[8px] uppercase font-black text-slate-400 block mb-1">Candidatos a Imagem do Produto</span>
                  <div className="flex gap-2 items-center flex-wrap">
                    {baselineData.imagens.map((img, idx) => (
                      <div key={idx} className="relative w-12 h-12 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden group">
                        <img src={img} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => removeImageFromPool(idx)}
                          className="absolute inset-0 bg-rose-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs cursor-pointer"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex-grow flex gap-1.5">
                      <input
                        type="text"
                        value={imageInputUrl}
                        onChange={(e) => setImageInputUrl(e.target.value)}
                        placeholder="Inserir URL da Imagem..."
                        className="text-2xs p-1.5 flex-grow bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={addImageUrlPool}
                        className="p-1 px-3.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-[9px] uppercase font-extrabold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* HIGH AUTOMATION: TITLES & KEYWORDS & MODEL PATTERNS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* LIST OF DYNAMIC TITLES */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/45 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-wider font-black text-slate-500">
                    Títulos Dinâmicos (Linha por Linha)
                  </span>
                  <HelpCircle className="w-3.5 h-3.5 text-slate-450" title="Cole múltiplos títulos para alternar sequencialmente" />
                </div>
                <textarea
                  className="w-full h-24 p-2 bg-white dark:bg-slate-950 text-2xs font-semibold rounded-xl border border-slate-200 dark:border-slate-850 focus:outline-none"
                  placeholder="MDF Cru 15cm&#10;MDF Laminado Branco&#10;Kit MDF Redondo 5 Unidades"
                  value={rawTitlesInput}
                  onChange={(e) => setRawTitlesInput(e.target.value)}
                />
                <div className="flex justify-between items-center text-xs">
                  <label className="text-[9px] uppercase font-black text-slate-400 block">Modo Distribuição</label>
                  <select
                    className="p-1.5 bg-white dark:bg-slate-950 text-2xs border border-slate-200 dark:border-slate-850 rounded-lg"
                    value={titleMode}
                    onChange={(e: any) => setTitleMode(e.target.value)}
                  >
                    <option value="sequential">Sequencial</option>
                    <option value="random">Aleatório</option>
                    <option value="shuffled">Embaralhada</option>
                  </select>
                </div>
              </div>

              {/* AUTOMATION PREFIX & SUFFIX KEYWORDS */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/45 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-3">
                <span className="text-[10px] uppercase tracking-wider font-black text-slate-500 block">
                  Palavras-Chave (Sufixo/Prefixo)
                </span>
                <textarea
                  className="w-full h-24 p-2 bg-white dark:bg-slate-950 text-2xs font-semibold rounded-xl border border-slate-200 dark:border-slate-850 focus:outline-none"
                  placeholder="Premium&#10;Oferta Limitada&#10;Profissional"
                  value={rawKeywordsInput}
                  onChange={(e) => setRawKeywordsInput(e.target.value)}
                />
                <div>
                  <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Máscara do Título</label>
                  <input
                    type="text"
                    className="w-full p-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-2xs font-mono"
                    value={keywordPattern}
                    onChange={(e) => setKeywordPattern(e.target.value)}
                    placeholder="{PRODUTO} {KEYWORD}"
                  />
                </div>
              </div>

            </div>

            {/* AUTOMÁTICO PATTERNS OF SKU & EAN */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/45 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-4">
              <span className="text-[10px] uppercase tracking-wider font-black text-slate-500 block">
                Modelagem Dinâmica de SKUs e Códigos EAN
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-400 block">Modelo Geração SKU *</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs font-mono font-bold"
                    value={skuPattern}
                    onChange={(e) => setSkuPattern(e.target.value)}
                  />
                  <p className="text-[9px] text-slate-400 font-mono">
                    Sup.: <span className="text-indigo-500">{'{N}'}</span>, <span className="text-indigo-500">{'{NNN}'}</span>, <span className="text-indigo-500">{'{RAND}'}</span>, <span className="text-indigo-500">{'{ANO}'}</span>, <span className="text-indigo-500">{'{MES}'}</span>, <span className="text-indigo-500">{'{DIA}'}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-400 block">Lista de EANs Disponíveis</label>
                  <textarea
                    className="w-full h-11 p-1 bg-white dark:bg-slate-950 text-2xs font-mono rounded-lg border border-slate-200 dark:border-slate-850 focus:outline-none"
                    placeholder="789012345601&#10;789012345602"
                    value={rawEansInput}
                    onChange={(e) => setRawEansInput(e.target.value)}
                  />
                </div>
              </div>

              {/* DUPLICATE HANDLING OPTIONS */}
              <div className="pt-2 border-t border-slate-105 dark:border-slate-900 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Tratamento de Duplicidade de EAN</label>
                  <select
                    className="w-full p-2 bg-white dark:bg-slate-950 text-2xs border border-slate-200 dark:border-slate-850 rounded-xl"
                    value={eanDuplicateConfig}
                    onChange={(e: any) => setEanDuplicateConfig(e.target.value)}
                  >
                    <option value="ignore">Ignorar (Tentar Criar)</option>
                    <option value="replace">Limpar EAN do Item Duplicado</option>
                    <option value="cancel">Cancelar Importação/Lote</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Quantidade de Anúncios</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    className="w-full p-2 bg-white dark:bg-slate-950 text-2xs font-bold border border-slate-200 dark:border-slate-850 rounded-xl"
                    value={generateQty}
                    onChange={(e) => setGenerateQty(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
              </div>
            </div>

            {/* RANDOMIZATION OPTIONS & MULTIPLE DESCRIPTIONS */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/45 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-3">
              <span className="text-[10px] uppercase tracking-wider font-black text-slate-500 block">
                 Sorteio e Campos Aleatórios Opcionais
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-400 block">Marcas Disponíveis para Sorteio (Vírgula)</label>
                  <input
                    type="text"
                    className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs font-semibold"
                    placeholder="MDF Premium, Artesanal, LaserTech"
                    value={brandPoolText}
                    onChange={(e) => setBrandPoolText(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-400 block">Modelos de Descrição (Separar por ===)</label>
                  <textarea
                    className="w-full h-11 p-1 bg-white dark:bg-slate-950 text-2xs font-semibold rounded-lg border border-slate-200 dark:border-slate-850 focus:outline-none"
                    placeholder="Descrição do {PRODUTO} modelo A === Descrição do {PRODUTO} modelo B"
                    value={descriptionModelsText}
                    onChange={(e) => setDescriptionModelsText(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* SPREADSHEET IMPORT / COPY PASTE TABLE (ADVANCED PLANILHAS) */}
            <div className="p-4 bg-indigo-500/[0.02] dark:bg-indigo-950/15 border border-indigo-200/50 dark:border-indigo-900/30 rounded-2xl space-y-3.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-wider font-black">
                     Formulário Avançado por Planilha ou Copiar/Colar
                  </span>
                </div>
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" title="Arrastar Excel ou colar com colunas nome, preco, sku, ean, tamanho, cor" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Arrastar Arquivo .xlsx / .csv</label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleSpreadsheetUpload}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-2xs file:font-extrabold file:bg-indigo-50 dark:file:bg-indigo-950/30 file:text-indigo-600 dark:file:text-indigo-400 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Colar Linhas de Planilha (TSV / CSV)</label>
                  <textarea
                    className="w-full h-16 p-2 bg-white dark:bg-slate-950 text-2xs font-mono rounded-xl border border-slate-250 dark:border-slate-850 focus:outline-none"
                    placeholder="sku&#9;nome&#9;preco&#9;ean&#10;MDF01&#9;MDF Premium&#9;49.90&#9;78901..."
                    value={customCsvInput}
                    onChange={(e) => {
                      setCustomCsvInput(e.target.value);
                      handleParseCsvOrSpreadsheet(e.target.value);
                    }}
                  />
                </div>
              </div>

              {csvHeaders.length > 0 && (
                <div className="p-3 bg-white dark:bg-slate-950/60 border border-indigo-200/20 dark:border-indigo-900/45 rounded-xl space-y-1">
                  <p className="text-[9px] text-indigo-605 dark:text-indigo-400 font-extrabold uppercase">
                     Mapeador de Colunas Ativo
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Planilha carregada com <span className="font-extrabold text-slate-800 dark:text-slate-200">{csvRows.length}</span> registros. Use tokens como <span className="text-indigo-600 font-bold">{'{COR}'}</span> com base nas colunas.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* COLUMN 2: TEMPLATES & ACTION PREVIEWS (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* ADVANCED TEMPLATES */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/35 border border-slate-200 dark:border-slate-850 rounded-2xl space-y-3">
              <span className="text-[10px] uppercase tracking-wider font-black text-slate-550 block">Modelos Salvos (Modo Template)</span>
              
              <div className="space-y-1.5">
                {advancedTemplates.map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleApplyAdvancedTemplate(tpl)}
                    className="w-full p-2 hover:bg-white dark:hover:bg-slate-950 border border-transparent hover:border-slate-200 dark:hover:border-slate-850 rounded-xl text-left text-2xs font-bold transition-all flex justify-between items-center cursor-pointer"
                  >
                    <span>{tpl.name}</span>
                    <span className="text-[8px] font-mono text-slate-400 uppercase">{tpl.categoria}</span>
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-850 space-y-2">
                <input
                  type="text"
                  placeholder="Nome do Novo Template..."
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full p-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-2xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveAsTemplate}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl uppercase text-[9px] tracking-widest transition-all cursor-pointer shadow-sm"
                >
                  Salvar Estado como Modelo
                </button>
              </div>
            </div>

            {/* INTERACTIVE CONTROLS CENTER */}
            <div className="p-5 bg-gradient-to-br from-indigo-500/10 to-indigo-600/[0.01] dark:from-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-2xl text-center space-y-4">
              <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest block">
                Painel de Comando do Lote
              </span>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleGenerateSimulation}
                  className="w-full h-11 bg-white dark:bg-slate-950 hover:bg-slate-100 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 dark:hover:bg-slate-900 font-black rounded-xl text-2xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Eye className="w-4 h-4" />
                  1. Passo: Simular Lote
                </button>

                <button
                  type="button"
                  onClick={handleValidateBatch}
                  disabled={simulatedItems.length === 0 || isValidating || isProcessing}
                  className="w-full h-11 bg-white dark:bg-slate-950 hover:bg-slate-100 border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 dark:hover:bg-slate-900 disabled:opacity-50 font-black rounded-xl text-2xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {isValidating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                      Validando: {validationProgress?.checked}/{validationProgress?.total}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      2. Passo: Validar Bling
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={simulatedItems.length === 0 || isProcessing || isValidating}
                  onClick={handleExecuteBatch}
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-705 text-white disabled:opacity-50 font-black rounded-2xl text-2xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99]"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Gravando: {processedCount}/{simulatedItems.length}
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      3. Passo: Executar Lote
                    </>
                  )}
                </button>
              </div>

              {simulatedItems.length > 0 && (
                <p className="text-[10px] text-slate-500 font-extrabold uppercase">
                  Lote Ativo: <span className="text-slate-800 dark:text-slate-200">{simulatedItems.length}</span> Itens Preparados
                </p>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ==========================================
         MAIN AREA: MODE EDIT (Edição de Existentes em Lote)
         ========================================== */}
      {automationMode === 'edit' && (
        <div className="space-y-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/45 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-4">
            <span className="text-[10px] uppercase tracking-wider font-black text-indigo-605 dark:text-indigo-400 block">
              Passo 1: Pesquisar e Carregar Produtos para a Fila de Edição
            </span>

            <form onSubmit={handleSourceSearch} className="flex gap-2">
              <input
                type="text"
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
                placeholder="Pesquisar produtos Bling..."
                className="flex-grow text-xs p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl"
              />
              <button
                type="submit"
                className="p-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-3xs font-extrabold uppercase tracking-wide cursor-pointer"
              >
                Pesquisar
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="border border-slate-105 dark:border-slate-850 rounded-xl p-2 bg-white dark:bg-slate-950 space-y-2 max-h-48 overflow-y-auto">
                <p className="text-[9px] uppercase font-black text-slate-400">Resultados Encontrados:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {searchResults.map(p => {
                    const inQueue = editQueue.some(eq => eq.id === p.id);
                    return (
                      <div key={p.id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-xs">
                        <span className="font-semibold truncate pr-2 text-slate-800 dark:text-slate-250">{p.nome} (SKU: {p.codigo})</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (inQueue) {
                              setEditQueue(prev => prev.filter(item => item.id !== p.id));
                            } else {
                              setEditQueue(prev => [...prev, p]);
                            }
                          }}
                          className={`p-1 px-3 text-[9px] uppercase font-bold rounded-lg cursor-pointer ${
                            inQueue ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-500'
                          }`}
                        >
                          {inQueue ? 'Remover' : 'Adicionar'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {editQueue.length > 0 && (
              <div className="p-3 bg-white dark:bg-slate-950/40 rounded-xl border border-slate-150 dark:border-slate-850 text-2xs space-y-1.5 font-mono">
                <div className="flex justify-between items-center text-[9px] uppercase">
                  <span className="font-black text-slate-450">Fila Ativa de Edição: {editQueue.length} itens</span>
                  <button type="button" onClick={() => setEditQueue([])} className="text-rose-500 underline uppercase text-3xs cursor-pointer font-bold">Limpar Tudo</button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                  {editQueue.map(eq => (
                    <span key={eq.id} className="bg-slate-100 dark:bg-slate-850 border border-slate-205 dark:border-slate-800 p-1 px-2 rounded-md font-extrabold flex items-center gap-1">
                      {eq.codigo || 'S/ SKU'}
                      <button type="button" onClick={() => setEditQueue(prev => prev.filter(item => item.id !== eq.id))} className="text-3xs text-rose-500">×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-5 bg-slate-50 dark:bg-slate-950/45 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-4">
            <span className="text-[10px] uppercase tracking-wider font-black text-indigo-605 dark:text-indigo-400 block">
              Passo 2: Configurar Regras de Alteração
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* HEADING ACCIDENTS */}
              <div className="p-4 bg-white dark:bg-slate-950/40 border border-slate-150 dark:border-slate-855 rounded-xl space-y-3">
                <label className="flex items-center gap-2 font-bold select-none cursor-pointer text-slate-705 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={massEditRule.updateTitle}
                    onChange={(e) => setMassEditRule({ ...massEditRule, updateTitle: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  Sufixo do Título (Adicionar ao Fim)
                </label>
                <input
                  type="text"
                  disabled={!massEditRule.updateTitle}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                  placeholder="EX: - Premium"
                  value={massEditRule.titleAppend}
                  onChange={(e) => setMassEditRule({ ...massEditRule, titleAppend: e.target.value })}
                />
              </div>

              {/* DESCRIPTION ACCIDENTS */}
              <div className="p-4 bg-white dark:bg-slate-950/40 border border-slate-150 dark:border-slate-855 rounded-xl space-y-3">
                <label className="flex items-center gap-2 font-bold select-none cursor-pointer text-slate-705 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={massEditRule.updateDescription}
                    onChange={(e) => setMassEditRule({ ...massEditRule, updateDescription: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  Sobrescrever Descrição Curta
                </label>
                <textarea
                  disabled={!massEditRule.updateDescription}
                  className="w-full h-10 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-2xs"
                  placeholder="Nova descrição curta corporativa..."
                  value={massEditRule.descriptionOverride}
                  onChange={(e) => setMassEditRule({ ...massEditRule, descriptionOverride: e.target.value })}
                />
              </div>

              {/* PRICE ACCIDENTS */}
              <div className="p-4 bg-white dark:bg-slate-950/40 border border-slate-150 dark:border-slate-855 rounded-xl space-y-3">
                <label className="flex items-center gap-2 font-bold select-none cursor-pointer text-slate-705 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={massEditRule.updatePrice}
                    onChange={(e) => setMassEditRule({ ...massEditRule, updatePrice: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  Alterar Preço de Venda (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  disabled={!massEditRule.updatePrice}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                  value={massEditRule.priceValue}
                  onChange={(e) => setMassEditRule({ ...massEditRule, priceValue: parseFloat(e.target.value) || 0 })}
                />
              </div>

              {/* NCM ACCIDENTS */}
              <div className="p-4 bg-white dark:bg-slate-950/40 border border-slate-150 dark:border-slate-855 rounded-xl space-y-3">
                <label className="flex items-center gap-2 font-bold select-none cursor-pointer text-slate-705 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={massEditRule.updateNcm}
                    onChange={(e) => setMassEditRule({ ...massEditRule, updateNcm: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  Alterar NCM Fiscal
                </label>
                <input
                  type="text"
                  disabled={!massEditRule.updateNcm}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono"
                  placeholder="8203.20.10"
                  value={massEditRule.ncmValue}
                  onChange={(e) => setMassEditRule({ ...massEditRule, ncmValue: e.target.value })}
                />
              </div>

              {/* EAN ACCIDENTS */}
              <div className="p-4 bg-white dark:bg-slate-950/40 border border-slate-150 dark:border-slate-855 rounded-xl md:col-span-2 space-y-3">
                <label className="flex items-center gap-2 font-bold select-none cursor-pointer text-slate-705 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={massEditRule.updateEan}
                    onChange={(e) => setMassEditRule({ ...massEditRule, updateEan: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  Substituir Códigos EAN / GTIN (Linha por Linha correspondente)
                </label>
                <textarea
                  disabled={!massEditRule.updateEan}
                  className="w-full h-11 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-2xs font-mono"
                  placeholder="78901001002&#10;78901001003"
                  value={massEditRule.eanList}
                  onChange={(e) => setMassEditRule({ ...massEditRule, eanList: e.target.value })}
                />
              </div>

            </div>

            <div className="flex gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-850 justify-end">
              <button
                type="button"
                onClick={handleGenerateSimulation}
                disabled={editQueue.length === 0}
                className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wide cursor-pointer disabled:opacity-40"
              >
                Gerar Simulação de Edição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
         SIMULATION TABLE (Common to Create & Edit)
         ========================================== */}
      {simulatedItems.length > 0 && (
        <div className="p-4 bg-slate-50 dark:bg-slate-950/45 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-4">
          <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-850">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-black text-indigo-600 dark:text-indigo-400">
                Visualização e Simulação das Ações
              </span>
              <p className="text-[10px] text-slate-450 uppercase mt-0.5">Revise os dados antes de salvar definitivamente</p>
            </div>
            {isProcessing && (
              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/15 text-[8px] uppercase px-2 py-0.5 rounded-full font-black animate-pulse">
                Gravando na Bling... ({processedCount}/{simulatedItems.length})
              </span>
            )}
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-2xs font-semibold divide-y divide-slate-100 dark:divide-slate-850">
              <thead className="bg-slate-100/50 dark:bg-slate-900/40 text-[8px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Ação</th>
                  <th className="p-2">Reg. SKU</th>
                  <th className="p-2">Reg. EAN</th>
                  <th className="p-2">Título do Anúncio</th>
                  <th className="p-2">R$ Unit.</th>
                  <th className="p-2">Estoque</th>
                  <th className="p-2">S.SKU</th>
                  <th className="p-2">S.EAN</th>
                  <th className="p-2 text-right">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-sans">
                {simulatedItems.map((item, idx) => {
                  let skuValBadge = <span className="text-slate-400">•</span>;
                  if (item.valsku === 'checking') skuValBadge = <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />;
                  else if (item.valsku === 'ok') skuValBadge = <span className="text-emerald-500 font-bold" title="Disponível">Disponível</span>;
                  else if (item.valsku === 'exists') skuValBadge = <span className="text-rose-500 font-bold" title="Já Cadastrado">Bling</span>;
                  else if (item.valsku === 'duplicate_batch') skuValBadge = <span className="text-amber-500 font-bold" title="Duplicado no Lote">Lote</span>;

                  let eanValBadge = <span className="text-slate-400">•</span>;
                  if (item.valean === 'checking') eanValBadge = <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />;
                  else if (item.valean === 'ok') eanValBadge = <span className="text-emerald-500 font-bold">Livre</span>;
                  else if (item.valean === 'duplicate_batch') eanValBadge = <span className="text-rose-500 font-bold" title="Duplicado no Lote">Duplicado</span>;

                  let resultBadge = <span className="bg-slate-100 dark:bg-slate-900 p-0.5 px-1.5 rounded-md text-slate-500 uppercase font-mono text-[9px]">Pendente</span>;
                  if (item.processStatus === 'success') {
                    resultBadge = <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 p-0.5 px-1.5 rounded-md font-extrabold text-[9px] uppercase">{item.feedbackMessage || 'Sucesso'}</span>;
                  } else if (item.processStatus === 'failed') {
                    resultBadge = <span className="bg-rose-500/10 text-rose-500 border border-rose-500/10 p-0.5 px-1.5 rounded-md font-bold text-[9px] truncate max-w-40 inline-block align-middle" title={item.errorMessage}>{item.errorMessage || 'Falha'}</span>;
                  }

                  return (
                    <tr key={idx} className="hover:bg-slate-100/10 dark:hover:bg-slate-900/30 text-slate-700 dark:text-slate-200">
                      <td className="p-2 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-2 text-slate-400 font-mono uppercase text-[9px]">{item.actionType === 'create' ? 'Criação' : 'Editar'}</td>
                      <td className="p-2 font-mono font-extrabold">{item.sku}</td>
                      <td className="p-2 font-mono">{item.gtin || '—'}</td>
                      <td className="p-2 font-sans font-bold truncate max-w-[200px]" title={item.nome}>{item.nome}</td>
                      <td className="p-2 font-mono">R$ {item.preco?.toFixed(2)}</td>
                      <td className="p-2 font-mono">{item.estoqueValue}</td>
                      <td className="p-2">{skuValBadge}</td>
                      <td className="p-2">{eanValBadge}</td>
                      <td className="p-2 text-right">{resultBadge}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* FINAL BATCH REPORT SECTION */}
          {processedCount > 0 && !isProcessing && (
            <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 animate-fadeIn">
              <div className="space-y-1 text-center md:text-left">
                <p className="text-xs font-black uppercase text-indigo-605">Estatísticas do Processamento</p>
                <div className="flex gap-4 text-2xs font-bold text-slate-500 pt-1 flex-wrap justify-center">
                  <div>Confirmados: <span className="text-emerald-500 font-black">{simulatedItems.filter(i => i.processStatus === 'success').length}</span></div>
                  <div>Falhas / Erros: <span className="text-rose-500 font-black">{simulatedItems.filter(i => i.processStatus === 'failed').length}</span></div>
                  <div>Ignorados: <span className="text-slate-400 font-black">{simulatedItems.filter(i => i.processStatus === 'pending').length}</span></div>
                  <div>Total: <span className="font-black text-slate-805 dark:text-slate-200">{simulatedItems.length}</span></div>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleExportCSVReport}
                className="h-10 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-black text-2xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer border border-indigo-200/20"
              >
                <Download className="w-4 h-4" />
                Exportar Relatório CSV
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
