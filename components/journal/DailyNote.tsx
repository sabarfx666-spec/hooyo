"use client";
import { useState, useEffect } from "react";
import { FileText, X, Plus, Trash2 } from "lucide-react";
import { VoiceMic, appendNote } from "@/components/VoiceMic";
import { VoiceNote } from "@/components/VoiceNote";

const STORE_KEY = "sabar-daily-notes";
const RED = "#E53E3E";

interface Note {
  id: string;
  text: string;
}

/** Notes are kept per calendar day: { "2026-08-07": [ …notes ] }. */
type NotesByDay = Record<string, Note[]>;

const todayKey = () => new Date().toISOString().split("T")[0];

const prettyDate = (key: string) =>
  new Date(key + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

export function DailyNote() {
  const [open, setOpen]   = useState(false);
  const [byDay, setByDay] = useState<NotesByDay>({});
  const [loaded, setLoaded] = useState(false);

  const day   = todayKey();
  const notes = byDay[day] ?? [];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setByDay(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  const persist = (next: NotesByDay) => {
    setByDay(next);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch {}
  };

  const setNotes = (next: Note[]) => persist({ ...byDay, [day]: next });

  const addNote    = () => setNotes([...notes, { id: `n-${Date.now()}`, text: "" }]);
  const updateNote = (id: string, text: string) =>
    setNotes(notes.map(n => (n.id === id ? { ...n, text } : n)));
  const removeNote = (id: string) => setNotes(notes.filter(n => n.id !== id));

  if (!loaded) return null;

  return (
    <>
      {/* Left-edge trigger — sits directly below the calculator */}
      <button
        onClick={() => setOpen(true)}
        title="Daily Note"
        className="fixed left-0 z-40 flex items-center justify-center w-10 h-10 rounded-r-xl transition-all hover:w-12"
        style={{
          top: "calc(50% + 58px)",
          background: "rgba(229,62,62,0.15)",
          border: "1px solid rgba(229,62,62,0.4)",
          borderLeft: "none",
          boxShadow: "2px 0 12px rgba(229,62,62,0.2)",
        }}
      >
        <FileText size={18} style={{ color: RED }} />
        {notes.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center font-sans text-[9px] font-bold text-white"
            style={{ background: RED }}>
            {notes.length}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setOpen(false)} />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-300"
        style={{
          width: "min(400px, 88vw)",
          background: "#0A0A0A",
          borderRight: "1px solid #262626",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          boxShadow: open ? "8px 0 32px rgba(0,0,0,0.6)" : "none",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b" style={{ borderColor: "#1A1A1A" }}>
          <div className="flex items-center gap-2.5">
            <FileText size={18} style={{ color: RED }} />
            <div>
              <h3 className="font-sans font-bold text-white text-lg leading-none">Daily Note</h3>
              <p className="font-sans text-xs mt-1.5" style={{ color: "#8A8A8A" }}>{prettyDate(day)}</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)}
            className="text-[#666] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <button onClick={addNote}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-sans text-sm font-semibold transition-all hover:bg-white/5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #262626", color: "#D0D0D0" }}>
            <Plus size={16} /> Add Note
          </button>

          {notes.map((note, i) => (
            <div key={note.id} className="group rounded-xl p-3"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #262626" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-sans text-[11px]" style={{ color: "#666" }}>Note {i + 1}</span>
                <div className="flex items-center gap-2">
                  <VoiceMic label="Voice note"
                    onText={t => updateNote(note.id, appendNote(note.text, t))} />
                  <button onClick={() => removeNote(note.id)} title="Delete note"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[#666] hover:text-[#EF4444]">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <textarea
                autoFocus={!note.text}
                value={note.text}
                onChange={e => updateNote(note.id, e.target.value)}
                placeholder="Write your note…"
                rows={4}
                className="w-full bg-transparent font-sans text-sm text-white placeholder-[#555] focus:outline-none resize-none leading-relaxed"
              />
              <div className="mt-2">
                <VoiceNote fieldKey={`daily-${day}-${note.id}`} />
              </div>
            </div>
          ))}

          {notes.length === 0 && (
            <p className="font-sans text-xs text-center pt-6" style={{ color: "#555" }}>
              No notes for today yet.
            </p>
          )}
        </div>

        <p className="px-4 py-3 font-sans text-[11px] border-t" style={{ borderColor: "#1A1A1A", color: "#555" }}>
          Saved automatically · one page per day
        </p>
      </div>
    </>
  );
}
