import React from "react";
import {
  ShoppingCart,
  FileText,
  History,
  Settings,
  RefreshCw,
  Lock,
  ChevronDown,
  BookOpen,
} from "lucide-react";
import { SyncConfig, VaultProfile } from "../types";

interface HeaderProps {
  activeTab: "lists" | "notes" | "history";
  setActiveTab: (tab: "lists" | "notes" | "history") => void;
  syncConfig?: SyncConfig;
  syncing: boolean;
  onSync: () => void;
  onOpenSettings: () => void;
  onOpenVaultManager: () => void;
  onOpenCatalogModal?: () => void;
  onLock: () => void;
  currentVault?: VaultProfile | null;
  deviceName: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  syncConfig,
  syncing,
  onSync,
  onOpenSettings,
  onOpenVaultManager,
  onOpenCatalogModal,
  onLock,
  currentVault,
  deviceName,
}) => {
  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800/90 px-3 sm:px-6 py-2.5 sm:py-3 z-30 shrink-0 select-none">
      {/* Top Row: Brand, Desktop Nav, and Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        {/* Brand & Desktop Vault Selector */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-lg sm:text-xl shadow-lg shadow-emerald-500/20 shrink-0">
            {currentVault?.icon || "🛒"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-base font-bold text-white tracking-tight shrink-0">
                FamilyNotes
              </h1>

              {/* Vault Switcher Trigger (Desktop / Tablet >= sm) */}
              <button
                type="button"
                onClick={onOpenVaultManager}
                title="Cambiar o gestionar bóvedas"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition cursor-pointer group shrink-0"
              >
                <span>{currentVault?.icon || "🛒"}</span>
                <span className="max-w-[140px] truncate">{currentVault?.name || "Bóveda Principal"}</span>
                <ChevronDown size={12} className="text-slate-400 group-hover:text-emerald-400 shrink-0" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block truncate">
              {deviceName} • Clave en dispositivo
            </p>
          </div>
        </div>

      {/* Main Navigation Tabs (Desktop / Tablet only >= md) */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-950 border border-slate-800/90 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab("lists")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "lists"
              ? "bg-emerald-500 text-slate-950 shadow-md font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <ShoppingCart size={15} />
          <span>Listas de Compra</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "notes"
              ? "bg-emerald-500 text-slate-950 shadow-md font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FileText size={15} />
          <span>Notas Compartidas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "history"
              ? "bg-emerald-500 text-slate-950 shadow-md font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <History size={15} />
          <span>Historial & Sugerencias</span>
        </button>
      </nav>

      {/* Top Actions: Sync, Catalog, Settings, Lock */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {syncConfig?.enabled && (
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            title={syncing ? "Sincronizando con FTP..." : "Sincronizar ahora con FTP"}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 text-xs font-medium border border-slate-700/60 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={15} className={syncing ? "animate-spin text-emerald-400" : ""} />
            <span className="hidden lg:inline text-xs">
              {syncing ? "Sincronizando" : "Sync FTP"}
            </span>
          </button>
        )}

        {onOpenCatalogModal && (
          <button
            type="button"
            onClick={onOpenCatalogModal}
            title="Diccionario de productos e iconos"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-purple-500/20 text-slate-300 hover:text-purple-400 border border-slate-700/60 transition cursor-pointer"
          >
            <BookOpen size={16} />
          </button>
        )}

        <button
          type="button"
          onClick={onOpenSettings}
          title="Ajustes y Servidor FTP"
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition cursor-pointer"
        >
          <Settings size={16} />
        </button>

        <button
          type="button"
          onClick={onLock}
          title="Bloquear bóveda"
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700/60 transition cursor-pointer"
        >
          <Lock size={16} />
        </button>
      </div>
      </div>

      {/* Mobile Sub-Row: Dedicated Vault Bar (Mobile only < sm) */}
      <div className="sm:hidden mt-2 pt-2 border-t border-slate-800/70 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpenVaultManager}
          title="Cambiar o gestionar bóvedas"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 active:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/80 transition cursor-pointer"
        >
          <span className="text-sm">{currentVault?.icon || "🛒"}</span>
          <span className="font-bold text-white max-w-[190px] truncate">
            {currentVault?.name || "Bóveda Principal"}
          </span>
          <ChevronDown size={13} className="text-slate-400 shrink-0" />
        </button>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-950/60 px-2.5 py-1.5 rounded-xl border border-slate-800/60">
          <span className={`w-2 h-2 rounded-full ${syncConfig?.enabled ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
          <span className="font-medium text-slate-300">
            {syncConfig?.enabled ? (syncing ? "Sincronizando..." : "Sincronizado") : "Modo Local"}
          </span>
        </div>
      </div>
    </header>
  );
};
