import React from 'react';
import { 
  Database, Menu, GripVertical, Keyboard, Moon, Sun, LogOut 
} from 'lucide-react';

interface NavigationItem {
  id: 'overview' | 'products' | 'logs' | 'settings';
  label: string;
  icon: any; // Lucide icon component reference
}

interface SidebarProps {
  navigationItems: NavigationItem[];
  selectedTab: 'overview' | 'products' | 'logs' | 'settings';
  setSelectedTab: (id: 'overview' | 'products' | 'logs' | 'settings') => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  showLeftSidebar: boolean;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  handleLogout: () => void;
  draggedIdx: number | null;
  handleDragStart: (e: React.DragEvent, index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
  setShowShortcutsModal: (v: boolean) => void;
}

export default function Sidebar({
  navigationItems,
  selectedTab,
  setSelectedTab,
  sidebarOpen,
  setSidebarOpen,
  showLeftSidebar,
  theme,
  setTheme,
  handleLogout,
  draggedIdx,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  setShowShortcutsModal
}: SidebarProps) {
  return (
    <>
      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-40 w-full font-sans">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
            B
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">BlingSync Pro</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-2xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
        >
          <Menu className="w-3.5 h-3.5" />
          Navegar
        </button>
      </div>

      {/* MOBILE DRAWER MENU */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-45 flex font-sans animate-fade-in">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setSidebarOpen(false)}></div>
          
          <div className="relative flex-1 flex flex-col max-w-[260px] w-full bg-slate-900 text-slate-200 border-r border-slate-800 py-5 px-3 z-50">
            <div className="absolute top-4 right-4 animate-fade-in">
              <button 
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-semibold p-1 bg-slate-800/40 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="px-2 pb-5 flex items-center gap-2 font-black text-indigo-400 text-sm tracking-wider border-b border-slate-800/70 mb-4 select-none">
              <Database className="w-4 h-4" />
              <span>BLINGSYNC PRO</span>
            </div>
            
            <nav className="space-y-1.5 flex-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isSelected = selectedTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10' 
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-2xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  {theme === 'light' ? 'Tema Escuro' : 'Tema Claro'}
                </span>
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-2xs font-bold text-rose-450 hover:bg-rose-950/20 border border-rose-900/40 transition-all text-left cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                Desconectar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP PERMANENT SIDEBAR */}
      <aside className={`hidden md:flex md:w-56 flex-col fixed inset-y-0 left-0 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-900 text-slate-500 dark:text-slate-400 z-30 font-sans transition-transform duration-300 ${showLeftSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Upper Brand panel */}
        <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-900 shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-extrabold text-sm shadow-md">
              <span>B</span>
            </div>
            <span className="font-extrabold text-xs tracking-wider text-slate-900 dark:text-slate-100 uppercase">BlingSync Pro</span>
          </div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 dark:border dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-400 uppercase select-none">v3.3</span>
        </div>
               {/* Navigation list with draggable config */}
        <nav className="flex-grow px-3 py-4 space-y-1">
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            const isSelected = selectedTab === item.id;
            const isDragged = draggedIdx === index;
            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`group flex items-center justify-between rounded-xl transition-all select-none cursor-grab active:cursor-grabbing border ${
                  isSelected 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-650/10' 
                    : 'border-transparent text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                } ${isDragged ? 'opacity-40 scale-[0.98] border-dashed border-indigo-500 bg-indigo-500/10' : ''}`}
              >
                <button
                  onClick={() => setSelectedTab(item.id)}
                  className="flex-grow flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-left rounded-xl focus:outline-none cursor-pointer"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
                <div className="px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 cursor-grab shrink-0" />
                </div>
              </div>
            );
          })}

          {/* Shortcut Helper link in navigation */}
          <button 
            onClick={() => setShowShortcutsModal(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-xl transition-all text-left mt-4 cursor-pointer"
          >
            <Keyboard className="w-4 h-4" />
            <span>Atalhos de Sistema</span>
          </button>
        </nav>        {/* Sidebar Bottom Sync Status */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-900 space-y-3 shrink-0">
          <div className="bg-slate-100/50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-900 select-none">
            <div className="flex items-center justify-between text-[10px] font-bold mb-1.5">
              <span className="text-slate-500 uppercase tracking-wider text-[9px]">API Status:</span>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-mono uppercase tracking-wider text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400">Online</span>
              </div>
            </div>
            <p className="text-[9.5px] text-slate-600 dark:text-slate-450 tracking-tight leading-relaxed font-semibold">
              Conectado ao Bling ERP
            </p>
          </div>

          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {theme === 'light' ? <Moon className="w-4 h-4 text-slate-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>{theme === 'light' ? 'Tema Escuro' : 'Tema Claro'}</span>
            </span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-400 transition-all text-left cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0 text-rose-500" />
            <span>Desconectar ERP</span>
          </button>
        </div>
      </aside>
    </>
  );
}
