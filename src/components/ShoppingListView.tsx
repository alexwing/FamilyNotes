import React, { useState, useRef } from "react";
import {
  Plus,
  Trash2,
  Check,
  Store,
  Sparkles,
  ShoppingBag,
  BookOpen,
  Edit3,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { PurchaseHistoryItem, ShoppingList, ProductCatalogItem } from "../types";
import { AmazonAutoComplete } from "./AmazonAutoComplete";
import { useTranslation } from "../context/LanguageContext";

interface ShoppingListViewProps {
  lists: ShoppingList[];
  history: PurchaseHistoryItem[];
  customCatalog?: ProductCatalogItem[];
  selectedListId: string;
  onSelectList: (id: string) => void;
  onCreateList: (name: string, color: string, icon: string) => void;
  onUpdateList?: (listId: string, name: string, color: string, icon: string) => void;
  onDeleteList: (id: string) => void;
  onArchiveList?: (id: string) => void;
  onUnarchiveList?: (id: string) => void;
  onReorderLists?: (listIds: string[]) => void;
  onAddItem: (listId: string, text: string, emoji?: string, category?: string, addToDictionary?: boolean) => void;
  onToggleItem: (listId: string, itemId: string) => void;
  onDeleteItem: (listId: string, itemId: string) => void;
  onClearCompleted: (listId: string) => void;
  onOpenCatalogModal?: () => void;
  deviceName: string;
}

export const ShoppingListView: React.FC<ShoppingListViewProps> = ({
  lists,
  history,
  customCatalog = [],
  selectedListId,
  onSelectList,
  onCreateList,
  onUpdateList,
  onDeleteList,
  onArchiveList,
  onUnarchiveList,
  onReorderLists,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onClearCompleted,
  onOpenCatalogModal,
}) => {
  const { t } = useTranslation();
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListColor, setNewListColor] = useState("#10b981");

  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#10b981");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleOpenEditList = (list: ShoppingList) => {
    setEditingList(list);
    setEditName(list.name);
    setEditColor(list.color || "#10b981");
    setIsConfirmingDelete(false);
  };

  const handleUpdateListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingList || !editName.trim()) return;
    if (onUpdateList) {
      onUpdateList(editingList.id, editName.trim(), editColor, editingList.icon || "cart");
    }
    setEditingList(null);
  };

  const handleDeleteConfirmed = () => {
    if (!editingList) return;
    onDeleteList(editingList.id);
    setEditingList(null);
    setIsConfirmingDelete(false);
  };

  const [showArchived, setShowArchived] = useState(false);
  const [orderedActiveListIds, setOrderedActiveListIds] = useState<string[] | null>(null);
  const [draggedListId, setDraggedListId] = useState<string | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const dragSourceIdRef = useRef<string | null>(null);
  const currentOrderRef = useRef<string[]>([]);

  // Sync internal ordered IDs when lists change (if not actively dragging)
  React.useEffect(() => {
    if (!isDraggingRef.current) {
      const ids = lists.filter((l) => !l.archived).map((l) => l.id);
      currentOrderRef.current = ids;
      setOrderedActiveListIds(ids);
    }
  }, [lists]);

  const activeLists = React.useMemo(() => {
    const base = lists.filter((l) => !l.archived);
    if (!orderedActiveListIds) return base;
    const map = new Map(base.map((l) => [l.id, l]));
    const res: ShoppingList[] = [];
    for (const id of orderedActiveListIds) {
      const item = map.get(id);
      if (item) {
        res.push(item);
        map.delete(id);
      }
    }
    for (const item of map.values()) {
      res.push(item);
    }
    return res;
  }, [lists, orderedActiveListIds]);

  const archivedLists = lists.filter((l) => !!l.archived);

  const handleTabPointerDown = (listId: string, e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;

    const startX = e.clientX;
    const startY = e.clientY;
    dragSourceIdRef.current = listId;
    isDraggingRef.current = false;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    const startDrag = () => {
      isDraggingRef.current = true;
      setDraggedListId(listId);
      setIsLongPressing(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(40);
      }
    };

    // Long press timer (for touch devices or stationary click)
    longPressTimerRef.current = setTimeout(() => {
      startDrag();
    }, 280);

    const onGlobalPointerMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - startX;
      const dy = moveEv.clientY - startY;
      const dist = Math.hypot(dx, dy);

      // On desktop mouse, moving > 5px immediately starts drag
      if (!isDraggingRef.current && moveEv.pointerType === "mouse" && dist > 5) {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        startDrag();
      }

      // If we are actively dragging, track tab reordering
      if (isDraggingRef.current && dragSourceIdRef.current) {
        const elem = document.elementFromPoint(moveEv.clientX, moveEv.clientY);
        const tabElem = elem?.closest("[data-list-id]") as HTMLElement | null;
        const targetId = tabElem?.dataset.listId;

        if (targetId && targetId !== dragSourceIdRef.current) {
          const currentIds = [...currentOrderRef.current];
          const fromIdx = currentIds.indexOf(dragSourceIdRef.current);
          const toIdx = currentIds.indexOf(targetId);
          if (fromIdx !== -1 && toIdx !== -1) {
            const [removed] = currentIds.splice(fromIdx, 1);
            currentIds.splice(toIdx, 0, removed);
            currentOrderRef.current = currentIds;
            setOrderedActiveListIds(currentIds);
          }
        }
      }
    };

    const onGlobalPointerUp = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      window.removeEventListener("pointermove", onGlobalPointerMove);
      window.removeEventListener("pointerup", onGlobalPointerUp);
      window.removeEventListener("pointercancel", onGlobalPointerUp);

      if (isDraggingRef.current) {
        if (onReorderLists && currentOrderRef.current.length > 0) {
          onReorderLists([...currentOrderRef.current]);
        }
      }

      // Small tick before clearing dragging state so onClick handler can ignore click
      setTimeout(() => {
        isDraggingRef.current = false;
        dragSourceIdRef.current = null;
        setDraggedListId(null);
        setIsLongPressing(false);
      }, 60);
    };

    window.addEventListener("pointermove", onGlobalPointerMove);
    window.addEventListener("pointerup", onGlobalPointerUp);
    window.addEventListener("pointercancel", onGlobalPointerUp);
  };

  const currentList =
    lists.find((l) => l.id === selectedListId) || activeLists[0] || archivedLists[0] || lists[0];

  const isCurrentArchived = !!currentList?.archived;

  const pendingItems = (currentList?.items || []).filter((i) => !i.checked);
  const completedItems = (currentList?.items || []).filter((i) => i.checked);

  const replenishmentAlerts = React.useMemo(() => {
    if (!currentList || isCurrentArchived) return [];
    return history.filter((h) => {
      const alreadyInList = currentList.items.some(
        (i) => i.text.toLowerCase() === h.text.toLowerCase() && !i.checked
      );
      if (alreadyInList) return false;
      return h.count >= 5;
    });
  }, [history, currentList, isCurrentArchived]);

  const handleCreateListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    onCreateList(newListName.trim(), newListColor, "cart");
    setNewListName("");
    setIsCreatingList(false);
  };

  if (lists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ShoppingBag size={48} className="text-slate-400 dark:text-slate-600 mb-3" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t("lists.empty")}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t("lists.emptyDesc")}</p>
        <button
          onClick={() => onCreateList("Supermercado", "#10b981", "cart")}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
        >
          {t("lists.createFirst")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto min-h-0 max-w-5xl mx-auto w-full p-3 sm:p-6 space-y-3 sm:space-y-4">
      {/* 1. LISTS SELECTOR (WRAPS IN MULTIPLE ROWS) */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
        {activeLists.map((list) => {
          const isSelected = list.id === currentList?.id;
          const pendCount = list.items.filter((i) => !i.checked).length;
          const isBeingDragged = draggedListId === list.id;

          return (
            <div
              key={list.id}
              data-list-id={list.id}
              onPointerDown={(e) => handleTabPointerDown(list.id, e)}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all border select-none cursor-grab active:cursor-grabbing touch-none ${
                isBeingDragged
                  ? "bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-purple-500 scale-105 shadow-xl ring-2 ring-purple-500/50 z-20 pointer-events-none"
                  : isSelected
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-emerald-500 shadow-md ring-1 ring-emerald-500/30"
                  : "bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  if (!isDraggingRef.current && !isLongPressing) {
                    onSelectList(list.id);
                  }
                }}
                className="flex items-center gap-1.5 sm:gap-2 cursor-pointer"
              >
                <Store size={14} style={{ color: list.color }} />
                <span>{list.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    pendCount > 0
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {pendCount}
                </span>
              </button>

              {isSelected && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditList(list);
                  }}
                  title={t("lists.editListTitle")}
                  className="p-1 -mr-1 rounded-md text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition cursor-pointer"
                >
                  <Edit3 size={13} />
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={() => setIsCreatingList(true)}
          className="flex items-center gap-1 px-3 py-1.5 sm:py-2 rounded-xl bg-white/60 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold border border-dashed border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition cursor-pointer"
        >
          <Plus size={14} />
          <span>{t("lists.newList")}</span>
        </button>

        {archivedLists.length > 0 && (
          <button
            type="button"
            onClick={() => setShowArchived((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition border cursor-pointer ${
              showArchived || isCurrentArchived
                ? "bg-amber-500/15 dark:bg-slate-800 text-amber-700 dark:text-amber-300 border-amber-500/40"
                : "bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
            title="Desplegar listas archivadas"
          >
            <Archive size={13} />
            <span>{t("lists.archivedBadge", { count: archivedLists.length })}</span>
          </button>
        )}

        {onOpenCatalogModal && (
          <button
            onClick={onOpenCatalogModal}
            title={t("nav.dictionary")}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/25 text-xs font-semibold transition ml-auto cursor-pointer"
          >
            <BookOpen size={14} />
            <span>{t("nav.dictionary")}</span>
          </button>
        )}
      </div>

      {/* ARCHIVED LISTS DROPDOWN / UNFOLD ROW */}
      {(showArchived || isCurrentArchived) && archivedLists.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl shrink-0">
          <span className="text-[11px] text-amber-700 dark:text-amber-400/80 font-semibold px-1 flex items-center gap-1">
            <Archive size={12} /> {t("lists.archivedSectionTitle")}
          </span>
          {archivedLists.map((list) => {
            const isSelected = list.id === currentList?.id;
            return (
              <button
                key={list.id}
                type="button"
                onClick={() => onSelectList(list.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  isSelected
                    ? "bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/50 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-300"
                }`}
              >
                <span>📦</span>
                <span>{list.name}</span>
                <span className="text-[10px] opacity-70">({list.items.length})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ARCHIVED LIST BANNER (READ-ONLY) */}
      {isCurrentArchived && currentList && (
        <div className="bg-gradient-to-r from-amber-500/10 via-white dark:via-slate-900 to-white dark:to-slate-900 border border-amber-500/30 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Archive size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-800 dark:text-amber-200">{t("lists.archivedTitle", { name: currentList.name })}</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">{t("lists.archivedBannerDesc")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {onUnarchiveList && (
              <button
                type="button"
                onClick={() => onUnarchiveList(currentList.id)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer shadow-md shadow-emerald-500/20"
              >
                <ArchiveRestore size={14} />
                <span>{t("common.unarchive")}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (confirm(`¿Seguro que deseas eliminar definitivamente "${currentList.name}"?`)) {
                  onDeleteList(currentList.id);
                }
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white dark:bg-rose-500/20 dark:text-rose-300 border border-rose-500/40 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              <Trash2 size={14} />
              <span>{t("common.delete")}</span>
            </button>
          </div>
        </div>
      )}

      {/* CREATE LIST MODAL */}
      {isCreatingList && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateListSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-slate-900 dark:text-white"
          >
            <h3 className="text-sm font-bold">{t("lists.createModalTitle")}</h3>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-1">{t("lists.nameLabel")}</label>
              <input
                type="text"
                autoFocus
                placeholder={t("lists.namePlaceholder")}
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-1.5">{t("lists.colorLabel")}</label>
              <div className="flex gap-2">
                {["#10b981", "#38bdf8", "#8b5cf6", "#f59e0b", "#f43f5e"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewListColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                      newListColor === c ? "scale-125 ring-2 ring-emerald-500" : "opacity-80 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingList(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                {t("lists.newList")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT LIST MODAL */}
      {editingList && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Edit3 size={16} className="text-emerald-500" />
                <span>{t("lists.editListTitle")}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingList(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateListSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                  {t("lists.nameLabel")}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  placeholder={t("lists.namePlaceholder")}
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-1.5">
                  {t("lists.colorLabel")}
                </label>
                <div className="flex gap-2">
                  {["#10b981", "#38bdf8", "#8b5cf6", "#f59e0b", "#f43f5e", "#ec4899", "#14b8a6"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        editColor === c ? "scale-125 ring-2 ring-emerald-500" : "opacity-75 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingList(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  {t("lists.saveChanges")}
                </button>
              </div>
            </form>

            {/* DELETE OR ARCHIVE LIST SECTION INSIDE MODAL */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80">
              {!isConfirmingDelete ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>{t("lists.deleteListBtn")}</span>
                </button>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5">
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                    {t("lists.deleteConfirmTitle", { name: editingList.name })}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {t("lists.deleteConfirmWarning", { count: editingList.items.length })}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {onArchiveList && (
                      <button
                        type="button"
                        onClick={() => {
                          onArchiveList(editingList.id);
                          setEditingList(null);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
                      >
                        <Archive size={14} />
                        <span>{t("lists.archiveBtn")}</span>
                      </button>
                    )}
                    {lists.length > 1 && (
                      <button
                        type="button"
                        onClick={handleDeleteConfirmed}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
                      >
                        <Trash2 size={14} />
                        <span>{t("lists.deletePermBtn")}</span>
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="w-full py-1 text-center text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. REPLENISHMENT SMART ALERTS */}
      {!isCurrentArchived && replenishmentAlerts.length > 0 && (
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 -mx-1 px-1 hide-scrollbar shrink-0">
          {replenishmentAlerts.map((alert, idx) => (
            <div key={idx} className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 rounded-2xl p-3.5 flex items-center justify-between gap-3 min-w-[280px] snap-center shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{alert.emoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={11} />
                      <span>{t("lists.replenishAlert")}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {t("lists.replenishTimes", { count: alert.count })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-800 dark:text-slate-200 mt-0.5 leading-tight">
                    {t("lists.replenishQuestion", { text: alert.text })}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  onAddItem(currentList.id, alert.text, alert.emoji, alert.category)
                }
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shrink-0 shadow-md transition cursor-pointer"
              >
                {t("lists.addBtn")}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 3. SEARCH & ADD BAR WITH LIVE AUTOCOMPLETE */}
      {!isCurrentArchived && (
        <div className="shrink-0">
          <AmazonAutoComplete
            history={history}
            customCatalog={customCatalog}
            onOpenCatalogModal={onOpenCatalogModal}
            onAddItem={(text, emoji, category, addToDictionary) =>
              onAddItem(currentList.id, text, emoji, category, addToDictionary)
            }
            placeholder={t("lists.searchPlaceholder", { name: currentList.name })}
          />
        </div>
      )}

      {/* 4. SHOPPING LIST CONTENT (PENDING & COMPLETED) */}
      <div className="space-y-6 pr-1">
        {/* PENDING ITEMS SECTION */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span>{t("lists.toBuy")}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                {pendingItems.length}
              </span>
            </h3>
          </div>

          {pendingItems.length === 0 ? (
            <div className="bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-6 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {completedItems.length > 0
                  ? t("lists.emptyPending")
                  : isCurrentArchived
                  ? t("lists.emptyPendingArchived")
                  : t("lists.emptyListHint")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="item-transition bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3 group shadow-sm"
                >
                  <div
                    onClick={() => {
                      if (!isCurrentArchived) {
                        onToggleItem(currentList.id, item.id);
                      }
                    }}
                    className={`flex items-center gap-3 flex-1 ${isCurrentArchived ? "cursor-default" : "cursor-pointer"}`}
                  >
                    {/* Checkbox button */}
                    {!isCurrentArchived && (
                      <button
                        type="button"
                        className="w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-slate-700 group-hover:border-emerald-500 flex items-center justify-center transition shrink-0 cursor-pointer"
                      >
                        <span className="opacity-0 group-hover:opacity-30 text-emerald-600 dark:text-emerald-400 text-xs">✓</span>
                      </button>
                    )}

                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{item.emoji || "🛒"}</span>
                      <div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                          {item.text}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                          {item.quantity && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              {item.quantity}
                            </span>
                          )}
                          {item.category && <span>• {item.category}</span>}
                          {item.checkedBy && <span>• {t("lists.addedBy", { name: item.checkedBy })}</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!isCurrentArchived && (
                    <button
                      onClick={() => onDeleteItem(currentList.id, item.id)}
                      title={t("lists.deleteItemTitle")}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COMPLETED ITEMS */}
        {completedItems.length > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span>{t("lists.completed")} ✓</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                  {completedItems.length}
                </span>
              </h3>
              {!isCurrentArchived && (
                <button
                  onClick={() => onClearCompleted(currentList.id)}
                  className="text-[11px] text-rose-500/80 hover:text-rose-500 font-semibold transition cursor-pointer"
                >
                  {t("lists.clearCompleted")}
                </button>
              )}
            </div>

            <div className="space-y-2">
              {completedItems.map((item) => (
                <div
                  key={item.id}
                  className="item-transition bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/40 rounded-xl p-2.5 flex items-center justify-between gap-3 opacity-75 hover:opacity-100 transition"
                >
                  <div
                    onClick={() => {
                      if (!isCurrentArchived) {
                        onToggleItem(currentList.id, item.id);
                      }
                    }}
                    className={`flex items-center gap-3 flex-1 ${isCurrentArchived ? "cursor-default" : "cursor-pointer"}`}
                  >
                    {/* Checked button */}
                    <button
                      type="button"
                      className="w-5 h-5 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm"
                    >
                      <Check size={14} className="stroke-[3]" />
                    </button>

                    <div className="flex items-center gap-2.5">
                      <span className="text-lg opacity-75">{item.emoji || "🛒"}</span>
                      <div>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 line-through block">
                          {item.text}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {item.checkedBy ? `${t("lists.completed")} por ${item.checkedBy}` : t("lists.completed")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteItem(currentList.id, item.id)}
                    title={t("common.delete")}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
