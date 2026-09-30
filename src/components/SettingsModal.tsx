import React, { useState, useEffect } from "react";
import {
  X,
  Sliders,
  Server,
  Shield,
  Smartphone,
  Check,
  AlertCircle,
  Key,
  QrCode,
  Copy,
  Camera,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  Globe,
  Trash2,
  Layers,
  ShoppingCart,
  Kanban,
  FileText,
  History,
  Type,
  Edit3,
  Eye,
  Columns,
} from "lucide-react";
import QRCode from "qrcode";
import {
  SyncConfig,
  Preferences,
  VaultData,
  ThemeMode,
  LanguageSetting,
  EnabledTabs,
  VaultProfile,
  UiScale,
  NoteEditorMode,
} from "../types";
import Api from "../api";
import { QrCameraScanner } from "./QrCameraScanner";
import { useTranslation } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { useScale } from "../context/ScaleContext";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncConfig: SyncConfig;
  onSaveSync: (config: SyncConfig) => void;
  preferences: Preferences;
  onSavePreferences: (prefs: Preferences) => void;
  vaultData: VaultData | null;
  onShowToast: (msg: string, icon?: string) => void;
  onDeleteDevice?: (id: string, name: string) => Promise<void> | void;
  currentVault?: VaultProfile | null;
  onUpdateEnabledTabs?: (tabs: EnabledTabs) => Promise<void> | void;
  onSaveNoteMode?: (mode: NoteEditorMode) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  syncConfig,
  onSaveSync,
  preferences,
  onSavePreferences,
  vaultData,
  onShowToast,
  onDeleteDevice,
  currentVault,
  onUpdateEnabledTabs,
  onSaveNoteMode,
}) => {
  const { t, language, setLanguage } = useTranslation();
  const { mode, setMode } = useTheme();
  const { scale, setScale } = useScale();

  const [activeTab, setActiveTab] = useState<"general" | "ftp" | "security" | "family">("general");
  const [noteMode, setNoteMode] = useState<NoteEditorMode>(() => {
    try {
      const saved = localStorage.getItem("familynotes_note_mode");
      if (saved === "edit" || saved === "preview" || saved === "split") return saved as NoteEditorMode;
    } catch {}
    return preferences.noteMode || "edit";
  });
  const [syncForm, setSyncForm] = useState<SyncConfig>(syncConfig);
  const [testingSync, setTestingSync] = useState(false);
  const [syncingModal, setSyncingModal] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [deviceName, setDeviceName] = useState(preferences.currentDeviceName || t("common.myDevice"));
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  // QR Linking States
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [qrString, setQrString] = useState<string>("");
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  useEffect(() => {
    setSyncForm(syncConfig);
  }, [syncConfig]);

  useEffect(() => {
    if (preferences.currentDeviceName) {
      setDeviceName(preferences.currentDeviceName);
    }
  }, [preferences.currentDeviceName]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showQrModal) {
          setShowQrModal(false);
        } else if (!isScannerOpen) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showQrModal, isScannerOpen, onClose]);

  if (!isOpen) return null;

  const handleTestSync = async () => {
    setTestingSync(true);
    setTestResult(null);
    try {
      await Api.testSync(syncForm);
      setTestResult({ ok: true, msg: t("settings.ftp.testSuccessMsg") });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setTestResult({ ok: false, msg: t("settings.ftp.testFailedMsg", { error: errorMsg }) });
    } finally {
      setTestingSync(false);
    }
  };

  const handleSyncNowFromModal = async () => {
    setSyncingModal(true);
    setTestResult(null);
    try {
      const configToSave: SyncConfig = {
        ...syncForm,
        enabled: true,
      };
      await onSaveSync(configToSave);
      setTestResult({ ok: true, msg: t("settings.ftp.syncSuccessMsg") });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setTestResult({ ok: false, msg: t("settings.ftp.syncFailedMsg", { error: errorMsg }) });
    } finally {
      setSyncingModal(false);
    }
  };

  const handleSaveSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const configToSave: SyncConfig = {
      ...syncForm,
      enabled: syncForm.host.trim().length > 0 ? true : syncForm.enabled,
    };
    await onSaveSync(configToSave);
    onClose();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== repeatPassword) {
      onShowToast(t("settings.security.passMismatch"), "⚠️");
      return;
    }
    if (newPassword.length < 4) {
      onShowToast(t("onboarding.passMinLength"), "⚠️");
      return;
    }

    setChangingPass(true);
    try {
      await Api.changeMasterPassword(oldPassword, newPassword);
      const updatedPrefs: Preferences = {
        ...preferences,
        savedMasterPassword: newPassword,
      };
      await Api.savePreferences(updatedPrefs);
      onSavePreferences(updatedPrefs);

      setOldPassword("");
      setNewPassword("");
      setRepeatPassword("");
      onShowToast(t("settings.security.passChanged"), "🔐");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      onShowToast(`${t("common.error")}: ${errorMsg}`, "❌");
    } finally {
      setChangingPass(false);
    }
  };

  const handleUpdateDeviceName = async () => {
    const updated = { ...preferences, currentDeviceName: deviceName.trim(), language };
    await Api.savePreferences(updated);
    onSavePreferences(updated);
    onShowToast(t("settings.general.deviceSaved"), "📱");
  };

  const handleScanQrData = (text: string) => {
    try {
      let jsonStr = text.trim();
      if (jsonStr.startsWith("fnlink://")) {
        jsonStr = atob(jsonStr.replace("fnlink://", ""));
      }
      const data = JSON.parse(jsonStr);
      if (data.host) {
        setSyncForm((prev) => ({
          ...prev,
          enabled: true,
          protocol: data.proto || "ftp",
          host: data.host,
          port: data.port || 21,
          username: data.user || "",
          password: data.pass || "",
          remoteDir: data.dir || "familynotes",
          remoteFile: data.file || "vault.fnvault",
        }));
        onShowToast(t("settings.ftp.qrImportedToast"), "📡");
      } else {
        onShowToast(t("onboarding.invalidQr"), "⚠️");
      }
    } catch {
      onShowToast(t("onboarding.invalidLinkFormat"), "❌");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex justify-center items-start sm:items-center overflow-y-auto p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl max-w-xl w-full max-h-[calc(100%-1rem)] sm:max-h-[calc(100%-2rem)] flex flex-col shadow-2xl overflow-hidden my-auto shrink-0">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t("settings.title")}</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              FamilyNotes
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={t("common.close")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Tabs: 4-columns segmented bar */}
        <div className="grid grid-cols-4 gap-1 p-1.5 bg-slate-100 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/80 px-2 sm:px-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            title={t("settings.tabGeneral")}
            className={`flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "general"
                ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700/60"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/40"
            }`}
          >
            <Sliders size={16} className="shrink-0" />
            <span className="hidden sm:inline truncate">{t("settings.tabGeneral")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ftp")}
            title={t("settings.tabFtp")}
            className={`flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "ftp"
                ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700/60"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/40"
            }`}
          >
            <Server size={16} className="shrink-0" />
            <span className="hidden sm:inline truncate">{t("settings.tabFtp")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            title={t("settings.tabSecurity")}
            className={`flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "security"
                ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700/60"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/40"
            }`}
          >
            <Shield size={16} className="shrink-0" />
            <span className="hidden sm:inline truncate">{t("settings.tabSecurity")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("family")}
            title={t("settings.tabFamily")}
            className={`flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "family"
                ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700/60"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/40"
            }`}
          >
            <Smartphone size={16} className="shrink-0" />
            <span className="hidden sm:inline truncate">{t("settings.tabFamily")}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 text-xs space-y-5">
          {/* TAB 0: GENERAL SETTINGS (APPEARANCE, LANGUAGE, DEVICE) */}
          {activeTab === "general" && (
            <div className="space-y-5">
              {/* THEME SELECTOR */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <Sun size={15} className="text-amber-500" />
                    <span>{t("settings.general.appearanceTitle")}</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t("settings.general.appearanceDesc")}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "system" as ThemeMode, label: t("settings.general.themeSystem"), icon: Monitor },
                    { id: "dark" as ThemeMode, label: t("settings.general.themeDark"), icon: Moon },
                    { id: "light" as ThemeMode, label: t("settings.general.themeLight"), icon: Sun },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = mode === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={async () => {
                          setMode(item.id);
                          const updated = { ...preferences, theme: item.id };
                          onSavePreferences(updated);
                          try {
                            await Api.savePreferences(updated);
                          } catch (e) {
                            console.error("Failed to save theme preference:", e);
                          }
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border font-bold text-xs gap-1.5 transition cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <Icon size={18} className={isSelected ? "text-emerald-500" : "text-slate-400"} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TEXT SIZE / UI SCALE SELECTOR */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <Type size={15} className="text-emerald-500" />
                    <span>{t("settings.general.scaleTitle")}</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t("settings.general.scaleDesc")}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "normal" as UiScale, label: t("settings.general.scaleNormal"), sub: t("settings.general.scaleNormalSub"), previewClass: "text-xs font-bold" },
                    { id: "large" as UiScale, label: t("settings.general.scaleLarge"), sub: t("settings.general.scaleLargeSub"), previewClass: "text-sm font-bold" },
                    { id: "xlarge" as UiScale, label: t("settings.general.scaleXLarge"), sub: t("settings.general.scaleXLargeSub"), previewClass: "text-base font-bold" },
                  ].map((item) => {
                    const isSelected = scale === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={async () => {
                          setScale(item.id);
                          const updated = { ...preferences, uiScale: item.id };
                          onSavePreferences(updated);
                          try {
                            await Api.savePreferences(updated);
                          } catch (e) {
                            console.error("Failed to save scale preference:", e);
                          }
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border font-bold text-xs gap-1 transition cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <span className={`tracking-tight ${item.previewClass} ${isSelected ? "text-emerald-500" : "text-slate-400"}`}>
                          Aa
                        </span>
                        <span className="leading-tight">{item.label}</span>
                        <span className="text-[10px] font-normal opacity-70">{item.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LANGUAGE SELECTOR */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <Globe size={15} className="text-sky-500" />
                    <span>{t("settings.general.languageTitle")}</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t("settings.general.languageDesc")}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "system" as LanguageSetting, label: t("settings.general.langSystem"), flag: "🌐" },
                    { id: "es" as LanguageSetting, label: t("settings.general.langEs"), flag: "🇪🇸" },
                    { id: "en" as LanguageSetting, label: t("settings.general.langEn"), flag: "🇬🇧" },
                  ].map((item) => {
                    const isSelected = language === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={async () => {
                          setLanguage(item.id);
                          const updated = { ...preferences, language: item.id };
                          onSavePreferences(updated);
                          try {
                            await Api.savePreferences(updated);
                          } catch (e) {
                            console.error("Failed to save language preference:", e);
                          }
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border font-bold text-xs gap-1.5 transition cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <span className="text-lg">{item.flag}</span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* NOTE OPEN MODE SELECTOR */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <FileText size={15} className="text-amber-500" />
                    <span>{t("settings.general.noteOpenModeTitle")}</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t("settings.general.noteOpenModeDesc")}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "edit" as NoteEditorMode, label: t("settings.general.noteModeEdit"), icon: Edit3 },
                    { id: "preview" as NoteEditorMode, label: t("settings.general.noteModePreview"), icon: Eye },
                    { id: "split" as NoteEditorMode, label: t("settings.general.noteModeSplit"), icon: Columns },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = noteMode === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={async () => {
                          setNoteMode(item.id);
                          try {
                            localStorage.setItem("familynotes_note_mode", item.id);
                          } catch {}
                          onSaveNoteMode?.(item.id);
                          const updated = { ...preferences, noteMode: item.id };
                          onSavePreferences(updated);
                          try {
                            await Api.savePreferences(updated);
                          } catch (e) {
                            console.error("Failed to save noteMode preference:", e);
                          }
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border font-bold text-xs gap-1.5 transition cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <Icon size={18} className={isSelected ? "text-emerald-500" : "text-slate-400"} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DEVICE NAME */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <Smartphone size={15} className="text-purple-500" />
                    <span>{t("settings.general.deviceTitle")}</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t("settings.general.deviceDesc")}
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder={t("settings.general.devicePlaceholder")}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleUpdateDeviceName}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    {t("common.save")}
                  </button>
                </div>
              </div>

              {/* VAULT MODULES / TABS */}
              {currentVault && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <Layers size={15} className="text-emerald-500" />
                      <span>{t("settings.general.modulesTitle")}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {t("settings.general.modulesDesc", { name: currentVault.name })}
                    </p>
                  </div>

                  {(() => {
                    const currentTabs: EnabledTabs = vaultData?.enabledTabs || currentVault.enabledTabs || {
                      lists: true,
                      tasks: true,
                      notes: true,
                      history: true,
                    };
                    const activeCount = [
                      currentTabs.lists !== false,
                      currentTabs.tasks !== false,
                      currentTabs.notes !== false,
                      currentTabs.history !== false,
                    ].filter(Boolean).length;

                    const modules = [
                      {
                        key: "lists" as const,
                        label: t("settings.general.moduleLists"),
                        icon: ShoppingCart,
                        color: "text-emerald-500",
                      },
                      {
                        key: "tasks" as const,
                        label: t("settings.general.moduleTasks"),
                        icon: Kanban,
                        color: "text-blue-500",
                      },
                      {
                        key: "notes" as const,
                        label: t("settings.general.moduleNotes"),
                        icon: FileText,
                        color: "text-amber-500",
                      },
                      {
                        key: "history" as const,
                        label: t("settings.general.moduleHistory"),
                        icon: History,
                        color: "text-sky-500",
                      },
                    ];

                    return (
                      <div className="space-y-2">
                        {modules.map((m) => {
                          const isEnabled = currentTabs[m.key] !== false;
                          const Icon = m.icon;
                          const isOnlyActive = isEnabled && activeCount <= 1;

                          return (
                            <label
                              key={m.key}
                              className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none ${
                                isEnabled
                                  ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50"
                                  : "bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/50 opacity-60 hover:opacity-80"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    isEnabled
                                      ? "bg-emerald-500/10 dark:bg-emerald-500/20"
                                      : "bg-slate-200 dark:bg-slate-800"
                                  }`}
                                >
                                  <Icon size={16} className={isEnabled ? m.color : "text-slate-400"} />
                                </div>
                                <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                                  {m.label}
                                </span>
                              </div>

                              <input
                                type="checkbox"
                                checked={isEnabled}
                                disabled={isOnlyActive}
                                onChange={async () => {
                                  if (isEnabled && activeCount <= 1) {
                                    onShowToast(t("settings.general.modulesAtLeastOne"), "⚠️");
                                    return;
                                  }
                                  const updatedTabs: EnabledTabs = {
                                    lists: currentTabs.lists !== false,
                                    tasks: currentTabs.tasks !== false,
                                    notes: currentTabs.notes !== false,
                                    history: currentTabs.history !== false,
                                    [m.key]: !isEnabled,
                                  };
                                  if (onUpdateEnabledTabs) {
                                    await onUpdateEnabledTabs(updatedTabs);
                                  }
                                }}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              />
                            </label>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TAB 1: FTP CONFIGURATION */}
          {activeTab === "ftp" && (
            <form onSubmit={handleSaveSyncSubmit} className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-xs block">
                    {t("settings.ftp.enabledLabel")}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t("settings.ftp.subtitle")}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={syncForm.enabled}
                  onChange={(e) =>
                    setSyncForm({ ...syncForm, enabled: e.target.checked })
                  }
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Auto Sync Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-xs block">
                    {t("settings.ftp.autoSyncLabel")}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t("settings.ftp.autoSyncDesc")}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={syncForm.autoSync ?? true}
                  onChange={(e) =>
                    setSyncForm({ ...syncForm, autoSync: e.target.checked })
                  }
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                    {t("settings.ftp.serverLabel")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("settings.ftp.hostPlaceholder")}
                    value={syncForm.host}
                    onChange={(e) =>
                      setSyncForm({ ...syncForm, host: e.target.value })
                    }
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                    {t("settings.ftp.portLabel")}
                  </label>
                  <input
                    type="number"
                    value={syncForm.port}
                    onChange={(e) =>
                      setSyncForm({
                        ...syncForm,
                        port: parseInt(e.target.value) || 21,
                      })
                    }
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                    {t("settings.ftp.userLabel")}
                  </label>
                  <input
                    type="text"
                    value={syncForm.username}
                    onChange={(e) =>
                      setSyncForm({ ...syncForm, username: e.target.value })
                    }
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                    {t("settings.ftp.passLabel")}
                  </label>
                  <input
                    type="password"
                    value={syncForm.password}
                    onChange={(e) =>
                      setSyncForm({ ...syncForm, password: e.target.value })
                    }
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                    {t("settings.ftp.dirLabel")}
                  </label>
                  <input
                    type="text"
                    value={syncForm.remoteDir}
                    onChange={(e) =>
                      setSyncForm({ ...syncForm, remoteDir: e.target.value })
                    }
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                    {t("settings.ftp.fileLabel")}
                  </label>
                  <input
                    type="text"
                    value={syncForm.remoteFile}
                    onChange={(e) =>
                      setSyncForm({ ...syncForm, remoteFile: e.target.value })
                    }
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* TEST CONNECTION & SYNC BUTTONS */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestSync}
                  disabled={testingSync || syncingModal || !syncForm.host}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sky-600 dark:text-sky-400 font-bold rounded-xl text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Server size={14} />
                  <span>
                    {testingSync
                      ? t("settings.ftp.testingBtn")
                      : t("settings.ftp.testBtn")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncNowFromModal}
                  disabled={syncingModal || testingSync || !syncForm.host}
                  className="py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold rounded-xl text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={14} className={syncingModal ? "animate-spin" : ""} />
                  <span>
                    {syncingModal
                      ? t("settings.ftp.syncingBtn")
                      : t("settings.ftp.syncNowBtn")}
                  </span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                    testResult.ok
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300"
                  }`}
                >
                  {testResult.ok ? (
                    <Check size={16} className="text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="text-rose-500 shrink-0" />
                  )}
                  <span className="text-xs">{testResult.msg}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  {t("settings.ftp.saveBtn")}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SECURITY & SAVED PASSWORD */}
          {activeTab === "security" && (
            <div className="space-y-5">
              {/* Device Credential Explanation */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <Shield size={16} />
                  <span>{t("settings.security.title")}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {t("settings.security.subtitle")}
                </p>
              </div>

              {/* CHANGE MASTER PASSWORD */}
              <form onSubmit={handleChangePassword} className="space-y-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  <Key size={14} className="text-emerald-500" />
                  <span>{t("settings.security.changePassTitle")}</span>
                </h4>

                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                    {t("settings.security.currentPassLabel")}
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                    {t("settings.security.newPassLabel")}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                    {t("settings.security.repeatPassLabel")}
                  </label>
                  <input
                    type="password"
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={changingPass || !newPassword}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-40 cursor-pointer"
                >
                  {changingPass ? t("settings.security.changingPassBtn") : t("settings.security.changePassBtn")}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: FAMILY & DEVICES */}
          {activeTab === "family" && (
            <div className="space-y-4">
              {/* Connected Family Members list */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider px-1">
                  {t("settings.family.title")}
                </h4>
                <div className="space-y-1.5">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">📱</span>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {preferences.currentDeviceName} ({t("settings.family.myDevice")})
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          {t("settings.family.statusOnline")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {(vaultData?.members || [])
                    .filter((m) => m.name !== preferences.currentDeviceName)
                    .map((m) => (
                      <div
                        key={m.id}
                        className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">📱</span>
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                              {m.name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {t("settings.family.statusFtpSync")}
                            </span>
                          </div>
                        </div>

                        {onDeleteDevice && (
                          <button
                            type="button"
                            onClick={() => {
                              const title = t("settings.family.deleteDeviceTitle", { name: m.name });
                              const confirmText = t("settings.family.deleteDeviceConfirm");
                              if (confirm(`${title}\n\n${confirmText}`)) {
                                onDeleteDevice(m.id, m.name);
                              }
                            }}
                            title={t("settings.family.deleteDeviceBtn")}
                            className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* QR Share Card */}
              <div className="p-4 bg-purple-500/10 border border-purple-500/25 rounded-2xl space-y-3 text-center">
                <QrCode size={32} className="mx-auto text-purple-600 dark:text-purple-400" />
                <div>
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white">{t("settings.family.qrTitle")}</h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    {t("settings.family.qrDesc")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!syncConfig.host) {
                        onShowToast(t("settings.ftp.syncConfigRequired"), "⚠️");
                        setActiveTab("ftp");
                        return;
                      }
                      const payload = {
                        fn_link: 1,
                        host: syncConfig.host,
                        port: syncConfig.port,
                        user: syncConfig.username,
                        pass: syncConfig.password,
                        dir: syncConfig.remoteDir,
                        file: syncConfig.remoteFile,
                        proto: syncConfig.protocol,
                      };
                      const encoded = `fnlink://${btoa(JSON.stringify(payload))}`;
                      setQrString(encoded);
                      try {
                        const url = await QRCode.toDataURL(encoded, {
                          width: 280,
                          margin: 2,
                          color: {
                            dark: "#090d16",
                            light: "#ffffff",
                          },
                        });
                        setQrCodeUrl(url);
                        setShowQrModal(true);
                      } catch (e) {
                        console.error("QR generation error:", e);
                        onShowToast(t("settings.ftp.qrError"), "❌");
                      }
                    }}
                    className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-purple-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <QrCode size={14} />
                    <span>{t("settings.family.showQrBtn")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/40 font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Camera size={14} />
                    <span>{t("settings.family.scanQrBtn")}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end shrink-0 bg-slate-50/70 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 sm:py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            {t("common.close")}
          </button>
        </div>

        {/* QR MODAL VIEWER */}
        {showQrModal && (
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex justify-center items-start sm:items-center overflow-y-auto p-2 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowQrModal(false);
            }}
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-sm w-full p-5 sm:p-6 text-center space-y-3.5 shadow-2xl relative my-auto shrink-0 max-h-[calc(100%-1rem)] sm:max-h-[calc(100%-2rem)] overflow-y-auto">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title={t("common.close")}
              >
                <X size={18} />
              </button>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
                  {t("settings.family.qrModalTitle")}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {t("settings.family.qrModalSubtitle")}
                </p>
              </div>

              {/* QR Image */}
              <div className="p-2 sm:p-3 bg-white rounded-2xl shadow-xl inline-block mx-auto">
                <img
                  src={qrCodeUrl}
                  alt={t("settings.family.qrModalAlt")}
                  className="w-44 h-44 sm:w-52 sm:h-52 mx-auto rounded-lg object-contain"
                />
              </div>

              <div className="p-3 bg-purple-500/10 border border-purple-500/25 rounded-xl text-[10px] text-purple-900 dark:text-purple-200 text-left space-y-1">
                <span className="font-bold block text-purple-700 dark:text-purple-300">
                  {t("settings.family.qrModalHowTitle")}
                </span>
                <p>
                  {t("settings.family.qrModalHowDesc", { host: syncConfig.host, file: syncConfig.remoteFile })}
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  {t("settings.family.qrModalHowSecurity")}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(qrString);
                      onShowToast(t("settings.ftp.copiedToast"), "📋");
                    } catch {
                      onShowToast(t("settings.ftp.copyErrorToast"), "⚠️");
                    }
                  }}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy size={13} />
                  <span>{t("common.copy")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  {t("common.close")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Camera Scanner Modal */}
      <QrCameraScanner
        isOpen={isScannerOpen}
        onScan={(text) => {
          setIsScannerOpen(false);
          handleScanQrData(text);
        }}
        onClose={() => setIsScannerOpen(false)}
        title={t("settings.family.scanQrModalTitle")}
      />
    </div>
  );
};
