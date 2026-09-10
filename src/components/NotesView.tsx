import React, { useState } from "react";
import { Plus, Trash2, Pin, Search } from "lucide-react";
import { Note } from "../types";

interface NotesViewProps {
  notes: Note[];
  onSaveNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  onSaveNote,
  onDeleteNote,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredNotes = [...notes]
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-4">
      {/* Top Search & Add Bar */}
      <div className="flex items-center gap-3 shrink-0">
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

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs transition shrink-0 shadow-md shadow-emerald-500/20"
        >
          <Plus size={16} />
          <span>Nueva Nota</span>
        </button>
      </div>

      {/* NOTES GRID */}
      <div className="flex-1 overflow-y-auto">
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
                        onDeleteNote(note.id);
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

      {/* EDIT / CREATE MODAL */}
      {isModalOpen && editingNote && (
        <div className="fixed inset-0 bg-slate-950 md:bg-black/60 md:backdrop-blur-sm z-50 flex items-center justify-center md:p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-slate-900 md:border border-slate-800 md:rounded-2xl p-5 max-w-lg w-full h-full md:h-auto flex flex-col space-y-4 md:shadow-2xl"
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

            <div className="flex-1 flex flex-col min-h-0">
              <label className="text-[11px] text-slate-400 font-bold block mb-1">
                Contenido
              </label>
              <textarea
                placeholder="Escribe aquí las ideas, recetas o datos para la familia..."
                value={editingNote.content}
                onChange={(e) =>
                  setEditingNote({ ...editingNote, content: e.target.value })
                }
                className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500 font-mono resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
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
