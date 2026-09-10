import React, { useEffect, useState, useCallback, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
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
import { useTranslation } from "./context/LanguageContext";
import { BUILTIN_DICTIONARY, normalizeText } from "./utils/productDictionary";

const DEFAULT_VAULT_FILENAME = "family_notes.fnvault";

export function App() {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<Preferences>({
    theme: "system",
    language: "system",
    currentDeviceName: t("common.myDevice"),
    currentDeviceId: "dev-local",
    savedMasterPassword: null,
    vaultFilePath: null,
    activeVaultId: null,
    vaults: [],
  });

  const [isInitializing, setIsInitializing] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [activeTab, setActiveTab] = useState<"lists" | "notes" | "history">("lists");
  const [selectedListId, setSelectedListId] = useState("ALL_LISTS");
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

  const preferencesRef = useRef(preferences);
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  // Load vault data into state
  const refreshVaultData = useCallback(async () => {
    try {
      const data = await Api.getVaultData();

      // Check device revocation: if vault has members, verify current device is authorized
      const currentDev = preferencesRef.current.currentDeviceName;
      const currentDevId = preferencesRef.current.currentDeviceId;
      if (data.members && data.members.length > 0) {
        const isMember = data.members.some(
          (m) =>
            m.name.toLowerCase() === currentDev.toLowerCase() ||
            (m.deviceId && m.deviceId === currentDevId)
        );
        if (!isMember) {
          console.warn("Device was removed from members! Locking out...");
          const currentPrefs = preferencesRef.current;
          const updatedVaults = (currentPrefs.vaults || []).map((v) =>
            v.id === currentPrefs.activeVaultId || v.filePath === vaultPathRef.current
              ? { ...v, savedMasterPassword: null }
              : v
          );
          const updatedPrefs: Preferences = {
            ...currentPrefs,
            savedMasterPassword: null,
            vaults: updatedVaults,
          };
          await Api.savePreferences(updatedPrefs);
          setPreferences(updatedPrefs);
          await Api.lockVault();
          setIsUnlocked(false);
          setManualUnlockError(t("settings.family.deviceRevokedMsg"));
          return;
        }
      }

      setVaultData(data);
      if (data.shoppingLists.length > 0) {
        setSelectedListId((curr) => {
          if (curr === "ALL_LISTS") return curr;
          const found = data.shoppingLists.some((l) => l.id === curr);
          return found ? curr : "ALL_LISTS";
        });
      }
    } catch (e) {
      console.error("Failed to load vault data:", e);
    }
  }, [t]);

  const isSyncingRef = useRef(false);
  const hasPendingChangesRef = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Core Sync Executor (Safely non-reentrant)
  const performSync = useCallback(async (isSilent = true) => {
    if (isSyncingRef.current) return;
    try {
      const cfg = await Api.getSyncConfig();
      if (!cfg.enabled || !cfg.host.trim()) return;

      isSyncingRef.current = true;
      setSyncing(true);

      const snap = await Api.syncNow();
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      hasPendingChangesRef.current = false;
      if (!isSilent) {
        showToast(t("toasts.syncCompleted"), "📡");
      }
    } catch (err: unknown) {
      if (!isSilent) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(t("toasts.syncError", { msg }), "❌");
      }
      console.warn("Sync failed or skipped:", err);
    } finally {
      isSyncingRef.current = false;
      setSyncing(false);
    }
  }, [persistVaultFile, refreshVaultData, showToast]);

  // Schedule a debounced sync after user stops modifying things (10s inactivity)
  const scheduleDebouncedSync = useCallback(() => {
    hasPendingChangesRef.current = true;
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      void performSync(true);
    }, 10000); // 10 seconds of quiet time
  }, [performSync]);

  // Smart Sync Listeners:
  // 1. Sync immediately when app loses focus or goes to background (if changes pending)
  // 2. Silent pull on return to foreground (if no unsaved changes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (hasPendingChangesRef.current && isUnlocked) {
          if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
          void performSync(true);
        }
      } else {
        if (isUnlocked && !hasPendingChangesRef.current) {
          void performSync(true);
        }
      }
    };

    const handleBlur = () => {
      if (hasPendingChangesRef.current && isUnlocked) {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        void performSync(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isUnlocked, performSync]);

  // Periodic Cron: check every 60 seconds
  useEffect(() => {
    if (!isUnlocked) return;
    const interval = setInterval(() => {
      void performSync(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [isUnlocked, performSync]);

  // Restore & Persist Window State (Fullscreen / Maximized / Windowed) on Desktop
  useEffect(() => {
    try {
      const appWindow = getCurrentWindow();
      const saved = localStorage.getItem("fn_window_state");
      if (saved) {
        try {
          const { isMaximized, isFullscreen } = JSON.parse(saved);
          if (isFullscreen) {
            void appWindow.setFullscreen(true);
          } else if (isMaximized) {
            void appWindow.maximize();
          }
        } catch {}
      }

      let timer: ReturnType<typeof setTimeout>;
      const saveState = async () => {
        try {
          const isMax = await appWindow.isMaximized();
          const isFull = await appWindow.isFullscreen();
          localStorage.setItem(
            "fn_window_state",
            JSON.stringify({ isMaximized: isMax, isFullscreen: isFull })
          );
        } catch {}
      };

      const unlistenPromise = appWindow.onResized(() => {
        clearTimeout(timer);
        timer = setTimeout(saveState, 300);
      });

      return () => {
        void unlistenPromise.then((fn) => fn?.());
      };
    } catch {
      // Graceful fallback on Android/iOS/web
    }
  }, []);

  // Initial Boot & Multi-Vault Setup
  useEffect(() => {
    const initApp = async () => {
      try {
        const prefs = await Api.getPreferences();
        const defaultDir = await Api.getDefaultVaultsDir();

        let currentVaults: VaultProfile[] = prefs.vaults || [];
        let prefsNeedSave = false;

        // Ensure unique persistent deviceId for this device
        if (!prefs.currentDeviceId || prefs.currentDeviceId === "dev-local") {
          prefs.currentDeviceId =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          prefsNeedSave = true;
        }

        // Check if there is an existing vault file on disk or in preferences to migrate
        if (currentVaults.length === 0) {
          const legacyPath = `${defaultDir}/${DEFAULT_VAULT_FILENAME}`;
          const fileExists = await Api.vaultFileExists(legacyPath);
          const legacyFile = prefs.vaultFilePath || (fileExists ? legacyPath : null);

          if (legacyFile) {
            const initialVault: VaultProfile = {
              id: "vault-default",
              name: t("vaultManager.defaultVaultName"),
              filePath: legacyFile,
              icon: "🛒",
              savedMasterPassword: prefs.savedMasterPassword,
            };
            currentVaults = [initialVault];
            prefs.vaults = currentVaults;
            prefs.activeVaultId = initialVault.id;
            prefsNeedSave = true;
          }
        }

        if (prefsNeedSave) {
          await Api.savePreferences(prefs);
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
              const data = await Api.getVaultData();

              const devName = prefs.currentDeviceName || t("common.myDevice");
              const devId = prefs.currentDeviceId;
              if (data.members && data.members.length > 0) {
                const isMember = data.members.some(
                  (m) =>
                    m.name.toLowerCase() === devName.toLowerCase() ||
                    (m.deviceId && m.deviceId === devId)
                );
                if (!isMember) {
                  console.warn("Device was removed from members on startup! Locking out...");
                  const updatedVaults = currentVaults.map((v) =>
                    v.id === active.id || v.filePath === active.filePath
                      ? { ...v, savedMasterPassword: null }
                      : v
                  );
                  await Api.savePreferences({
                    ...prefs,
                    savedMasterPassword: null,
                    vaults: updatedVaults,
                  });
                  await Api.lockVault();
                  setIsUnlocked(false);
                  setManualUnlockError(t("settings.family.deviceRevokedMsg"));
                  return;
                }
              }

              setIsUnlocked(true);
              await refreshVaultData();
              void performSync(true);
              showToast(t("toasts.vaultOpened", { name: active.name }), "🔓");
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
      } finally {
        setIsInitializing(false);
      }
    };

    void initApp();
  }, [refreshVaultData, showToast, t]);

  // Handle Onboarding Completion (First Vault Creation)
  const handleOnboardingComplete = async (password: string, deviceName: string) => {
    try {
      const defaultDir = await Api.getDefaultVaultsDir();
      const filePath = vaultPathRef.current || `${defaultDir}/${DEFAULT_VAULT_FILENAME}`;

      const snap = await Api.createVault(password, deviceName);
      await Api.writeVaultFile(filePath, snap.contents);

      const newVault: VaultProfile = {
        id: `vault-${Date.now()}`,
        name: t("vaultManager.defaultVaultName"),
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
      showToast(t("toasts.vaultCreated"), "🎉");
    } catch (e) {
      console.error("Failed to create vault:", e);
      showToast(t("toasts.vaultCreateError"), "❌");
    }
  };

  // Handle Onboarding Link via FTP / QR
  const handleLinkViaFtp = async (config: SyncConfig, password: string, deviceName: string) => {
    try {
      const defaultDir = await Api.getDefaultVaultsDir();
      const filePath =
        vaultPathRef.current || `${defaultDir}/${config.remoteFile || DEFAULT_VAULT_FILENAME}`;

      const devId =
        preferences.currentDeviceId && preferences.currentDeviceId !== "dev-local"
          ? preferences.currentDeviceId
          : typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const snap = await Api.linkViaFtp(config, password, deviceName, devId);
      await Api.writeVaultFile(filePath, snap.contents);

      const newVault: VaultProfile = {
        id: `vault-ftp-${Date.now()}`,
        name: t("vaultManager.sharedVaultDefaultName", { host: config.host }),
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
        currentDeviceId: devId,
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
      void performSync(true);
      showToast(t("toasts.vaultLinked"), "🎉");
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

      // Re-register device in family members upon successful manual password entry
      try {
        const snapMember = await Api.registerFamilyMember(
          preferences.currentDeviceName,
          preferences.currentDeviceId
        );
        await persistVaultFile(snapMember.contents);
      } catch (err) {
        console.warn("Could not register family member on unlock:", err);
      }

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
      void performSync(true);
      showToast(t("lock.unlockSuccess"), "🔓");
    } catch {
      setManualUnlockError(t("lock.unlockError"));
    }
  };

  // Lock Vault
  const handleLock = async () => {
    await Api.lockVault();
    setIsUnlocked(false);
    setVaultData(null);
    showToast(t("toasts.vaultLocked"), "🔒");
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
        void performSync(true);
        showToast(t("toasts.vaultOpened", { name: vault.name }), "🔓");
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
    showToast(t("toasts.vaultReady", { name }), "🎉");
  };

  // Multi-Vault: Pick Local Vault File (.fnvault / .pdvault)
  const handlePickLocalVaultFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Family Vault", extensions: ["fnvault", "pdvault"] }],
      });

      if (!selected || typeof selected !== "string") return;

      const path = selected;
      const fileName = path.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") || "Vault";

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
      showToast(t("toasts.openFileError"), "❌");
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
    showToast(t("toasts.vaultUpdated"), "✅");
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
      showToast(t("toasts.dictSaved", { name: item.name }), "📚");
      scheduleDebouncedSync();
    } catch (e) {
      console.error("Upsert catalog error:", e);
    }
  };

  const handleDeleteCatalogItem = async (id: string) => {
    try {
      const snap = await Api.deleteCatalogItem(id);
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      showToast(t("toasts.dictDeleted"), "🗑");
      scheduleDebouncedSync();
    } catch (e) {
      console.error("Delete catalog error:", e);
    }
  };

  // Shopping List Operations
  const handleAddItem = async (
    listId: string,
    text: string,
    emoji?: string,
    category?: string,
    addToDictionary?: boolean
  ) => {
    try {
      const trimmedText = text.trim();
      const finalEmoji = emoji || "🛒";
      const finalCategory = category || "General";

      const item: ShoppingItem = {
        id: "",
        text: trimmedText,
        emoji: finalEmoji,
        category: finalCategory,
        checked: false,
        checkedBy: preferences.currentDeviceName,
        createdAt: "",
        updatedAt: "",
      };
      const snap = await Api.upsertShoppingItem(listId, item);
      let finalContents = snap.contents;

      // If user customized icon & category, add to dictionary if not existing
      if (addToDictionary && trimmedText) {
        const norm = normalizeText(trimmedText);
        const existingInCatalog = (vaultData?.catalog || []).find(
          (c) => normalizeText(c.name) === norm
        );
        const existingInBuiltin = BUILTIN_DICTIONARY.find(
          (b) => normalizeText(b.name) === norm
        );

        if (!existingInCatalog && !existingInBuiltin) {
          const words = trimmedText
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 2);
          const keywords = Array.from(new Set([trimmedText.toLowerCase(), ...words]));

          const newCatItem: ProductCatalogItem = {
            id: "",
            name: trimmedText,
            emoji: finalEmoji,
            category: finalCategory,
            keywords,
          };
          const catSnap = await Api.upsertCatalogItem(newCatItem);
          finalContents = catSnap.contents;
          showToast(t("lists.addedToListAndDictionary", { text: trimmedText }), "📚");
        } else if (
          existingInCatalog &&
          (existingInCatalog.emoji !== finalEmoji || existingInCatalog.category !== finalCategory)
        ) {
          const updatedCatItem: ProductCatalogItem = {
            ...existingInCatalog,
            emoji: finalEmoji,
            category: finalCategory,
          };
          const catSnap = await Api.upsertCatalogItem(updatedCatItem);
          finalContents = catSnap.contents;
          showToast(t("lists.updatedInDictionary", { text: trimmedText }), "📚");
        }
      }

      await persistVaultFile(finalContents);
      await refreshVaultData();
      scheduleDebouncedSync();
    } catch (e) {
      console.error("Add item error:", e);
    }
  };

  const handleToggleItem = async (listId: string, itemId: string) => {
    // 1. Optimistic instant UI toggle (0ms)
    setVaultData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        shoppingLists: prev.shoppingLists.map((l) =>
          l.id === listId
            ? {
                ...l,
                items: l.items.map((i) =>
                  i.id === itemId
                    ? { ...i, checked: !i.checked, checkedBy: preferences.currentDeviceName }
                    : i
                ),
              }
            : l
        ),
      };
    });

    // 2. Persist in background without blocking UI
    try {
      const snap = await Api.toggleShoppingItem(listId, itemId, preferences.currentDeviceName);
      await persistVaultFile(snap.contents);
      scheduleDebouncedSync();
    } catch (e) {
      console.error("Toggle item error:", e);
      await refreshVaultData();
    }
  };

  const handleDeleteItem = async (listId: string, itemId: string) => {
    // 1. Optimistic instant UI removal (0ms)
    setVaultData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        shoppingLists: prev.shoppingLists.map((l) =>
          l.id === listId
            ? { ...l, items: l.items.filter((i) => i.id !== itemId) }
            : l
        ),
      };
    });

    // 2. Persist in background without blocking UI
    try {
      const snap = await Api.deleteShoppingItem(listId, itemId);
      await persistVaultFile(snap.contents);
      scheduleDebouncedSync();
    } catch (e) {
      console.error("Delete item error:", e);
      await refreshVaultData();
    }
  };

  const handleClearCompleted = async (listId: string) => {
    const isAll = listId === "ALL_LISTS";
    const targetListIds = isAll
      ? (vaultData?.shoppingLists || []).filter((l) => !l.archived).map((l) => l.id)
      : [listId];

    // 1. Optimistic instant UI removal
    setVaultData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        shoppingLists: prev.shoppingLists.map((l) =>
          targetListIds.includes(l.id)
            ? { ...l, items: l.items.filter((i) => !i.checked) }
            : l
        ),
      };
    });

    try {
      let lastSnap = null;
      for (const id of targetListIds) {
        lastSnap = await Api.clearCompletedItems(id);
      }
      if (lastSnap) {
        await persistVaultFile(lastSnap.contents);
      }
      showToast(t("toasts.completedCleared"), "🧹");
      scheduleDebouncedSync();
    } catch (e) {
      console.error("Clear completed error:", e);
      await refreshVaultData();
    }
  };

  const handleClearHistory = async () => {
    if (!confirm(t("history.clearHistoryConfirm"))) return;
    try {
      const snap = await Api.clearPurchaseHistory();
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      showToast(t("history.clearHistoryToast"), "🗑️");
      scheduleDebouncedSync();
    } catch (e) {
      console.error("Clear history error:", e);
    }
  };

  const handleDeleteHistoryItem = async (text: string) => {
    try {
      setVaultData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          purchaseHistory: prev.purchaseHistory.filter(
            (p) => p.text.trim().toLowerCase() !== text.trim().toLowerCase()
          ),
        };
      });
      const snap = await Api.deletePurchaseHistoryItem(text);
      await persistVaultFile(snap.contents);
      showToast(t("history.itemDeleted"), "🗑️");
      scheduleDebouncedSync();
    } catch (e) {
      console.error("Delete history item error:", e);
      await refreshVaultData();
    }
  };

  const handleReorderLists = async (listIds: string[]) => {
    try {
      setVaultData((prev) => {
        if (!prev) return prev;
        const map = new Map(prev.shoppingLists.map((l) => [l.id, l]));
        const reordered: ShoppingList[] = [];
        for (const id of listIds) {
          const l = map.get(id);
          if (l) {
            reordered.push(l);
            map.delete(id);
          }
        }
        for (const l of map.values()) {
          reordered.push(l);
        }
        return { ...prev, shoppingLists: reordered };
      });

      const snap = await Api.reorderShoppingLists(listIds);
      await persistVaultFile(snap.contents);
      scheduleDebouncedSync();
    } catch (e) {
      console.error("Reorder shopping lists error:", e);
      await refreshVaultData();
    }
  };

  const handleDeleteFamilyMember = async (id: string, name: string) => {
    try {
      const snap = await Api.deleteFamilyMember(id);
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      showToast(t("settings.family.deviceDeletedToast", { name }), "🗑️");
      void performSync(true);
    } catch (e) {
      console.error("Delete family member error:", e);
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
      showToast(t("toasts.listCreated", { name }), "📝");
      scheduleDebouncedSync();
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
      showToast(t("toasts.listUpdated", { name }), "✏️");
      scheduleDebouncedSync();
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
      showToast(t("toasts.listDeleted"), "🗑");
      scheduleDebouncedSync();
    } catch (e) {
      console.error("Delete list error:", e);
    }
  };

  const handleArchiveList = async (id: string) => {
    try {
      const existing = (vaultData?.shoppingLists || []).find((l) => l.id === id);
      if (!existing) return;
      const updated: ShoppingList = {
        ...existing,
        archived: true,
        updatedAt: new Date().toISOString(),
      };
      const snap = await Api.upsertShoppingList(updated);
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      const remainingActive = (vaultData?.shoppingLists || []).filter((l) => l.id !== id && !l.archived);
      if (remainingActive.length > 0) {
        setSelectedListId(remainingActive[0].id);
      }
      showToast(t("toasts.listArchived", { name: existing.name }), "📦");
      scheduleDebouncedSync();
    } catch (e) {
      console.error("Archive list error:", e);
    }
  };

  const handleUnarchiveList = async (id: string) => {
    try {
      const existing = (vaultData?.shoppingLists || []).find((l) => l.id === id);
      if (!existing) return;
      const updated: ShoppingList = {
        ...existing,
        archived: false,
        updatedAt: new Date().toISOString(),
      };
      const snap = await Api.upsertShoppingList(updated);
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      setSelectedListId(id);
      showToast(t("toasts.listUnarchived", { name: existing.name }), "✅");
      scheduleDebouncedSync();
    } catch (e) {
      console.error("Unarchive list error:", e);
    }
  };

  // Notes Operations
  const handleSaveNote = async (note: Note) => {
    try {
      const snap = await Api.upsertNote(note);
      await persistVaultFile(snap.contents);
      await refreshVaultData();
      showToast(t("toasts.noteSaved"), "💾");
      scheduleDebouncedSync();
    } catch (e) {
      console.error("Save note error:", e);
    }
  };

  const handleDeleteNote = async (id: string) => {
    // 1. Optimistic instant removal
    setVaultData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        notes: prev.notes.filter((n) => n.id !== id),
      };
    });

    try {
      const snap = await Api.deleteNote(id);
      await persistVaultFile(snap.contents);
      showToast(t("toasts.noteDeleted"), "🗑");
      scheduleDebouncedSync();
    } catch (e) {
      console.error("Delete note error:", e);
      await refreshVaultData();
    }
  };

  const handleArchiveNote = async (id: string) => {
    setVaultData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        notes: prev.notes.map((n) =>
          n.id === id ? { ...n, archived: true, updatedAt: new Date().toISOString() } : n
        ),
      };
    });

    try {
      const existing = (vaultData?.notes || []).find((n) => n.id === id);
      if (!existing) return;
      const updated: Note = {
        ...existing,
        archived: true,
        updatedAt: new Date().toISOString(),
      };
      const snap = await Api.upsertNote(updated);
      await persistVaultFile(snap.contents);
      showToast(t("toasts.noteArchived"), "📦");
      scheduleDebouncedSync();
    } catch (e) {
      console.error("Archive note error:", e);
      await refreshVaultData();
    }
  };

  const handleUnarchiveNote = async (id: string) => {
    setVaultData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        notes: prev.notes.map((n) =>
          n.id === id ? { ...n, archived: false, updatedAt: new Date().toISOString() } : n
        ),
      };
    });

    try {
      const existing = (vaultData?.notes || []).find((n) => n.id === id);
      if (!existing) return;
      const updated: Note = {
        ...existing,
        archived: false,
        updatedAt: new Date().toISOString(),
      };
      const snap = await Api.upsertNote(updated);
      await persistVaultFile(snap.contents);
      showToast(t("toasts.noteUnarchived"), "✅");
      scheduleDebouncedSync();
    } catch (e) {
      console.error("Unarchive note error:", e);
      await refreshVaultData();
    }
  };

  // Manual Sync
  const handleManualSync = async () => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    await performSync(false);
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
          showToast(t("toasts.vaultSynced"), "📡");
        } catch (syncErr: unknown) {
          const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
          showToast(t("toasts.saveLocalFtpFail", { msg }), "⚠️");
        } finally {
          setSyncing(false);
        }
      } else {
        showToast(t("toasts.ftpSaved"), "💾");
      }
    } catch (e) {
      console.error("Save sync config error:", e);
      showToast(t("toasts.ftpSaveError"), "❌");
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

  // Render App Initializing Splash (prevents password screen flicker during auto-unlock)
  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors z-50">
        <div className="flex flex-col items-center space-y-4 animate-in fade-in duration-300">
          <img
            src="/icon.png"
            alt="FamilyNotes"
            className="w-20 h-20 rounded-3xl shadow-xl shadow-emerald-500/25 animate-pulse"
          />
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">FamilyNotes</h1>
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Render Manual Unlock Screen
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors">
        <form
          onSubmit={handleManualUnlock}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-4 shadow-2xl text-center animate-in fade-in duration-200 text-slate-900 dark:text-white"
        >
          <img src="/icon.png" alt="FamilyNotes" className="w-14 h-14 rounded-2xl mx-auto shadow-lg shadow-emerald-500/20" />
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {currentVault?.name || "FamilyNotes"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t("lock.enterPassword")}</p>
          </div>

          <div className="text-left space-y-1">
            <input
              type="password"
              autoFocus
              placeholder={t("lock.passwordPlaceholder")}
              value={manualUnlockPassword}
              onChange={(e) => setManualUnlockPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-mono outline-none focus:border-emerald-500"
            />
            {manualUnlockError && (
              <p className="text-xs text-rose-500 dark:text-rose-400 font-medium">{manualUnlockError}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock size={14} />
            <span>{t("lock.unlockBtn")}</span>
          </button>

          {preferences.vaults.length > 1 && (
            <button
              type="button"
              onClick={() => setIsVaultManagerOpen(true)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center justify-center gap-1.5 mx-auto pt-2 cursor-pointer"
            >
              <FolderLock size={13} />
              <span>{t("lock.switchVault", { count: preferences.vaults.length })}</span>
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
    <div className="fixed inset-0 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden transition-colors">
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
            onArchiveList={handleArchiveList}
            onUnarchiveList={handleUnarchiveList}
            onReorderLists={handleReorderLists}
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
            onArchiveNote={handleArchiveNote}
            onUnarchiveNote={handleUnarchiveNote}
          />
        )}

        {activeTab === "history" && (
          <HistoryView
            history={vaultData?.purchaseHistory || []}
            lists={vaultData?.shoppingLists || []}
            onAddItem={handleAddItem}
            onClearHistory={handleClearHistory}
            onDeleteItem={handleDeleteHistoryItem}
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
        onDeleteDevice={handleDeleteFamilyMember}
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
