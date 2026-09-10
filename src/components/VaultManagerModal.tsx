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
      setError("Escribe un nombre para la nueva bóveda");
      return;
    }
    if (password.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres");
      return;
    }
    if (password !== repeatPassword) {
      setError("Las contraseñas no coinciden");
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
      setIcon("🛒");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error al crear: ${msg}`);
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
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <FolderLock size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Mis Bóvedas (Vaults)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {vaults.length}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Gestiona y alterna entre múltiples bóvedas independientes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* VIEW 1: LIST VAULTS */}
        {view === "list" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
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
                <span>Crear Nueva Bóveda</span>
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
                <span>Vincular con QR / FTP</span>
              </button>
            </div>

            {/* Local file picker button */}
            <button
              type="button"
              onClick={onPickLocalVaultFile}
              className="w-full py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition border border-slate-700/60"
            >
              <FolderOpen size={14} className="text-amber-400" />
              <span>Abrir archivo .fnvault existente del equipo</span>
            </button>

            {/* Vaults List */}
            <div className="space-y-2 pt-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block px-1">
                Bóvedas Disponibles
              </label>

              {vaults.map((v) => {
                const isActive = v.id === activeVaultId;
                return (
                  <div
                    key={v.id}
                    className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
                      isActive
                        ? "bg-slate-800/90 border-emerald-500 shadow-md shadow-emerald-500/10"
                        : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
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
                          <span className="text-xs sm:text-sm font-bold text-white truncate block">
                            {v.name}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              Activa
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 truncate block font-mono">
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
                        title="Editar nombre e icono"
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                      >
                        <Edit2 size={13} />
                      </button>

                      {vaults.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveVault(v.id, false)}
                          title="Quitar de la lista"
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
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
          <form onSubmit={handleCreateSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={14} className="text-emerald-400" />
                <span>Crear Nueva Bóveda</span>
              </h4>
              <button
                type="button"
                onClick={() => setView("list")}
                className="text-xs text-slate-400 hover:text-white"
              >
                Volver
              </button>
            </div>

            {/* Icon selection */}
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">
                ELIGE UN ICONO
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {VAULT_ICONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setIcon(em)}
                    className={`p-2 rounded-xl text-lg transition ${
                      icon === em
                        ? "bg-emerald-500/20 border-2 border-emerald-500 scale-110"
                        : "bg-slate-950 border border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">
                NOMBRE DE LA BÓVEDA
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Ej: Bóveda Personal, Trabajo, Casa Playa..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">
                CONTRASEÑA MAESTRA
              </label>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-emerald-500">
                <Key size={14} className="text-slate-400" />
                <input
                  type="password"
                  placeholder="Contraseña para cifrar esta bóveda..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-xs text-white font-mono outline-none"
                />
              </div>
            </div>

            {/* Repeat Password */}
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">
                REPETIR CONTRASEÑA
              </label>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-emerald-500">
                <Lock size={14} className="text-slate-400" />
                <input
                  type="password"
                  placeholder="Repite la contraseña..."
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="w-full bg-transparent text-xs text-white font-mono outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Se guardará en este dispositivo para que no te la pida cada vez.
              </span>
            </div>

            {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setView("list")}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim() || !password}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isSubmitting ? "Creando..." : "Crear Bóveda"}
              </button>
            </div>
          </form>
        )}

        {/* VIEW 3: EDIT VAULT */}
        {view === "edit" && editingVault && (
          <form onSubmit={handleEditSubmit} className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Editar Bóveda
              </h4>
              <button
                type="button"
                onClick={() => setView("list")}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>

            {/* Icon selection */}
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">
                CAMBIAR ICONO
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {VAULT_ICONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEditingVault({ ...editingVault, icon: em })}
                    className={`p-2 rounded-xl text-lg transition ${
                      editingVault.icon === em
                        ? "bg-emerald-500/20 border-2 border-emerald-500 scale-110"
                        : "bg-slate-950 border border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">
                NOMBRE DE LA BÓVEDA
              </label>
              <input
                type="text"
                value={editingVault.name}
                onChange={(e) => setEditingVault({ ...editingVault, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setView("list")}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
