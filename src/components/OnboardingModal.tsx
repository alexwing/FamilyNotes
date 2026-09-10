import React, { useState, useRef } from "react";
import {
  ShieldCheck,
  ArrowRight,
  Key,
  Sparkles,
  QrCode,
  ClipboardPaste,
  Server,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { SyncConfig } from "../types";
import { QrCameraScanner } from "./QrCameraScanner";
import { decodeQrFromImageFile } from "../utils/qrDecoder";

interface OnboardingModalProps {
  onComplete: (password: string, deviceName: string) => void;
  onLinkViaFtp: (config: SyncConfig, password: string, deviceName: string) => Promise<void>;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  onComplete,
  onLinkViaFtp,
}) => {
  const [mode, setMode] = useState<"create" | "link_qr">("create");
  const [step, setStep] = useState<1 | 2>(1);
  const [deviceName, setDeviceName] = useState("Mamá");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState("");

  // QR Linking Form state
  const [qrInput, setQrInput] = useState("");
  const [parsedConfig, setParsedConfig] = useState<SyncConfig | null>(null);
  const [linkPassword, setLinkPassword] = useState("");
  const [linkingDeviceName, setLinkingDeviceName] = useState("Nuevo Dispositivo");
  const [isLinking, setIsLinking] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [scanSuccessBanner, setScanSuccessBanner] = useState(false);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const linkPasswordInputRef = useRef<HTMLInputElement | null>(null);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) {
      setError("Por favor escribe tu nombre o el de este dispositivo");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleFinishCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Introduce una contraseña maestra");
      return;
    }
    if (password !== repeatPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres");
      return;
    }

    onComplete(password, deviceName.trim());
  };

  // Parse QR Link payload
  const handleParseQr = (text: string) => {
    setQrInput(text);
    setError("");
    const trimmed = text.trim();
    if (!trimmed) {
      setParsedConfig(null);
      return;
    }

    try {
      let jsonStr = trimmed;
      if (trimmed.startsWith("fnlink://")) {
        const b64 = trimmed.replace("fnlink://", "");
        jsonStr = atob(b64);
      }
      const data = JSON.parse(jsonStr);
      if (data.host) {
        const config: SyncConfig = {
          enabled: true,
          protocol: data.proto || "ftp",
          host: data.host,
          port: data.port || 21,
          username: data.user || "",
          password: data.pass || "",
          remoteDir: data.dir || "familynotes",
          remoteFile: data.file || "vault.fnvault",
          autoSync: true,
        };
        setParsedConfig(config);
      } else {
        setError("El código QR no contiene datos válidos de servidor FTP");
      }
    } catch {
      setError("Formato de enlace no reconocido. Debe comenzar con 'fnlink://' o ser JSON");
    }
  };

  const onQrDecoded = (text: string) => {
    handleParseQr(text);
    setScanSuccessBanner(true);
    setTimeout(() => {
      linkPasswordInputRef.current?.focus();
    }, 200);
  };

  const handleImageUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    setError("");
    try {
      const decodedText = await decodeQrFromImageFile(file);
      onQrDecoded(decodedText);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      onQrDecoded(clip);
    } catch {
      setError("No se pudo leer el portapapeles. Pega el texto manualmente.");
    }
  };

  const handleFinishLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedConfig) {
      setError("Primero debes ingresar o escanear el código QR");
      return;
    }
    if (!linkPassword) {
      setError("Escribe la contraseña maestra para descifrar la bóveda");
      return;
    }

    setIsLinking(true);
    setError("");
    try {
      await onLinkViaFtp(parsedConfig, linkPassword, linkingDeviceName.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("decryption_failed") || msg.includes("invalid_key")) {
        setError("Contraseña maestra incorrecta para este vault.");
      } else if (msg.includes("vault_file_not_found")) {
        setError("No se encontró el fichero vault en el FTP. Comprueba el servidor.");
      } else {
        setError(`Error al vincular: ${msg}`);
      }
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* VIEW 1: CREATE NEW VAULT */}
        {mode === "create" && (
          <div>
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-1.5 mb-6">
              <div
                className={`w-8 h-1.5 rounded-full transition-all ${
                  step === 1 ? "bg-emerald-500" : "bg-slate-800"
                }`}
              />
              <div
                className={`w-8 h-1.5 rounded-full transition-all ${
                  step === 2 ? "bg-emerald-500" : "bg-slate-800"
                }`}
              />
            </div>

            {step === 1 ? (
              <form onSubmit={handleStep1} className="space-y-5 text-center">
                <img src="/icon.png" alt="FamilyNotes" className="w-14 h-14 rounded-2xl mx-auto shadow-lg shadow-emerald-500/20" />

                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    ¡Bienvenido a FamilyNotes!
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Listas de la compra y notas familiares cifradas y sincronizadas.
                  </p>
                </div>

                <div className="text-left space-y-1.5 pt-2">
                  <label className="text-[11px] text-slate-300 font-bold block">
                    ¿Quién usará este dispositivo?
                  </label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Ej: Mamá, Papá, Lucas, PC Salón..."
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition"
                  />
                  <span className="text-[10px] text-slate-500">
                    Aparecerá en los productos que marques como comprados.
                  </span>
                </div>

                {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <span>Crear nueva bóveda</span>
                  <ArrowRight size={16} />
                </button>

                {/* Switch to QR Link */}
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setMode("link_qr");
                    }}
                    className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center justify-center gap-1.5 mx-auto transition"
                  >
                    <QrCode size={14} />
                    <span>¿Ya tienes FamilyNotes en otro equipo? Vincular por QR</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleFinishCreate} className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl mx-auto border border-emerald-500/20">
                    <ShieldCheck size={26} />
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Crea tu Contraseña Maestra
                  </h2>
                  <p className="text-xs text-slate-400">
                    Esta clave cifra tu bóveda con <strong>Argon2id + XChaCha20</strong>.
                  </p>
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5">
                  <Sparkles size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-300">
                    Esta contraseña <strong>se guardará en este equipo</strong>. No te la volverá a pedir cada vez que abras la app.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">
                      CONTRASEÑA MAESTRA
                    </label>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-emerald-500">
                      <Key size={14} className="text-slate-400" />
                      <input
                        type="password"
                        autoFocus
                        placeholder="Escribe tu contraseña..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-transparent text-xs text-white font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">
                      REPETIR CONTRASEÑA
                    </label>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-emerald-500">
                      <Key size={14} className="text-slate-400" />
                      <input
                        type="password"
                        placeholder="Repite la contraseña..."
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                        className="w-full bg-transparent text-xs text-white font-mono outline-none"
                      />
                    </div>
                  </div>
                </div>

                {error && <p className="text-xs text-rose-400 font-medium text-center">{error}</p>}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20"
                  >
                    Comenzar a usar FamilyNotes
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* VIEW 2: LINK VIA QR / FTP */}
        {mode === "link_qr" && (
          <form onSubmit={handleFinishLink} className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-2xl mx-auto border border-purple-500/20">
                <QrCode size={26} />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Vincular Dispositivo con QR
              </h2>
              <p className="text-xs text-slate-400">
                Escanea la cámara, sube una foto o pega el código generado en el otro equipo para descargar la bóveda.
              </p>
            </div>

            {/* Quick Actions: Scan Camera & Upload Image */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Método de vinculación
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setIsScannerOpen(true);
                  }}
                  className="p-3 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white rounded-2xl flex flex-col items-center justify-center gap-1.5 transition shadow-lg shadow-purple-600/20 group cursor-pointer"
                >
                  <Camera size={20} className="group-hover:scale-110 transition text-purple-100" />
                  <span className="text-xs font-bold">Escanear Cámara</span>
                  <span className="text-[10px] text-purple-200/80">Webcam o Móvil</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    imageInputRef.current?.click();
                  }}
                  disabled={isUploadingImage}
                  className="p-3 bg-slate-800/90 hover:bg-slate-700/90 active:scale-95 text-slate-200 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition border border-slate-700/60 group disabled:opacity-50 cursor-pointer"
                >
                  {isUploadingImage ? (
                    <Loader2 size={20} className="animate-spin text-purple-400" />
                  ) : (
                    <ImageIcon size={20} className="group-hover:scale-110 transition text-purple-400" />
                  )}
                  <span className="text-xs font-bold">Subir Imagen / Foto</span>
                  <span className="text-[10px] text-slate-400">Captura o Galería</span>
                </button>
              </div>

              {/* Hidden File Input for QR Image Upload */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUploadChange}
              />
            </div>

            {/* Separator */}
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider py-0.5">
              <div className="flex-1 h-px bg-slate-800" />
              <span>o pega el enlace manualmente</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            <div className="space-y-3">
              {/* QR Input */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                  CÓDIGO DE VINCULACIÓN O ENLACE (fnlink://...)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Pega aquí el enlace de vinculación..."
                    value={qrInput}
                    onChange={(e) => {
                      setScanSuccessBanner(false);
                      handleParseQr(e.target.value);
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    title="Pegar del portapapeles"
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-purple-400 font-bold rounded-xl text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <ClipboardPaste size={14} />
                    <span>Pegar</span>
                  </button>
                </div>
              </div>

              {/* Scan Success Banner */}
              {scanSuccessBanner && parsedConfig && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span className="font-semibold">¡Código QR reconocido con éxito!</span>
                </div>
              )}

              {/* Parsed FTP preview */}
              {parsedConfig && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                    <Server size={13} />
                    <span>Servidor FTP reconocido:</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono">
                    Host: {parsedConfig.host}:{parsedConfig.port}
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono">
                    Bóveda: {parsedConfig.remoteDir}/{parsedConfig.remoteFile}
                  </div>
                </div>
              )}

              {/* Device name */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                  TU NOMBRE EN ESTE EQUIPO
                </label>
                <input
                  type="text"
                  value={linkingDeviceName}
                  onChange={(e) => setLinkingDeviceName(e.target.value)}
                  placeholder="Ej: Papá, Teléfono Lucas, PC Trabajo..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>

              {/* Master password to decrypt */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                  CONTRASEÑA MAESTRA DE LA BÓVEDA
                </label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-purple-500">
                  <Key size={14} className="text-slate-400" />
                  <input
                    ref={linkPasswordInputRef}
                    type="password"
                    placeholder="Introduce la contraseña para descifrar..."
                    value={linkPassword}
                    onChange={(e) => setLinkPassword(e.target.value)}
                    className="w-full bg-transparent text-xs text-white font-mono outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Se guardará en este equipo para que no la tengas que volver a escribir.
                </span>
              </div>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle size={14} className="text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMode("create");
                }}
                className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={isLinking || !parsedConfig || !linkPassword}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isLinking ? "Descargando bóveda..." : "Descargar y Vincular Bóveda"}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Live Camera Scanner Modal */}
      <QrCameraScanner
        isOpen={isScannerOpen}
        onScan={(text) => {
          setIsScannerOpen(false);
          onQrDecoded(text);
        }}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
};
