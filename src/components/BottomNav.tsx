import React from "react";
import { ShoppingCart, FileText, History } from "lucide-react";

interface BottomNavProps {
  activeTab: "lists" | "notes" | "history";
  setActiveTab: (tab: "lists" | "notes" | "history") => void;
  pendingCount?: number;
  notesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  pendingCount = 0,
  notesCount = 0,
}) => {
  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 px-4 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around md:hidden shadow-[0_-8px_20px_rgba(0,0,0,0.4)]"
    >
      {/* 1. Listas de Compra */}
      <button
        type="button"
        onClick={() => setActiveTab("lists")}
        className={`flex-1 flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-150 cursor-pointer ${
          activeTab === "lists"
            ? "text-emerald-400 bg-emerald-500/10 font-bold shadow-inner"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <div className="relative">
          <ShoppingCart size={20} className={activeTab === "lists" ? "stroke-[2.5]" : "stroke-[1.75]"} />
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-extrabold flex items-center justify-center shadow-md">
              {pendingCount > 99 ? "99+" : pendingCount}
            </span>
          )}
        </div>
        <span className="text-[11px] mt-0.5 tracking-tight">Listas</span>
      </button>

      {/* 2. Notas Compartidas */}
      <button
        type="button"
        onClick={() => setActiveTab("notes")}
        className={`flex-1 flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-150 cursor-pointer ${
          activeTab === "notes"
            ? "text-emerald-400 bg-emerald-500/10 font-bold shadow-inner"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <div className="relative">
          <FileText size={20} className={activeTab === "notes" ? "stroke-[2.5]" : "stroke-[1.75]"} />
          {notesCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center justify-center">
              {notesCount > 99 ? "99+" : notesCount}
            </span>
          )}
        </div>
        <span className="text-[11px] mt-0.5 tracking-tight">Notas</span>
      </button>

      {/* 3. Historial & Sugerencias */}
      <button
        type="button"
        onClick={() => setActiveTab("history")}
        className={`flex-1 flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-150 cursor-pointer ${
          activeTab === "history"
            ? "text-emerald-400 bg-emerald-500/10 font-bold shadow-inner"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <History size={20} className={activeTab === "history" ? "stroke-[2.5]" : "stroke-[1.75]"} />
        <span className="text-[11px] mt-0.5 tracking-tight">Historial</span>
      </button>
    </nav>
  );
};
