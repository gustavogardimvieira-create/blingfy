/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Box, Terminal, Settings } from 'lucide-react';

import { BlingProduct, SystemLog, DashboardStats, Toast } from '../shared/types';
import ToastContainer from './components/ToastContainer';
import LoginView from './components/LoginView';
import ShortcutsModal from './components/ShortcutsModal';
import EditPriceModal from './components/EditPriceModal';
import EditStockModal from './components/EditStockModal';
import DashboardOverview from './components/DashboardOverview';
import ProductsTable from './components/ProductsTable';
import ProductDetailView from './components/ProductDetailView';
import LogsView from './components/LogsView';
import SettingsView from './components/SettingsView';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import CreateProductModal from './components/CreateProductModal';
import CloneProductModal from './components/CloneProductModal';

export default function App() {
  // Authentication & Token State
  const [token, setToken] = useState<string>(() => localStorage.getItem('bling_token') || '');
  const [tempToken, setTempToken] = useState('');
  const [loadingToken, setLoadingToken] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [showTokenRaw, setShowTokenRaw] = useState(false);

  // Selected Product Detail Screen state
  const [selectedProduct, setSelectedProduct] = useState<BlingProduct | null>(null);

  // App Main State
  const [products, setProducts] = useState<BlingProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [totalProducts, setTotalProducts] = useState(0);

  // Sorting State
  const [sortField, setSortField] = useState<'id' | 'nome' | 'preco' | 'estoqueValue' | 'codigo' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [availableCategories, setAvailableCategories] = useState<string[]>(['Todas']);
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Stats & Logs
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Modern Toggles & Modes
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });
  const [autoRefreshStock, setAutoRefreshStock] = useState(false);
  const [useCache, setUseCache] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'products' | 'logs' | 'settings'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [isCompact, setIsCompact] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Dynamic search input debounce reference
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Action Modals State
  const [editingPriceProduct, setEditingPriceProduct] = useState<BlingProduct | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [submittingPrice, setSubmittingPrice] = useState(false);

  const [editingStockProduct, setEditingStockProduct] = useState<BlingProduct | null>(null);
  const [newStock, setNewStock] = useState('');
  const [submittingStock, setSubmittingStock] = useState(false);

  // Create Product Modal State definition
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [cloningProduct, setCloningProduct] = useState<BlingProduct | null>(null);

  // Interactive Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Timers & Observers
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [navigationItems, setNavigationItems] = useState([
    { id: 'overview' as const, label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'products' as const, label: 'Produtos e Estoque', icon: Box },
    { id: 'logs' as const, label: 'Eventos e Auditoria', icon: Terminal },
    { id: 'settings' as const, label: 'Preferências ERP', icon: Settings },
  ]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Toast trigger function
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    
    const newItems = [...navigationItems];
    const draggedItem = newItems[draggedIdx];
    newItems.splice(draggedIdx, 1);
    newItems.splice(index, 0, draggedItem);
    
    setDraggedIdx(index);
    setNavigationItems(newItems);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  // Dynamically collect unique categories from loaded products to populate filter
  useEffect(() => {
    if (products && products.length > 0) {
      const cats = products.map(p => p.categoria || 'Geral');
      setAvailableCategories(prev => {
        const merged = new Set(['Todas', ...prev, ...cats]);
        return Array.from(merged).filter(Boolean);
      });
    }
  }, [products]);

  // Apply Theme class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Instant search debounce handler
  useEffect(() => {
    if (isAuthenticated && token) {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      
      searchDebounceRef.current = setTimeout(() => {
        setCurrentPage(1);
        loadProducts();
      }, 400);
    }
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, useCache]);

  // Trigger loading when token or page changes (without search changes which are debounced)
  useEffect(() => {
    if (isAuthenticated && token) {
      loadProducts();
    }
  }, [isAuthenticated, token, currentPage]);

  // Load Dashboard Stats & Logs only on initial integration/token change
  useEffect(() => {
    if (isAuthenticated && token) {
      loadStats();
      loadLogs();
    }
  }, [isAuthenticated, token]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if writing in input fields
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLInputElement).blur();
        }
        return;
      }

      // Focus search with '/'
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        searchInput?.focus();
        addToast('Busca focada', 'info');
      }

      // Toggle Compact Mode with 'Alt + c'
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setIsCompact(prev => {
          const next = !prev;
          addToast(next ? 'Modo compacto ativado' : 'Modo confortável ativado', 'info');
          return next;
        });
      }

      // Sync data manually with 'Alt + s'
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        loadProducts();
        loadStats();
        addToast('Sincronizados dados com API do Bling', 'success');
      }

      // Trigger export CSV with 'Alt + e'
      if (e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        exportToCSV();
      }

      // Toggle Theme with 'Alt + t'
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setTheme(prev => {
          const next = prev === 'light' ? 'dark' : 'light';
          addToast(`Tema alterado para ${next === 'dark' ? 'escuro' : 'claro'}`, 'info');
          return next;
        });
      }

      // Switch views
      if (e.key === '1') { setSelectedTab('overview'); }
      if (e.key === '2') { setSelectedTab('products'); }
      if (e.key === '3') { setSelectedTab('logs'); }
      if (e.key === '4') { setSelectedTab('settings'); }

      // Close modals with 'Escape'
      if (e.key === 'Escape') {
        setEditingPriceProduct(null);
        setEditingStockProduct(null);
        setShowShortcutsModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, isCompact, currentPage, searchQuery]);

  // Hook for Auto Refresh Stock
  useEffect(() => {
    if (autoRefreshStock && isAuthenticated) {
      addToast('Auto-refresh de estoque a cada 35 segundos habilitado', 'info');
      autoRefreshIntervalRef.current = setInterval(() => {
        loadProducts(true); // silent refresh
        loadStats();
      }, 35000);
    } else {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [autoRefreshStock, isAuthenticated]);

  const handleExpiredToken = () => {
    localStorage.removeItem('bling_token');
    setToken('');
    setIsAuthenticated(false);
    setStats(null);
    setProducts([]);
    setTokenError('A sua chave de acesso expirou ou foi invalidada pelo Bling. Por favor, insira uma nova chave Bearer.');
    addToast('Chave de acesso inválida ou expirada. Conecte-se novamente.', 'error');
  };

  // Fetch Products
  const loadProducts = async (silent = false) => {
    if (!silent) setLoadingProducts(true);
    try {
      const response = await fetch(`/api/products?page=${currentPage}&limit=${limit}&search=${encodeURIComponent(searchQuery)}&cache=${useCache}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401) {
        handleExpiredToken();
        return;
      }
      if (!response.ok) {
        throw new Error('Falha ao obter lista de produtos.');
      }
      const data = await response.json();
      setProducts(data.data || []);
      setTotalProducts(data.total || 0);
      if (silent) {
        addToast('Produtos atualizados dinamicamente', 'success');
      }
    } catch (err: any) {
      console.error(err);
      addToast('Erro ao puxar produtos da API Bling v3', 'error');
    } finally {
      if (!silent) setLoadingProducts(false);
    }
  };

  // Fetch Dashboard Stats
  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch('/api/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401) {
        handleExpiredToken();
        return;
      }
      if (!response.ok) {
        throw new Error('Falha ao obter dados estatísticos do Bling.');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch Logs
  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const response = await fetch('/api/logs');
      if (response.ok) {
        const data = await response.json();
        setSystemLogs(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const clearLogsOnBackend = async () => {
    try {
      const response = await fetch('/api/logs/clear', { method: 'POST' });
      if (response.ok) {
        loadLogs();
        addToast('Logs do sistema limpos com sucesso', 'success');
      }
    } catch (err) {
      console.error(err);
      addToast('Falha ao limpar histórico de logs', 'error');
    }
  };

  // Authenticate and Save token
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempToken.trim()) {
      setTokenError('O token de acesso (access_token) do Bling é obrigatório.');
      return;
    }

    setLoadingToken(true);
    setTokenError('');

    try {
      const response = await fetch('/api/check-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tempToken.trim()}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok && result.ok) {
        localStorage.setItem('bling_token', tempToken.trim());
        setToken(tempToken.trim());
        setIsAuthenticated(true);
        addToast('Conectado com sucesso ao Bling ERP v3!', 'success');
      } else {
        const errorDetail = result.details ? `: ${result.details.description || result.details.message}` : '';
        setTokenError(result.error || `Falha ao validar o token do Bling${errorDetail}`);
        addToast(result.error || 'Credenciais inválidas ou erro Bling', 'error');
      }
    } catch (err) {
      setTokenError('Não foi possível conectar ao servidor Express do applet.');
      addToast('Não foi possível fazer contato com o backend', 'error');
    } finally {
      setLoadingToken(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('bling_token');
    setToken('');
    setIsAuthenticated(false);
    setStats(null);
    setProducts([]);
    addToast('Sessão encerrada com segurança', 'info');
  };

  // Sort toggle handler
  const handleSort = (field: 'id' | 'nome' | 'preco' | 'estoqueValue' | 'codigo') => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
      addToast(`Ordenando ${field === 'nome' ? 'nome' : field === 'preco' ? 'preço' : 'estoque'} em ordem ${sortOrder === 'asc' ? 'decrescente' : 'crescente'}`, 'info');
    } else {
      setSortField(field);
      setSortOrder('asc');
      addToast(`Ordenando ${field === 'nome' ? 'nome' : field === 'preco' ? 'preço' : 'estoque'} progressivamente`, 'info');
    }
  };

  // Price Submitter
  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPriceProduct) return;

    const parsedPrice = parseFloat(newPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      addToast('Valor de preço inválido.', 'error');
      return;
    }

    setSubmittingPrice(true);
    try {
      const response = await fetch('/api/products/update-price', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idProduto: editingPriceProduct.id,
          nome: editingPriceProduct.nome,
          tipo: editingPriceProduct.tipo,
          situacao: editingPriceProduct.situacao,
          formato: editingPriceProduct.formato,
          preco: parsedPrice
        })
      });

      if (response.status === 401) {
        handleExpiredToken();
        return;
      }

      if (response.ok) {
        addToast(`Preço de "${editingPriceProduct.nome}" ajustado para R$ ${parsedPrice.toFixed(2)}`, 'success');
        setEditingPriceProduct(null);
        loadProducts();
        loadStats();
        loadLogs();
      } else {
        const errData = await response.json();
        addToast(`Bling: ${errData.error || 'Erro na atualização de preço.'}`, 'error');
        loadLogs();
      }
    } catch (err) {
      addToast('Erro de conexão ao salvar alteração.', 'error');
    } finally {
      setSubmittingPrice(false);
    }
  };

  // Stock Balance Submitter
  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStockProduct) return;

    const parsedQty = parseInt(newStock);
    if (isNaN(parsedQty) || parsedQty < 0) {
      addToast('Código ou saldo numérico inválido.', 'error');
      return;
    }

    setSubmittingStock(true);
    try {
      const response = await fetch('/api/products/update-stock', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idProduto: editingStockProduct.id,
          quantidade: parsedQty
        })
      });

      if (response.status === 401) {
        handleExpiredToken();
        return;
      }

      if (response.ok) {
        addToast(`Estoque de "${editingStockProduct.nome}" atualizado para ${parsedQty} unidades`, 'success');
        setEditingStockProduct(null);
        loadProducts();
        loadStats();
        loadLogs();
      } else {
        const errData = await response.json();
        addToast(`Bling: ${errData.error || 'Erro na alteração de inventário.'}`, 'error');
        loadLogs();
      }
    } catch (err) {
      addToast('Erro de comunicação ou rede.', 'error');
    } finally {
      setSubmittingStock(false);
    }
  };

  // CSV Generator
  const exportToCSV = () => {
    if (products.length === 0) {
      addToast('Sem produtos carregados na página ativa para exportar.', 'error');
      return;
    }

    try {
      let csvContent = "\uFEFF"; // UTF-8 BOM
      csvContent += "ID;SKU;Nome;Preço Venda (R$);Preço de Custo (R$);Saldo em Estoque;Categoria;Situação\n";

      products.forEach(p => {
        const formattedRow = [
          p.id,
          p.codigo || 'S/D',
          `"${p.nome.replace(/"/g, '""')}"`,
          (p.preco || 0).toFixed(2),
          (p.precoCusto || 0).toFixed(2),
          p.estoqueValue ?? 0,
          p.categoria || 'Geral',
          p.situacao === 'A' ? 'Ativo' : 'Inativo'
        ].join(";");
        csvContent += formattedRow + "\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `bling_export_page_${currentPage}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Planilha de produtos exportada', 'success');
    } catch (error) {
      addToast('Falha ao processar exportação', 'error');
    }
  };

  // Authentication validation UI
  if (!isAuthenticated) {
    return (
      <>
        <ToastContainer toasts={toasts} />
        <LoginView
          tempToken={tempToken}
          setTempToken={setTempToken}
          handleLogin={handleLogin}
          loadingToken={loadingToken}
          tokenError={tokenError}
          theme={theme}
          setTheme={setTheme}
          showTokenRaw={showTokenRaw}
          setShowTokenRaw={setShowTokenRaw}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 flex flex-col md:flex-row antialiased">
      
      {/* Toast Alert Center */}
      <ToastContainer toasts={toasts} />

      {/* SIDEBAR MANAGEMENT Component */}
      <Sidebar
        navigationItems={navigationItems}
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        showLeftSidebar={showLeftSidebar}
        theme={theme}
        setTheme={setTheme}
        handleLogout={handleLogout}
        draggedIdx={draggedIdx}
        handleDragStart={handleDragStart}
        handleDragOver={handleDragOver}
        handleDragEnd={handleDragEnd}
        setShowShortcutsModal={setShowShortcutsModal}
      />

      {/* MAIN CONTENT FIELD */}
      <div className={`flex-grow flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 transition-all duration-300 ${showLeftSidebar ? 'md:pl-56' : 'md:pl-0'} w-full`}>
        
        {/* UPPER HEAD PANEL */}
        <Header
          showLeftSidebar={showLeftSidebar}
          setShowLeftSidebar={setShowLeftSidebar}
          selectedTab={selectedTab}
          isCompact={isCompact}
          setIsCompact={setIsCompact}
          useCache={useCache}
          setUseCache={setUseCache}
          addToast={addToast}
        />

        {/* CONTAINER MAIN WINDOW AREA */}
        <main className="flex-grow p-4 sm:p-6 lg:p-7 space-y-6 max-w-7xl mx-auto w-full overflow-hidden transition-all">
          {selectedTab === 'overview' && (
            <DashboardOverview
              stats={stats}
              loadingStats={loadingStats}
              loadStats={loadStats}
              loadProducts={loadProducts}
              theme={theme}
              products={products}
              setSelectedTab={setSelectedTab}
              setStockFilter={setStockFilter}
              addToast={addToast}
            />
          )}

          {selectedTab === 'products' && (
            selectedProduct ? (
              <ProductDetailView
                product={selectedProduct}
                onBack={() => setSelectedProduct(null)}
                onSave={async () => {
                  setUseCache(false);
                  setTimeout(() => {
                    loadProducts();
                    loadStats();
                    setUseCache(true);
                  }, 100);
                }}
                theme={theme}
                addToast={addToast}
              />
            ) : (
              <ProductsTable
                products={products}
                loadingProducts={loadingProducts}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                availableCategories={availableCategories}
                stockFilter={stockFilter}
                setStockFilter={setStockFilter}
                autoRefreshStock={autoRefreshStock}
                setAutoRefreshStock={setAutoRefreshStock}
                loadProducts={loadProducts}
                loadStats={loadStats}
                exportToCSV={exportToCSV}
                isCompact={isCompact}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalProducts={totalProducts}
                limit={limit}
                setUseCache={setUseCache}
                handleSort={handleSort}
                sortField={sortField}
                sortOrder={sortOrder}
                setEditingPriceProduct={setEditingPriceProduct}
                setNewPrice={setNewPrice}
                setEditingStockProduct={setEditingStockProduct}
                setNewStock={setNewStock}
                onSelectProduct={setSelectedProduct}
                addToast={addToast}
                theme={theme}
                onOpenCreateProduct={() => setShowCreateProductModal(true)}
                onCloneProduct={setCloningProduct}
              />
            )
          )}

          {selectedTab === 'logs' && (
            <LogsView
              systemLogs={systemLogs}
              loadingLogs={loadingLogs}
              loadLogs={loadLogs}
              clearLogsOnBackend={clearLogsOnBackend}
              addToast={addToast}
            />
          )}

          {selectedTab === 'settings' && (
            <SettingsView
              token={token}
              handleLogout={handleLogout}
              useCache={useCache}
              setUseCache={setUseCache}
              autoRefreshStock={autoRefreshStock}
              setAutoRefreshStock={setAutoRefreshStock}
              addToast={addToast}
            />
          )}
        </main>
      </div>

      {/* FLOAT SHORTCUTS LEGEND KEY MODAL */}
      {showShortcutsModal && (
        <ShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}

      {/* PRICE MODAL */}
      {editingPriceProduct && (
        <EditPriceModal
          product={editingPriceProduct}
          newPrice={newPrice}
          setNewPrice={setNewPrice}
          onSubmit={handleUpdatePrice}
          submitting={submittingPrice}
          onClose={() => setEditingPriceProduct(null)}
        />
      )}

      {/* STOCK MODAL */}
      {editingStockProduct && (
        <EditStockModal
          product={editingStockProduct}
          newStock={newStock}
          setNewStock={setNewStock}
          onSubmit={handleUpdateStock}
          submitting={submittingStock}
          onClose={() => setEditingStockProduct(null)}
        />
      )}

      {/* CREATE PRODUCT MODAL */}
      {showCreateProductModal && (
        <CreateProductModal
          onClose={() => setShowCreateProductModal(false)}
          token={token}
          loadProducts={loadProducts}
          loadStats={loadStats}
          addToast={addToast}
          availableCategories={availableCategories}
          theme={theme}
        />
      )}

      {/* CLONE/DUPLICATE PRODUCT MODAL */}
      {cloningProduct && (
        <CloneProductModal
          product={cloningProduct}
          onClose={() => setCloningProduct(null)}
          token={token}
          loadProducts={loadProducts}
          loadStats={loadStats}
          addToast={addToast}
          theme={theme}
        />
      )}
    </div>
  );
}
