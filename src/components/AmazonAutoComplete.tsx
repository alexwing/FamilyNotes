import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, Plus, Sparkles, BookOpen } from "lucide-react";
import { PurchaseHistoryItem, ProductCatalogItem } from "../types";
import {
  matchProduct,
  BUILTIN_DICTIONARY,
  normalizeText,
} from "../utils/productDictionary";
import { useTranslation } from "../context/LanguageContext";

interface AmazonAutoCompleteProps {
  history: PurchaseHistoryItem[];
  customCatalog?: ProductCatalogItem[];
  onAddItem: (text: string, emoji?: string, category?: string) => void;
  onOpenCatalogModal?: () => void;
  placeholder?: string;
}

const QUICK_EMOJIS = [
  "🥛", "🧀", "🥚", "🍎", "🍌", "🍅", "🧅", "🥔", "🥖", "🥐", "🥩", "🍗", "🐟",
  "🍚", "🍝", "🫒", "☕", "💧", "🧃", "🍺", "🧻", "🧼", "✨", "🛒",
];

export const AmazonAutoComplete: React.FC<AmazonAutoCompleteProps> = ({
  history,
  customCatalog = [],
  onAddItem,
  onOpenCatalogModal,
  placeholder = "Escribe un producto...",
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [customEmoji, setCustomEmoji] = useState<string | null>(null);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic intelligent match from dictionary based on what user is currently typing
  const smartMatch = useMemo(() => {
    if (!query.trim()) return { emoji: "🛒", category: "General" };
    return matchProduct(query, customCatalog);
  }, [query, customCatalog]);

  const activeEmoji = customEmoji || smartMatch.emoji;
  const activeCategory = smartMatch.category;

  // Filter history items matching query
  const historyMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return history
      .filter((h) => h.text.toLowerCase().includes(q))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [history, query]);

  // Filter catalog items matching query (from custom catalog & built-in)
  const catalogMatches = useMemo(() => {
    const q = normalizeText(query);
    if (!q || q.length < 2) return [];

    const results: { name: string; emoji: string; category: string }[] = [];

    // Custom catalog first
    for (const item of customCatalog) {
      if (
        normalizeText(item.name).includes(q) ||
        (item.keywords || []).some((k) => normalizeText(k).includes(q))
      ) {
        results.push({ name: item.name, emoji: item.emoji, category: item.category });
      }
    }

    // Built-in dictionary
    for (const item of BUILTIN_DICTIONARY) {
      if (
        normalizeText(item.name).includes(q) ||
        item.keywords.some((k) => normalizeText(k).includes(q))
      ) {
        if (!results.some((r) => r.name.toLowerCase() === item.name.toLowerCase())) {
          results.push({ name: item.name, emoji: item.emoji, category: item.category });
        }
      }
      if (results.length >= 6) break;
    }

    return results;
  }, [query, customCatalog]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowEmojiMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectHistory = (item: PurchaseHistoryItem) => {
    onAddItem(item.text, item.emoji, item.category);
    setQuery("");
    setCustomEmoji(null);
    setIsOpen(false);
  };

  const handleSelectCatalog = (item: { name: string; emoji: string; category: string }) => {
    onAddItem(item.name, item.emoji, item.category);
    setQuery("");
    setCustomEmoji(null);
    setIsOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = query.trim();
    if (!val) return;

    onAddItem(val, activeEmoji, activeCategory);
    setQuery("");
    setCustomEmoji(null);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 focus-within:border-emerald-500 rounded-2xl p-1.5 pl-2.5 shadow-md dark:shadow-lg transition-all"
      >
        {/* Dynamic Emoji Button with click-to-change picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiMenu(!showEmojiMenu)}
            title="Icono detectado automáticamente. Haz clic para cambiarlo."
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 flex items-center justify-center text-lg transition-transform active:scale-95 cursor-pointer"
          >
            <span>{activeEmoji}</span>
          </button>

          {/* Quick Emoji Menu */}
          {showEmojiMenu && (
            <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 shadow-2xl grid grid-cols-6 gap-1 w-52 max-h-44 overflow-y-auto">
              {QUICK_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    setCustomEmoji(em);
                    setShowEmojiMenu(false);
                  }}
                  className="p-1.5 text-base hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>

        <Search size={16} className="text-slate-400 dark:text-slate-500 shrink-0 hidden sm:block" />

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCustomEmoji(null);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
        />

        {/* Category preview badge if detected */}
        {query.trim() && smartMatch.category !== "General" && (
          <span className="hidden md:inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25 shrink-0">
            {smartMatch.category}
          </span>
        )}

        <button
          type="submit"
          disabled={!query.trim()}
          className="w-8 h-8 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center justify-center shrink-0 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
        >
          <Plus size={18} />
        </button>
      </form>

      {/* AUTOCOMPLETE DROPDOWN */}
      {isOpen && (historyMatches.length > 0 || catalogMatches.length > 0 || onOpenCatalogModal) && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 space-y-2 backdrop-blur-md max-h-80 overflow-y-auto text-slate-900 dark:text-white">
          {/* History Matches */}
          {historyMatches.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2.5 py-1 border-b border-slate-200 dark:border-slate-800 text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={11} />
                  <span>{t("history.title")}</span>
                </span>
                <span className="text-slate-400 dark:text-slate-500">{t("nav.history")}</span>
              </div>
              <div className="space-y-0.5 mt-1">
                {historyMatches.map((item, idx) => (
                  <div
                    key={`hist-${idx}`}
                    onClick={() => handleSelectHistory(item)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{item.emoji}</span>
                      <div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block group-hover:text-black dark:group-hover:text-white">
                          {item.text}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {t("history.timesPurchased", { count: item.count })} • {item.category}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition">
                      {t("lists.addBtn")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Catalog / Dictionary Matches */}
          {catalogMatches.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2.5 py-1 border-b border-slate-200 dark:border-slate-800 text-[10px] text-purple-600 dark:text-purple-300 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <BookOpen size={11} />
                  <span>{t("nav.dictionary")}</span>
                </span>
                <span className="text-slate-400 dark:text-slate-500">Catálogo</span>
              </div>
              <div className="space-y-0.5 mt-1">
                {catalogMatches.map((item, idx) => (
                  <div
                    key={`cat-${idx}`}
                    onClick={() => handleSelectCatalog(item)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{item.emoji}</span>
                      <div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block group-hover:text-black dark:group-hover:text-white">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-purple-600 dark:text-purple-400/80">{item.category}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition">
                      {t("lists.addBtn")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manage Catalog Link */}
          {onOpenCatalogModal && (
            <div className="pt-1 border-t border-slate-200 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCatalogModal();
                }}
                className="w-full py-1.5 px-2.5 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-500/10 rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <BookOpen size={13} />
                <span>{t("nav.dictionary")}...</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
