import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  BookOpen,
  Search,
  Sparkles,
  Smile,
  Tag,
  Check,
} from "lucide-react";
import { ProductCatalogItem } from "../types";
import { BUILTIN_DICTIONARY, CATEGORIES, getCategoryLabel } from "../utils/productDictionary";
import { useTranslation } from "../context/LanguageContext";

interface ProductCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  customCatalog: ProductCatalogItem[];
  onUpsertItem: (item: ProductCatalogItem) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
}

const COMMON_EMOJIS = [
  "🥛", "🧀", "🧈", "🥣", "🥚",
  "🍎", "🍌", "🍊", "🍋", "🍇", "🍓", "🍉", "🥑", "🍅", "🧅", "🥔", "🥕", "🥬", "🧄", "🫑", "🥒", "🍄",
  "🥖", "🍞", "🥐", "🍪", "🍫",
  "🥩", "🍗", "🍖", "🌭", "🥓", "🐟", "🦐",
  "🍚", "🍝", "🫒", "🧂", "🌾", "🥫", "🫘", "☕", "🍵",
  "💧", "🧃", "🍺", "🍷", "🥤",
  "🧻", "🧼", "🫧", "🧴", "🪥", "🧹", "🗑️", "✨", "🛒",
];

export const ProductCatalogModal: React.FC<ProductCatalogModalProps> = ({
  isOpen,
  onClose,
  customCatalog,
  onUpsertItem,
  onDeleteItem,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New item form
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("🛒");
  const [newCategory, setNewCategory] = useState("Lácteos");
  const [newKeywords, setNewKeywords] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  if (!isOpen) return null;

  // Filter items
  const q = search.trim().toLowerCase();

  const filteredCustom = customCatalog.filter((item) => {
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.keywords || []).some((k) => k.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  const filteredBuiltin = BUILTIN_DICTIONARY.filter((item) => {
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSaving(true);
    try {
      const keywordsArray = newKeywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

      const item: ProductCatalogItem = {
        id: "",
        name: newName.trim(),
        emoji: newEmoji,
        category: newCategory,
        keywords: keywordsArray.length > 0 ? keywordsArray : [newName.trim().toLowerCase()],
      };

      await onUpsertItem(item);
      setNewName("");
      setNewKeywords("");
      setNewEmoji("🛒");
      setIsAddingNew(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t("catalog.title")}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20 dark:border-purple-500/30">
                  {t("catalog.productCount", { count: customCatalog.length + BUILTIN_DICTIONARY.length })}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("catalog.subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar: Search, Categories & Add Button */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 space-y-3 shrink-0">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus-within:border-purple-500">
              <Search size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder={t("catalog.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent outline-none text-xs placeholder-slate-400 dark:placeholder-slate-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-md shadow-purple-600/20 shrink-0 cursor-pointer"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">{t("catalog.addProduct")}</span>
              <span className="sm:hidden">{t("catalog.addBtn")}</span>
            </button>
          </div>

          {/* Category Pills (Wraps in multiple rows) */}
          <div className="flex flex-wrap items-center gap-1.5 pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1 rounded-lg font-semibold transition text-[11px] cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {t("categories.all")} ({customCatalog.length + BUILTIN_DICTIONARY.length})
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1 rounded-lg font-semibold transition shrink-0 text-[11px] flex items-center gap-1 cursor-pointer ${
                  selectedCategory === c.id
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <span>{c.emoji}</span>
                <span>{getCategoryLabel(c.id, t)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form to Add New Custom Product */}
        {isAddingNew && (
          <form
            onSubmit={handleSaveItem}
            className="p-4 bg-purple-50/80 dark:bg-purple-950/20 border-b border-purple-200 dark:border-purple-500/30 space-y-3 shrink-0 animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <Sparkles size={14} />
                <span>{t("catalog.newProductTitle")}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                {t("common.cancel")}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              {/* Emoji selector */}
              <div className="relative">
                <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  {t("catalog.emojiLabel")}
                </label>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 hover:border-purple-500 rounded-xl py-2 px-3 text-xl flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>{newEmoji}</span>
                  <Smile size={14} className="text-slate-400 dark:text-slate-500" />
                </button>

                {showEmojiPicker && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 shadow-2xl grid grid-cols-8 gap-1 w-64 max-h-48 overflow-y-auto">
                    {COMMON_EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => {
                          setNewEmoji(em);
                          setShowEmojiPicker(false);
                        }}
                        className="p-1.5 text-lg hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="sm:col-span-2">
                <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  {t("catalog.productNameLabel")}
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder={t("catalog.productNamePlaceholder")}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  {t("catalog.categoryLabel")}
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500 cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {getCategoryLabel(c.id, t)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Keywords */}
            <div>
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold block mb-1">
                {t("catalog.keywordsLabel")}
              </label>
              <input
                type="text"
                placeholder={t("catalog.keywordsPlaceholder")}
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                {t("catalog.keywordsHelp")}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                disabled={isSaving || !newName.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                <span>{isSaving ? t("catalog.savingBtn") : t("catalog.saveBtn")}</span>
              </button>
            </div>
          </form>
        )}

        {/* Product Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Custom User Products */}
          {filteredCustom.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 font-bold uppercase tracking-wider px-1">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-purple-600 dark:text-purple-400" />
                  <span>{t("catalog.customTitle", { count: filteredCustom.length })}</span>
                </span>
                <span className="text-[10px] text-slate-500">{t("catalog.customSubtitle")}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredCustom.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white dark:bg-slate-950 border border-purple-200 dark:border-purple-500/30 rounded-2xl flex items-center justify-between group hover:border-purple-400 dark:hover:border-purple-500 transition shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.emoji}</span>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">{item.name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                          <span className="text-purple-600 dark:text-purple-400 font-medium">
                            {getCategoryLabel(item.category, t)}
                          </span>
                          {item.keywords && item.keywords.length > 0 && (
                            <span>• {item.keywords.slice(0, 3).join(", ")}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      title={t("catalog.deleteCustomTitle")}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Built-in Products */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider px-1">
              <span className="flex items-center gap-1.5">
                <Tag size={13} />
                <span>{t("catalog.builtinTitle", { count: filteredBuiltin.length })}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredBuiltin.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{item.emoji}</span>
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>{getCategoryLabel(item.category, t)}</span>
                        <span>• {item.keywords.slice(0, 3).join(", ")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
