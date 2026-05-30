import React from 'react';
import { Lock, ShieldAlert, RefreshCw, Play, BadgeInfo, Moon, Sun } from 'lucide-react';

interface LoginViewProps {
  tempToken: string;
  setTempToken: (val: string) => void;
  handleLogin: (e: React.FormEvent) => void;
  loadingToken: boolean;
  tokenError: string;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  showTokenRaw: boolean;
  setShowTokenRaw: (val: boolean) => void;
}

export default function LoginView({
  tempToken,
  setTempToken,
  handleLogin,
  loadingToken,
  tokenError,
  theme,
  setTheme,
  showTokenRaw,
  setShowTokenRaw
}: LoginViewProps) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 justify-center items-center p-4 transition-colors duration-200 font-sans w-full">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="border-b border-slate-200 dark:border-slate-800 p-6 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-500/10">
              <span>B</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">BlingSync SaaS</h1>
              <p className="text-2xs text-slate-500 dark:text-slate-400 font-medium">Bling ERP API v3 Integration Client</p>
            </div>
          </div>
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 hover:dark:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
            type="button"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
          </button>
        </div>

        <div className="p-7 space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Bling v3 Access Token (Bearer)
                </span>
                <button 
                  type="button" 
                  onClick={() => setShowTokenRaw(!showTokenRaw)}
                  className="text-2xs text-indigo-500 dark:text-indigo-400 lowercase font-medium hover:underline focus:outline-hidden cursor-pointer"
                >
                  {showTokenRaw ? 'esconder' : 'revelar'}
                </button>
              </label>
              <div className="relative mt-1">
                <input
                  type={showTokenRaw ? "text" : "password"}
                  value={tempToken}
                  onChange={(e) => setTempToken(e.target.value)}
                  placeholder="Cole seu Bearer Access Token aqui..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 font-mono text-xs transition-all"
                />
              </div>
              {tokenError && (
                <p className="mt-2.5 text-xs text-rose-500 flex items-center gap-1.5 font-medium animate-fade-in">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  {tokenError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loadingToken}
              className="w-full py-3 px-4 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2 text-xs cursor-pointer"
            >
              {loadingToken ? (
                <>
                  <RefreshCw className="animate-spin w-4 h-4" />
                  Verificando credenciais API...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Autorizar e Sincronizar
                </>
              )}
            </button>
          </form>

          <div className="border-t border-slate-100 dark:border-slate-850 pt-5 space-y-3">
            <h2 className="text-2xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
              <BadgeInfo className="w-3.5 h-3.5 text-indigo-500" />
              Como gerar o token de acesso:
            </h2>
            <ol className="list-decimal list-inside space-y-1.5 text-2xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              <li>
                No Bling ERP acesse: <span className="font-semibold text-slate-700 dark:text-slate-300">Configurações &gt; Integrações &gt; Configurações de Integrações</span>.
              </li>
              <li>
                Crie/registre uma nova chave na seção <span className="font-semibold text-slate-700 dark:text-slate-300">Apps do Bling</span>.
              </li>
              <li>
                Conceda escopos de <code className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1 py-0.5 rounded text-rose-500 font-mono text-[9px]">Leitura e Gravação</code> para produtos e estoques.
              </li>
              <li>
                Gere o Access Token desejado e cole no prompt acima.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
