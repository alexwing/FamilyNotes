import React, { useState, useRef, useMemo } from "react";
import {
  Plus,
  Trash2,
  Pin,
  Search,
  Archive,
  ArchiveRestore,
  Bold,
  Italic,
  Heading,
  List,
  ListTodo,
  Code,
  Quote,
  Eye,
  Edit3,
  Columns,
  LayoutGrid,
  Rows3,
  Tag,
  X,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import { Note } from "../types";
import { useTranslation } from "../context/LanguageContext";
import { MarkdownContent } from "./MarkdownContent";

interface NotesViewProps {
  notes: Note[];
  onSaveNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onArchiveNote?: (id: string) => void;
  onUnarchiveNote?: (id: string) => void;
  onReorderNotes?: (noteIds: string[]) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  onSaveNote,
  onDeleteNote,
  onArchiveNote,
  onUnarchiveNote,
  onReorderNotes,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try {
      return (localStorage.getItem("familynotes_notes_view_mode") as "grid" | "list") || "grid";
    } catch {
      return "grid";
    }
  });
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<"edit" | "preview" | "split">("edit");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [pendingDeleteNote, setPendingDeleteNote] = useState<Note | null>(null);
  const [lastDeletedNote, setLastDeletedNote] = useState<Note | null>(null);

  // Drag and drop state for reordering
  const [orderedActiveNoteIds, setOrderedActiveNoteIds] = useState<string[] | null>(null);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const dragSourceIdRef = useRef<string | null>(null);
  const currentOrderRef = useRef<string[]>([]);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSetViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("familynotes_notes_view_mode", mode);
    } catch {}
  };

  const insertMarkdown = (prefix: string, suffix = "") => {
    const textarea = textareaRef.current;
    if (!textarea || !editingNote) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const text = editingNote.content;
    const selected = text.substring(start, end);
    const replacement = prefix + (selected || "") + suffix;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setEditingNote({ ...editingNote, content: newContent });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    }, 0);
  };

  const allAvailableTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((n) => {
      n.tags?.forEach((t) => {
        const trimmed = t.trim();
        if (trimmed) tagSet.add(trimmed);
      });
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const suggestedTags = useMemo(() => {
    if (!editingNote) return [];
    const current = new Set((editingNote.tags || []).map((t) => t.toLowerCase()));
    return allAvailableTags.filter((t) => !current.has(t.toLowerCase())).slice(0, 6);
  }, [allAvailableTags, editingNote]);

  const handleAddTag = (rawTag: string) => {
    const clean = rawTag.trim().replace(/^#/, "");
    if (!clean || !editingNote) return;
    const currentTags = editingNote.tags || [];
    if (!currentTags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setEditingNote({
        ...editingNote,
        tags: [...currentTags, clean],
      });
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!editingNote) return;
    setEditingNote({
      ...editingNote,
      tags: (editingNote.tags || []).filter((t) => t !== tagToRemove),
    });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && editingNote?.tags?.length) {
      handleRemoveTag(editingNote.tags[editingNote.tags.length - 1]);
    }
  };

  const activeNotes = useMemo(() => notes.filter((n) => !n.archived), [notes]);
  const archivedNotes = useMemo(() => notes.filter((n) => !!n.archived), [notes]);

  // Sync internal ordered IDs when incoming notes change (if not actively dragging)
  React.useEffect(() => {
    if (!isDraggingRef.current) {
      const active = notes.filter((n) => !n.archived);
      const pinned = active.filter((n) => n.pinned);
      const unpinned = active.filter((n) => !n.pinned);
      const ids = [...pinned, ...unpinned].map((n) => n.id);
      currentOrderRef.current = ids;
      setOrderedActiveNoteIds(ids);
    }
  }, [notes]);

  const orderedActiveNotes = useMemo(() => {
    const active = notes.filter((n) => !n.archived);
    if (!orderedActiveNoteIds) return active;
    const map = new Map(active.map((n) => [n.id, n]));
    const res: Note[] = [];
    for (const id of orderedActiveNoteIds) {
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
  }, [notes, orderedActiveNoteIds]);

  const isNormalView = !searchQuery.trim() && !selectedTag && !showArchived;

  const filterNote = (n: Note) => {
    if (selectedTag) {
      const hasTag = n.tags?.some((t) => t.trim().toLowerCase() === selectedTag.toLowerCase());
      if (!hasTag) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanQ = q.startsWith("#") ? q.slice(1) : q;
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchContent = n.content.toLowerCase().includes(q);
      const matchTags = n.tags?.some((t) => t.toLowerCase().includes(cleanQ));
      return matchTitle || matchContent || matchTags;
    }
    return true;
  };

  const filteredNotes = useMemo(() => {
    return orderedActiveNotes.filter(filterNote);
  }, [orderedActiveNotes, searchQuery, selectedTag]);

  const filteredArchivedNotes = useMemo(() => {
    return archivedNotes.filter(filterNote);
  }, [archivedNotes, searchQuery, selectedTag]);

  const handleNotePointerDown = (noteId: string, e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (!isNormalView) return;

    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("[data-no-drag]")) {
      return;
    }

    const startX = e.clientX;
    const startY = e.clientY;
    dragSourceIdRef.current = noteId;
    isDraggingRef.current = false;
    hasDraggedRef.current = false;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    const startDrag = () => {
      isDraggingRef.current = true;
      hasDraggedRef.current = true;
      setDraggedNoteId(noteId);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(40);
      }
    };

    longPressTimerRef.current = setTimeout(() => {
      startDrag();
    }, 280);

    const onGlobalPointerMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - startX;
      const dy = moveEv.clientY - startY;
      const dist = Math.hypot(dx, dy);

      if (!isDraggingRef.current && moveEv.pointerType === "mouse" && dist > 6) {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        startDrag();
      }

      if (isDraggingRef.current && dragSourceIdRef.current) {
        if (moveEv.cancelable) {
          moveEv.preventDefault();
        }

        const elem = document.elementFromPoint(moveEv.clientX, moveEv.clientY);
        const cardElem = elem?.closest("[data-note-id]") as HTMLElement | null;
        const targetId = cardElem?.dataset.noteId;

        if (targetId && targetId !== dragSourceIdRef.current) {
          const currentIds = [...currentOrderRef.current];
          const fromIdx = currentIds.indexOf(dragSourceIdRef.current);
          const toIdx = currentIds.indexOf(targetId);
          if (fromIdx !== -1 && toIdx !== -1) {
            const [removed] = currentIds.splice(fromIdx, 1);
            currentIds.splice(toIdx, 0, removed);
            currentOrderRef.current = currentIds;
            setOrderedActiveNoteIds(currentIds);
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
        const finalIds = [...currentOrderRef.current];
        if (onReorderNotes && finalIds.length > 0) {
          onReorderNotes(finalIds);
        }

        // Check if dragged note changed pinned zone
        const sourceNote = notes.find((n) => n.id === dragSourceIdRef.current);
        if (sourceNote) {
          const idx = finalIds.indexOf(sourceNote.id);
          const prevNote = idx > 0 ? notes.find((n) => n.id === finalIds[idx - 1]) : null;
          const nextNote = idx < finalIds.length - 1 ? notes.find((n) => n.id === finalIds[idx + 1]) : null;

          let targetPinned = sourceNote.pinned;
          if (prevNote && nextNote) {
            if (prevNote.pinned === nextNote.pinned && prevNote.pinned !== sourceNote.pinned) {
              targetPinned = prevNote.pinned;
            }
          } else if (prevNote && !nextNote) {
            targetPinned = prevNote.pinned;
          } else if (!prevNote && nextNote) {
            targetPinned = nextNote.pinned;
          }

          if (targetPinned !== sourceNote.pinned) {
            onSaveNote({
              ...sourceNote,
              pinned: targetPinned,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      setTimeout(() => {
        isDraggingRef.current = false;
        dragSourceIdRef.current = null;
        setDraggedNoteId(null);
        setTimeout(() => {
          hasDraggedRef.current = false;
        }, 60);
      }, 60);
    };

    window.addEventListener("pointermove", onGlobalPointerMove, { passive: false });
    window.addEventListener("pointerup", onGlobalPointerUp);
    window.addEventListener("pointercancel", onGlobalPointerUp);
  };

  const handleOpenCreate = () => {
    setEditingNote({
      id: "",
      title: "",
      content: "",
      color: "#10b981",
      pinned: false,
      createdAt: "",
      updatedAt: "",
      tags: [],
    });
    setTagInput("");
    setEditorTab("edit");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (note: Note) => {
    setEditingNote({
      ...note,
      tags: note.tags || [],
    });
    setTagInput("");
    setEditorTab("edit");
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editingNote.title.trim()) return;
    let finalTags = [...(editingNote.tags || [])];
    if (tagInput.trim()) {
      const clean = tagInput.trim().replace(/^#/, "");
      if (!finalTags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
        finalTags.push(clean);
      }
    }
    onSaveNote({
      ...editingNote,
      tags: finalTags,
    });
    setIsModalOpen(false);
    setEditingNote(null);
    setTagInput("");
  };

  const handleDeleteConfirmed = () => {
    if (!pendingDeleteNote) return;
    const noteToDelete = pendingDeleteNote;
    onDeleteNote(noteToDelete.id);
    setLastDeletedNote(noteToDelete);
    setPendingDeleteNote(null);
  };

  const handleRestoreDeletedNote = () => {
    if (!lastDeletedNote) return;
    onSaveNote(lastDeletedNote);
    setLastDeletedNote(null);
  };

  const formatNoteDate = (isoStr?: string) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto min-h-0 max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-4">
      {/* Top Search & Add Bar */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 text-xs">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={t("notes.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shrink-0">
          <button
            type="button"
            onClick={() => handleSetViewMode("grid")}
            className={`p-1.5 rounded-xl transition cursor-pointer ${
              viewMode === "grid"
                ? "bg-emerald-500 text-slate-950 font-bold shadow-xs"
                : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
            title={t("notes.viewModeGrid")}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            onClick={() => handleSetViewMode("list")}
            className={`p-1.5 rounded-xl transition cursor-pointer ${
              viewMode === "list"
                ? "bg-emerald-500 text-slate-950 font-bold shadow-xs"
                : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
            title={t("notes.viewModeList")}
          >
            <Rows3 size={15} />
          </button>
        </div>

        {/* Unfold archived notes button */}
        {archivedNotes.length > 0 && (
          <button
            type="button"
            onClick={() => setShowArchived((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold transition border cursor-pointer shrink-0 ${
              showArchived
                ? "bg-amber-500/15 dark:bg-slate-800 text-amber-700 dark:text-amber-300 border-amber-500/40"
                : "bg-white/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
            title={t("notes.archivedSectionTitle", { count: archivedNotes.length })}
          >
            <Archive size={14} />
            <span className="hidden sm:inline">{t("common.archived")}</span>
            <span className="text-[10px] opacity-75">({archivedNotes.length})</span>
          </button>
        )}

        {/* Tags filter dropdown (to the right of the archive button) */}
        {(allAvailableTags.length > 0 || selectedTag) && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsTagMenuOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold transition border cursor-pointer ${
                selectedTag
                  ? "bg-emerald-500/15 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shadow-xs"
                  : "bg-white/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
              title={selectedTag ? t("notes.filterByTag", { tag: selectedTag }) : t("notes.noteTagsLabel")}
            >
              <Tag size={13} className={selectedTag ? "text-emerald-500" : "text-slate-400"} />
              <span className="max-w-[100px] truncate">
                {selectedTag ? `#${selectedTag}` : t("notes.noteTagsLabel")}
              </span>
              {selectedTag ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTag(null);
                    setIsTagMenuOpen(false);
                  }}
                  className="hover:text-rose-500 p-0.5 rounded-full hover:bg-rose-500/10 transition cursor-pointer ml-0.5"
                  title={t("notes.clearTagFilter")}
                >
                  <X size={13} />
                </span>
              ) : (
                <>
                  <span className="text-[10px] opacity-75">({allAvailableTags.length})</span>
                  <ChevronDown size={12} className="opacity-60" />
                </>
              )}
            </button>

            {/* Dropdown Menu */}
            {isTagMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsTagMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xl z-40 space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {t("notes.noteTagsLabel")}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTag(null);
                      setIsTagMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                      selectedTag === null
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{t("notes.allTags")}</span>
                    <span className="text-[10px] opacity-70">({activeNotes.length})</span>
                  </button>

                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {allAvailableTags.map((tag) => {
                      const isSelected = selectedTag?.toLowerCase() === tag.toLowerCase();
                      const count = activeNotes.filter((n) =>
                        n.tags?.some((t) => t.toLowerCase() === tag.toLowerCase())
                      ).length;
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setSelectedTag(isSelected ? null : tag);
                            setIsTagMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer ${
                            isSelected
                              ? "bg-emerald-500 text-slate-950 font-bold shadow-xs"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <Tag size={12} className={isSelected ? "text-slate-950" : "text-emerald-500"} />
                            <span className="truncate">#{tag}</span>
                          </span>
                          <span className={`text-[10px] ${isSelected ? "text-slate-900 opacity-90" : "text-slate-400"}`}>
                            ({count})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs transition shrink-0 shadow-md shadow-emerald-500/20 cursor-pointer"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">{t("notes.newNote")}</span>
        </button>
      </div>

      {/* NOTES LIST OR GRID */}
      <div>
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <p className="text-sm">{t("notes.empty")}</p>
            {selectedTag ? (
              <button
                onClick={() => setSelectedTag(null)}
                className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {t("notes.clearTagFilter")}
              </button>
            ) : (
              <button
                onClick={handleOpenCreate}
                className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {t("notes.createFirst")}
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredNotes.map((note) => {
              const isBeingDragged = draggedNoteId === note.id;
              return (
                <div
                  key={note.id}
                  data-note-id={note.id}
                  onPointerDown={(e) => handleNotePointerDown(note.id, e)}
                  onClick={() => {
                    if (hasDraggedRef.current || isDraggingRef.current) return;
                    handleOpenEdit(note);
                  }}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all duration-150 shadow-sm group relative select-none touch-manipulation ${
                    isBeingDragged
                      ? "opacity-40 scale-95 border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl z-20 cursor-grabbing"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isNormalView && (
                          <div
                            className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0 transition"
                            title={t("notes.dragToReorder")}
                          >
                            <GripVertical size={13} />
                          </div>
                        )}
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight line-clamp-1">
                          {note.title}
                        </h4>
                      </div>
                      {note.pinned && (
                        <Pin size={14} className="text-amber-500 fill-amber-500 shrink-0" />
                      )}
                    </div>

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2" data-no-drag>
                        {note.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTag(selectedTag?.toLowerCase() === tag.toLowerCase() ? null : tag);
                            }}
                            className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md transition border cursor-pointer ${
                              selectedTag?.toLowerCase() === tag.toLowerCase()
                                ? "bg-emerald-500 text-slate-950 font-bold border-emerald-500"
                                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/60 hover:border-emerald-500/40"
                            }`}
                          >
                            <Tag size={9} className={selectedTag?.toLowerCase() === tag.toLowerCase() ? "text-slate-950" : "text-emerald-500"} />
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="max-h-40 overflow-hidden relative text-xs font-normal pointer-events-none">
                      <MarkdownContent content={note.content} isCompact={true} />
                      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none opacity-80" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 dark:text-slate-500">
                    <span>{formatNoteDate(note.updatedAt || note.createdAt)}</span>
                    <div className="flex items-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDeleteNote(note);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer transition"
                        title={t("common.delete")}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* FULL LIST VIEW - UNCLIPPED & COMPLETE */
          <div className="flex flex-col gap-4">
            {filteredNotes.map((note) => {
              const isBeingDragged = draggedNoteId === note.id;
              return (
                <div
                  key={note.id}
                  data-note-id={note.id}
                  onPointerDown={(e) => handleNotePointerDown(note.id, e)}
                  onClick={() => {
                    if (hasDraggedRef.current || isDraggingRef.current) return;
                    handleOpenEdit(note);
                  }}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 flex flex-col space-y-3 transition-all duration-150 shadow-sm group relative select-none touch-manipulation ${
                    isBeingDragged
                      ? "opacity-40 scale-[0.99] border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl z-20 cursor-grabbing"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
                  }`}
                >
                  {/* List Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isNormalView && (
                          <div
                            className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0 transition"
                            title={t("notes.dragToReorder")}
                          >
                            <GripVertical size={15} />
                          </div>
                        )}
                        <h4 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                          {note.title}
                        </h4>
                        {note.pinned && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                            <Pin size={11} className="fill-amber-500 text-amber-500" />
                            {t("notes.pinnedTag")}
                          </span>
                        )}
                      </div>

                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5" data-no-drag>
                          {note.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTag(selectedTag?.toLowerCase() === tag.toLowerCase() ? null : tag);
                              }}
                              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg transition border cursor-pointer ${
                                selectedTag?.toLowerCase() === tag.toLowerCase()
                                  ? "bg-emerald-500 text-slate-950 font-bold border-emerald-500"
                                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/60 hover:border-emerald-500/40"
                              }`}
                            >
                              <Tag size={10} className={selectedTag?.toLowerCase() === tag.toLowerCase() ? "text-slate-950" : "text-emerald-500"} />
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {note.updatedAt && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                          {formatNoteDate(note.updatedAt)}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDeleteNote(note);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer rounded-lg hover:bg-rose-500/10"
                        title={t("common.delete")}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Complete Unclipped Markdown Content */}
                  <div className="text-xs sm:text-sm font-normal text-slate-800 dark:text-slate-200 leading-relaxed pt-1 pointer-events-none">
                    <MarkdownContent content={note.content} isCompact={false} />
                  </div>

                  {/* List Footer with edit hint */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/70 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="sm:hidden">{formatNoteDate(note.updatedAt || note.createdAt)}</span>
                    <span className="hidden sm:inline opacity-70 group-hover:opacity-100 transition-opacity text-emerald-600 dark:text-emerald-400">
                      ✎ {t("common.edit")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ARCHIVED NOTES SECTION */}
      {showArchived && archivedNotes.length > 0 && (
        <div className="p-3.5 sm:p-4 bg-white/60 dark:bg-slate-900/50 border border-amber-500/20 rounded-2xl space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Archive size={15} className="text-amber-500" />
              <h3 className="text-xs font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider">
                {t("notes.archivedSectionTitle", { count: archivedNotes.length })}
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">{t("notes.archivedReadOnlyDesc")}</span>
          </div>

          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredArchivedNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-sm select-none"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h4 className="font-bold text-slate-800 dark:text-slate-300 text-sm tracking-tight line-clamp-1">
                        {note.title}
                      </h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/20 shrink-0">
                        {t("notes.archivedTag")}
                      </span>
                    </div>

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {note.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            onClick={() => setSelectedTag(selectedTag?.toLowerCase() === tag.toLowerCase() ? null : tag)}
                            className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                          >
                            <Tag size={9} className="text-amber-500" />
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="max-h-36 overflow-hidden relative text-xs font-normal opacity-85">
                      <MarkdownContent content={note.content} isCompact={true} />
                      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent pointer-events-none opacity-90" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs">
                    {onUnarchiveNote && (
                      <button
                        type="button"
                        onClick={() => onUnarchiveNote(note.id)}
                        className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-semibold text-[11px] transition cursor-pointer"
                      >
                        <ArchiveRestore size={13} />
                        <span>{t("notes.unarchiveBtn")}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setPendingDeleteNote(note)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer ml-auto"
                      title={t("common.delete")}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredArchivedNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col space-y-3 shadow-sm select-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-800 dark:text-slate-300 text-base tracking-tight">
                          {note.title}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/20">
                          {t("notes.archivedTag")}
                        </span>
                      </div>

                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {note.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              onClick={() => setSelectedTag(selectedTag?.toLowerCase() === tag.toLowerCase() ? null : tag)}
                              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                            >
                              <Tag size={10} className="text-amber-500" />
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {onUnarchiveNote && (
                        <button
                          type="button"
                          onClick={() => onUnarchiveNote(note.id)}
                          className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-semibold text-[11px] transition cursor-pointer px-2 py-1 rounded-lg hover:bg-emerald-500/10"
                        >
                          <ArchiveRestore size={13} />
                          <span>{t("notes.unarchiveBtn")}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPendingDeleteNote(note)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer rounded-lg hover:bg-rose-500/10"
                        title={t("common.delete")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm font-normal text-slate-700 dark:text-slate-300 leading-relaxed">
                    <MarkdownContent content={note.content} isCompact={false} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {lastDeletedNote && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100%-2rem)] rounded-2xl border border-amber-500/30 bg-white/95 dark:bg-slate-900/95 p-3 shadow-2xl shadow-amber-950/30 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
                {t("notes.noteDeletedUndo")}
              </p>
              <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                {lastDeletedNote.title || t("notes.untitledNote")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLastDeletedNote(null)}
              className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              {t("common.close")}
            </button>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setLastDeletedNote(null)}
              className="px-3 py-1.5 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              {t("notes.ignoreBtn")}
            </button>
            <button
              type="button"
              onClick={handleRestoreDeletedNote}
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-[11px] hover:bg-amber-400 cursor-pointer"
            >
              {t("notes.recoverBtn")}
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE OR ARCHIVE DIALOGUE */}
      {pendingDeleteNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl text-slate-900 dark:text-white">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-500">
                {pendingDeleteNote.archived ? t("common.delete") : t("common.archive")}
              </p>
              <h3 className="mt-2 text-sm font-bold">
                {t("notes.deleteConfirmTitle", { title: pendingDeleteNote.title || "esta nota" })}
              </h3>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {pendingDeleteNote.archived
                  ? t("notes.deleteArchivedConfirmDesc")
                  : t("notes.deleteConfirmDesc")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteNote(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white order-last sm:order-first cursor-pointer"
              >
                {t("common.cancel")}
              </button>

              {!pendingDeleteNote.archived && onArchiveNote && (
                <button
                  type="button"
                  onClick={() => {
                    onArchiveNote(pendingDeleteNote.id);
                    setPendingDeleteNote(null);
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  <Archive size={14} />
                  <span>{t("notes.archiveBtn")}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDeleteConfirmed}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                <Trash2 size={14} />
                <span>{t("notes.deletePermBtn")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT / CREATE MODAL */}
      {isModalOpen && editingNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center md:p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 md:rounded-2xl p-5 w-[95vw] max-w-3xl md:max-w-4xl lg:max-w-5xl h-[92vh] md:h-[85vh] flex flex-col gap-3 md:shadow-2xl overflow-hidden text-slate-900 dark:text-white"
          >
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold">
                {editingNote.id ? t("notes.editModalTitle") : t("notes.createModalTitle")}
              </h3>
              <button
                type="button"
                onClick={() =>
                  setEditingNote({
                    ...editingNote,
                    pinned: !editingNote.pinned,
                  })
                }
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer ${
                  editingNote.pinned
                    ? "bg-amber-400/10 border-amber-400/30 text-amber-600 dark:text-amber-300"
                    : "border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                }`}
              >
                <Pin size={13} />
                <span>{editingNote.pinned ? t("notes.unpinNote") : t("notes.pinNote")}</span>
              </button>
            </div>

            <div className="shrink-0">
              <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                {t("notes.noteTitleLabel")}
              </label>
              <input
                type="text"
                autoFocus
                placeholder={t("notes.noteTitlePlaceholder")}
                value={editingNote.title}
                onChange={(e) =>
                  setEditingNote({ ...editingNote, title: e.target.value })
                }
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex-1 flex flex-col min-h-0 pb-1">
              <div className="flex items-center justify-between mb-1.5 shrink-0">
                <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                  {t("notes.noteContentLabel")}{" "}
                  <span className="font-normal text-[10px] text-slate-400 dark:text-slate-500">
                    ({t("notes.markdownSupported")})
                  </span>
                </label>

                {/* View Tabs */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px]">
                  <button
                    type="button"
                    onClick={() => setEditorTab("edit")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                      editorTab === "edit"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Edit3 size={12} />
                    <span>{t("notes.tabEdit")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("preview")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                      editorTab === "preview"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Eye size={12} />
                    <span>{t("notes.tabPreview")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("split")}
                    className={`hidden md:flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                      editorTab === "split"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Columns size={12} />
                    <span>{t("notes.tabSplit")}</span>
                  </button>
                </div>
              </div>

              {/* Markdown Quick Toolbar (visible in edit and split modes) */}
              {editorTab !== "preview" && (
                <div className="flex items-center gap-1 py-1 px-2 mb-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-slate-600 dark:text-slate-300 overflow-x-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => insertMarkdown("## ")}
                    className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition cursor-pointer"
                    title={t("notes.toolbarHeading")}
                  >
                    <Heading size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("**", "**")}
                    className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition cursor-pointer"
                    title={t("notes.toolbarBold")}
                  >
                    <Bold size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("*", "*")}
                    className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition cursor-pointer"
                    title={t("notes.toolbarItalic")}
                  >
                    <Italic size={14} />
                  </button>
                  <div className="h-3 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => insertMarkdown("- ")}
                    className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition cursor-pointer"
                    title={t("notes.toolbarList")}
                  >
                    <List size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("- [ ] ")}
                    className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition cursor-pointer"
                    title={t("notes.toolbarChecklist")}
                  >
                    <ListTodo size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("> ")}
                    className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition cursor-pointer"
                    title={t("notes.toolbarQuote")}
                  >
                    <Quote size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("`", "`")}
                    className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition cursor-pointer"
                    title={t("notes.toolbarCode")}
                  >
                    <Code size={14} />
                  </button>
                </div>
              )}

              {/* Editor / Preview Content Area */}
              <div className="flex-1 flex min-h-0 gap-3">
                {/* Editor Textarea */}
                {(editorTab === "edit" || editorTab === "split") && (
                  <div className={`flex-1 flex flex-col rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all ${
                    editorTab === "split" ? "w-1/2" : "w-full"
                  }`}>
                    <textarea
                      ref={textareaRef}
                      placeholder={t("notes.noteContentPlaceholder")}
                      value={editingNote.content}
                      onChange={(e) =>
                        setEditingNote({ ...editingNote, content: e.target.value })
                      }
                      className="flex-1 w-full bg-transparent text-xs text-slate-900 dark:text-white font-mono resize-none border-0 outline-none p-1 overflow-y-auto"
                    />
                  </div>
                )}

                {/* Preview Area */}
                {(editorTab === "preview" || editorTab === "split") && (
                  <div className={`flex-1 overflow-y-auto rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 ${
                    editorTab === "split" ? "w-1/2" : "w-full"
                  }`}>
                    {editingNote.content.trim() ? (
                      <MarkdownContent content={editingNote.content} />
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                        {t("notes.previewEmpty")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 shrink-0 border-t border-slate-200 dark:border-slate-800/80 mt-1 pb-1">
              {/* Left area: Archive button + Tags to its right */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto scrollbar-none py-0.5">
                {editingNote.id && onArchiveNote && (
                  <button
                    type="button"
                    onClick={() => {
                      onArchiveNote(editingNote.id);
                      setIsModalOpen(false);
                      setEditingNote(null);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 border border-amber-500/25 font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                    title={t("notes.archiveNoteBtn")}
                  >
                    <Archive size={13} />
                    <span className="hidden sm:inline">{t("notes.archiveNoteBtn")}</span>
                  </button>
                )}

                {/* Existing tag chips */}
                {editingNote.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-xl bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shrink-0"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-rose-500 cursor-pointer text-xs ml-0.5"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}

                {/* Tag input pill */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1 text-xs focus-within:border-emerald-500 shrink-0 transition-all">
                  <Tag size={12} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder={
                      editingNote.tags && editingNote.tags.length > 0
                        ? "+ etiqueta..."
                        : t("notes.noteTagsPlaceholder")
                    }
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="w-24 sm:w-36 bg-transparent text-xs text-slate-900 dark:text-white outline-none placeholder-slate-400"
                  />
                  {tagInput.trim() && (
                    <button
                      type="button"
                      onClick={() => handleAddTag(tagInput)}
                      className="px-1.5 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-bold rounded-md cursor-pointer hover:bg-emerald-400 transition"
                    >
                      +
                    </button>
                  )}
                </div>

                {/* Suggested tags chips */}
                {suggestedTags.length > 0 && (
                  <div className="hidden md:flex items-center gap-1 shrink-0 text-[10px]">
                    <span className="text-slate-400">{t("notes.suggestedTags")}</span>
                    {suggestedTags.slice(0, 3).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-300 transition cursor-pointer"
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right area: Cancel & Save buttons */}
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                >
                  {t("notes.saveNoteBtn")}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
