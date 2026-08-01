"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, StickyNote, Maximize2 } from "lucide-react";

const STORE_KEY = "sabar-plan-notes";

/** Sticky-note colours — background / border / text tuned for the dark canvas. */
const COLORS = [
  { key: "amber",  bg: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.45)", dot: "#F59E0B" },
  { key: "green",  bg: "rgba(34,197,94,0.13)",  border: "rgba(34,197,94,0.45)",  dot: "#22C55E" },
  { key: "red",    bg: "rgba(239,68,68,0.13)",  border: "rgba(239,68,68,0.45)",  dot: "#EF4444" },
  { key: "cyan",   bg: "rgba(106,236,225,0.12)",border: "rgba(106,236,225,0.4)", dot: "#6AECE1" },
  { key: "violet", bg: "rgba(167,139,250,0.13)",border: "rgba(167,139,250,0.45)",dot: "#A78BFA" },
] as const;

type ColorKey = typeof COLORS[number]["key"];
const colorOf = (k: ColorKey) => COLORS.find(c => c.key === k) ?? COLORS[0];

interface Note {
  id: string;
  text: string;
  x: number;
  y: number;
  color: ColorKey;
}

const NOTE_W = 210;
const NOTE_H = 150;

export default function PlanPage() {
  const [notes, setNotes]   = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  // Which note is being dragged, and the grab offset inside it
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setNotes(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  const persist = useCallback((next: Note[]) => {
    setNotes(next);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const addNote = () => {
    // Stagger new notes so they don't stack exactly on top of each other
    const n = notes.length;
    const note: Note = {
      id: `note-${Date.now()}`,
      text: "",
      x: 40 + (n % 5) * 40,
      y: 40 + (n % 5) * 30,
      color: COLORS[n % COLORS.length].key,
    };
    persist([...notes, note]);
    setEditing(note.id);
  };

  const updateNote = (id: string, patch: Partial<Note>) =>
    persist(notes.map(n => (n.id === id ? { ...n, ...patch } : n)));

  const removeNote = (id: string) => {
    persist(notes.filter(n => n.id !== id));
    if (editing === id) setEditing(null);
  };

  /* ── drag to move ── */
  const startDrag = (e: React.PointerEvent, note: Note) => {
    if (editing === note.id) return;            // don't drag while typing
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = canvasRef.current?.getBoundingClientRect();
    drag.current = {
      id: note.id,
      dx: e.clientX - (rect?.left ?? 0) - note.x,
      dy: e.clientY - (rect?.top ?? 0) - note.y,
    };
  };

  const onDragMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    const x = Math.max(0, e.clientX - (rect?.left ?? 0) - d.dx);
    const y = Math.max(0, e.clientY - (rect?.top ?? 0) - d.dy);
    setNotes(prev => prev.map(n => (n.id === d.id ? { ...n, x, y } : n)));
  };

  const endDrag = () => {
    if (drag.current) {
      drag.current = null;
      persist(notes);   // commit the final position
    }
  };

  if (!loaded) return null;

  return (
    <div className="max-w-5xl mx-auto p-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)" }}>
            <StickyNote size={19} style={{ color: "#F59E0B" }} />
          </div>
          <div>
            <h1 className="font-sans font-bold text-white text-lg">Plan</h1>
            <p className="font-sans text-xs" style={{ color: "#8A8A8A" }}>
              Visual canvas for setups, ideas and strategy notes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={addNote}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-sans text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: "#EF4444", boxShadow: "0 0 14px 2px rgba(239,68,68,0.35)" }}>
            <Plus size={15} strokeWidth={3} /> New Note
          </button>
          <Link href="/history"
            className="flex items-center gap-1.5 text-xs font-mono text-[#444] hover:text-white transition-colors ml-1">
            <ArrowLeft size={13} /> Back to Journal
          </Link>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative rounded-2xl overflow-hidden select-none"
        style={{
          minHeight: 560,
          border: "1px solid #262626",
          background:
            "linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)," +
            "rgba(12,12,12,0.6)",
          backgroundSize: "28px 28px, 28px 28px, auto",
        }}
      >
        {notes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <Maximize2 size={26} style={{ color: "#333" }} />
            <p className="font-sans text-sm" style={{ color: "#666" }}>Your canvas is empty</p>
            <p className="font-sans text-xs" style={{ color: "#444" }}>
              Hit <span style={{ color: "#EF4444" }}>+ New Note</span> to start planning
            </p>
          </div>
        )}

        {notes.map(note => {
          const c = colorOf(note.color);
          const isEditing = editing === note.id;
          return (
            <div
              key={note.id}
              onPointerDown={e => startDrag(e, note)}
              onDoubleClick={() => setEditing(note.id)}
              className="absolute group rounded-xl p-3 flex flex-col"
              style={{
                left: note.x,
                top: note.y,
                width: NOTE_W,
                minHeight: NOTE_H,
                background: c.bg,
                border: `1px solid ${c.border}`,
                cursor: isEditing ? "text" : "grab",
                boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
              }}
            >
              {/* colour swatches + delete */}
              <div className="flex items-center justify-between mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1">
                  {COLORS.map(col => (
                    <button key={col.key}
                      onPointerDown={e => e.stopPropagation()}
                      onClick={() => updateNote(note.id, { color: col.key })}
                      title={col.key}
                      className="w-3 h-3 rounded-full transition-transform hover:scale-125"
                      style={{
                        background: col.dot,
                        outline: note.color === col.key ? `2px solid ${col.dot}66` : "none",
                        outlineOffset: 1,
                      }} />
                  ))}
                </div>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => removeNote(note.id)}
                  title="Delete note"
                  className="text-[#888] hover:text-[#EF4444] transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>

              {isEditing ? (
                <textarea
                  autoFocus
                  value={note.text}
                  onPointerDown={e => e.stopPropagation()}
                  onChange={e => updateNote(note.id, { text: e.target.value })}
                  onBlur={() => setEditing(null)}
                  placeholder="Write your idea…"
                  className="flex-1 w-full bg-transparent font-sans text-sm text-white placeholder-[#777] focus:outline-none resize-none leading-snug"
                />
              ) : (
                <p
                  onClick={() => setEditing(note.id)}
                  className="flex-1 font-sans text-sm whitespace-pre-wrap leading-snug cursor-text"
                  style={{ color: note.text ? "#fff" : "#777" }}>
                  {note.text || "Click to write…"}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="font-sans text-xs mt-3" style={{ color: "#555" }}>
        Drag a note to move it · click to write · hover for colours and delete
      </p>
    </div>
  );
}
