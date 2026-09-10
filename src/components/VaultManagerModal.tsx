import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  FolderLock,
  Key,
  QrCode,
  FolderOpen,
  Edit2,
  Lock,
} from "lucide-react";
import { VaultProfile } from "../types";
import { useTranslation } from "../context/LanguageContext";

interface VaultManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaults: VaultProfile[];
  activeVaultId?: string | null;
  onSelectVault: (vault: VaultProfile) => Promise<void>;
  onCreateNewVault: (name: string, icon: string, password: string) => Promise<void>;
  onOpenLinkModal: () => void;
  onPickLocalVaultFile: () => Promise<void>;
  onUpdateVaultProfile: (vault: VaultProfile) => Promise<void>;
  onRemoveVault: (vaultId: string, deleteFile: boolean) => Promise<void>;
}

const VAULT_ICONS = ["🛒", "🏠", "💼", "🏖️", "🔑", "🌟", "🍕", "🎒", "👨‍👩‍👧‍👦", "❤️", "🔒", "📁"];

export const VaultManagerModal: React.FC<VaultManagerModalProps> = ({
  isOpen,
  onClose,
  vaults,
  activeVaultId,
  onSelectVault,
  onCreateNewVault,
  onOpenLinkModal,
  onPickLocalVaultFile,
  onUpdateVaultProfile,
  onRemoveVault,
}) => {
  const { t } = useTranslation();
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editingVault, setEditingVault] = useState<VaultProfile | null>(null);

  // Create form
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🛒");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("vaultManager.nameRequired"));
      return;
    }
    if (!password) {
      setError(t("vaultManager.passRequired"));
      return;
    }
    if (password !== repeatPassword) {
      setError(t("vaultManager.passMismatch"));
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onCreateNewVault(name.trim(), icon, password);
      setView("list");
      setName("");
      setPassword("");
      setRepeatPassword("");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(t("vaultManager.createError", { msg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVault || !editingVault.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onUpdateVaultProfile(editingVault);
      setView("list");
      setEditingVault(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <FolderLock size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t("vaultManager.title")}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  {vaults.length}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("vaultManager.subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* VIEW 1: LIST VAULTS */}
        {view === "list" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
            {/* Quick Actions Row */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setView("create");
                }}
                className="p-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 text-xs transition shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Plus size={16} />
                <span>{t("vaultManager.createNewVault")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLinkModal();
                }}
                className="p-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-xs transition shadow-md shadow-purple-600/20 cursor-pointer"
              >
                <QrCode size={16} />
                <span>{t("vaultManager.linkWithQrFtp")}</span>
              </button>
            </div>

            {/* Local file picker button */}
            <button
              type="button"
              onClick={onPickLocalVaultFile}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition border border-slate-200 dark:border-slate-700/60 cursor-pointer"
            >
              <FolderOpen size={14} className="text-amber-500" />
              <span>{t("vaultManager.importFile")}</span>
            </button>

            {/* Vaults List */}
            <div className="space-y-2 pt-1">
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block px-1">
                {t("vaultManager.availableVaults")}
              </label>

              {vaults.map((v) => {
                const isActive = v.id === activeVaultId;
                return (
                  <div
                    key={v.id}
                    className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
                      isActive
                        ? "bg-emerald-50/50 dark:bg-slate-800/90 border-emerald-500 shadow-md shadow-emerald-500/10"
                        : "bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div
                      onClick={() => {
                        if (!isActive) {
                          void onSelectVault(v);
                          onClose();
                        }
                      }}
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    >
                      <span className="text-2xl">{v.icon || "🛒"}</span>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate block">
                            {v.name}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                              {t("vaultManager.activeBadge")}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block font-mono">
                          {v.filePath}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingVault({ ...v });
                          setView("edit");
                        }}
                        title={t("vaultManager.editProfile")}
                        className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>

                      {vaults.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveVault(v.id, false)}
                          title={t("vaultManager.deleteVault")}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: CREATE NEW VAULT */}
        {view === "create" && (
          <form onSubmit={handleCreateSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={14} className="text-emerald-500" />
                <span>{t("vaultManager.createNewVault")}</span>
              </h4>
              <button
                type="button"
                onClick={() => setView("list")}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {t("common.back")}
              </button>
            </div>

            {/* Icon selection */}
            <div>
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                {t("vaultManager.chooseIcon").toUpperCase()}
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {VAULT_ICONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setIcon(em)}
                    className={`p-2 rounded-xl text-lg transition cursor-pointer ${
                      icon === em
                        ? "bg-emerald-500/20 border-2 border-emerald-500 scale-110"
                        : "bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                {t("vaultManager.vaultName").toUpperCase()}
              </label>
              <input
                type="text"
                autoFocus
                placeholder={t("vaultManager.vaultNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                {t("vaultManager.masterPass").toUpperCase()}
              </label>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 focus-within:border-emerald-500">
                <Key size={14} className="text-slate-400" />
                <input
                  type="password"
                  placeholder={t("vaultManager.masterPassPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>
            </div>

            {/* Repeat Password */}
            <div>
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                {t("vaultManager.repeatPass").toUpperCase()}
              </label>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 focus-within:border-emerald-500">
                <Lock size={14} className="text-slate-400" />
                <input
                  type="password"
                  placeholder={t("vaultManager.repeatPassPlaceholder")}
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>
            </div>

            {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setView("list")}
                className="px-4 py-2 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim() || !password}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? t("common.loading") : t("common.create")}
              </button>
            </div>
          </form>
        )}

        {/* VIEW 3: EDIT VAULT */}
        {view === "edit" && editingVault && (
          <form onSubmit={handleEditSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {t("vaultManager.editProfile")}
              </h4>
              <button
                type="button"
                onClick={() => setView("list")}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {t("common.cancel")}
              </button>
            </div>

            {/* Icon selection */}
            <div>
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                {t("vaultManager.changeIcon").toUpperCase()}
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {VAULT_ICONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEditingVault({ ...editingVault, icon: em })}
                    className={`p-2 rounded-xl text-lg transition cursor-pointer ${
                      editingVault.icon === em
                        ? "bg-emerald-500/20 border-2 border-emerald-500 scale-110"
                        : "bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                {t("vaultManager.vaultName").toUpperCase()}
              </label>
              <input
                type="text"
                value={editingVault.name}
                onChange={(e) => setEditingVault({ ...editingVault, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setView("list")}
                className="px-4 py-2 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                {t("common.save")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
