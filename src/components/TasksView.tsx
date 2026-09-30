import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Kanban,
  List as ListIcon,
  Plus,
  Search,
  SlidersHorizontal,
  Calendar,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  FileText,
  Eye,
  Check,
  Tag,
  GripVertical,
} from "lucide-react";
import { Task, TaskPriority, TaskStatus, FamilyMember, Note } from "../types";
import { useTranslation } from "../context/LanguageContext";
import { MarkdownContent } from "./MarkdownContent";

const COLOR_PALETTE = [
  "#64748b", // Slate
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
  "#6366f1", // Indigo
];

interface TasksViewProps {
  tasks: Task[];
  taskStatuses: TaskStatus[];
  members?: FamilyMember[];
  notes?: Note[];
  onShowToast?: (msg: string, icon?: string) => void;
  onUpsertTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onReorderTasks: (taskIds: string[]) => void;
  onUpsertTaskStatus: (status: TaskStatus) => void;
  onDeleteTaskStatus: (statusId: string, fallbackStatusId?: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  taskStatuses,
  members = [],
  notes = [],
  onShowToast,
  onUpsertTask,
  onDeleteTask,
  onReorderTasks,
  onUpsertTaskStatus,
  onDeleteTaskStatus,
}) => {
  const { t } = useTranslation();

  // View mode: "kanban" | "list"
  const [viewMode, setViewMode] = useState<"kanban" | "list">(() => {
    try {
      return (
        (localStorage.getItem("familynotes_tasks_view_mode") as "kanban" | "list") ||
        "kanban"
      );
    } catch {
      return "kanban";
    }
  });

  const handleSetViewMode = (mode: "kanban" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("familynotes_tasks_view_mode", mode);
    } catch {
      // ignore
    }
  };

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Jira Detail Modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditingNew, setIsEditingNew] = useState(false);

  // Column Manager Modal state
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);

  // Pointer Drag State (Tauri / WebView2 & Touchscreens native support)
  const [activeDragItem, setActiveDragItem] = useState<{
    type: "task" | "note";
    id: string;
    title: string;
    priority?: TaskPriority;
    color?: string;
    sourceStatusId?: string;
    initialX: number;
    initialY: number;
  } | null>(null);
  const [activeDropStatusId, setActiveDropStatusId] = useState<string | null>(null);
  const currentDropStatusIdRef = useRef<string | null>(null);
  const isPointerDraggingRef = useRef(false);
  const hasDraggedPointerRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  // Vault Notes Drawer state (for converting notes into kanban tasks)
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);
  const [notesSearch, setNotesSearch] = useState("");

  // Extract all unique tags across active tasks
  const allAvailableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const t of tasks) {
      if (t.archived) continue;
      if (t.tags) {
        for (const tag of t.tags) {
          const trimmed = tag.trim();
          if (trimmed) tagSet.add(trimmed);
        }
      }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  // Filtered vault notes for the notes drawer
  const activeVaultNotes = useMemo(() => {
    const q = notesSearch.trim().toLowerCase();
    return (notes || []).filter((note) => {
      if (note.archived) return false;
      if (!q) return true;
      const titleMatch = note.title.toLowerCase().includes(q);
      const contentMatch = note.content.toLowerCase().includes(q);
      const tagsMatch = (note.tags || []).some((t) => t.toLowerCase().includes(q));
      return titleMatch || contentMatch || tagsMatch;
    });
  }, [notes, notesSearch]);

  // Sort statuses by order
  const sortedStatuses = useMemo(() => {
    return [...taskStatuses].sort((a, b) => a.order - b.order);
  }, [taskStatuses]);

  const statusMap = useMemo(() => {
    const map = new Map<string, TaskStatus>();
    for (const s of taskStatuses) {
      map.set(s.id, s);
    }
    return map;
  }, [taskStatuses]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      if (task.archived) return false;
      if (statusFilter !== "all" && task.statusId !== statusFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (
        selectedTag &&
        !(task.tags || []).some((t) => t.toLowerCase() === selectedTag.toLowerCase())
      ) {
        return false;
      }

      if (!q) return true;
      const titleMatch = task.title.toLowerCase().includes(q);
      const descMatch = task.description.toLowerCase().includes(q);
      const assigneeMatch = (task.assignee || "").toLowerCase().includes(q);
      const tagsMatch = (task.tags || []).some((tag) => tag.toLowerCase().includes(q));

      return titleMatch || descMatch || assigneeMatch || tagsMatch;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, selectedTag]);

  // Group tasks by status for Kanban
  const tasksByStatus = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const status of sortedStatuses) {
      map.set(status.id, []);
    }
    for (const task of filteredTasks) {
      const list = map.get(task.statusId);
      if (list) {
        list.push(task);
      } else if (sortedStatuses.length > 0) {
        // Fallback to first column if status is unrecognized
        const first = map.get(sortedStatuses[0].id);
        if (first) first.push(task);
      }
    }
    // Sort within columns by order
    for (const [, list] of map.entries()) {
      list.sort((a, b) => a.order - b.order);
    }
    return map;
  }, [sortedStatuses, filteredTasks]);

  // Priority color & badge helpers
  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "urgent":
        return {
          label: t("tasks.priorityUrgent"),
          bg: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
          dot: "bg-red-500",
        };
      case "high":
        return {
          label: t("tasks.priorityHigh"),
          bg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
          dot: "bg-amber-500",
        };
      case "low":
        return {
          label: t("tasks.priorityLow"),
          bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          dot: "bg-emerald-500",
        };
      case "medium":
      default:
        return {
          label: t("tasks.priorityMedium"),
          bg: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
          dot: "bg-blue-500",
        };
    }
  };

  // Due date helpers
  const getDueDateInfo = (dueDateStr?: string | null) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateClean = new Date(due);
    dueDateClean.setHours(0, 0, 0, 0);

    const isOverdue = dueDateClean < today;
    const isDueToday = dueDateClean.getTime() === today.getTime();

    return {
      formatted: dueDateStr,
      isOverdue,
      isDueToday,
    };
  };

  // Quick Open Card Modal
  const openNewTaskModal = (initialStatusId?: string) => {
    const defaultStatusId = initialStatusId || sortedStatuses[0]?.id || "todo";
    setSelectedTask({
      id: "",
      title: "",
      description: "",
      statusId: defaultStatusId,
      priority: "medium",
      assignee: null,
      dueDate: null,
      tags: [],
      order: 0,
      createdAt: "",
      updatedAt: "",
    });
    setIsEditingNew(true);
    setIsDetailModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setSelectedTask({ ...task });
    setIsEditingNew(false);
    setIsDetailModalOpen(true);
  };

  // Quick Toggle Complete from Card / Table
  const handleToggleTaskComplete = (task: Task, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentStatus = statusMap.get(task.statusId);
    if (!currentStatus) return;

    if (currentStatus.isCompleted) {
      // Find first non-completed status
      const firstNonDone = sortedStatuses.find((s) => !s.isCompleted) || sortedStatuses[0];
      if (firstNonDone) {
        onUpsertTask({ ...task, statusId: firstNonDone.id });
      }
    } else {
      // Find first completed status
      const firstDone = sortedStatuses.find((s) => s.isCompleted);
      if (firstDone) {
        onUpsertTask({ ...task, statusId: firstDone.id });
      }
    }
  };

  // Quick Move Column (Left / Right)
  const handleMoveColumn = (task: Task, direction: "left" | "right", e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = sortedStatuses.findIndex((s) => s.id === task.statusId);
    if (currentIndex === -1) return;

    const nextIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex >= 0 && nextIndex < sortedStatuses.length) {
      const nextStatus = sortedStatuses[nextIndex];
      onUpsertTask({ ...task, statusId: nextStatus.id });
    }
  };

  const createTaskFromNote = (note: Note, targetStatusId: string) => {
    const effectiveStatusId = targetStatusId || sortedStatuses[0]?.id || "todo";
    const targetStatus = statusMap.get(effectiveStatusId);
    const now = new Date().toISOString();
    const currentList = tasksByStatus.get(effectiveStatusId) || [];
    const maxOrder = currentList.reduce((max, t) => Math.max(max, t.order || 0), 0);
    const newTask: Task = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: note.title.trim() || note.content.slice(0, 45).trim() || "Nota",
      description: note.content || "",
      statusId: effectiveStatusId,
      priority: "medium",
      assignee: null,
      dueDate: null,
      tags: note.tags && note.tags.length > 0 ? [...note.tags] : [],
      order: currentList.length > 0 ? maxOrder + 1 : 0,
      createdAt: now,
      updatedAt: now,
    };
    onUpsertTask(newTask);
    if (onShowToast) {
      onShowToast(
        t("tasks.noteConvertedToast", { status: targetStatus?.name || "" }),
        "📝"
      );
    }
  };

  // Pointer-based Drag & Drop (Tauri / WebView2 native & touch safe)
  const handleTaskPointerDown = (task: Task, e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("select") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("[data-no-drag]")
    ) {
      return;
    }

    const startX = e.clientX;
    const startY = e.clientY;
    hasDraggedPointerRef.current = false;
    isPointerDraggingRef.current = false;
    currentDropStatusIdRef.current = task.statusId;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const startDrag = (clientX: number, clientY: number) => {
      isPointerDraggingRef.current = true;
      hasDraggedPointerRef.current = true;
      currentDropStatusIdRef.current = task.statusId;
      setActiveDropStatusId(task.statusId);
      setActiveDragItem({
        type: "task",
        id: task.id,
        title: task.title,
        priority: task.priority,
        sourceStatusId: task.statusId,
        initialX: clientX,
        initialY: clientY,
      });
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate3d(${clientX}px, ${clientY}px, 0) translate(-50%, -50%) rotate(2.5deg)`;
      }
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(30);
      }
    };

    if (e.pointerType === "touch") {
      longPressTimerRef.current = setTimeout(() => {
        startDrag(startX, startY);
      }, 250);
    }

    const onPointerMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - startX;
      const dy = moveEv.clientY - startY;
      const dist = Math.hypot(dx, dy);

      // On mouse, movement > 5px immediately starts drag
      if (!isPointerDraggingRef.current && moveEv.pointerType === "mouse" && dist > 5) {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        startDrag(moveEv.clientX, moveEv.clientY);
      }

      // On touch, movement > 10px before 250ms cancels drag so page can scroll
      if (!isPointerDraggingRef.current && moveEv.pointerType === "touch" && dist > 10) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }

      if (isPointerDraggingRef.current) {
        if (moveEv.cancelable) moveEv.preventDefault();

        if (ghostRef.current) {
          ghostRef.current.style.transform = `translate3d(${moveEv.clientX}px, ${moveEv.clientY}px, 0) translate(-50%, -50%) rotate(2.5deg)`;
        }

        const elem = document.elementFromPoint(moveEv.clientX, moveEv.clientY);
        const colElem = elem?.closest("[data-status-id]") as HTMLElement | null;
        const colId = colElem?.dataset.statusId || null;
        if (colId && colId !== currentDropStatusIdRef.current) {
          currentDropStatusIdRef.current = colId;
          setActiveDropStatusId(colId);
        }
      }
    };

    const onPointerUp = (upEv: PointerEvent) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      if (isPointerDraggingRef.current) {
        const elem = document.elementFromPoint(upEv.clientX, upEv.clientY);
        const colElem = elem?.closest("[data-status-id]") as HTMLElement | null;
        const targetStatusId = colElem?.dataset.statusId || currentDropStatusIdRef.current;

        if (targetStatusId) {
          if (targetStatusId !== task.statusId) {
            onUpsertTask({ ...task, statusId: targetStatusId });
          } else {
            // Reorder within the same column if dropped over another card
            const cardElem = elem?.closest("[data-task-id]") as HTMLElement | null;
            const targetTaskId = cardElem?.dataset.taskId;
            const currentList = tasksByStatus.get(targetStatusId) || [];
            if (targetTaskId && targetTaskId !== task.id) {
              const ids = currentList.map((t) => t.id);
              const fromIdx = ids.indexOf(task.id);
              const toIdx = ids.indexOf(targetTaskId);
              if (fromIdx !== -1 && toIdx !== -1) {
                ids.splice(fromIdx, 1);
                ids.splice(toIdx, 0, task.id);
                onReorderTasks(ids);
              }
            }
          }
        }
      }

      isPointerDraggingRef.current = false;
      setActiveDragItem(null);
      setActiveDropStatusId(null);
      currentDropStatusIdRef.current = null;

      setTimeout(() => {
        hasDraggedPointerRef.current = false;
      }, 150);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const handleNotePointerDown = (note: Note, e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("select") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("[data-no-drag]")
    ) {
      return;
    }

    const startX = e.clientX;
    const startY = e.clientY;
    hasDraggedPointerRef.current = false;
    isPointerDraggingRef.current = false;
    currentDropStatusIdRef.current = null;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const startDrag = (clientX: number, clientY: number) => {
      isPointerDraggingRef.current = true;
      hasDraggedPointerRef.current = true;
      setActiveDragItem({
        type: "note",
        id: note.id,
        title: note.title || "Nota",
        color: note.color,
        initialX: clientX,
        initialY: clientY,
      });
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate3d(${clientX}px, ${clientY}px, 0) translate(-50%, -50%) rotate(2.5deg)`;
      }
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(30);
      }
    };

    if (e.pointerType === "touch") {
      longPressTimerRef.current = setTimeout(() => {
        startDrag(startX, startY);
      }, 250);
    }

    const onPointerMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - startX;
      const dy = moveEv.clientY - startY;
      const dist = Math.hypot(dx, dy);

      if (!isPointerDraggingRef.current && moveEv.pointerType === "mouse" && dist > 5) {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        startDrag(moveEv.clientX, moveEv.clientY);
      }

      if (!isPointerDraggingRef.current && moveEv.pointerType === "touch" && dist > 10) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }

      if (isPointerDraggingRef.current) {
        if (moveEv.cancelable) moveEv.preventDefault();

        if (ghostRef.current) {
          ghostRef.current.style.transform = `translate3d(${moveEv.clientX}px, ${moveEv.clientY}px, 0) translate(-50%, -50%) rotate(2.5deg)`;
        }

        const elem = document.elementFromPoint(moveEv.clientX, moveEv.clientY);
        const colElem = elem?.closest("[data-status-id]") as HTMLElement | null;
        const colId = colElem?.dataset.statusId || null;
        if (colId && colId !== currentDropStatusIdRef.current) {
          currentDropStatusIdRef.current = colId;
          setActiveDropStatusId(colId);
        }
      }
    };

    const onPointerUp = (upEv: PointerEvent) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      if (isPointerDraggingRef.current) {
        const elem = document.elementFromPoint(upEv.clientX, upEv.clientY);
        const colElem = elem?.closest("[data-status-id]") as HTMLElement | null;
        const targetStatusId = colElem?.dataset.statusId || currentDropStatusIdRef.current;

        if (targetStatusId) {
          createTaskFromNote(note, targetStatusId);
        }
      }

      isPointerDraggingRef.current = false;
      setActiveDragItem(null);
      setActiveDropStatusId(null);
      currentDropStatusIdRef.current = null;

      setTimeout(() => {
        hasDraggedPointerRef.current = false;
      }, 150);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-950/50 select-none">
      {/* Top Toolbar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/90 px-3 sm:px-6 py-2.5 sm:py-3 shrink-0 flex flex-wrap items-center justify-between gap-2.5 transition-colors">
        {/* Left: View Mode Toggle & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/90 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => handleSetViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-emerald-500 text-slate-950 shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title={t("tasks.viewModeKanban")}
            >
              <Kanban size={14} />
              <span className="hidden sm:inline">{t("tasks.viewModeKanban")}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === "list"
                  ? "bg-emerald-500 text-slate-950 shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title={t("tasks.viewModeList")}
            >
              <ListIcon size={14} />
              <span className="hidden sm:inline">{t("tasks.viewModeList")}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsColumnModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={t("tasks.manageColumnsTitle")}
          >
            <SlidersHorizontal size={14} />
            <span className="hidden md:inline">{t("tasks.manageColumns")}</span>
          </button>

          {/* Vault Notes Drawer Toggle Button */}
          {notes && notes.length > 0 && (
            <button
              type="button"
              onClick={() => setIsNotesDrawerOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isNotesDrawerOpen
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title={t("tasks.notesDrawerTitle")}
            >
              <FileText size={14} />
              <span className="hidden sm:inline">{t("tasks.notesDrawerBtn")}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {notes.filter((n) => !n.archived).length}
              </span>
            </button>
          )}
        </div>

        {/* Center / Right: Search & Filters & Add Task */}
        <div className="flex items-center gap-2 flex-1 justify-end max-w-full sm:max-w-2xl">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[140px] max-w-xs">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("tasks.searchPlaceholder")}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/90 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/90 rounded-xl px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer hidden md:block"
          >
            <option value="all">{t("tasks.filterStatus")}</option>
            {sortedStatuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/90 rounded-xl px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer hidden sm:block"
          >
            <option value="all">{t("tasks.filterPriority")}</option>
            <option value="low">{t("tasks.priorityLow")}</option>
            <option value="medium">{t("tasks.priorityMedium")}</option>
            <option value="high">{t("tasks.priorityHigh")}</option>
            <option value="urgent">{t("tasks.priorityUrgent")}</option>
          </select>

          {/* Tag Filter */}
          {allAvailableTags.length > 0 && (
            <select
              value={selectedTag || "all"}
              onChange={(e) => setSelectedTag(e.target.value === "all" ? null : e.target.value)}
              className={`border rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer hidden lg:block transition ${
                selectedTag
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold"
                  : "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800/90 text-slate-700 dark:text-slate-300"
              }`}
            >
              <option value="all">{t("tasks.filterTag")}</option>
              {allAvailableTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          )}

          {/* New Task Button */}
          <button
            type="button"
            onClick={() => openNewTaskModal()}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition cursor-pointer shrink-0"
          >
            <Plus size={15} />
            <span>{t("tasks.newTask")}</span>
          </button>
        </div>
      </div>

      {/* Active Tag Filter Banner */}
      {selectedTag && (
        <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border-b border-emerald-500/20 px-3 sm:px-6 py-1.5 flex items-center justify-between shrink-0 text-xs text-emerald-700 dark:text-emerald-300 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Tag size={13} className="text-emerald-500 shrink-0" />
            <span>
              {t("tasks.activeTagFilter")}: <strong className="font-bold">#{selectedTag}</strong>
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 font-bold">
              {filteredTasks.length} {t("tasks.totalTasks", { count: filteredTasks.length })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedTag(null)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 transition text-[11px] font-semibold cursor-pointer"
            title={t("tasks.clearTagFilter")}
          >
            <X size={12} />
            <span>{t("tasks.clearTagFilter")}</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {filteredTasks.length === 0 && !searchQuery && tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-500 mb-3 shadow-inner">
              <Kanban size={32} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {t("tasks.emptyTasks")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
              {t("tasks.emptyTasksDesc")}
            </p>
            <button
              type="button"
              onClick={() => openNewTaskModal()}
              className="flex items-center gap-2 bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 hover:bg-emerald-400 transition cursor-pointer"
            >
              <Plus size={16} />
              <span>{t("tasks.newTask")}</span>
            </button>
          </div>
        ) : viewMode === "kanban" ? (
          /* Kanban Board View with optional Vault Notes side drawer */
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            <div className="flex-1 flex gap-3 sm:gap-4 overflow-x-auto p-3 sm:p-5 items-stretch scrollbar-thin">
              {sortedStatuses.map((status) => {
                const columnTasks = tasksByStatus.get(status.id) || [];
                const isOver = activeDropStatusId === status.id;

                return (
                  <div
                    key={status.id}
                    data-status-id={status.id}
                    className={`flex-1 min-w-[280px] sm:min-w-[300px] flex flex-col h-full rounded-2xl border transition-all duration-150 ${
                      isOver
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-lg ring-2 ring-emerald-500/30 scale-[1.01]"
                        : "border-slate-200 dark:border-slate-800/80 bg-slate-100/70 dark:bg-slate-900/60 shadow-sm"
                    }`}
                  >
                    {/* Column Header */}
                    <div className="p-3 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: status.color || "#64748b" }}
                        />
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {status.name}
                        </h4>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {columnTasks.length}
                        </span>
                      </div>

                      <button
                        type="button"
                        data-no-drag
                        onClick={() => openNewTaskModal(status.id)}
                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                        title={t("tasks.newTask")}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Drag Over Hint Banner */}
                    {isOver && (
                      <div className="mx-2 mt-2 p-2 rounded-xl border-2 border-dashed border-emerald-500/80 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold text-center flex items-center justify-center gap-1.5 animate-pulse">
                        <span>📥</span>
                        <span>{t("tasks.dragNoteDropHint")}</span>
                      </div>
                    )}

                    {/* Column Task Cards */}
                    <div className="flex-1 overflow-y-auto p-2 sm:p-2.5 space-y-2.5 min-h-[120px] scrollbar-thin">
                      {columnTasks.length === 0 ? (
                        <div className="py-8 text-center text-[11px] text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                          {t("tasks.emptyColumn")}
                        </div>
                      ) : (
                        columnTasks.map((task) => {
                          const priorityInfo = getPriorityBadge(task.priority);
                          const dueInfo = getDueDateInfo(task.dueDate);
                          const isDone = status.isCompleted;
                          const isCardDragged = activeDragItem?.id === task.id;

                          return (
                            <div
                              key={task.id}
                              data-task-id={task.id}
                              onPointerDown={(e) => handleTaskPointerDown(task, e)}
                              onClick={() => {
                                if (hasDraggedPointerRef.current) return;
                                openEditTaskModal(task);
                              }}
                              className={`group relative p-3 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition select-none cursor-grab active:cursor-grabbing touch-none flex flex-col gap-2 ${
                                isCardDragged ? "opacity-30 scale-95 border-dashed border-emerald-500" : ""
                              }`}
                            >
                              {/* Card Top: Priority, Completion Toggle & Quick Move */}
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400 cursor-grab shrink-0 transition"
                                    title="Arrastra para mover"
                                  >
                                    <GripVertical size={13} />
                                  </div>
                                  <button
                                    type="button"
                                    data-no-drag
                                    onClick={(e) => handleToggleTaskComplete(task, e)}
                                    className="text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition cursor-pointer"
                                    title={isDone ? t("tasks.pending") : t("tasks.completed")}
                                  >
                                    {isDone ? (
                                      <CheckCircle2 size={16} className="text-emerald-500 fill-emerald-500/10" />
                                    ) : (
                                      <Circle size={16} />
                                    )}
                                  </button>
                                  <span
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${priorityInfo.bg}`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dot}`}
                                    />
                                    <span>{priorityInfo.label}</span>
                                  </span>
                                </div>

                                {/* Desktop/Mobile Move Nudge Buttons */}
                                <div className="flex items-center opacity-70 group-hover:opacity-100 transition">
                                  <button
                                    type="button"
                                    data-no-drag
                                    onClick={(e) => handleMoveColumn(task, "left", e)}
                                    className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                    title={t("tasks.moveLeft")}
                                  >
                                    <ChevronLeft size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    data-no-drag
                                    onClick={(e) => handleMoveColumn(task, "right", e)}
                                    className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                    title={t("tasks.moveRight")}
                                  >
                                    <ChevronRight size={13} />
                                  </button>
                                </div>
                              </div>

                              {/* Card Title */}
                              <h5
                                className={`text-xs font-semibold leading-snug break-words text-slate-900 dark:text-white ${
                                  isDone ? "line-through text-slate-400 dark:text-slate-500" : ""
                                }`}
                              >
                                {task.title}
                              </h5>

                              {/* Card Description snippet if any */}
                              {task.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                  {task.description}
                                </p>
                              )}

                              {/* Tags Chips */}
                              {task.tags && task.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {task.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      data-no-drag
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTag((prev) =>
                                          prev?.toLowerCase() === tag.toLowerCase() ? null : tag
                                        );
                                      }}
                                      className={`px-1.5 py-0.5 text-[10px] rounded-md font-medium cursor-pointer transition ${
                                        selectedTag?.toLowerCase() === tag.toLowerCase()
                                          ? "bg-emerald-500 text-slate-950 font-bold shadow-xs"
                                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-500"
                                      }`}
                                      title={t("tasks.filterByTag", { tag })}
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Card Footer: Due Date & Assignee */}
                              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[10px]">
                                {/* Due Date */}
                                {dueInfo ? (
                                  <div
                                    className={`flex items-center gap-1 font-medium ${
                                      dueInfo.isOverdue
                                        ? "text-red-600 dark:text-red-400 font-bold"
                                        : dueInfo.isDueToday
                                        ? "text-amber-600 dark:text-amber-400 font-bold"
                                        : "text-slate-500 dark:text-slate-400"
                                    }`}
                                    title={
                                      dueInfo.isOverdue
                                        ? t("tasks.overdue")
                                        : dueInfo.isDueToday
                                        ? t("tasks.dueToday")
                                        : t("tasks.dueDateLabel")
                                    }
                                  >
                                    <Calendar size={11} />
                                    <span>{dueInfo.formatted}</span>
                                  </div>
                                ) : (
                                  <span />
                                )}

                                {/* Assignee */}
                                {task.assignee ? (
                                  <div
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
                                    title={task.assignee}
                                  >
                                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-bold flex items-center justify-center">
                                      {task.assignee.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="truncate max-w-[80px]">
                                      {task.assignee}
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Vault Notes Drawer for dragging notes into Kanban columns */}
            {isNotesDrawerOpen && (
              <div className="w-72 sm:w-80 shrink-0 border-l border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900 flex flex-col h-full shadow-xl z-10 animate-in slide-in-from-right duration-200">
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-emerald-500" />
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      {t("tasks.notesDrawerTitle")}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNotesDrawerOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <p className="px-3 pt-2 pb-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {t("tasks.notesDrawerDesc")}
                </p>

                {/* Notes Search */}
                <div className="px-3 py-1.5">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={notesSearch}
                      onChange={(e) => setNotesSearch(e.target.value)}
                      placeholder={t("tasks.searchPlaceholder")}
                      className="w-full pl-7 pr-6 py-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                    />
                    {notesSearch && (
                      <button
                        type="button"
                        onClick={() => setNotesSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Notes List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                  {activeVaultNotes.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      {t("tasks.noNotesInVault")}
                    </div>
                  ) : (
                    activeVaultNotes.map((note) => (
                      <div
                        key={note.id}
                        data-note-id={note.id}
                        onPointerDown={(e) => handleNotePointerDown(note, e)}
                        className={`p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-emerald-500/50 hover:shadow-sm transition select-none cursor-grab active:cursor-grabbing touch-none flex flex-col gap-1.5 group ${
                          activeDragItem?.id === note.id ? "opacity-30 border-dashed border-emerald-500" : ""
                        }`}
                        style={{ borderLeftColor: note.color || "#10b981", borderLeftWidth: "4px" }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                            {note.title || "Nota"}
                          </span>
                          <span className="text-[10px] text-slate-400 opacity-60 group-hover:opacity-100 shrink-0">
                            ✋ Arrastra
                          </span>
                        </div>
                        {note.content && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                            {note.content}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800/50 mt-0.5">
                          <div className="flex flex-wrap gap-1">
                            {note.tags?.map((tg) => (
                              <span key={tg} className="text-[9px] text-slate-500 dark:text-slate-400">
                                #{tg}
                              </span>
                            ))}
                          </div>
                          <button
                            type="button"
                            data-no-drag
                            onClick={() => {
                              const targetStatus = sortedStatuses[0];
                              if (targetStatus) createTaskFromNote(note, targetStatus.id);
                            }}
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer shrink-0"
                            title={t("tasks.createTaskFromNote")}
                          >
                            + {sortedStatuses[0]?.name || t("tasks.createTaskFromNote")}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* List / Table View */
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 scrollbar-thin">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold select-none">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">{t("tasks.taskTitlePlaceholder")}</th>
                    <th className="py-2.5 px-3 w-36">{t("tasks.statusLabel")}</th>
                    <th className="py-2.5 px-3 w-28">{t("tasks.priorityLabel")}</th>
                    <th className="py-2.5 px-3 w-36 hidden sm:table-cell">{t("tasks.assigneeLabel")}</th>
                    <th className="py-2.5 px-3 w-32 hidden md:table-cell">{t("tasks.dueDateLabel")}</th>
                    <th className="py-2.5 px-3 w-20 text-right">{t("tasks.cardActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredTasks.map((task) => {
                    const status = statusMap.get(task.statusId);
                    const priorityInfo = getPriorityBadge(task.priority);
                    const dueInfo = getDueDateInfo(task.dueDate);
                    const isDone = status?.isCompleted;

                    return (
                      <tr
                        key={task.id}
                        onClick={() => openEditTaskModal(task)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                      >
                        {/* Checkbox Complete */}
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleToggleTaskComplete(task, e)}
                            className="text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition cursor-pointer"
                          >
                            {isDone ? (
                              <CheckCircle2 size={16} className="text-emerald-500 fill-emerald-500/10" />
                            ) : (
                              <Circle size={16} />
                            )}
                          </button>
                        </td>

                        {/* Title & Tags */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`font-semibold text-slate-900 dark:text-white ${
                                isDone ? "line-through text-slate-400 dark:text-slate-500" : ""
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {task.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTag((prev) =>
                                        prev?.toLowerCase() === tag.toLowerCase() ? null : tag
                                      );
                                    }}
                                    className={`text-[10px] px-1.5 py-0.2 rounded font-medium cursor-pointer transition ${
                                      selectedTag?.toLowerCase() === tag.toLowerCase()
                                        ? "bg-emerald-500 text-slate-950 font-bold"
                                        : "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-500"
                                    }`}
                                    title={t("tasks.filterByTag", { tag })}
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* In-place Status Selector */}
                        <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={task.statusId}
                            onChange={(e) => {
                              onUpsertTask({ ...task, statusId: e.target.value });
                            }}
                            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer text-slate-800 dark:text-slate-100"
                            style={{ borderLeftColor: status?.color, borderLeftWidth: "4px" }}
                          >
                            {sortedStatuses.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* In-place Priority Selector */}
                        <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={task.priority}
                            onChange={(e) => {
                              onUpsertTask({ ...task, priority: e.target.value as TaskPriority });
                            }}
                            className={`w-full border rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${priorityInfo.bg}`}
                          >
                            <option value="low">{t("tasks.priorityLow")}</option>
                            <option value="medium">{t("tasks.priorityMedium")}</option>
                            <option value="high">{t("tasks.priorityHigh")}</option>
                            <option value="urgent">{t("tasks.priorityUrgent")}</option>
                          </select>
                        </td>

                        {/* Assignee */}
                        <td className="py-2.5 px-3 hidden sm:table-cell">
                          {task.assignee ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs">
                              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-bold flex items-center justify-center">
                                {task.assignee.charAt(0).toUpperCase()}
                              </span>
                              <span className="truncate max-w-[100px]">{task.assignee}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              {t("tasks.unassigned")}
                            </span>
                          )}
                        </td>

                        {/* Due Date */}
                        <td className="py-2.5 px-3 hidden md:table-cell">
                          {dueInfo ? (
                            <span
                              className={`inline-flex items-center gap-1 text-xs ${
                                dueInfo.isOverdue
                                  ? "text-red-600 dark:text-red-400 font-bold"
                                  : dueInfo.isDueToday
                                  ? "text-amber-600 dark:text-amber-400 font-bold"
                                  : "text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              <Calendar size={12} />
                              <span>{dueInfo.formatted}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditTaskModal(task)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title={t("tasks.details")}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(t("tasks.deleteTaskConfirm"))) {
                                  onDeleteTask(task.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title={t("tasks.deleteTask")}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* JIRA-STYLE TASK DETAIL MODAL ("Ficha de Tarea") */}
      {isDetailModalOpen && selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isNew={isEditingNew}
          taskStatuses={sortedStatuses}
          members={members}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedTask(null);
          }}
          onSave={(updatedTask) => {
            onUpsertTask(updatedTask);
            setIsDetailModalOpen(false);
            setSelectedTask(null);
          }}
          onDelete={(taskId) => {
            onDeleteTask(taskId);
            setIsDetailModalOpen(false);
            setSelectedTask(null);
          }}
        />
      )}

      {/* MANAGE COLUMNS & STATUSES MODAL */}
      {isColumnModalOpen && (
        <ColumnManagerModal
          taskStatuses={sortedStatuses}
          tasks={tasks}
          onClose={() => setIsColumnModalOpen(false)}
          onUpsertStatus={onUpsertTaskStatus}
          onDeleteStatus={onDeleteTaskStatus}
        />
      )}

      {/* Floating Ghost Drag Item Preview (Pointer Events) */}
      {activeDragItem && (
        <div
          ref={ghostRef}
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            transform: `translate3d(${activeDragItem.initialX}px, ${activeDragItem.initialY}px, 0) translate(-50%, -50%) rotate(2.5deg)`,
            pointerEvents: "none",
            zIndex: 99999,
          }}
          className="w-64 p-3 rounded-2xl border-2 border-emerald-500 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl ring-4 ring-emerald-500/30 text-slate-900 dark:text-white flex flex-col gap-1.5 select-none"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold truncate">
            <span>{activeDragItem.type === "note" ? "📄" : "📌"}</span>
            <span className="truncate">{activeDragItem.title}</span>
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <span>
              {activeDropStatusId
                ? `✓ ${t("tasks.moveTo")} ${statusMap.get(activeDropStatusId)?.name || ""}`
                : t("tasks.dragToReorder") || "Arrastra a una columna"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ========================================================================= */
/* 1. JIRA-STYLE TASK DETAIL MODAL COMPONENT ("Ficha de Tarea")             */
/* ========================================================================= */

interface TaskDetailModalProps {
  task: Task;
  isNew: boolean;
  taskStatuses: TaskStatus[];
  members: FamilyMember[];
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isNew,
  taskStatuses,
  members,
  onClose,
  onSave,
  onDelete,
}) => {
  const { t } = useTranslation();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [statusId, setStatusId] = useState(task.statusId || taskStatuses[0]?.id || "todo");
  const [priority, setPriority] = useState<TaskPriority>(task.priority || "medium");
  const [assignee, setAssignee] = useState(task.assignee || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [tags, setTags] = useState<string[]>(task.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [descTab, setDescTab] = useState<"edit" | "preview">("edit");
  const isBackdropMouseDownRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, "");
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDownTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      e.preventDefault();
      setTags(tags.slice(0, -1));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      ...task,
      title: title.trim(),
      description: description.trim(),
      statusId,
      priority,
      assignee: assignee.trim() ? assignee.trim() : null,
      dueDate: dueDate || null,
      tags,
    });
  };

  const currentStatus = taskStatuses.find((s) => s.id === statusId);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start sm:items-center overflow-y-auto p-2 sm:p-4"
      onMouseDown={(e) => {
        isBackdropMouseDownRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && isBackdropMouseDownRef.current) {
          onClose();
        }
        isBackdropMouseDownRef.current = false;
      }}
      onKeyDown={(e) => {
        if (e.key === "Delete" || e.key === "Backspace") {
          e.stopPropagation();
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Delete" || e.key === "Backspace") {
            e.stopPropagation();
          }
        }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-[96vw] max-w-3xl max-h-[calc(100%-1rem)] sm:max-h-[calc(100%-2rem)] my-auto shrink-0 flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-white"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: currentStatus?.color || "#64748b" }}
            />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isNew ? t("tasks.newTask") : t("tasks.editTask")}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Two columns layout on tablet/desktop */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
          {/* Title Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t("tasks.taskTitlePlaceholder")} *
            </label>
            <input
              type="text"
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("tasks.taskTitlePlaceholder")}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          {/* Jira-style Grid: Status, Priority, Assignee, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
            {/* Status (Column) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {t("tasks.statusLabel")}
              </label>
              <select
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {taskStatuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isCompleted ? `(${t("tasks.completed")})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {t("tasks.priorityLabel")}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="low">{t("tasks.priorityLow")} 🟢</option>
                <option value="medium">{t("tasks.priorityMedium")} 🔵</option>
                <option value="high">{t("tasks.priorityHigh")} 🟠</option>
                <option value="urgent">{t("tasks.priorityUrgent")} 🔴</option>
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {t("tasks.assigneeLabel")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  list="family-members-datalist"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder={t("tasks.assigneePlaceholder")}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <datalist id="family-members-datalist">
                  {members.map((m) => (
                    <option key={m.id} value={m.name} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {t("tasks.dueDateLabel")}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Tags Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t("tasks.tagsLabel")}
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl min-h-[42px]">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs rounded-md shadow-xs font-medium"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDownTag}
                placeholder={tags.length === 0 ? t("tasks.addTagPlaceholder") : "+ tag..."}
                className="flex-1 min-w-[100px] bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Description Field (with Markdown & Preview Tabs) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("tasks.descriptionTab")} (Markdown)
              </label>
              <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setDescTab("edit")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                    descTab === "edit"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <FileText size={12} />
                  <span>{t("tasks.descriptionTab")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDescTab("preview")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                    descTab === "preview"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Eye size={12} />
                  <span>{t("tasks.previewTab")}</span>
                </button>
              </div>
            </div>

            {descTab === "edit" ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder={t("tasks.taskDescPlaceholder")}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs leading-relaxed text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition font-mono"
              />
            ) : (
              <div className="w-full min-h-[140px] max-h-[260px] overflow-y-auto px-3 py-2.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl">
                {description.trim() ? (
                  <MarkdownContent content={description} />
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    {t("tasks.taskDescPlaceholder")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Timestamps if editing */}
          {!isNew && (task.createdAt || task.updatedAt) && (
            <div className="text-[11px] text-slate-400 dark:text-slate-500 flex flex-wrap gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              {task.createdAt && (
                <span>
                  {t("tasks.createdAt")}: {new Date(task.createdAt).toLocaleString()}
                </span>
              )}
              {task.updatedAt && (
                <span>
                  {t("tasks.updatedAt")}: {new Date(task.updatedAt).toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            {!isNew && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(t("tasks.deleteTaskConfirm"))) {
                    onDelete(task.id);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
              >
                <Trash2 size={14} />
                <span>{t("tasks.deleteTask")}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
            >
              {t("tasks.saveTask")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

/* ========================================================================= */
/* 2. COLUMN & STATUS MANAGER MODAL COMPONENT                               */
/* ========================================================================= */

interface ColumnManagerModalProps {
  taskStatuses: TaskStatus[];
  tasks: Task[];
  onClose: () => void;
  onUpsertStatus: (status: TaskStatus) => void;
  onDeleteStatus: (statusId: string, fallbackStatusId?: string) => void;
}

const ColumnManagerModal: React.FC<ColumnManagerModalProps> = ({
  taskStatuses,
  tasks,
  onClose,
  onUpsertStatus,
  onDeleteStatus,
}) => {
  const { t } = useTranslation();

  // Add / Edit Column Form State
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [isCompleted, setIsCompleted] = useState(false);

  // Status deletion fallback prompt state
  const [statusToDelete, setStatusToDelete] = useState<TaskStatus | null>(null);
  const [fallbackStatusId, setFallbackStatusId] = useState<string>("");
  const isBackdropMouseDownRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (statusToDelete) {
          setStatusToDelete(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [statusToDelete, onClose]);

  const handleStartAdd = () => {
    setEditingStatusId("new");
    setName("");
    setColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
    setIsCompleted(false);
  };

  const handleStartEdit = (status: TaskStatus) => {
    setEditingStatusId(status.id);
    setName(status.name);
    setColor(status.color);
    setIsCompleted(status.isCompleted);
  };

  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingStatusId === "new") {
      const maxOrder = taskStatuses.reduce((acc, s) => Math.max(acc, s.order), 0);
      onUpsertStatus({
        id: "",
        name: name.trim(),
        color,
        order: maxOrder + 1,
        isCompleted,
      });
    } else if (editingStatusId) {
      const existing = taskStatuses.find((s) => s.id === editingStatusId);
      if (existing) {
        onUpsertStatus({
          ...existing,
          name: name.trim(),
          color,
          isCompleted,
        });
      }
    }

    setEditingStatusId(null);
  };

  const handleMoveOrder = (status: TaskStatus, direction: "up" | "down") => {
    const idx = taskStatuses.findIndex((s) => s.id === status.id);
    if (idx === -1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= taskStatuses.length) return;

    const targetStatus = taskStatuses[targetIdx];
    const oldOrder = status.order;
    const newOrder = targetStatus.order;

    onUpsertStatus({ ...status, order: newOrder });
    onUpsertStatus({ ...targetStatus, order: oldOrder });
  };

  const handleInitiateDelete = (status: TaskStatus) => {
    if (taskStatuses.length <= 1) {
      alert(t("tasks.noFallbackAvailable"));
      return;
    }

    const tasksInColumn = tasks.filter((task) => task.statusId === status.id);
    if (tasksInColumn.length > 0) {
      // Prompt for fallback
      const otherStatus = taskStatuses.find((s) => s.id !== status.id);
      setFallbackStatusId(otherStatus?.id || "");
      setStatusToDelete(status);
    } else {
      if (confirm(t("tasks.deleteColumnConfirm", { name: status.name }))) {
        onDeleteStatus(status.id);
      }
    }
  };

  const handleConfirmDeleteWithFallback = () => {
    if (!statusToDelete || !fallbackStatusId) return;
    onDeleteStatus(statusToDelete.id, fallbackStatusId);
    setStatusToDelete(null);
    setFallbackStatusId("");
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start sm:items-center overflow-y-auto p-2 sm:p-4"
      onMouseDown={(e) => {
        isBackdropMouseDownRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && isBackdropMouseDownRef.current) {
          onClose();
        }
        isBackdropMouseDownRef.current = false;
      }}
      onKeyDown={(e) => {
        if (e.key === "Delete" || e.key === "Backspace") {
          e.stopPropagation();
        }
      }}
    >
      <div
        onKeyDown={(e) => {
          if (e.key === "Delete" || e.key === "Backspace") {
            e.stopPropagation();
          }
        }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-[96vw] max-w-xl max-h-[calc(100%-1rem)] sm:max-h-[calc(100%-2rem)] my-auto shrink-0 flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-emerald-500" />
              <span>{t("tasks.manageColumnsTitle")}</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {t("tasks.manageColumnsDesc")}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
          {/* Fallback Warning Submodal if Deleting column with active tasks */}
          {statusToDelete && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    {t("tasks.deleteColumnConfirm", { name: statusToDelete.name })}
                  </h4>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                    {t("tasks.deleteColumnWarning", {
                      count: tasks.filter((t) => t.statusId === statusToDelete.id).length,
                    })}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("tasks.fallbackColumnLabel")}
                </label>
                <select
                  value={fallbackStatusId}
                  onChange={(e) => setFallbackStatusId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                >
                  {taskStatuses
                    .filter((s) => s.id !== statusToDelete.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStatusToDelete(null)}
                  className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteWithFallback}
                  className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-500 transition"
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
          )}

          {/* Form when adding or editing a column */}
          {editingStatusId ? (
            <form onSubmit={handleSaveStatus} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {editingStatusId === "new" ? t("tasks.addColumn") : t("tasks.editColumn")}
              </h4>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {t("tasks.columnName")} *
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("tasks.columnNamePlaceholder")}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Color Palette */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {t("tasks.columnColor")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition flex items-center justify-center cursor-pointer ${
                        color === c ? "ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900 scale-110" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check size={12} className="text-white drop-shadow-sm" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Completed Status Checkbox */}
              <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/60 dark:hover:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCompleted}
                  onChange={(e) => setIsCompleted(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                    {t("tasks.isCompletedColumn")}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t("tasks.isCompletedColumnDesc")}
                  </span>
                </div>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStatusId(null)}
                  className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition cursor-pointer"
                >
                  {t("common.save")}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleStartAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
              >
                <Plus size={14} />
                <span>{t("tasks.addColumn")}</span>
              </button>
            </div>
          )}

          {/* List of Existing Columns */}
          <div className="space-y-2">
            {taskStatuses.map((status, idx) => {
              const taskCount = tasks.filter((t) => t.statusId === status.id).length;

              return (
                <div
                  key={status.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: status.color || "#64748b" }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {status.name}
                        </span>
                        {status.isCompleted && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30">
                            {t("tasks.completed")}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t("tasks.totalTasks", { count: taskCount })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveOrder(status, "up")}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Move up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === taskStatuses.length - 1}
                      onClick={() => handleMoveOrder(status, "down")}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Move down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(status)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                      title={t("tasks.editColumn")}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={taskStatuses.length <= 1}
                      onClick={() => handleInitiateDelete(status)}
                      className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title={t("tasks.deleteColumn")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
};
