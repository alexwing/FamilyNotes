import React, { useState, useEffect } from "react";
import {
  X,
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
} from "lucide-react";
import QRCode from "qrcode";
import { SyncConfig, Preferences, VaultData } from "../types";
import Api from "../api";
import { QrCameraScanner } from "./QrCameraScanner";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncConfig: SyncConfig;
  onSaveSync: (config: SyncConfig) => void;
  preferences: Preferences;
  onSavePreferences: (prefs: Preferences) => void;
  vaultData: VaultData | null;
  onShowToast: (msg: string, icon?: string) => void;
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
}) => {
  const [activeTab, setActiveTab] = useState<"ftp" | "security" | "family">("ftp");
  const [syncForm, setSyncForm] = useState<SyncConfig>(syncConfig);
  const [testingSync, setTestingSync] = useState(false);
  const [syncingModal, setSyncingModal] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [deviceName, setDeviceName] = useState(preferences.currentDeviceName || "Mi Dispositivo");
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

  if (!isOpen) return null;

  const handleTestSync = async () => {
    setTestingSync(true);
    setTestResult(null);
    try {
      await Api.testSync(syncForm);
      setTestResult({ ok: true, msg: "¡Conexión FTP y acceso a la carpeta verificados con éxito!" });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setTestResult({ ok: false, msg: `Error de conexión: ${errorMsg}` });
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
      setTestResult({ ok: true, msg: "¡Bóveda guardada y subida al FTP con éxito!" });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setTestResult({ ok: false, msg: `Error al sincronizar: ${errorMsg}` });
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
      onShowToast("Las contraseñas no coinciden", "⚠️");
      return;
    }
    if (newPassword.length < 4) {
      onShowToast("La contraseña debe tener al menos 4 caracteres", "⚠️");
      return;
    }

    setChangingPass(true);
    try {
      await Api.changeMasterPassword(oldPassword, newPassword);
      // Update saved password in preferences
      const updatedPrefs: Preferences = {
        ...preferences,
        savedMasterPassword: newPassword,
      };
      await Api.savePreferences(updatedPrefs);
      onSavePreferences(updatedPrefs);

      setOldPassword("");
      setNewPassword("");
      setRepeatPassword("");
      onShowToast("Contraseña maestra actualizada y guardada", "🔐");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      onShowToast(`Error al cambiar contraseña: ${errorMsg}`, "❌");
    } finally {
      setChangingPass(false);
    }
  };

  const handleUpdateDeviceName = async () => {
    const updated = { ...preferences, currentDeviceName: deviceName.trim() };
    await Api.savePreferences(updated);
    onSavePreferences(updated);
    onShowToast("Nombre de dispositivo guardado", "📱");
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
        onShowToast("¡Configuración FTP importada desde el QR!", "📡");
      } else {
        onShowToast("El QR no contiene datos de servidor FTP válidos", "⚠️");
      }
    } catch {
      onShowToast("Formato de enlace no reconocido", "❌");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Ajustes & Sincronización</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              FamilyNotes
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Tabs: Responsive 3-columns segmented bar */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-950/60 border-b border-slate-800/80 px-2 sm:px-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("ftp")}
            className={`flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "ftp"
                ? "bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Server size={14} className="shrink-0" />
            <span className="truncate">
              <span className="hidden sm:inline">Servidor </span>FTP
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "security"
                ? "bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Shield size={14} className="shrink-0" />
            <span className="truncate">
              Seguridad<span className="hidden sm:inline"> & Clave</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("family")}
            className={`flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "family"
                ? "bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Smartphone size={14} className="shrink-0" />
            <span className="truncate">
              Familia<span className="hidden sm:inline"> & Disp.</span>
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs space-y-4">
          {/* TAB 1: FTP CONFIGURATION */}
          {activeTab === "ftp" && (
            <form onSubmit={handleSaveSyncSubmit} className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <div>
                  <span className="font-bold text-white text-xs block">
                    Activar Sincronización FTP
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Sincroniza tus listas y notas con toda la familia
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
              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <div>
                  <span className="font-bold text-white text-xs block">
                    Sincronización Automática
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Sube y descarga cambios automáticamente al añadir o marcar productos
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

              {/* Import from QR button */}
              <div className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                <div className="flex items-center gap-2.5 text-purple-300 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <QrCode size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-white block">¿Vincular desde otro equipo?</span>
                    <span className="text-[11px] text-purple-300/80">
                      Importa los datos escaneando o subiendo el QR
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-md shadow-purple-600/20"
                >
                  <Camera size={13} />
                  <span>Escanear / Subir QR</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    SERVIDOR / HOST
                  </label>
                  <input
                    type="text"
                    placeholder="ftp.ejemplo.com"
                    value={syncForm.host}
                    onChange={(e) =>
                      setSyncForm({ ...syncForm, host: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    PUERTO
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    USUARIO FTP
                  </label>
                  <input
                    type="text"
                    value={syncForm.username}
                    onChange={(e) =>
                      setSyncForm({ ...syncForm, username: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    CONTRASEÑA FTP
                  </label>
                  <input
                    type="password"
                    value={syncForm.password}
                    onChange={(e) =>
                      setSyncForm({ ...syncForm, password: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    CARPETA REMOTA
                  </label>
                  <input
                    type="text"
                    value={syncForm.remoteDir}
                    onChange={(e) =>
                      setSyncForm({ ...syncForm, remoteDir: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    NOMBRE DEL ARCHIVO
                  </label>
                  <input
                    type="text"
                    value={syncForm.remoteFile}
                    onChange={(e) =>
                      setSyncForm({ ...syncForm, remoteFile: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* TEST CONNECTION & SYNC BUTTONS */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestSync}
                  disabled={testingSync || syncingModal || !syncForm.host}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold rounded-xl text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Server size={14} />
                  <span>
                    {testingSync
                      ? "Probando..."
                      : "🔌 Probar conexión"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncNowFromModal}
                  disabled={syncingModal || testingSync || !syncForm.host}
                  className="py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold rounded-xl text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={14} className={syncingModal ? "animate-spin" : ""} />
                  <span>
                    {syncingModal
                      ? "Sincronizando..."
                      : "📡 Sincronizar ahora"}
                  </span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                    testResult.ok
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}
                >
                  {testResult.ok ? (
                    <Check size={16} className="text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="text-rose-400 shrink-0" />
                  )}
                  <span className="text-xs">{testResult.msg}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Guardar y Activar Sincronización FTP
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SECURITY & SAVED PASSWORD */}
          {activeTab === "security" && (
            <div className="space-y-5">
              {/* Device Credential Explanation */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Shield size={16} />
                  <span>Contraseña guardada en este equipo</span>
                </div>
                <p className="text-xs text-slate-300">
                  Tal como solicitaste, tu contraseña se guarda cifrada en el almacenamiento local de tu equipo. Al abrir la app, <strong>no hace falta introducirla cada vez</strong>.
                </p>
                <p className="text-[11px] text-slate-400">
                  El archivo remoto en el FTP permanece 100% cifrado con Argon2id + XChaCha20-Poly1305.
                </p>
              </div>

              {/* CHANGE MASTER PASSWORD */}
              <form onSubmit={handleChangePassword} className="space-y-3 bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Key size={14} className="text-emerald-400" />
                  <span>Cambiar Contraseña Maestra</span>
                </h4>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    CONTRASEÑA ACTUAL
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    NUEVA CONTRASEÑA
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    REPETIR NUEVA CONTRASEÑA
                  </label>
                  <input
                    type="password"
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={changingPass || !newPassword}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-40"
                >
                  {changingPass ? "Actualizando clave..." : "Actualizar Contraseña Maestra"}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: FAMILY & DEVICES */}
          {activeTab === "family" && (
            <div className="space-y-4">
              {/* Device Name input */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-white text-xs">Identificador de este dispositivo</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="Ej: Mamá, Papá, PC Salón..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleUpdateDeviceName}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
                  >
                    Guardar
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Este nombre aparecerá cuando marques productos como comprados ("Comprado por {deviceName}").
                </p>
              </div>

              {/* Connected Family Members list */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider px-1">
                  Miembros en la bóveda
                </h4>
                <div className="space-y-1.5">
                  <div className="p-3 bg-slate-950 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">📱</span>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {preferences.currentDeviceName} (Este dispositivo)
                        </span>
                        <span className="text-[10px] text-emerald-400">Activo</span>
                      </div>
                    </div>
                  </div>

                  {(vaultData?.members || [])
                    .filter((m) => m.name !== preferences.currentDeviceName)
                    .map((m) => (
                      <div
                        key={m.id}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">📱</span>
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {m.name}
                            </span>
                            <span className="text-[10px] text-slate-400">Conectado vía FTP</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* QR Share Card */}
              <div className="p-4 bg-purple-500/10 border border-purple-500/25 rounded-2xl space-y-3 text-center">
                <QrCode size={32} className="mx-auto text-purple-400" />
                <div>
                  <h5 className="font-bold text-xs text-white">Vincular otro dispositivo con Código QR</h5>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Genera un código QR con los datos de acceso al FTP y el fichero de la bóveda. Al escanearlo en el nuevo dispositivo, se descargará automáticamente y solo pedirá la contraseña maestra.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!syncConfig.host) {
                      onShowToast("Primero debes configurar y guardar los datos del FTP", "⚠️");
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
                      onShowToast("Error generando código QR", "❌");
                    }
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 mx-auto"
                >
                  <QrCode size={16} />
                  <span>📷 Ver Código QR de Vinculación</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* QR MODAL VIEWER */}
        {showQrModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative">
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>

              <div>
                <h4 className="font-bold text-white text-base">Escanear para Vincular</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Abre FamilyNotes en el nuevo teléfono o PC y escanea este código.
                </p>
              </div>

              {/* QR Image */}
              <div className="p-3 bg-white rounded-2xl shadow-xl inline-block mx-auto">
                <img
                  src={qrCodeUrl}
                  alt="Código QR de vinculación"
                  className="w-56 h-56 mx-auto rounded-lg"
                />
              </div>

              <div className="p-3 bg-purple-500/10 border border-purple-500/25 rounded-xl text-[10px] text-purple-200 text-left space-y-1">
                <span className="font-bold block text-purple-300">ℹ️ ¿Cómo funciona?</span>
                <p>
                  El nuevo equipo leerá los datos del FTP (<strong>{syncConfig.host}</strong>) y descargará el archivo <strong>{syncConfig.remoteFile}</strong>.
                </p>
                <p className="text-slate-400">
                  Por seguridad, la contraseña maestra no va en el QR; el nuevo usuario la escribirá para descifrar la bóveda.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(qrString);
                      onShowToast("Código de vinculación copiado al portapapeles", "📋");
                    } catch {
                      onShowToast("No se pudo copiar al portapapeles", "⚠️");
                    }
                  }}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Copy size={13} />
                  <span>Copiar enlace</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
                >
                  Listo
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
        title="Importar Servidor FTP con QR"
      />
    </div>
  );
};
