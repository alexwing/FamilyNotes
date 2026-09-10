import React from "react";
import { Plus, History, TrendingUp, Trash2 } from "lucide-react";
import { PurchaseHistoryItem, ShoppingList } from "../types";
import { useTranslation } from "../context/LanguageContext";

interface HistoryViewProps {
  history: PurchaseHistoryItem[];
  lists: ShoppingList[];
  onAddItem: (listId: string, text: string, emoji?: string, category?: string) => void;
  onClearHistory: () => void;
  onDeleteItem?: (text: string) => void;
  selectedListId: string;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  lists,
  onAddItem,
  onClearHistory,
  onDeleteItem,
  selectedListId,
}) => {
  const { t } = useTranslation();
  const currentList = lists.find((l) => l.id === selectedListId) || lists[0];

  const sortedHistory = [...history].sort((a, b) => b.count - a.count);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto min-h-0 max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl font-bold border border-purple-500/20">
            📊
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{t("history.title")}</span>
              <span className="text-[10px] bg-purple-500/15 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold px-2 py-0.5 rounded-full">
                Smart
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("history.subtitle")}
            </p>
          </div>
        </div>

        {currentList && (
          <div className="text-right text-xs">
            <span className="text-slate-400 dark:text-slate-500 block text-[10px]">+</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{currentList.name}</span>
          </div>
        )}
      </div>

      {/* FREQUENT ITEMS LIST */}
      <div className="flex-1 overflow-y-auto space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp size={13} />
            <span>{t("history.title")} ({sortedHistory.length})</span>
          </h3>
          <div className="flex items-center gap-2">
            {sortedHistory.length > 0 && (
              <button
                onClick={() => {
                  if (confirm(t("history.clearHistoryConfirm"))) {
                    onClearHistory();
                  }
                }}
                className="text-[11px] text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 ml-2 border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 rounded-md transition cursor-pointer"
              >
                {t("history.clearHistoryBtn")}
              </button>
            )}
          </div>
        </div>

        {sortedHistory.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <History size={36} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">
              {t("history.emptyDesc")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedHistory.map((item, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">
                    {item.emoji}
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-black dark:group-hover:text-white">
                      {item.text}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        {t("history.timesPurchased", { count: item.count })}
                      </span>
                      {item.avgIntervalDays && (
                        <span>• {t("history.everyDays", { days: item.avgIntervalDays })}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {currentList && (
                    <button
                      onClick={() =>
                        onAddItem(currentList.id, item.text, item.emoji, item.category)
                      }
                      title={t("history.addToList", { name: currentList.name })}
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-slate-950 dark:hover:text-slate-950 font-bold text-xs rounded-xl border border-emerald-500/30 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>{t("lists.addBtn")}</span>
                    </button>
                  )}
                  {onDeleteItem && (
                    <button
                      onClick={() => onDeleteItem(item.text)}
                      title={t("common.delete")}
                      className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
