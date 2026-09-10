import React, { useEffect, useState, useCallback, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Lock, FolderLock } from "lucide-react";
import Api from "./api";
import {
  Preferences,
  VaultData,
  SyncConfig,
  ShoppingItem,
  ShoppingList,
  Note,
  ProductCatalogItem,
  VaultProfile,
} from "./types";
import { Header } from "./components/Header";
import { ShoppingListView } from "./components/ShoppingListView";
import { NotesView } from "./components/NotesView";
import { HistoryView } from "./components/HistoryView";
import { SettingsModal } from "./components/SettingsModal";
import { OnboardingModal } from "./components/OnboardingModal";
import { VaultManagerModal } from "./components/VaultManagerModal";
import { ProductCatalogModal } from "./components/ProductCatalogModal";
import { BottomNav } from "./components/BottomNav";

const DEFAULT_VAULT_FILENAME = "family_notes.fnvault";

export function App() {
  const [preferences, setPreferences] = useState<Preferences>({
    theme: "dark",
    language: "es",
    currentDeviceName: "Mi Dispositivo",
    currentDeviceId: "dev-local",
    savedMasterPassword: null,
    vaultFilePath: null,
    activeVaultId: null,
    vaults: [],
  });

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [activeTab, setActiveTab] = useState<"lists" | "notes" | "history">("lists");
  const [selectedListId, setSelectedListId] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isVaultManagerOpen, setIsVaultManagerOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  // Manual unlock state
  const [manualUnlockPassword, setManualUnlockPassword] = useState("");
  const [manualUnlockError, setManualUnlockError] = useState("");
  const [toast, setToast] = useState<{ msg: string; icon?: string } | null>(null);

  const vaultPathRef = useRef<string>("");

  const showToast = useCallback((msg: string, icon = "✨") => {
    setToast({ msg, icon });
    setTimeout(() => {
      setToast((prev) => (prev?.msg === msg ? null : prev));
    }, 2800);
  }, []);

  // Save vault snapshot to disk using atomic Rust command (No plugin-fs sandbox blocks)
  const persistVaultFile = useCallback(async (contents: string) => {
    try {
      if (vaultPathRef.current) {
        await Api.writeVaultFile(vaultPathRef.current, contents);
      }
    } catch (e) {
      console.error("Error writing vault to file:", e);
    }
  }, []);

  // Load vault data into state
  const refreshVaultData = useCallback(async () => {
    try {
      const data = await Api.getVaultData();
      setVaultData(data);
      if (data.shoppingLists.length > 0) {
        setSelectedListId((curr) => {
          const found = data.shoppingLists.some((l) => l.id === curr);
          return found ? curr : data.shoppingLists[0].id;
        });
      }
    } catch (e) {
      console.error("Failed to load vault data:", e);
    }
  }, []);

  // Auto-Sync in background if configured
  const triggerAutoSync = useCallback(async () => {
    try {
      const cfg = await Api.getSyncConfig();
      if (cfg.enabled && cfg.autoSync && cfg.host.trim()) {
        setSyncing(true);
        const snap = await Api.syncNow();
        await persistVaultFile(snap.contents);
        await refreshVaultData();
        setSyncing(false);
      }
    } catch {
      setSyncing(false);
    }
  }, [persistVaultFile, refreshVaultData]);

  // Initial Boot & Multi-Vault Setup
  useEffect(() => {
    const initApp = async () => {
      try {
        const prefs = await Api.getPreferences();
        const defaultDir = await Api.getDefaultVaultsDir();

        let currentVaults: VaultProfile[] = prefs.vaults || [];

        // Check if there is an existing vault file on disk or in preferences to migrate
        if (currentVaults.length === 0) {
          const legacyPath = `${defaultDir}/${DEFAULT_VAULT_FILENAME}`;
          const fileExists = await Api.vaultFileExists(legacyPath);
          const legacyFile = prefs.vaultFilePath || (fileExists ? legacyPath : null);

          if (legacyFile) {
            const initialVault: VaultProfile = {
              id: "vault-default",
              name: "Bóveda Familiar",
              filePath: legacyFile,
              icon: "🛒",
              savedMasterPassword: prefs.savedMasterPassword,
            };
            currentVaults = [initialVault];
            prefs.vaults = currentVaults;
            prefs.activeVaultId = initialVault.id;
            await Api.savePreferences(prefs);
          }
        }

        setPreferences(prefs);

        // Find active vault
        const active =
          currentVaults.find((v) => v.id === prefs.activeVaultId) ||
          currentVaults[0];

        if (!active) {
          // No vault at all: setup target path and open onboarding
          const newPath = `${defaultDir}/${DEFAULT_VAULT_FILENAME}`;
          vaultPathRef.current = newPath;
          setIsOnboardingOpen(true);
          return;
        }

        vaultPathRef.current = active.filePath;
        const fileExists = await Api.vaultFileExists(active.filePath);

        if (!fileExists) {
          // File missing on disk: open onboarding
          setIsOnboardingOpen(true);
        } else {
          // File exists! Attempt auto-unlock with saved password
          const pass = active.savedMasterPassword || prefs.savedMasterPassword;
          if (pass) {
            try {
              const contents = await Api.readVaultFile(active.filePath);
              await Api.unlockVault(contents, pass);
              setIsUnlocked(true);
              await refreshVaultData();
              void triggerAutoSync();
              showToast(`Bóveda "${active.name}" abierta`, "🔓");
            } catch (err) {
              console.warn("Auto-unlock failed, prompting password:", err);
              setIsUnlocked(false);
            }
          } else {
            setIsUnlocked(false);
          }
        }
      } catch (err) {
        console.error("App init error:", err);
        setIsOnboardingOpen(true);
      }
    };

    void initApp();
  }, [refreshVaultData, showToast]);

  // Handle Onboarding Completion (First Vault Creation)
  const handleOnboardingComplete = async (password: string, deviceName: string) => {
    try {
      const defaultDir = await Api.getDefaultVaultsDir();
      const filePath = vaultPathRef.current || `${defaultDir}/${DEFAULT_VAULT_FILENAME}`;

      const snap = await Api.createVault(password, deviceName);
      await Api.writeVaultFile(filePath, snap.contents);

      const newVault: VaultProfile = {
        id: `vault-${Date.now()}`,
        name: "Bóveda Familiar",
        filePath,
        icon: "🛒",
        savedMasterPassword: password,
      };

      const updatedVaults = [
        ...(preferences.vaults || []).filter((v) => v.filePath !== filePath),
        newVault,
      ];

      const updatedPrefs: Preferences = {
        ...preferences,
        currentDeviceName: deviceName,
        savedMasterPassword: password,
        vaultFilePath: filePath,
        activeVaultId: newVault.id,
        vaults: updatedVaults,
      };

      await Api.savePreferences(updatedPrefs);
      setPreferences(updatedPrefs);

      setIsOnboardingOpen(false);
      setIsUnlocked(true);
      await refreshVaultData();
      showToast("¡Bóveda creada y guardada con éxito!", "🎉");
    } catch (e) {
      console.error("Failed to create vault:", e);
      showToast("Error al crear la bóveda", "❌");
    }
  };

  // Handle Onboarding Link via FTP / QR
  const handleLinkViaFtp = async (config: SyncConfig, password: string, deviceName: string) => {
    try {
      const defaultDir = await Api.getDefaultVaultsDir();
      const filePath =
        vaultPathRef.current || `${defaultDir}/${config.remoteFile || DEFAULT_VAULT_FILENAME}`;

      const snap = await Api.linkViaFtp(config, password, deviceName);
      await Api.writeVaultFile(filePath, snap.contents);

      const newVault: VaultProfile = {
        id: `vault-ftp-${Date.now()}`,
        name: `Bóveda Compartida (${config.host})`,
        filePath,
        icon: "☁️",
        savedMasterPassword: password,
      };

      const updatedVaults = [
        ...(preferences.vaults || []).filter((v) => v.filePath !== filePath),
        newVault,
      ];

      const updatedPrefs: Preferences = {
        ...preferences,
        currentDeviceName: deviceName,
        savedMasterPassword: password,
        vaultFilePath: filePath,
        activeVaultId: newVault.id,
        vaults: updatedVaults,
      };

      await Api.savePreferences(updatedPrefs);
      setPreferences(updatedPrefs);

      setIsOnboardingOpen(false);
      setIsUnlocked(true);
      await refreshVaultData();
      showToast("¡Bóveda vinculada y descargada desde el FTP!", "🎉");
    } catch (e) {
      console.error("Link via FTP error:", e);
      throw e;
    }
  };

  // Manual Unlock
  const handleManualUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualUnlockError("");
    try {
      const contents = await Api.readVaultFile(vaultPathRef.current);
      await Api.unlockVault(contents, manualUnlockPassword);

      // Save password in active vault profile in preferences
      const activeId = preferences.activeVaultId;
      const updatedVaults = preferences.vaults.map((v) =>
        v.id === activeId || v.filePath === vaultPathRef.current
          ? { ...v, savedMasterPassword: manualUnlockPassword }
          : v
      );

      const updatedPrefs: Preferences = {
        ...preferences,
        savedMasterPassword: manualUnlockPassword,
        vaults: updatedVaults,
      };

      await Api.savePreferences(updatedPrefs);
      setPreferences(updatedPrefs);

      setIsUnlocked(true);
      setManualUnlockPassword("");
      await refreshVaultData();
      void triggerAutoSync();
      showToast("Desbloqueado con éxito", "🔓");
    } catch {
      setManualUnlockError("Contraseña incorrecta. Inténtalo de nuevo.");
    }
  };

  // Lock Vault
  const handleLock = async () => {
    await Api.lockVault();
    setIsUnlocked(false);
    setVaultData(null);
    showToast("Bóveda cerrada", "🔒");
  };

  // Multi-Vault: Switch Vault
  const handleSelectVault = async (vault: VaultProfile) => {
    if (isUnlocked) {
      await Api.lockVault();
      setIsUnlocked(false);
      setVaultData(null);
    }

    vaultPathRef.current = vault.filePath;

    const updatedPrefs: Preferences = {
      ...preferences,
      activeVaultId: vault.id,
      vaultFilePath: vault.filePath,
    };
    await Api.savePreferences(updatedPrefs);
    setPreferences(updatedPrefs);

    // Try auto-unlock if password saved
    const pass = vault.savedMasterPassword || preferences.savedMasterPassword;
    if (pass) {
      try {
        const contents = await Api.readVaultFile(vault.filePath);
        await Api.unlockVault(contents, pass);
        setIsUnlocked(true);
        await refreshVaultData();
        void triggerAutoSync();
        showToast(`Bóveda "${vault.name}" abierta`, "🔓");
        return;
      } catch (e) {
        console.warn("Vault switch unlock failed:", e);
      }
    }

    // Prompt password
    setIsUnlocked(false);
    setManualUnlockPassword("");
  };

  // Multi-Vault: Create New Vault
  const handleCreateNewVault = async (name: string, icon: string, password: string) => {
    const defaultDir = await Api.getDefaultVaultsDir();
    const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const filePath = `${defaultDir}/vault_${safeName}_${Date.now()}.fnvault`;

    const snap = await Api.createVault(password, preferences.currentDeviceName);
    await Api.writeVaultFile(filePath, snap.contents);

    const newVault: VaultProfile = {
      id: `vault-${Date.now()}`,
      name,
      filePath,
      icon,
      savedMasterPassword: password,
    };

    vaultPathRef.current = filePath;

    const updatedVaults = [...preferences.vaults, newVault];
    const updatedPrefs: Preferences = {
      ...preferences,
      activeVaultId: newVault.id,
      vaultFilePath: filePath,
      vaults: updatedVaults,
    };

    await Api.savePreferences(updatedPrefs);
    setPreferences(updatedPrefs);

    setIsUnlocked(true);
    await refreshVaultData();
    showToast(`Bóveda "${name}" creada y lista`, "🎉");
  };

  // Multi-Vault: Pick Local Vault File (.fnvault / .pdvault)
  const handlePickLocalVaultFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Bóveda Cifrada", extensions: ["fnvault", "pdvault"] }],
      });

      if (!selected || typeof selected !== "string") return;

      const path = selected;
      const fileName = path.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") || "Bóveda Local";

      const newVault: VaultProfile = {
        id: `vault-${Date.now()}`,
        name: fileName,
        filePath: path,
        icon: "📁",
        savedMasterPassword: null,
      };

      const updatedVaults = [...preferences.vaults.filter((v) => v.filePath !== path), newVault];
      const updatedPrefs: Preferences = {
        ...preferences,
        activeVaultId: newVault.id,
        vaultFilePath: path,
        vaults: updatedVaults,
      };

      await Api.savePreferences(updatedPrefs);
      setPreferences(updatedPrefs);

      setIsVaultManagerOpen(false);
      await handleSelectVault(newVault);
    } catch (err) {
      console.error("Pick vault file error:", err);
      showToast("No se pudo abrir el archivo", "❌");
    }
  };

  // Multi-Vault: Update Vault Profile
  const handleUpdateVaultProfile = async (vault: VaultProfile) => {
    const updatedVaults = preferences.vaults.map((v) => (v.id === vault.id ? vault : v));
    const updatedPrefs: Preferences = {
      ...preferences,
      vaults: updatedVaults,
    };
    await Api.savePreferences(updatedPrefs);
    setPreferences(updatedPrefs);
    showToast("Bóveda actualizada", "✅");
  };

  // Multi-Vault: Remove Vault from list
  const handleRemoveVault = async (vaultId: string, deleteFile: boolean) => {
    const target = preferences.vaults.find((v) => v.id === vaultId);
    if (!target) return;

    if (deleteFile) {
      await Api.deleteVaultFile(target.filePath);
    }

    const remaining = preferences.vaults.filter((v) => v.id !== vaultId);
    const nextActive = remaining[0]?.id || null;

    const updatedPrefs: Preferences = {
      ...preferences,
      activeVaultId: nextActive,
      vaults: remaining,
    };

    await Api.savePreferences(updatedPrefs);
    setPreferences(updatedPrefs);

    if (nextActive && remaining[0]) {
      await handleSelectVault(remaining[0]);
    } else {
      setIsOnboardingOpen(true);
    }
  };

  // Catalog / Dictionary Operations
  const handleUpsertCatalogItem = async (item: ProductCatalogItem) => {
    try {
      const snap = await Api.upsertCatalogItem(item);
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      showToast(`"${item.name}" guardado en el diccionario`, "📚");
      void triggerAutoSync();
    } catch (e) {
      console.error("Upsert catalog error:", e);
    }
  };

  const handleDeleteCatalogItem = async (id: string) => {
    try {
      const snap = await Api.deleteCatalogItem(id);
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      showToast("Producto eliminado del diccionario", "🗑");
      void triggerAutoSync();
    } catch (e) {
      console.error("Delete catalog error:", e);
    }
  };

  // Shopping List Operations
  const handleAddItem = async (listId: string, text: string, emoji?: string, category?: string) => {
    try {
      const item: ShoppingItem = {
        id: "",
        text: text.trim(),
        emoji: emoji || "🛒",
        category: category || "General",
        checked: false,
        checkedBy: preferences.currentDeviceName,
        createdAt: "",
        updatedAt: "",
      };
      const snap = await Api.upsertShoppingItem(listId, item);
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      void triggerAutoSync();
    } catch (e) {
      console.error("Add item error:", e);
    }
  };

  const handleToggleItem = async (listId: string, itemId: string) => {
    try {
      const snap = await Api.toggleShoppingItem(listId, itemId, preferences.currentDeviceName);
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      void triggerAutoSync();
    } catch (e) {
      console.error("Toggle item error:", e);
    }
  };

  const handleDeleteItem = async (listId: string, itemId: string) => {
    try {
      const snap = await Api.deleteShoppingItem(listId, itemId);
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      showToast("Producto eliminado", "🗑");
      void triggerAutoSync();
    } catch (e) {
      console.error("Delete item error:", e);
    }
  };

  const handleClearCompleted = async (listId: string) => {
    try {
      const snap = await Api.clearCompletedItems(listId);
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      showToast("Comprados vaciados", "🧹");
      void triggerAutoSync();
    } catch (e) {
      console.error("Clear completed error:", e);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("¿Seguro que quieres borrar el historial de compras?")) return;
    try {
      const snap = await Api.clearPurchaseHistory();
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      showToast("Historial borrado", "🗑️");
      void triggerAutoSync();
    } catch (e) {
      console.error("Clear history error:", e);
    }
  };

  const handleCreateList = async (name: string, color: string, icon: string) => {
    try {
      const newListId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `list_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const list: ShoppingList = {
        id: newListId,
        name,
        color,
        icon,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const snap = await Api.upsertShoppingList(list);
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      setSelectedListId(newListId);
      showToast(`Lista "${name}" creada`, "📝");
      void triggerAutoSync();
    } catch (e) {
      console.error("Create list error:", e);
    }
  };

  const handleUpdateList = async (
    listId: string,
    name: string,
    color: string,
    icon: string
  ) => {
    try {
      const existing = (vaultData?.shoppingLists || []).find((l) => l.id === listId);
      if (!existing) return;
      const updated: ShoppingList = {
        ...existing,
        name,
        color,
        icon,
        updatedAt: new Date().toISOString(),
      };
      const snap = await Api.upsertShoppingList(updated);
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      showToast(`Lista "${name}" actualizada`, "✏️");
      void triggerAutoSync();
    } catch (e) {
      console.error("Update list error:", e);
    }
  };

  const handleDeleteList = async (id: string) => {
    try {
      const snap = await Api.deleteShoppingList(id);
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      const remaining = (vaultData?.shoppingLists || []).filter((l) => l.id !== id);
      if (remaining.length > 0) {
        setSelectedListId(remaining[0].id);
      }
      showToast("Lista eliminada", "🗑");
      void triggerAutoSync();
    } catch (e) {
      console.error("Delete list error:", e);
    }
  };

  // Notes Operations
  const handleSaveNote = async (note: Note) => {
    try {
      const snap = await Api.upsertNote(note);
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      showToast("Nota guardada", "💾");
      void triggerAutoSync();
    } catch (e) {
      console.error("Save note error:", e);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const snap = await Api.deleteNote(id);
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      showToast("Nota eliminada", "🗑");
      void triggerAutoSync();
    } catch (e) {
      console.error("Delete note error:", e);
    }
  };

  // Manual Sync
  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const snap = await Api.syncNow();
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      showToast("Sincronización FTP completada", "📡");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Error al sincronizar: ${msg}`, "❌");
    } finally {
      setSyncing(false);
    }
  };

  // Save Sync Configuration
  const handleSaveSync = async (cfg: SyncConfig) => {
    try {
      const snap = await Api.setSyncConfig(cfg);
      await persistVaultFile(snap.contents);
      await refreshVaultData();

      // If sync is enabled and host is specified, immediately trigger initial upload/sync
      if (cfg.enabled && cfg.host.trim()) {
        try {
          setSyncing(true);
          const syncSnap = await Api.syncNow();
          await persistVaultFile(syncSnap.contents);
          await refreshVaultData();
          showToast("¡Bóveda guardada y sincronizada en el FTP!", "📡");
        } catch (syncErr: unknown) {
          const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
          showToast(`Guardado localmente, pero falló FTP: ${msg}`, "⚠️");
        } finally {
          setSyncing(false);
        }
      } else {
        showToast("Configuración FTP guardada", "💾");
      }
    } catch (e) {
      console.error("Save sync config error:", e);
      showToast("Error al guardar configuración", "❌");
    }
  };

  // Render Onboarding
  if (isOnboardingOpen) {
    return (
      <OnboardingModal
        onComplete={handleOnboardingComplete}
        onLinkViaFtp={handleLinkViaFtp}
      />
    );
  }

  const currentVault =
    preferences.vaults.find((v) => v.id === preferences.activeVaultId) ||
    preferences.vaults[0] ||
    null;

  // Render Manual Unlock Screen
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <form
          onSubmit={handleManualUnlock}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-4 shadow-2xl text-center animate-in fade-in duration-200"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-emerald-500/20">
            {currentVault?.icon || "🛒"}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {currentVault?.name || "FamilyNotes"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Introduce tu contraseña maestra para acceder</p>
          </div>

          <div className="text-left space-y-1">
            <input
              type="password"
              autoFocus
              placeholder="Contraseña..."
              value={manualUnlockPassword}
              onChange={(e) => setManualUnlockPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono outline-none focus:border-emerald-500"
            />
            {manualUnlockError && (
              <p className="text-xs text-rose-400 font-medium">{manualUnlockError}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <Lock size={14} />
            <span>Desbloquear Bóveda</span>
          </button>

          {preferences.vaults.length > 1 && (
            <button
              type="button"
              onClick={() => setIsVaultManagerOpen(true)}
              className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto pt-2"
            >
              <FolderLock size={13} />
              <span>Cambiar de bóveda ({preferences.vaults.length})</span>
            </button>
          )}
        </form>

        {/* Vault Manager Modal while locked */}
        <VaultManagerModal
          isOpen={isVaultManagerOpen}
          onClose={() => setIsVaultManagerOpen(false)}
          vaults={preferences.vaults}
          activeVaultId={preferences.activeVaultId}
          onSelectVault={handleSelectVault}
          onCreateNewVault={handleCreateNewVault}
          onOpenLinkModal={() => setIsOnboardingOpen(true)}
          onPickLocalVaultFile={handlePickLocalVaultFile}
          onUpdateVaultProfile={handleUpdateVaultProfile}
          onRemoveVault={handleRemoveVault}
        />
      </div>
    );
  }

  const totalPending = (vaultData?.shoppingLists || []).reduce(
    (acc, list) => acc + list.items.filter((i) => !i.checked).length,
    0
  );
  const totalNotes = (vaultData?.notes || []).length;

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        syncConfig={vaultData?.sync}
        syncing={syncing}
        onSync={handleManualSync}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenVaultManager={() => setIsVaultManagerOpen(true)}
        onOpenCatalogModal={() => setIsCatalogOpen(true)}
        onLock={handleLock}
        currentVault={currentVault}
        deviceName={preferences.currentDeviceName}
      />

      {/* Main Tab Views */}
      <main className="flex-1 flex flex-col overflow-hidden min-h-0 pb-[72px] md:pb-0 relative">
        {activeTab === "lists" && (
          <ShoppingListView
            lists={vaultData?.shoppingLists || []}
            history={vaultData?.purchaseHistory || []}
            customCatalog={vaultData?.catalog || []}
            selectedListId={selectedListId}
            onSelectList={setSelectedListId}
            onCreateList={handleCreateList}
            onUpdateList={handleUpdateList}
            onDeleteList={handleDeleteList}
            onAddItem={handleAddItem}
            onToggleItem={handleToggleItem}
            onDeleteItem={handleDeleteItem}
            onClearCompleted={handleClearCompleted}
            onOpenCatalogModal={() => setIsCatalogOpen(true)}
            deviceName={preferences.currentDeviceName}
          />
        )}

        {activeTab === "notes" && (
          <NotesView
            notes={vaultData?.notes || []}
            onSaveNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
          />
        )}

        {activeTab === "history" && (
          <HistoryView
            history={vaultData?.purchaseHistory || []}
            lists={vaultData?.shoppingLists || []}
            onAddItem={handleAddItem}
            onClearHistory={handleClearHistory}
            selectedListId={selectedListId}
          />
        )}
      </main>

      {/* Mobile Ergonomic Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={totalPending}
        notesCount={totalNotes}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        syncConfig={
          vaultData?.sync || {
            enabled: false,
            protocol: "ftp",
            host: "",
            port: 21,
            username: "",
            password: "",
            remoteDir: "familynotes",
            remoteFile: "vault.fnvault",
            autoSync: true,
          }
        }
        onSaveSync={handleSaveSync}
        preferences={preferences}
        onSavePreferences={setPreferences}
        vaultData={vaultData}
        onShowToast={showToast}
      />

      {/* Vault Manager Modal */}
      <VaultManagerModal
        isOpen={isVaultManagerOpen}
        onClose={() => setIsVaultManagerOpen(false)}
        vaults={preferences.vaults}
        activeVaultId={preferences.activeVaultId}
        onSelectVault={handleSelectVault}
        onCreateNewVault={handleCreateNewVault}
        onOpenLinkModal={() => setIsOnboardingOpen(true)}
        onPickLocalVaultFile={handlePickLocalVaultFile}
        onUpdateVaultProfile={handleUpdateVaultProfile}
        onRemoveVault={handleRemoveVault}
      />

      {/* Product Catalog / Dictionary Modal */}
      <ProductCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        customCatalog={vaultData?.catalog || []}
        onUpsertItem={handleUpsertCatalogItem}
        onDeleteItem={handleDeleteCatalogItem}
      />

      {/* Floating Notification Toast */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-5 left-1/2 -translate-x-1/2 bg-slate-900 border border-emerald-500/40 text-white text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 pointer-events-none z-50 animate-bounce">
          <span>{toast.icon || "✨"}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

export default App;
