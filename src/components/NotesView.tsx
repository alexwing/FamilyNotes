import React, { useState } from "react";
import { Plus, Trash2, Pin, Search, Archive, ArchiveRestore } from "lucide-react";
import { Note } from "../types";

interface NotesViewProps {
  notes: Note[];
  onSaveNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onArchiveNote?: (id: string) => void;
  onUnarchiveNote?: (id: string) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  onSaveNote,
  onDeleteNote,
  onArchiveNote,
  onUnarchiveNote,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingDeleteNote, setPendingDeleteNote] = useState<Note | null>(null);
  const [lastDeletedNote, setLastDeletedNote] = useState<Note | null>(null);

  const activeNotes = notes.filter((n) => !n.archived);
  const archivedNotes = notes.filter((n) => !!n.archived);

  const filteredNotes = activeNotes
    .filter(
      (n) =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (a.pinned === b.pinned) {
        // Sort by updatedAt descending if both are pinned or both unpinned
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      }
      return a.pinned ? -1 : 1;
    });

  const filteredArchivedNotes = archivedNotes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingNote({
      id: "",
      title: "",
      content: "",
      color: "#10b981",
      pinned: false,
      createdAt: "",
      updatedAt: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (note: Note) => {
    setEditingNote(note);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editingNote.title.trim()) return;
    onSaveNote(editingNote);
    setIsModalOpen(false);
    setEditingNote(null);
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

  return (
    <div className="flex-1 flex flex-col overflow-y-auto min-h-0 max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-4">
      {/* Top Search & Add Bar */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-3 py-2 text-xs">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar en notas familiares..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-white placeholder-slate-500 outline-none"
          />
        </div>

        {/* Botón no destacado para desplegar archivadas */}
        {archivedNotes.length > 0 && (
          <button
            type="button"
            onClick={() => setShowArchived((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold transition border cursor-pointer shrink-0 ${
              showArchived
                ? "bg-slate-800 text-amber-300 border-amber-500/40"
                : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-300 hover:border-slate-700"
            }`}
            title="Desplegar notas archivadas"
          >
            <Archive size={14} />
            <span className="hidden sm:inline">Archivadas</span>
            <span className="text-[10px] opacity-75">({archivedNotes.length})</span>
          </button>
        )}

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs transition shrink-0 shadow-md shadow-emerald-500/20 cursor-pointer"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nueva Nota</span>
        </button>
      </div>

      {/* NOTES GRID */}
      <div>
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm">No se encontraron notas familiares.</p>
            <button
              onClick={handleOpenCreate}
              className="mt-3 text-xs text-emerald-400 hover:underline"
            >
              + Crear una nota
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => handleOpenEdit(note)}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition shadow-sm group relative cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-bold text-white text-sm tracking-tight line-clamp-1">
                      {note.title}
                    </h4>
                    {note.pinned && (
                      <Pin size={14} className="text-amber-400 fill-amber-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap line-clamp-6 font-normal">
                    {note.content}
                  </p>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
                  <div className="flex items-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDeleteNote(note);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-400"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ARCHIVED NOTES SECTION (UNFOLDED VIA BUTTON) */}
      {showArchived && archivedNotes.length > 0 && (
        <div className="p-3.5 sm:p-4 bg-slate-900/50 border border-amber-500/20 rounded-2xl space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Archive size={15} className="text-amber-400" />
              <h3 className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                Notas Archivadas ({archivedNotes.length})
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Solo lectura: desarchivar o eliminar</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredArchivedNotes.map((note) => (
              <div
                key={note.id}
                className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-sm select-none"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-bold text-slate-300 text-sm tracking-tight line-clamp-1">
                      {note.title}
                    </h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                      Archivada
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 whitespace-pre-wrap line-clamp-5 font-normal">
                    {note.content}
                  </p>
                </div>

                {/* Solo desarchivar o eliminar - NO EDITAR */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  {onUnarchiveNote && (
                    <button
                      type="button"
                      onClick={() => onUnarchiveNote(note.id)}
                      className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold text-[11px] transition cursor-pointer"
                    >
                      <ArchiveRestore size={13} />
                      <span>Desarchivar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPendingDeleteNote(note)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer ml-auto"
                    title="Eliminar definitivamente"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {lastDeletedNote && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100%-2rem)] rounded-2xl border border-amber-500/30 bg-slate-900/95 p-3 shadow-2xl shadow-amber-950/30 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-400">
                Nota eliminada
              </p>
              <p className="mt-1 text-xs text-slate-300 line-clamp-2">
                {lastDeletedNote.title || "Sin título"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLastDeletedNote(null)}
              className="text-[10px] text-slate-400 hover:text-white"
            >
              Cerrar
            </button>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setLastDeletedNote(null)}
              className="px-3 py-1.5 rounded-xl text-[11px] text-slate-300 hover:text-white"
            >
              Ignorar
            </button>
            <button
              type="button"
              onClick={handleRestoreDeletedNote}
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-[11px] hover:bg-amber-400"
            >
              Recuperar
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE OR ARCHIVE DIALOGUE */}
      {pendingDeleteNote && (
        <div className="fixed inset-0 bg-slate-950/80 md:bg-black/60 md:backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-400">
                {pendingDeleteNote.archived ? "Eliminar nota archivada" : "Eliminar o archivar nota"}
              </p>
              <h3 className="mt-2 text-sm font-bold text-white">
                ¿Qué deseas hacer con "{pendingDeleteNote.title || "esta nota"}"?
              </h3>
              <p className="mt-2 text-xs text-slate-400">
                {pendingDeleteNote.archived
                  ? "Esta nota ya está archivada. Se borrará permanentemente de tu bóveda."
                  : "Puedes archivarla para ocultarla de la lista principal sin perder su información, o eliminarla definitivamente."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteNote(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white order-last sm:order-first"
              >
                Cancelar
              </button>

              {!pendingDeleteNote.archived && onArchiveNote && (
                <button
                  type="button"
                  onClick={() => {
                    onArchiveNote(pendingDeleteNote.id);
                    setPendingDeleteNote(null);
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  <Archive size={14} />
                  <span>Archivar</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDeleteConfirmed}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Eliminar definitivamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT / CREATE MODAL */}
      {isModalOpen && editingNote && (
        <div className="fixed inset-0 bg-slate-950 md:bg-black/60 md:backdrop-blur-sm z-50 flex items-center justify-center md:p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-slate-900 md:border border-slate-800 md:rounded-2xl p-5 w-[95vw] max-w-3xl md:max-w-4xl lg:max-w-5xl h-[92vh] md:h-[85vh] flex flex-col gap-3 md:shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-white">
                {editingNote.id ? "Editar Nota" : "Nueva Nota"}
              </h3>
              <button
                type="button"
                onClick={() =>
                  setEditingNote({
                    ...editingNote,
                    pinned: !editingNote.pinned,
                  })
                }
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                  editingNote.pinned
                    ? "bg-amber-400/10 border-amber-400/30 text-amber-300"
                    : "border-slate-800 text-slate-400"
                }`}
              >
                <Pin size={13} />
                <span>{editingNote.pinned ? "Fijada" : "Fijar"}</span>
              </button>
            </div>

            <div className="shrink-0">
              <label className="text-[11px] text-slate-400 font-bold block mb-1">
                Título
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Título de la nota..."
                value={editingNote.title}
                onChange={(e) =>
                  setEditingNote({ ...editingNote, title: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex-1 flex flex-col min-h-0 pb-1">
              <label className="text-[11px] text-slate-400 font-bold block mb-2">
                Contenido
              </label>
              <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950 p-2 mb-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all">
                <textarea
                  placeholder="Escribe aquí las ideas, recetas o datos para la familia..."
                  value={editingNote.content}
                  onChange={(e) =>
                    setEditingNote({ ...editingNote, content: e.target.value })
                  }
                  className="flex-1 w-full min-h-[260px] bg-transparent text-xs text-white font-mono resize-none border-0 outline-none p-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 shrink-0 border-t border-slate-800/80 bg-slate-900 mt-1 pb-1">
              {editingNote.id && onArchiveNote && (
                <button
                  type="button"
                  onClick={() => {
                    onArchiveNote(editingNote.id);
                    setIsModalOpen(false);
                    setEditingNote(null);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs text-amber-300 hover:bg-amber-500/10 border border-amber-500/25 font-semibold flex items-center gap-1.5 mr-auto cursor-pointer"
                >
                  <Archive size={13} />
                  <span>Archivar nota</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Guardar Nota
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
