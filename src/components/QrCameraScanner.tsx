import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  X,
  RefreshCw,
  Image as ImageIcon,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import jsQR from "jsqr";
import { decodeQrFromImageFile } from "../utils/qrDecoder";

interface QrCameraScannerProps {
  isOpen: boolean;
  onScan: (decodedText: string) => void;
  onClose: () => void;
  title?: string;
}

export const QrCameraScanner: React.FC<QrCameraScannerProps> = ({
  isOpen,
  onScan,
  onClose,
  title = "Escanear Código QR",
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const camerasListRef = useRef<MediaDeviceInfo[]>([]);

  // Keep onScan in a ref to avoid callback changes triggering camera restarts
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const currentCameraIndexRef = useRef(currentCameraIndex);
  useEffect(() => {
    currentCameraIndexRef.current = currentCameraIndex;
  }, [currentCameraIndex]);

  const facingModeRef = useRef(facingMode);
  useEffect(() => {
    facingModeRef.current = facingMode;
  }, [facingMode]);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Frame scanning loop - fully stable
  const startScanningLoop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    let isScanning = true;

    const scanFrame = () => {
      if (!isScanning) return;
      if (!videoRef.current || !canvasRef.current) {
        animFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;
      // readyState >= 2 means current frame is available
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data && code.data.trim().length > 0) {
            isScanning = false;
            // Haptic vibration on mobile devices if supported
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              try {
                navigator.vibrate(80);
              } catch {
                // Ignore unsupported
              }
            }
            stopCamera();
            onScanRef.current(code.data);
            return;
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera]);

  // Enumerate video devices without forcing a camera restart
  const enumerateVideoDevices = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (d) => d.kind === "videoinput" && d.deviceId && d.deviceId.trim().length > 0
      );
      camerasListRef.current = videoDevices;
      setAvailableCameras((prev) => {
        if (prev.length !== videoDevices.length) return videoDevices;
        const hasDiff = videoDevices.some((d, idx) => d.deviceId !== prev[idx]?.deviceId);
        return hasDiff ? videoDevices : prev;
      });
      return videoDevices;
    } catch {
      return [];
    }
  }, []);

  // Start Camera - stable callback
  const startCamera = useCallback(
    async (cameraIndex?: number, mode?: "environment" | "user") => {
      stopCamera();
      setIsLoading(true);
      setErrorMessage("");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsLoading(false);
        setErrorMessage(
          "El acceso a la cámara no está soportado en este entorno. Puedes subir una foto del código QR con el botón inferior."
        );
        return;
      }

      const activeIndex = cameraIndex ?? currentCameraIndexRef.current;
      const activeMode = mode ?? facingModeRef.current;

      let stream: MediaStream | null = null;
      const knownDevices = camerasListRef.current;
      const targetDevice =
        knownDevices.length > 0 && knownDevices[activeIndex]?.deviceId
          ? knownDevices[activeIndex].deviceId
          : null;

      try {
        // 1. Try with deviceId if explicitly chosen and valid
        if (targetDevice && targetDevice.trim().length > 0) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: { deviceId: { exact: targetDevice } },
            });
          } catch {
            stream = null;
          }
        }

        // 2. Try facingMode ideal (mobile friendly)
        if (!stream) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: { facingMode: { ideal: activeMode } },
            });
          } catch {
            stream = null;
          }
        }

        // 3. Fallback to basic video: true (universal for desktop webcams)
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          });
        }

        // If user closed the modal during stream request, immediately abort
        if (!isOpenRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn("video.play() warning:", playErr);
          }
        }

        // Enumerate devices now that permission is active to populate camera list
        void enumerateVideoDevices();

        setIsLoading(false);
        startScanningLoop();
      } catch (err: unknown) {
        console.error("Camera start error:", err);
        setIsLoading(false);
        const name = (err as Error)?.name || "";
        const msg = (err as Error)?.message || String(err);
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setErrorMessage(
            "Permiso de cámara denegado. Concede permiso a la aplicación en los ajustes de privacidad de tu sistema o sube una imagen con el QR."
          );
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setErrorMessage(
            "No se detectó ninguna cámara o webcam disponible. Puedes subir una imagen con la foto del QR."
          );
        } else {
          setErrorMessage(
            `No se pudo iniciar la cámara (${name || "Error"}: ${msg || "en uso"}). Comprueba que no esté en uso por otra app o sube una foto del QR.`
          );
        }
      }
    },
    [stopCamera, enumerateVideoDevices, startScanningLoop]
  );

  // Switch camera (front/back or next device)
  const handleSwitchCamera = () => {
    if (availableCameras.length > 1) {
      setCurrentCameraIndex((prev) => (prev + 1) % availableCameras.length);
    } else {
      setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    }
  };

  // Image file pick handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setErrorMessage("");

    try {
      const decodedText = await decodeQrFromImageFile(file);
      stopCamera();
      onScanRef.current(decodedText);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Lifecycle: runs only on open/close and when camera index/mode changes
  useEffect(() => {
    if (isOpen) {
      void startCamera(currentCameraIndex, facingMode);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, currentCameraIndex, facingMode, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="text-[11px] text-slate-400">
                Apunta al código QR generado en el otro equipo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Viewfinder Camera Area */}
        <div className="relative aspect-square sm:aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
          {/* Video element */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Hidden Canvas for QR extraction */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Loading state */}
          {isLoading && !errorMessage && (
            <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-3 z-20">
              <Loader2 size={32} className="text-purple-400 animate-spin" />
              <p className="text-xs text-slate-300 font-medium">Iniciando cámara...</p>
            </div>
          )}

          {/* Processing image state */}
          {isProcessingFile && (
            <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center gap-3 z-30">
              <Loader2 size={32} className="text-emerald-400 animate-spin" />
              <p className="text-xs text-white font-medium">Analizando imagen y decodificando QR...</p>
            </div>
          )}

          {/* Error / Fallback message inside camera */}
          {errorMessage && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center gap-3 z-20">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <AlertTriangle size={24} />
              </div>
              <p className="text-xs text-amber-200/90 max-w-xs">{errorMessage}</p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
                >
                  Reintentar
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition"
                >
                  Subir imagen
                </button>
              </div>
            </div>
          )}

          {/* Overlay Target Framing */}
          {!errorMessage && !isLoading && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8 z-10">
              {/* Semi-dark outer border */}
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl border-2 border-purple-500/50 shadow-[0_0_0_9999px_rgba(3,7,18,0.55)]">
                {/* Neon Corner Brackets */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-purple-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-purple-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-purple-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-purple-400 rounded-br-lg" />

                {/* Animated Laser Scanning Line */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* Camera Switcher Icon (Floating) */}
          {(availableCameras.length > 1 || !errorMessage) && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              title="Cambiar cámara"
              className="absolute top-3 right-3 z-20 w-9 h-9 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 transition active:scale-95"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Upload Image Option */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingFile}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition"
          >
            <ImageIcon size={15} className="text-purple-400" />
            <span>Subir imagen / foto del QR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-full sm:w-auto px-4 py-2 text-xs text-slate-400 hover:text-white transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
