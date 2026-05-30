import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash, Image as ImageIcon, Star, ArrowUp, ArrowDown, Upload, 
  FileSpreadsheet, FileText, Check, AlertCircle, Play, Settings, RefreshCw, Layers, Copy
} from 'lucide-react';
import { BlingProduct, Toast } from '../../shared/types';
import * as XLSX from 'xlsx';
import AdvancedBulkAutomation from './AdvancedBulkAutomation';

interface CreateProductModalProps {
  onClose: () => void;
  token: string;
  loadProducts: () => void;
  loadStats: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  availableCategories: string[];
  theme: 'light' | 'dark';
}

interface TemplateModel {
  name: string;
  categoria: string;
  marca: string;
  ncm: string;
  unidade: string;
}

interface BulkImportItem {
  id?: number; // if existing for update
  sku: string;
  nome: string;
  preco: number;
  estoqueValue: number;
  categoria?: string;
  marca?: string;
  ncm?: string;
  unidade?: string;
  descricaoCurta?: string;
  status?: 'pending' | 'success' | 'failed' | 'skipped' | 'updated';
  errorDetail?: string;
}

export default function CreateProductModal({
  onClose,
  token,
  loadProducts,
  loadStats,
  addToast,
  availableCategories,
  theme
}: CreateProductModalProps) {
  // Navigation Tabs: 'individual' | 'bulk' | 'automation'
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk' | 'automation'>('individual');

  // ==========================================
  // TEMPLATES STATE (Feature 12)
  // ==========================================
  const [templates, setTemplates] = useState<TemplateModel[]>(() => {
    try {
      const stored = localStorage.getItem('bling_product_templates');
      return stored ? JSON.parse(stored) : [
        { name: 'Padrão Ferramentas', categoria: 'Ferramentas', marca: 'Geral', ncm: '8203.20.10', unidade: 'UN' },
        { name: 'Padrão Vestuário', categoria: 'Moda & Vestuário', marca: 'Própria', ncm: '6109.10.00', unidade: 'PC' }
      ];
    } catch {
      return [];
    }
  });
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');

  // ==========================================
  // INDIVIDUAL FORM STATE (Feature 2)
  // ==========================================
  const [formData, setFormData] = useState({
    nome: '',
    sku: '',
    preco: '0.00',
    estoqueInicial: '0',
    categoria: 'Geral',
    descricaoCurta: '',
    descricaoComplementar: '',
    situacao: 'A', // A = Ativo, I = Inativo
    tipo: 'P', // P = Produto, S = Serviço
    formato: 'S', // S = Simples, V = Variante
    ncm: '',
    pesoLiquido: '',
    pesoBruto: '',
    marca: '',
    unidade: 'un',
  });

  const [images, setImages] = useState<string[]>([]);
  const [imageInputUrl, setImageInputUrl] = useState('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  
  // SKU Checker State (Feature 5)
  const [skuCheckStatus, setSkuCheckStatus] = useState<'idle' | 'checking' | 'available' | 'duplicate'>('idle');
  const [existingDuplicateInfo, setExistingDuplicateInfo] = useState<{ id?: number; nome?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResponse, setSuccessResponse] = useState<any | null>(null);

  // ==========================================
  // BULK FORM STATE (Feature 7, 8, 9, 10, 11)
  // ==========================================
  const [bulkInputText, setBulkInputText] = useState('');
  const [bulkFileHeaders, setBulkFileHeaders] = useState<string[]>([]);
  const [bulkRawRows, setBulkRawRows] = useState<any[]>([]); // Array of arrays or objects
  const [bulkMapping, setBulkMapping] = useState({
    sku: '',
    nome: '',
    preco: '',
    estoque: '',
    categoria: '',
    marca: '',
    ncm: '',
    unidade: ''
  });

  // Import Configurations
  const [duplicateResolution, setDuplicateResolution] = useState<'ignore' | 'update' | 'cancel'>('ignore');
  const [mappedItems, setMappedItems] = useState<BulkImportItem[]>([]);
  const [importReport, setImportReport] = useState<{
    total: number;
    validCount: number;
    errorCount: number;
    items: BulkImportItem[];
  } | null>(null);

  // Lot Processing Progress
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'paused' | 'completed' | 'canceled'>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [detailedErrors, setDetailedErrors] = useState<{ row: number; sku: string; error: string }[]>([]);

  // ==========================================
  // PERSIST TEMPLATES
  // ==========================================
  useEffect(() => {
    localStorage.setItem('bling_product_templates', JSON.stringify(templates));
  }, [templates]);

  // Load selected template
  const handleApplyTemplate = (name: string) => {
    setSelectedTemplateName(name);
    const found = templates.find(t => t.name === name);
    if (found) {
      setFormData(prev => ({
        ...prev,
        categoria: found.categoria || prev.categoria,
        marca: found.marca || prev.marca,
        ncm: found.ncm || prev.ncm,
        unidade: found.unidade || prev.unidade
      }));
      addToast(`Modelo "${name}" aplicado com sucesso!`, 'success');
    }
  };

  // Save customized template
  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) {
      addToast('Por favor, informe o nome para o novo modelo.', 'error');
      return;
    }
    const exists = templates.some(t => t.name.toLowerCase() === newTemplateName.trim().toLowerCase());
    if (exists) {
      addToast('Já existe um modelo com este nome.', 'error');
      return;
    }
    const added: TemplateModel = {
      name: newTemplateName.trim(),
      categoria: formData.categoria,
      marca: formData.marca,
      ncm: formData.ncm,
      unidade: formData.unidade
    };
    setTemplates(prev => [...prev, added]);
    setSelectedTemplateName(added.name);
    setNewTemplateName('');
    addToast(`Modelo "${added.name}" salvo com sucesso!`, 'success');
  };

  // ==========================================
  // FORM FIELD VALIDATORS
  // ==========================================
  const validateIndividualForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    if (!formData.nome.trim()) {
      errors.nome = 'O nome do produto é obrigatório.';
    }
    if (!formData.sku.trim()) {
      errors.sku = 'O SKU (código) é obrigatório.';
    }
    const parsedPrice = parseFloat(formData.preco);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      errors.preco = 'O preço deve ser superior ou igual a zero.';
    }
    const parsedStock = parseInt(formData.estoqueInicial, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      errors.estoqueInicial = 'O estoque inicial deve ser um valor inteiro positivo.';
    }
    if (formData.pesoLiquido && isNaN(parseFloat(formData.pesoLiquido))) {
      errors.pesoLiquido = 'Peso deve ser numérico.';
    }
    if (formData.pesoBruto && isNaN(parseFloat(formData.pesoBruto))) {
      errors.pesoBruto = 'Peso deve ser numérico.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check SKU online
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

  // Trigger individual creation submitting
  const handleSubmitIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateIndividualForm()) {
      addToast('Por favor, corrija os erros no formulário antes de continuar.', 'error');
      return;
    }

    // Double check duplicate alert
    if (skuCheckStatus === 'duplicate') {
      const confirmForce = window.confirm(
        `Já existe um produto com o SKU "${formData.sku}" (${existingDuplicateInfo?.nome || 'N/A'}). Deseja alterar o SKU antes de continuar?`
      );
      if (confirmForce) {
        return; // stopped to let user alter SKU
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
          nome: formData.nome.trim(),
          codigo: formData.sku.trim(),
          preco: parseFloat(formData.preco),
          estoqueInicial: parseInt(formData.estoqueInicial, 10),
          categoria: formData.categoria,
          descricaoCurta: formData.descricaoCurta.trim(),
          descricaoComplementar: formData.descricaoComplementar.trim(),
          situacao: formData.situacao,
          tipo: formData.tipo,
          formato: formData.formato,
          ncm: formData.ncm.trim(),
          pesoLiquido: formData.pesoLiquido ? parseFloat(formData.pesoLiquido) : undefined,
          pesoBruto: formData.pesoBruto ? parseFloat(formData.pesoBruto) : undefined,
          marca: formData.marca.trim(),
          unidade: formData.unidade.trim(),
          imagemURL: images.length > 0 ? images[0] : undefined,
          imagens: images.length > 1 ? images : undefined
        })
      });

      const resData = await response.json();
      if (response.ok && resData.ok) {
        addToast('Produto criado com total sucesso no Bling!', 'success');
        setSuccessResponse(resData);
        loadProducts();
        loadStats();
      } else {
        addToast(`Bling: ${resData.error || 'Não foi possível cadastrar o produto.'}`, 'error');
      }
    } catch (err) {
      addToast('Ocorreu uma falha na conexão de rede para a criação.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to add another product
  const handleAddNewForm = () => {
    setFormData({
      nome: '',
      sku: '',
      preco: '0.00',
      estoqueInicial: '0',
      categoria: 'Geral',
      descricaoCurta: '',
      descricaoComplementar: '',
      situacao: 'A',
      tipo: 'P',
      formato: 'S',
      ncm: '',
      pesoLiquido: '',
      pesoBruto: '',
      marca: '',
      unidade: 'un',
    });
    setImages([]);
    setSuccessResponse(null);
    setSkuCheckStatus('idle');
    setExistingDuplicateInfo(null);
    setFormErrors({});
  };

  // Image reordering handlers (Feature 3)
  const addImageUrl = () => {
    if (!imageInputUrl.trim()) return;
    if (!imageInputUrl.toLowerCase().startsWith('http://') && !imageInputUrl.toLowerCase().startsWith('https://')) {
      addToast('A URL da imagem informada é inválida.', 'error');
      return;
    }
    setImages(prev => [...prev, imageInputUrl.trim()]);
    setImageInputUrl('');
    addToast('Imagem associada à lista.', 'success');
  };

  const handleImageUploadLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages(prev => [...prev, String(event.target.result)]);
        }
      };
      reader.readAsDataURL(file);
    }
    addToast('Imagens locais carregadas com êxito.', 'success');
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === images.length - 1) return;

    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...images];
    const temp = reordered[index];
    reordered[index] = reordered[nextIndex];
    reordered[nextIndex] = temp;
    setImages(reordered);
  };

  const setAsMainImage = (index: number) => {
    if (index === 0) return;
    const reordered = [...images];
    const main = reordered.splice(index, 1)[0];
    reordered.unshift(main);
    setImages(reordered);
    addToast('Imagem definida como principal.', 'success');
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== index));
    addToast('Imagem removida.', 'info');
  };

  // ==========================================
  // BULK FILE PARSING IMPLEMENTATIONS
  // ==========================================
  const handlePastedDataParse = () => {
    if (!bulkInputText.trim()) {
      addToast('Insira dados em formato tabela (ou separados por barras/abas) antes de importar.', 'error');
      return;
    }

    const rows = bulkInputText.trim().split('\n');
    if (rows.length < 2) {
      addToast('Os dados informados possuem poucas linhas.', 'error');
      return;
    }

    // Try to auto-split row cells (tabs or semicolons or commas)
    const delimiter = rows[0].includes('\t') ? '\t' : (rows[0].includes(';') ? ';' : ',');
    const parsedData = rows.map(r => r.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, '')));

    const headers = parsedData[0];
    setBulkFileHeaders(headers);
    setBulkRawRows(parsedData.slice(1));

    // Try to auto-map columns
    const initialMapping = { ...bulkMapping };
    headers.forEach((h, idx) => {
      const text = h.toLowerCase();
      if (text.includes('sku') || text.includes('codigo') || text.includes('código') || text === 'ref') {
        initialMapping.sku = h;
      } else if (text.includes('nome') || text.includes('produto') || text.includes('titulo') || text.includes('descrição')) {
        initialMapping.nome = h;
      } else if (text.includes('preco') || text.includes('preço') || text.includes('valor') || text.includes('venda')) {
        initialMapping.preco = h;
      } else if (text.includes('estoque') || text.includes('quantidade') || text.includes('qtd') || text.includes('inicial')) {
        initialMapping.estoque = h;
      } else if (text.includes('categoria') || text === 'cat') {
        initialMapping.categoria = h;
      } else if (text.includes('marca') || text === 'brand') {
        initialMapping.marca = h;
      } else if (text.includes('ncm')) {
        initialMapping.ncm = h;
      } else if (text.includes('unidade') || text === 'un') {
        initialMapping.unidade = h;
      }
    });

    setBulkMapping(initialMapping);
    addToast('Linhas decodificadas com sucesso. Configure os mapeamentos abaixo.', 'success');
  };

  const handleFileUploadRaw = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isXlsx) {
      reader.onload = (event) => {
        try {
          const binaryStr = event.target?.result;
          const workbook = XLSX.read(binaryStr, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (rawJson.length < 2) {
            addToast('O arquivo Excel de importação parece estar vazio.', 'error');
            return;
          }

          const headers = rawJson[0].map((h: any) => String(h || '').trim());
          setBulkFileHeaders(headers);
          
          // Map array of arrays to clean values
          const cleanRows = rawJson.slice(1).filter(r => r.length > 0);
          setBulkRawRows(cleanRows);

          // Auto map columns
          const initialMapping = { ...bulkMapping };
          headers.forEach((h, idx) => {
            const text = h.toLowerCase();
            if (text.includes('sku') || text.includes('codigo') || text.includes('código')) {
              initialMapping.sku = h;
            } else if (text.includes('nome') || text.includes('produto')) {
              initialMapping.nome = h;
            } else if (text.includes('preco') || text.includes('preço') || text.includes('valor')) {
              initialMapping.preco = h;
            } else if (text.includes('estoque') || text.includes('quantidade') || text.includes('qtd')) {
              initialMapping.estoque = h;
            }
          });
          setBulkMapping(initialMapping);

          addToast('Excel lido com êxito no navegador.', 'success');
        } catch {
          addToast('Falha crítica de leitura de planilha Excel.', 'error');
        }
      };
      reader.readAsBinaryString(file);
    } else {
      // Parse as standard text CSV
      reader.onload = (event) => {
        const text = String(event.target?.result || '');
        setBulkInputText(text);
        addToast('Lendo arquivo CSV...', 'info');
        
        const rows = text.trim().split('\n');
        if (rows.length < 2) {
          addToast('O arquivo CSV de importação parece estar vazio ou com poucas linhas.', 'error');
          return;
        }

        const delimiter = rows[0].includes('\t') ? '\t' : (rows[0].includes(';') ? ';' : ',');
        const parsedData = rows.map(r => r.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, '')));

        const headers = parsedData[0];
        setBulkFileHeaders(headers);
        setBulkRawRows(parsedData.slice(1));

        // Auto map columns
        const initialMapping = { ...bulkMapping };
        headers.forEach((h, idx) => {
          const t = h.toLowerCase();
          if (t.includes('sku') || t.includes('codigo') || t.includes('código')) {
            initialMapping.sku = h;
          } else if (t.includes('nome') || t.includes('produto')) {
            initialMapping.nome = h;
          } else if (t.includes('preco') || t.includes('preço') || t.includes('valor')) {
            initialMapping.preco = h;
          } else if (t.includes('estoque') || t.includes('quantidade') || t.includes('qtd')) {
            initialMapping.estoque = h;
          }
        });
        setBulkMapping(initialMapping);

        addToast('CSV lido com êxito.', 'success');
      };
      reader.readAsText(file);
    }
  };

  // Generate Report and validation preview (Feature 9)
  const buildAndValidateReport = () => {
    if (bulkRawRows.length === 0) {
      addToast('Não há dados carregados para validar.', 'error');
      return;
    }

    if (!bulkMapping.sku || !bulkMapping.nome) {
      addToast('Os campos SKU e Nome são obrigatórios para realizar o mapeamento.', 'error');
      return;
    }

    const skuColIdx = bulkFileHeaders.indexOf(bulkMapping.sku);
    const nomeColIdx = bulkFileHeaders.indexOf(bulkMapping.nome);
    const precoColIdx = bulkMapping.preco ? bulkFileHeaders.indexOf(bulkMapping.preco) : -1;
    const estoqueColIdx = bulkMapping.estoque ? bulkFileHeaders.indexOf(bulkMapping.estoque) : -1;
    const categoriaColIdx = bulkMapping.categoria ? bulkFileHeaders.indexOf(bulkMapping.categoria) : -1;
    const marcaColIdx = bulkMapping.marca ? bulkFileHeaders.indexOf(bulkMapping.marca) : -1;
    const ncmColIdx = bulkMapping.ncm ? bulkFileHeaders.indexOf(bulkMapping.ncm) : -1;
    const unidadeColIdx = bulkMapping.unidade ? bulkFileHeaders.indexOf(bulkMapping.unidade) : -1;

    const items: BulkImportItem[] = [];
    let validCount = 0;
    let errorCount = 0;

    bulkRawRows.forEach((row, idx) => {
      // Row might be array of elements (Excel/CSV parse) or something else
      const rawSku = String(row[skuColIdx] || '').trim();
      const rawNome = String(row[nomeColIdx] || '').trim();
      
      let rawPreco = 0;
      if (precoColIdx !== -1) {
        const val = parseFloat(String(row[precoColIdx]).replace(',', '.').replace(/[^\d.]/g, ''));
        rawPreco = isNaN(val) ? 0 : val;
      }

      let rawEstoque = 0;
      if (estoqueColIdx !== -1) {
        const val = parseInt(String(row[estoqueColIdx]).replace(/[^\d]/g, ''), 10);
        rawEstoque = isNaN(val) ? 0 : val;
      }

      const itemCategory = categoriaColIdx !== -1 ? String(row[categoriaColIdx]).trim() : undefined;
      const itemMarca = marcaColIdx !== -1 ? String(row[marcaColIdx]).trim() : undefined;
      const itemNcm = ncmColIdx !== -1 ? String(row[ncmColIdx]).trim() : undefined;
      const itemUnidade = unidadeColIdx !== -1 ? String(row[unidadeColIdx]).trim() : undefined;

      let errorDetail = '';
      if (!rawSku) {
        errorDetail = 'SKU (código) do item está em branco.';
      } else if (!rawNome) {
        errorDetail = 'O nome do produto está em branco.';
      } else if (rawPreco < 0) {
        errorDetail = 'O preço de venda é inferior a zero.';
      }

      const status: 'pending' | 'failed' = errorDetail ? 'failed' : 'pending';
      if (status === 'failed') {
        errorCount++;
      } else {
        validCount++;
      }

      items.push({
        sku: rawSku,
        nome: rawNome,
        preco: rawPreco,
        estoqueValue: rawEstoque,
        categoria: itemCategory,
        marca: itemMarca,
        ncm: itemNcm,
        unidade: itemUnidade,
        status,
        errorDetail: errorDetail || undefined
      });
    });

    setMappedItems(items);
    setImportReport({
      total: items.length,
      validCount,
      errorCount,
      items
    });

    addToast('Análise de estrutura em lote finalizada.', 'info');
  };

  // Sequential Batch Process Pipeline (Feature 11)
  const executeBatchImport = async () => {
    if (!importReport || mappedItems.length === 0) return;
    
    // reset stats
    setProcessingStatus('processing');
    setCurrentIndex(0);
    setSuccessCount(0);
    setFailedCount(0);
    setSkippedCount(0);
    setUpdatedCount(0);
    setDetailedErrors([]);

    const itemsToProcess = [...mappedItems];
    
    for (let i = 0; i < itemsToProcess.length; i++) {
      const item = itemsToProcess[i];
      if (item.status === 'failed') {
        setFailedCount(p => p + 1);
        setDetailedErrors(prev => [...prev, { row: i + 2, sku: item.sku || 'N/A', error: item.errorDetail || 'Validação básica falhou.' }]);
        continue;
      }

      setCurrentIndex(i);

      try {
        // 1. Verify duplication
        const checkRes = await fetch(`/api/products/check-sku/${encodeURIComponent(item.sku)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const checkData = await checkRes.json();

        if (checkData.exists) {
          // If duplicate exists, handle according to resolution configuration (Feature 10)
          if (duplicateResolution === 'ignore') {
            item.status = 'skipped';
            setSkippedCount(p => p + 1);
            continue;
          } else if (duplicateResolution === 'cancel') {
            setProcessingStatus('canceled');
            addToast(`Processamento interrompido: SKU duplicado detectado ("${item.sku}").`, 'error');
            break;
          } else if (duplicateResolution === 'update') {
            // Update existings
            const updateId = checkData.id;
            if (!updateId) {
              item.status = 'failed';
              item.errorDetail = 'ID do produto duplicado não foi localizado para faturamento.';
              setFailedCount(p => p + 1);
              setDetailedErrors(prev => [...prev, { row: i + 2, sku: item.sku, error: 'Incapaz de localizar ID correspondente para atualização no Bling.' }]);
              continue;
            }

            const updateResponse = await fetch('/api/products/update', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                idProduto: updateId,
                nome: item.nome,
                codigo: item.sku,
                preco: item.preco,
                estoqueValue: item.estoqueValue,
                categoria: item.categoria,
                marca: item.marca,
                unidade: item.unidade,
                gtin: item.ncm ? item.ncm : undefined
              })
            });

            if (updateResponse.ok) {
              item.status = 'updated';
              setUpdatedCount(p => p + 1);
            } else {
              const errData = await updateResponse.json();
              item.status = 'failed';
              item.errorDetail = `Erro update Bling: ${errData.error || 'N/A'}`;
              setFailedCount(p => p + 1);
              setDetailedErrors(prev => [...prev, { row: i + 2, sku: item.sku, error: item.errorDetail || 'O Bling rejeitou a atualização.' }]);
            }
            continue;
          }
        }

        // 2. Simply Create Product
        const createRes = await fetch('/api/products/create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nome: item.nome,
            codigo: item.sku,
            preco: item.preco,
            estoqueInicial: item.estoqueValue,
            categoria: item.categoria || 'Geral',
            marca: item.marca,
            ncm: item.ncm,
            unidade: item.unidade || 'un'
          })
        });

        if (createRes.ok) {
          item.status = 'success';
          setSuccessCount(p => p + 1);
        } else {
          const errData = await createRes.json();
          item.status = 'failed';
          item.errorDetail = `Bling: ${errData.error || 'Não pôde cadastrar.'}`;
          setFailedCount(p => p + 1);
          setDetailedErrors(prev => [...prev, { row: i + 2, sku: item.sku, error: item.errorDetail || 'Rejeição de requisição da API Bling Erp.' }]);
        }

      } catch (err: any) {
        item.status = 'failed';
        item.errorDetail = `Comunicação interna: ${err.message}`;
        setFailedCount(p => p + 1);
        setDetailedErrors(prev => [...prev, { row: i + 2, sku: item.sku, error: 'Perda de conexão de rede ou rota na criação.' }]);
      }

      // Delay to avoid Bling API Rate-limits (approx 300ms)
      await new Promise(resolve => setTimeout(resolve, 310));
    }

    setProcessingStatus(prev => prev === 'canceled' ? 'canceled' : 'completed');
    addToast('Lote finalizado com sucesso.', 'success');
    loadProducts();
    loadStats();
  };

  // Clear bulk state
  const resetBulkSession = () => {
    setBulkInputText('');
    setBulkFileHeaders([]);
    setBulkRawRows([]);
    setMappedItems([]);
    setImportReport(null);
    setProcessingStatus('idle');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col transition-all">
        
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/55 dark:bg-slate-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide text-slate-800 dark:text-slate-100 uppercase">
                Cadastrar Novo Item no Bling ERP
              </h2>
              <p className="text-4xs text-slate-500 uppercase tracking-widest font-extrabold mt-0.5">
                Módulo Geral de Publicação Integrada
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTROLL TAB CHOOSER */}
        <div className="px-5 border-b border-slate-150 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 flex gap-4">
          <button
            onClick={() => { setActiveTab('individual'); }}
            className={`py-3 px-1 text-2xs font-extrabold tracking-wider uppercase border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'individual' 
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Cadastro Individual
          </button>
          <button
            onClick={() => { setActiveTab('bulk'); }}
            className={`py-3 px-1 text-2xs font-extrabold tracking-wider uppercase border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'bulk' 
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Criação em Massa (Lote)
          </button>
          <button
            onClick={() => { setActiveTab('automation'); }}
            className={`py-3 px-1 text-2xs font-extrabold tracking-wider uppercase border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'automation' 
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Automação Avançada
          </button>
        </div>

        {/* MODAL WORKSPACE */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {activeTab === 'individual' ? (
            successResponse ? (
              /* INDIVIDUAL SUCCESS REPORT SCREEN (Feature 6) */
              <div className="max-w-md mx-auto text-center py-8 space-y-5 animate-fadeIn">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-500/5">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                    Produto Publicado com Sucesso!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Os metadados e estoque já constam na API do Bling ERP.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-left font-sans space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 uppercase text-3xs font-extrabold">ID Bling:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-bold font-mono">{successResponse.id || 'N/A'}</span>
                  </div>
                  <hr className="border-slate-200 dark:border-slate-850" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 uppercase text-3xs font-extrabold">SKU / Código:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-bold font-mono">{successResponse.sku}</span>
                  </div>
                  <hr className="border-slate-200 dark:border-slate-850" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 uppercase text-3xs font-extrabold">Nome:</span>
                    <span className="text-slate-705 dark:text-slate-200 font-extrabold text-right">{successResponse.nome}</span>
                  </div>
                </div>

                <div className="flex gap-3 justify-center pt-2">
                  <button
                    onClick={handleAddNewForm}
                    className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-extrabold text-2xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cadastrar Outro
                  </button>
                  <button
                    onClick={onClose}
                    className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-2xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
                  >
                    Fechar Janela
                  </button>
                </div>
              </div>
            ) : (
              /* INDIVIDUAL REGISTRATION FORM */
              <form onSubmit={handleSubmitIndividual} className="space-y-6">
                
                {/* TEMPLATE PICKER BLOCK (Feature 12) */}
                <div className="bg-indigo-50/15 dark:bg-indigo-950/10 border border-indigo-250/30 dark:border-indigo-900/40 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5" />
                      Modelos e Templates de Preenchimento
                    </h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                      Agilize o cadastro pré-configurando NCM, Marca, Categoria e Unidade
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    <select
                      value={selectedTemplateName}
                      onChange={(e) => handleApplyTemplate(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-950 text-xs font-bold px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer max-w-[200px]"
                    >
                      <option value="">Selecione um Modelo...</option>
                      {templates.map(t => (
                        <option key={t.name} value={t.name}>{t.name}</option>
                      ))}
                    </select>

                    <div className="flex gap-1.5 w-full sm:w-auto mt-2 sm:mt-0">
                      <input
                        type="text"
                        placeholder="Nome novo modelo..."
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 flex-grow"
                      />
                      <button
                        type="button"
                        onClick={handleSaveTemplate}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-3xs font-extrabold uppercase px-3 rounded-lg py-1.5 tracking-wider font-mono cursor-pointer transition-colors"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* TWO THIRD COLUMN FOR FIELDS */}
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Informações Gerais
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* NOME DOM */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Nome do Produto *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.nome}
                          onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                          className={`w-full bg-slate-50 dark:bg-slate-950 border ${
                            formErrors.nome ? 'border-rose-500' : 'border-slate-200 dark:border-slate-850'
                          } text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                          placeholder="Ex: Tênis Air Max Running"
                        />
                        {formErrors.nome && <p className="text-[10px] text-rose-500 font-semibold">{formErrors.nome}</p>}
                      </div>

                      {/* SKU DOM AND CHECKER */}
                      <div className="space-y-1 relative">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          SKU (Código Interno) *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={formData.sku}
                            onChange={(e) => {
                              const v = e.target.value.trim();
                              setFormData(prev => ({ ...prev, sku: v }));
                              setSkuCheckStatus('idle');
                            }}
                            onBlur={(e) => triggerSkuVerification(e.target.value)}
                            className={`w-full bg-slate-50 dark:bg-slate-950 border ${
                              formErrors.sku ? 'border-rose-500' : 'border-slate-200 dark:border-slate-850'
                            } text-xs font-semibold p-2.5 pr-10 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono`}
                            placeholder="Ex: TN-MAX-001"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                            {skuCheckStatus === 'checking' && <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
                            {skuCheckStatus === 'available' && <Check className="w-3.5 h-3.5 text-emerald-500" title="SKU Disponível" />}
                            {skuCheckStatus === 'duplicate' && (
                              <button 
                                type="button"
                                className="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-rose-500 text-white" 
                                title="SKU Duplicado no Bling!"
                                onClick={() => addToast(`SKU já existe: ${existingDuplicateInfo?.nome}`, 'error')}
                              >
                                !
                              </button>
                            )}
                          </div>
                        </div>
                        {formErrors.sku && <p className="text-[10px] text-rose-500 font-semibold">{formErrors.sku}</p>}
                        {skuCheckStatus === 'duplicate' && (
                          <p className="text-[10px] text-rose-500 font-mono font-bold">
                            Já existe um produto com o SKU "{formData.sku}".
                          </p>
                        )}
                      </div>

                      {/* PRECO DOM */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Preço de Venda (R$) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={formData.preco}
                          onChange={(e) => setFormData(prev => ({ ...prev, preco: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="0.00"
                        />
                        {formErrors.preco && <p className="text-[10px] text-rose-500 font-semibold">{formErrors.preco}</p>}
                      </div>

                      {/* ESTOQUE INICIAL DOM */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Estoque Inicial
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={formData.estoqueInicial}
                          onChange={(e) => setFormData(prev => ({ ...prev, estoqueInicial: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="0"
                        />
                        {formErrors.estoqueInicial && <p className="text-[10px] text-rose-500 font-semibold">{formErrors.estoqueInicial}</p>}
                      </div>

                      {/* CATEGORIA DOM */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Categoria
                        </label>
                        <select
                          value={formData.categoria}
                          onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs font-semibold p-2.5 rounded-xl focus:outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="Geral">Geral</option>
                          {availableCategories.filter(c => c !== 'Todas' && c !== 'Geral').map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* MARCA DOM */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Marca
                        </label>
                        <input
                          type="text"
                          value={formData.marca}
                          onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="Ex: Marca Própria"
                        />
                      </div>

                      {/* NCM DOM */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          NCM (Código Fiscal)
                        </label>
                        <input
                          type="text"
                          value={formData.ncm}
                          onChange={(e) => setFormData(prev => ({ ...prev, ncm: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          placeholder="Ex: 6109.10.00"
                        />
                      </div>

                      {/* UNIDADE DOM */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Unidade Comercial
                        </label>
                        <input
                          type="text"
                          value={formData.unidade}
                          onChange={(e) => setFormData(prev => ({ ...prev, unidade: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="un, pc, par, kg..."
                        />
                      </div>

                    </div>

                    {/* CONFIGS AVANÇADOS */}
                    <div className="p-4 border border-slate-150 dark:border-slate-850 rounded-2xl bg-slate-50/20 dark:bg-slate-950/20 space-y-4">
                      <h4 className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5 text-indigo-500" />
                        Parâmetros Adicionais
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Situação</label>
                          <select
                            value={formData.situacao}
                            onChange={(e) => setFormData(prev => ({ ...prev, situacao: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2 rounded-lg"
                          >
                            <option value="A">Ativo</option>
                            <option value="I">Inativo</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Tipo Item</label>
                          <select
                            value={formData.tipo}
                            onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2 rounded-lg"
                          >
                            <option value="P">Produto</option>
                            <option value="S">Serviço</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Formato</label>
                          <select
                            value={formData.formato}
                            onChange={(e) => setFormData(prev => ({ ...prev, formato: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2 rounded-lg"
                          >
                            <option value="S">Simples</option>
                            <option value="V">Com Variações</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Peso Líquido (kg)</label>
                          <input
                            type="number"
                            step="0.001"
                            value={formData.pesoLiquido}
                            onChange={(e) => setFormData(prev => ({ ...prev, pesoLiquido: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold p-2 rounded-lg"
                            placeholder="0.000"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Peso Bruto (kg)</label>
                          <input
                            type="number"
                            step="0.001"
                            value={formData.pesoBruto}
                            onChange={(e) => setFormData(prev => ({ ...prev, pesoBruto: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold p-2 rounded-lg"
                            placeholder="0.000"
                          />
                        </div>
                      </div>
                    </div>

                    {/* DESCRIÇÃO COMPLETA */}
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Descrição Curta (Comercial)
                        </label>
                        <textarea
                          rows={2}
                          value={formData.descricaoCurta}
                          onChange={(e) => setFormData(prev => ({ ...prev, descricaoCurta: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs font-semibold p-2.5 rounded-xl focus:outline-none"
                          placeholder="Sumário breve do item..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Descrição Complementar / Detalhada
                        </label>
                        <textarea
                          rows={3}
                          value={formData.descricaoComplementar}
                          onChange={(e) => setFormData(prev => ({ ...prev, descricaoComplementar: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs font-semibold p-2.5 rounded-xl focus:outline-none"
                          placeholder="Especificações técnicas, garantia, manual básico..."
                        />
                      </div>
                    </div>

                  </div>

                  {/* ONE THIRD COLUMN FOR IMAGES (Feature 3) */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Imagens e Ativos Digitais
                    </h3>

                    {/* IMAGE UPLOADER CONTROL */}
                    <div className="border border-dashed border-slate-200 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-950/20 rounded-2xl p-4 text-center space-y-3">
                      <ImageIcon className="w-8 h-8 text-indigo-500 mx-auto" />
                      <div className="space-y-1">
                        <p className="text-3xs font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                          Selecione Fotos de Seus Itens
                        </p>
                        <p className="text-[9px] text-slate-400 uppercase">
                          Formatos suportados: PNG, JPG ou URLs Web
                        </p>
                      </div>

                      <div className="relative pt-1">
                        <label className="h-8 w-full rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 text-3xs font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer hover:bg-indigo-100/50 dark:hover:bg-indigo-950/90 transition-all border border-indigo-200/40 dark:border-indigo-900/40">
                          <Upload className="w-3 h-3" />
                          Buscar do Computador
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleImageUploadLocal}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="flex border-t border-slate-150 dark:border-slate-850/60 pt-3 gap-1">
                        <input
                          type="text"
                          placeholder="Ou insira URL pública..."
                          value={imageInputUrl}
                          onChange={(e) => setImageInputUrl(e.target.value)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] p-2 rounded-lg flex-grow focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={addImageUrl}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-2xs px-2 rounded-lg cursor-pointer"
                        >
                          Ok
                        </button>
                      </div>
                    </div>

                    {/* IMAGES REORDERING PREVIEWS LIST */}
                    {images.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Mídia vinculada ({images.length} item(s)):
                        </p>
                        <div className="grid grid-cols-1 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                          {images.map((img, idx) => (
                            <div 
                              key={idx} 
                              className={`p-2 border rounded-xl flex items-center gap-2.5 transition-all ${
                                idx === 0 
                                  ? 'border-indigo-500/50 bg-indigo-500/[0.02] dark:bg-indigo-950/10' 
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'
                              }`}
                            >
                              <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-900 overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                                <img src={img} alt={`Item ${idx}`} className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                              </div>

                              <div className="flex-grow min-w-0">
                                <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-350 flex items-center gap-1.5 leading-none">
                                  {idx === 0 ? (
                                    <span className="text-[9px] text-indigo-650 bg-indigo-500/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                      Principal
                                    </span>
                                  ) : `Imagem #${idx + 1}`}
                                </span>
                                <span className="text-[9px] text-slate-400 block truncate mt-1">
                                  {img.startsWith('data:') ? 'Atributo codificado Base64' : img}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setAsMainImage(idx)}
                                  disabled={idx === 0}
                                  className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors ${
                                    idx === 0 ? 'text-indigo-500 opacity-60' : 'text-slate-400'
                                  }`}
                                  title="Definir Principal"
                                >
                                  <Star className={`w-3 h-3 ${idx === 0 ? 'fill-indigo-500' : ''}`} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveImage(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                                  title="Subir"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveImage(idx, 'down')}
                                  disabled={idx === images.length - 1}
                                  className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                                  title="Descer"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeImage(idx)}
                                  className="p-1 text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                                  title="Excluir"
                                >
                                  <Trash className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 border border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400 space-y-2 text-3xs font-bold uppercase tracking-wider">
                        <ImageIcon className="w-6 h-6 text-slate-300 mx-auto" strokeWidth={1.5} />
                        Sem Mídias Associadas
                      </div>
                    )}

                  </div>

                </div>

                {/* ACCORDION TRIGGER FOR DRAFT SAVING */}
                <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/20">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-10 px-4 rounded-xl text-slate-600 dark:text-slate-350 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors uppercase text-2xs tracking-wider cursor-pointer"
                  >
                    Descartar e Sair
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-10 px-4.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold uppercase text-2xs tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Salvar Produto no Bling
                      </>
                    )}
                  </button>
                </div>

              </form>
            )
          ) : activeTab === 'bulk' ? (
            /* ==========================================
               CRIÇÃO EM MASSA WORKSPACE (Feature 7, 8, 9, 10, 11)
               ========================================== */
            <div className="space-y-6">
              
              {processingStatus === 'idle' ? (
                <>
                  <div className="p-4 border border-indigo-250/20 dark:border-indigo-900/40 rounded-2xl bg-indigo-50/[0.02] dark:bg-indigo-950/[0.04]">
                    <h3 className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                      Instruções para Importar Arquivo em Lote
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">
                      Você pode colar dados tabulados diretamente de sua planilha de compras ou arrastar arquivos nos formatos CSV ou Excel (.XLSX)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* INPUT 1: PASTE CHANNELS */}
                    <div className="space-y-2">
                      <label className="text-2xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Pasted Data Canvas (TSV/CSV)</span>
                        <span className="text-[9px] text-indigo-500 font-mono italic">Alt+C</span>
                      </label>
                      <textarea
                        rows={6}
                        value={bulkInputText}
                        onChange={(e) => setBulkInputText(e.target.value)}
                        placeholder="Cole abaixo suas linhas copiadas de planilhas. Exemplo:&#10;SKU&#9;Nome&#9;Preço&#9;Estoque&#10;ABC001&#9;Furadeira Vonder&#9;299.90&#9;15&#10;ABC002&#9;Maleta de Ferramentas&#10;199.90&#9;25"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-3 rounded-2xl font-mono text-3xs focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handlePastedDataParse}
                        className="h-8 w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold uppercase text-3xs tracking-wider rounded-xl transition-colors cursor-pointer"
                      >
                        Compilar Conteúdo Copiado
                      </button>
                    </div>

                    {/* INPUT 2: EXCEL / CSV DRAG FILE ZONE */}
                    <div className="space-y-2">
                      <label className="text-2xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Importação Via Arquivos
                      </label>
                      <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-4 bg-slate-50/10 dark:bg-slate-950/10 flex flex-col items-center justify-center min-h-[195px]">
                        <FileSpreadsheet className="w-10 h-10 text-indigo-500" strokeWidth={1.5} />
                        <div className="space-y-1">
                          <p className="text-3xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                            Selecione .CSV ou Planilhas .XLSX
                          </p>
                          <p className="text-[9px] text-slate-450 uppercase">
                            Arquivos de exportação do Excel, Google Sheets, Bling ou Tiny
                          </p>
                        </div>
                        <label className="h-8 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-3xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-md">
                          <Upload className="w-3 h-3" />
                          Selecionar Arquivo
                          <input
                            type="file"
                            accept=".csv, .xlsx, .xls"
                            onChange={handleFileUploadRaw}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                  </div>

                  {/* COLUMN MAPPING SECTIONS (Feature 8) */}
                  {bulkFileHeaders.length > 0 && (
                    <div className="border border-slate-200 dark:border-slate-850 bg-slate-55/20 dark:bg-slate-950/20 rounded-2xl p-5 space-y-4 animate-slideIn">
                      <div className="flex justify-between items-start border-b border-slate-150 dark:border-slate-850/65 pb-3">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-indigo-500" />
                            Mapeador de Colunas do Arquivo
                          </h4>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                            Associe cada campo do Bling Erp à coluna correspondente do seu arquivo para garantir um processamento sem falhas
                          </p>
                        </div>
                        <span className="text-3xs font-black px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-750 dark:text-indigo-400 uppercase tracking-wider font-mono">
                          {bulkRawRows.length} Linhas Carregadas
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Código / SKU *</label>
                          <select
                            value={bulkMapping.sku}
                            onChange={(e) => setBulkMapping(prev => ({ ...prev, sku: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2 rounded-lg focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Ignorar --</option>
                            {bulkFileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Nome / Título *</label>
                          <select
                            value={bulkMapping.nome}
                            onChange={(e) => setBulkMapping(prev => ({ ...prev, nome: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2 rounded-lg focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Ignorar --</option>
                            {bulkFileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Preço Venda</label>
                          <select
                            value={bulkMapping.preco}
                            onChange={(e) => setBulkMapping(prev => ({ ...prev, preco: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2 rounded-lg focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Ignorar --</option>
                            {bulkFileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Estoque Inicial</label>
                          <select
                            value={bulkMapping.estoque}
                            onChange={(e) => setBulkMapping(prev => ({ ...prev, estoque: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2 rounded-lg focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Ignorar --</option>
                            {bulkFileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* EXTRA FIELDS EXPANSION MAPS */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Categoria</label>
                          <select
                            value={bulkMapping.categoria}
                            onChange={(e) => setBulkMapping(prev => ({ ...prev, categoria: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2 rounded-lg focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Ignorar --</option>
                            {bulkFileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Marca</label>
                          <select
                            value={bulkMapping.marca}
                            onChange={(e) => setBulkMapping(prev => ({ ...prev, marca: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2 rounded-lg focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Ignorar --</option>
                            {bulkFileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">NCM</label>
                          <select
                            value={bulkMapping.ncm}
                            onChange={(e) => setBulkMapping(prev => ({ ...prev, ncm: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2 rounded-lg focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Ignorar --</option>
                            {bulkFileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Unidade</label>
                          <select
                            value={bulkMapping.unidade}
                            onChange={(e) => setBulkMapping(prev => ({ ...prev, unidade: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2 rounded-lg focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Ignorar --</option>
                            {bulkFileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* DUPLICATES RULE RESOLUTION TRIGGER */}
                      <div className="pt-4 border-t border-slate-150 dark:border-slate-850 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Settings className="w-3.5 h-3.5 text-indigo-500" />
                            Regra para Casos de SKUs Duplicados
                          </label>
                          <select
                            value={duplicateResolution}
                            onChange={(e) => setDuplicateResolution(e.target.value as any)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2.5 rounded-xl cursor-pointer"
                          >
                            <option value="ignore">Ignorar duplicados (Ignora re-cadastros)</option>
                            <option value="update">Atualizar existentes (Alinha metadados e faturadora)</option>
                            <option value="cancel">Cancelar importação (Para integridade completa)</option>
                          </select>
                        </div>
                        <div className="flex items-end pr-1">
                          <button
                            type="button"
                            onClick={buildAndValidateReport}
                            className="h-10 w-full bg-indigo-600 hover:bg-indigo-700 text-white uppercase text-2xs font-extrabold tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <AlertCircle className="w-4 h-4 animate-pulse" />
                            Analisar e Pré-Visualizar Linhas
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* PREVIEW ANALYSIS RESULTS BOARD (Feature 9) */}
                  {importReport && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-50/50 dark:bg-slate-950/20 p-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                          <span className="text-[9px] font-black text-slate-450 uppercase block tracking-widest">Total Analisado</span>
                          <span className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono block mt-1">{importReport.total}</span>
                        </div>
                        <div className="bg-emerald-500/[0.02] dark:bg-emerald-950/[0.04] p-3.5 border border-emerald-500/20 rounded-2xl text-center">
                          <span className="text-[9px] font-black text-emerald-500 uppercase block tracking-widest">Validados no Grid</span>
                          <span className="text-xl font-black text-emerald-500 font-mono block mt-1">{importReport.validCount}</span>
                        </div>
                        <div className="bg-rose-500/[0.02] dark:bg-rose-950/[0.04] p-3.5 border border-rose-500/20 rounded-2xl text-center">
                          <span className="text-[9px] font-black text-rose-500 uppercase block tracking-widest">Contêm Erro</span>
                          <span className="text-xl font-black text-rose-500 font-mono block mt-1">{importReport.errorCount}</span>
                        </div>
                      </div>

                      {/* ITEM ERROR LOGS */}
                      {importReport.errorCount > 0 && (
                        <div className="p-4 border border-rose-500/15 bg-rose-500/[0.012] rounded-2xl space-y-2 max-h-[160px] overflow-y-auto">
                          <h5 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                            Log de Anomalias Rejeitados na Pré-Validação:
                          </h5>
                          {mappedItems.filter(p => p.status === 'failed').map((it, idx) => (
                            <div key={idx} className="flex gap-2 text-3xs font-semibold uppercase text-rose-400 font-mono">
                              <span>• Linha {idx + 2}:</span>
                              <span>SKU: {it.sku || '<vazio>'} - {it.errorDetail}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-3 justify-end pt-2">
                        <button
                          type="button"
                          onClick={resetBulkSession}
                          className="h-10 px-4.5 rounded-xl border border-slate-205 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-350 text-2xs uppercase tracking-wider font-extrabold cursor-pointer"
                        >
                          Limpar Sessão
                        </button>
                        <button
                          type="button"
                          onClick={executeBatchImport}
                          className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase text-2xs tracking-wider transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Iniciar Processamento de {importReport.validCount} Produto(s)
                        </button>
                      </div>

                    </div>
                  )}
                </>
              ) : (
                /* ==========================================
                   BATCH PROCESS PIPELINE (Feature 11)
                   ========================================== */
                <div className="py-8 max-w-lg mx-auto text-center space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                      {processingStatus === 'processing' && 'Carregando Produtos na Nuvem Bling...'}
                      {processingStatus === 'completed' && 'Processamento Geral Concluído!'}
                      {processingStatus === 'canceled' && 'Processamento Interrompido.'}
                    </h3>
                    <p className="text-4xs font-black uppercase text-slate-400 tracking-wider">
                      Fila sequencial automática para evitar sobrecarga (rate limit)
                    </p>
                  </div>

                  {/* LARGE REAL-TIME COUNTER */}
                  <div className="text-5xl font-black font-mono text-indigo-650 tracking-tight">
                    {currentIndex + 1} <span className="text-xl text-slate-400 font-normal">/ {mappedItems.length}</span>
                  </div>

                  {/* PROGRESS BAR */}
                  <div className="w-full bg-slate-100 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-900">
                    <div 
                      className="bg-indigo-600 h-full transition-all duration-200 rounded-full"
                      style={{ width: `${((currentIndex + 1) / mappedItems.length) * 100}%` }}
                    />
                  </div>

                  {/* REAL-TIME PROGRESS SUMMARIES */}
                  <div className="grid grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-850 font-sans text-center">
                    <div>
                      <span className="text-2xs text-emerald-500 font-extrabold font-mono block leading-none">{successCount}</span>
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest block mt-1">Criados</span>
                    </div>
                    <div>
                      <span className="text-2xs text-indigo-500 font-extrabold font-mono block leading-none">{updatedCount}</span>
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest block mt-1">Atualiz.</span>
                    </div>
                    <div>
                      <span className="text-2xs text-amber-500 font-extrabold font-mono block leading-none">{skippedCount}</span>
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest block mt-1">Ignorad.</span>
                    </div>
                    <div>
                      <span className="text-2xs text-rose-500 font-extrabold font-mono block leading-none">{failedCount}</span>
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest block mt-1">Falhas</span>
                    </div>
                  </div>

                  {/* ERROR CHANNELS */}
                  {detailedErrors.length > 0 && (
                    <div className="p-4 border border-rose-500/15 bg-rose-500/[0.012] rounded-2xl text-left max-h-[160px] overflow-y-auto">
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Log Detalhado de Erros no Lote:
                      </p>
                      {detailedErrors.map((err, idx) => (
                        <div key={idx} className="text-3xs font-semibold uppercase text-rose-400 font-mono py-0.5 border-b border-rose-500/5 last:border-b-0">
                          Linha {err.row} (SKU: {err.sku}): {err.error}
                        </div>
                      ))}
                    </div>
                  )}

                  {processingStatus !== 'processing' && (
                    <div className="flex gap-3 justify-center pt-2">
                      <button
                        type="button"
                        onClick={resetBulkSession}
                        className="h-10 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-200 font-extrabold text-2xs uppercase tracking-wider cursor-pointer"
                      >
                        Nova Importação
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-2xs uppercase tracking-wider cursor-pointer shadow-md"
                      >
                        Concluir e Fechar
                      </button>
                    </div>
                  )}

                </div>
              )}

            </div>
          ) : (
            <AdvancedBulkAutomation
              onClose={onClose}
              token={token}
              loadProducts={loadProducts}
              loadStats={loadStats}
              addToast={addToast}
              availableCategories={availableCategories}
              theme={theme}
            />
          )}
        </div>

      </div>
    </div>
  );
}
