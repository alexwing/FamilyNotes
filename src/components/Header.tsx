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
import { useTranslation } from "../context/LanguageContext";

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
  const { t } = useTranslation();

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/90 px-3 sm:px-6 py-2.5 sm:py-3 z-30 shrink-0 select-none transition-colors">
      {/* Top Row: Brand, Desktop Nav, and Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        {/* Brand & Desktop Vault Selector */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img src="/icon.png" alt="FamilyNotes" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl shadow-lg shadow-emerald-500/20 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-base font-bold text-slate-900 dark:text-white tracking-tight shrink-0 hidden sm:block">
                FamilyNotes
              </h1>

              {/* Vault Switcher Trigger */}
              <button
                type="button"
                onClick={onOpenVaultManager}
                title={t("header.switchVault")}
                className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 hover:text-black dark:hover:text-white text-xs font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer group shrink-0"
              >
                <span>{currentVault?.icon || "🛒"}</span>
                <span className="hidden sm:inline-block max-w-[140px] truncate">{currentVault?.name || "Bóveda Principal"}</span>
                <ChevronDown size={12} className="text-slate-400 group-hover:text-emerald-500 shrink-0" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block truncate">
              {deviceName}
            </p>
          </div>
        </div>

        {/* Main Navigation Tabs (Desktop / Tablet only >= md) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/90 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("lists")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "lists"
                ? "bg-emerald-500 text-slate-950 shadow-md font-bold"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <ShoppingCart size={15} />
            <span>{t("nav.lists")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "notes"
                ? "bg-emerald-500 text-slate-950 shadow-md font-bold"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <FileText size={15} />
            <span>{t("nav.notes")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "history"
                ? "bg-emerald-500 text-slate-950 shadow-md font-bold"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <History size={15} />
            <span>{t("nav.history")}</span>
          </button>
        </nav>

        {/* Top Actions: Sync, Catalog, Settings, Lock */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {syncConfig?.enabled && (
            <button
              type="button"
              onClick={onSync}
              disabled={syncing}
              title={syncing ? t("header.syncing") : t("header.syncNow")}
              className={`flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-medium border border-slate-200 dark:border-slate-700/60 transition disabled:opacity-50 cursor-pointer ${
                syncing ? "text-emerald-500" : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-500"
              }`}
            >
              <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
              <span className="hidden lg:inline text-xs">
                {syncing ? t("header.syncing") : t("nav.sync")}
              </span>
            </button>
          )}

          {onOpenCatalogModal && (
            <button
              type="button"
              onClick={onOpenCatalogModal}
              title={t("nav.dictionary")}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-purple-500/15 dark:hover:bg-purple-500/20 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 border border-slate-200 dark:border-slate-700/60 transition cursor-pointer"
            >
              <BookOpen size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            title={t("nav.settings")}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 transition cursor-pointer"
          >
            <Settings size={16} />
          </button>

          <button
            type="button"
            onClick={onLock}
            title={t("header.lockVault")}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-rose-500/15 dark:hover:bg-rose-500/20 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700/60 transition cursor-pointer"
          >
            <Lock size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
