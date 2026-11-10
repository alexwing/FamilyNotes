import { useEffect, useState } from "react";
import { Copy, Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTranslation } from "../context/LanguageContext";

// Desktop-only replacement for the native title bar, same design as Passdroid's
// (window `decorations` are off in tauri.conf.json). Dragging and
// double-click-to-maximize come from `data-tauri-drag-region`; the buttons call
// the window API directly. Not rendered on Android/iOS, nor in fullscreen.
// While shown, <html> gets `has-titlebar`, which sets --tb so full-screen
// layers (app shell, modals) start below the bar.

const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);

export function TitleBar() {
  const { t } = useTranslation();
  const [maximized, setMaximized] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Keep the maximize/restore icon in sync with the real window state, which
  // also changes from outside the bar (Snap, double-click, keyboard).
  useEffect(() => {
    if (isMobile) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    try {
      const win = getCurrentWindow();
      const sync = () =>
        Promise.all([win.isMaximized(), win.isFullscreen()])
          .then(([max, full]) => {
            if (disposed) return;
            setMaximized(max);
            setFullscreen(full);
          })
          .catch(() => {});
      void sync();
      win
        .onResized(() => void sync())
        .then((fn) => {
          if (disposed) fn();
          else unlisten = fn;
        })
        .catch(() => {});
    } catch {
      // Not running inside Tauri (plain browser dev): the bar is inert.
    }
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const visible = !isMobile && !fullscreen;

  useEffect(() => {
    document.documentElement.classList.toggle("has-titlebar", visible);
    return () => document.documentElement.classList.remove("has-titlebar");
  }, [visible]);

  if (!visible) return null;

  const act = (action: "minimize" | "toggleMaximize" | "close") => {
    try {
      void getCurrentWindow()[action]().catch(() => {});
    } catch {
      /* not running inside Tauri */
    }
  };

  const maximizeLabel = maximized ? t("window.restore") : t("window.maximize");
  const btn =
    "grid place-items-center w-11 h-full text-slate-600 dark:text-slate-300 transition-colors duration-150 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white focus-visible:-outline-offset-2";

  return (
    <div
      data-tauri-drag-region
      className="fixed top-0 inset-x-0 z-[60] flex items-center gap-2 h-[var(--tb)] pl-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 select-none"
    >
      {/* Children other than buttons must not swallow the drag. */}
      <img src="/icon.png" alt="" width={18} height={18} draggable={false} className="w-[18px] h-[18px] rounded-[5px] pointer-events-none" />
      <span className="font-semibold text-slate-900 dark:text-slate-100 pointer-events-none">FamilyNotes</span>
      <span className="flex-1 pointer-events-none" />
      <button type="button" className={btn} onClick={() => act("minimize")} aria-label={t("window.minimize")} title={t("window.minimize")}>
        <Minus size={14} aria-hidden />
      </button>
      <button type="button" className={btn} onClick={() => act("toggleMaximize")} aria-label={maximizeLabel} title={maximizeLabel}>
        {maximized ? <Copy size={13} aria-hidden /> : <Square size={13} aria-hidden />}
      </button>
      <button
        type="button"
        className={`${btn} hover:!bg-[#e5484d] hover:!text-white`}
        onClick={() => act("close")}
        aria-label={t("common.close")}
        title={t("common.close")}
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}
