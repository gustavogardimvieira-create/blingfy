import React from 'react';
import { Terminal, RefreshCw, Trash2 } from 'lucide-react';
import { SystemLog } from '../../shared/types';

interface LogsViewProps {
  systemLogs: SystemLog[];
  loadingLogs: boolean;
  loadLogs: () => Promise<void>;
  clearLogsOnBackend: () => Promise<void>;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function LogsView({
  systemLogs,
  loadingLogs,
  loadLogs,
  clearLogsOnBackend,
  addToast
}: LogsViewProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-2xl p-4 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="text-indigo-400 w-4.5 h-4.5 animate-pulse shrink-0" />
          <div>
            <h2 className="text-xs font-black tracking-wider uppercase text-slate-705 dark:text-slate-300 font-sans">Auditoria &amp; Comunicação ERP</h2>
            <p className="text-2xs text-slate-500 dark:text-slate-400 font-sans">Rastreie requisições enviadas ao gateway Bling e respostas de retorno.</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end shrink-0">
          <button 
            onClick={() => {
              loadLogs();
              addToast('Verificando fila de eventos mais recentes...', 'info');
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition cursor-pointer" 
            title="Novo Pull"
          >
            <RefreshCw className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <button
            onClick={clearLogsOnBackend}
            className="text-2xs text-rose-600 hover:text-rose-700 dark:text-rose-450 hover:dark:text-rose-400 flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/15 hover:dark:bg-rose-950/25 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/30 transition-all font-bold cursor-pointer font-sans"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            Zerar Logs
          </button>
        </div>
      </div>

      <div className="max-h-[440px] overflow-y-auto space-y-2 font-mono text-2xs pr-1 scrollbar-thin">
        {loadingLogs && systemLogs.length === 0 ? (
          <p className="text-slate-400 text-center py-10">Consultando barramento de eventos do applet...</p>
        ) : systemLogs.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-600 text-center py-10 font-bold lowercase">Nenhum evento armazenado nas últimas 24 horas.</p>
        ) : (
          systemLogs.map((log) => {
            const isError = log.type === 'error';
            const isSuccess = log.type === 'success';
            let alertBorderColor = 'border-slate-100 dark:border-slate-800';
            let dotColor = 'bg-sky-400';
            if (isError) {
              alertBorderColor = 'border-red-200 dark:border-rose-900/40 bg-rose-500/[0.01]';
              dotColor = 'bg-rose-500 animate-pulse';
            }
            if (isSuccess) {
              alertBorderColor = 'border-emerald-200 dark:border-emerald-900/30 bg-emerald-500/[0.005]';
              dotColor = 'bg-emerald-500';
            }

            return (
              <div key={log.id} className={`p-3 bg-slate-100 dark:bg-slate-950 rounded-xl border ${alertBorderColor} hover:border-indigo-600 transition-colors`}>
                <div className="flex justify-between items-center gap-2 mb-1.5 text-[9px] font-bold">
                  <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-300">
                    <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
                    {log.type.toUpperCase()}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 font-semibold">{log.timestamp}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-normal text-xs font-sans font-medium">{log.message}</p>
                {log.details && (
                  <pre className="mt-2 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-900 p-2.5 rounded-lg text-[10px] overflow-x-auto whitespace-pre-wrap max-w-full leading-normal font-mono select-all select-text">
                    {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
