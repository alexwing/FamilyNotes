import { Plus, History, TrendingUp } from "lucide-react";
import { PurchaseHistoryItem, ShoppingList } from "../types";

interface HistoryViewProps {
  history: PurchaseHistoryItem[];
  lists: ShoppingList[];
  onAddItem: (listId: string, text: string, emoji?: string, category?: string) => void;
  onClearHistory: () => void;
  selectedListId: string;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  lists,
  onAddItem,
  onClearHistory,
  selectedListId,
}) => {
  const currentList = lists.find((l) => l.id === selectedListId) || lists[0];

  const sortedHistory = [...history].sort((a, b) => b.count - a.count);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center text-xl font-bold border border-purple-500/20">
            📊
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Hábitos de Compra &amp; Frecuencia</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 font-semibold px-2 py-0.5 rounded-full">
                Estilo Amazon
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Analizado automáticamente desde tus listas compartidas.
            </p>
          </div>
        </div>

        {currentList && (
          <div className="text-right text-xs">
            <span className="text-slate-500 block text-[10px]">Añadiendo a:</span>
            <span className="text-emerald-400 font-bold">{currentList.name}</span>
          </div>
        )}
      </div>

      {/* FREQUENT ITEMS LIST */}
      <div className="flex-1 overflow-y-auto space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp size={13} />
            <span>Productos más comprados ({sortedHistory.length})</span>
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Un clic para reponer</span>
            {sortedHistory.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-[11px] text-rose-400 hover:text-rose-300 ml-2 border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 rounded-md transition"
              >
                Resetear
              </button>
            )}
          </div>
        </div>

        {sortedHistory.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <History size={36} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">
              Aún no hay historial registrado. A medida que taches productos de tus listas, aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedHistory.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">
                    {item.emoji}
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200 group-hover:text-white">
                      {item.text}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="font-bold text-purple-400">
                        {item.count} {item.count === 1 ? "compra" : "compras"}
                      </span>
                      {item.avgIntervalDays && (
                        <span>• cada ~{item.avgIntervalDays} días</span>
                      )}
                    </div>
                  </div>
                </div>

                {currentList && (
                  <button
                    onClick={() =>
                      onAddItem(currentList.id, item.text, item.emoji, item.category)
                    }
                    title={`Añadir a ${currentList.name}`}
                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 font-bold text-xs rounded-xl border border-emerald-500/30 transition flex items-center gap-1"
                  >
                    <Plus size={13} />
                    <span>Añadir</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
