import React from 'react';
import { Lock, Sliders, BadgeInfo } from 'lucide-react';

interface SettingsViewProps {
  token: string;
  handleLogout: () => void;
  useCache: boolean;
  setUseCache: (val: boolean) => void;
  autoRefreshStock: boolean;
  setAutoRefreshStock: (val: boolean) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function SettingsView({
  token,
  handleLogout,
  useCache,
  setUseCache,
  autoRefreshStock,
  setAutoRefreshStock,
  addToast
}: SettingsViewProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 font-sans">Parâmetros das Políticas do Applet</h2>
          <p className="text-2xs text-slate-600 dark:text-slate-400 mt-0.5 font-sans">Definições estritas de sincronismo com a API v3 homologada do Bling.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
          {/* Token Info Frame */}
          <div className="p-4 bg-slate-50/50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3.5">
            <p className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              OAuth Chave Bearer Ativa
            </p>
            <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 break-all select-all block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg leading-relaxed text-justify">
              {token}
            </p>
            <div className="pt-2">
               <button
                onClick={handleLogout}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/20 hover:dark:bg-rose-950/35 dark:border dark:border-rose-900/30 dark:text-rose-400 rounded-xl text-2xs font-extrabold transition-all cursor-pointer"
              >
                Excluir Chave e Sair
              </button>
            </div>
          </div>

          {/* Cache and background settings */}
          <div className="p-4 bg-slate-50/50 dark:bg-slate-955 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <p className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Políticas de Consumo (Bling)
            </p>

            <div className="space-y-2 pt-1 font-semibold text-slate-700 dark:text-slate-300">
              <label className="flex items-center justify-between text-2xs bg-white dark:bg-slate-900 py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="space-y-0.5">
                  <p>Habilitar Cache Local (Snappy Load)</p>
                  <span className="text-[9.5px] text-slate-500 block font-medium">Reutiliza dados localmente por 30s para avoid tetos de Rate Limit.</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={useCache} 
                  onChange={(e) => {
                    setUseCache(e.target.checked);
                    addToast(e.target.checked ? 'Cache ativado' : 'Cache desativado', 'info');
                  }}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-50 border-slate-350 focus:ring-indigo-500 focus:ring-1 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-2xs bg-white dark:bg-slate-900 py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="space-y-0.5">
                  <p>Monitoramento Dinâmico em Background</p>
                  <span className="text-[9.5px] text-slate-500 block font-medium">Consulta automática e polida de estoque a cada 35 segundos.</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={autoRefreshStock} 
                  onChange={(e) => setAutoRefreshStock(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-50 border-slate-350 focus:ring-indigo-500 focus:ring-1 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* INTEGRATION GUIDE STEPS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <h2 className="text-2xs font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5 tracking-wider uppercase font-sans">
          <BadgeInfo className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          Manual Prático da Conexão
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-2xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold font-sans font-sans">
          <li>
            O Bling v3 implementa limites restritos de requisições por segundo (429 rate ceiling). Recomenda-se manter o <strong className="text-slate-705 dark:text-slate-200">Fast-Load ligado</strong> durante as operações normais do dia-a-dia.
          </li>
          <li>
            As alterações de estoque registradas neste painel realizam uma operação do tipo <strong className="text-indigo-600 dark:text-indigo-450 font-mono">Balanço (B)</strong>. O ERP atualizará o saldo físico total do primeiro depósito cadastrado para a quantidade inserida por você.
          </li>
          <li>
            Os Access Tokens gerados pelo OAuth do Bling expiram a cada 2 horas. Caso receba erros de validação após esse período, basta gerar uma nova chave Bearer no painel do ERP correspondente e atualizar neste software.
          </li>
        </ol>
      </div>
    </div>
  );
}
