"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, Settings2, Clipboard, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_IMAGES = "sabar-proof-images";
const STORAGE_SLOTS  = "sabar-proof-slots";

const DEFAULT_SLOTS = [
  { id: "weekly", label: "Weekly Proof", sub: "1W" },
  { id: "daily",  label: "Daily Proof",  sub: "1D" },
  { id: "4h",     label: "4H Proof",     sub: "4H" },
  { id: "entry",  label: "Entry Proof",  sub: "5m/15m" },
  { id: "after",  label: "After",        sub: "TP/SL Result" },
];

type Slot = { id: string; label: string; sub: string };

function SlotCard({ slot, image, onChange }: { slot: Slot; image: string | null; onChange: (url: string | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const readFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (item) { const f = item.getAsFile(); if (f) readFile(f); }
  }, []);

  return (
    <div
      tabIndex={0}
      onPaste={handlePaste}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) readFile(f); }}
      onClick={() => !image && fileRef.current?.click()}
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-all duration-150 outline-none",
        dragOver ? "border-[#FF3B3B] bg-[#FF3B3B]/5"
                 : "border-[#2A2A2A] hover:border-[#FF3B3B]/50 focus:border-[#FF3B3B]/50",
        !image && "cursor-pointer"
      )}
    >
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ""; }} />

      {image ? (
        <div className="relative p-1">
          <img src={image} alt={slot.label} className="w-full h-36 object-cover rounded-lg" />
          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
            <span className="font-sans text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">{slot.label}</span>
            <button onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="text-[10px] font-mono text-white bg-black/60 hover:bg-[#FF3B3B] px-1.5 py-0.5 rounded transition-colors">
              ✕
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center gap-1.5 p-4 py-5">
          <Camera size={38} strokeWidth={1.5} style={{ color: "#FF3B3B" }} />
          <p className="font-sans font-bold text-white text-sm mt-1">{slot.label}</p>
          <p className="font-mono text-[11px]" style={{ color: "#555" }}>{slot.sub}</p>
          <div className="flex items-center gap-1 text-[11px] font-sans mt-2" style={{ color: "#444" }}>
            <Clipboard size={11} /> Click + Ctrl+V to paste
          </div>
          <p className="text-[11px] font-sans" style={{ color: "#444" }}>or drag &amp; drop</p>
          <button onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
            className="flex items-center gap-1 text-[11px] font-sans mt-0.5 hover:opacity-70 transition-opacity"
            style={{ color: "#FF3B3B" }}>
            <Upload size={11} /> Upload file
          </button>
        </div>
      )}
    </div>
  );
}

function ManageSlotsModal({ slots, onSave, onClose }: { slots: Slot[]; onSave: (s: Slot[]) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Slot[]>(slots.map(s => ({ ...s })));

  const update = (id: string, field: "label" | "sub", val: string) =>
    setDraft(d => d.map(s => s.id === id ? { ...s, [field]: val } : s));

  const addSlot = () => {
    const id = `slot-${Date.now()}`;
    setDraft(d => [...d, { id, label: "New Slot", sub: "" }]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md rounded-2xl p-5 space-y-4" style={{ background: "#111", border: "1px solid #2A2A2A" }}>
        <div className="flex items-center justify-between">
          <h3 className="font-sans font-bold text-white">Manage Slots</h3>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors"><X size={16} /></button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {draft.map((slot) => (
            <div key={slot.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input value={slot.label} onChange={e => update(slot.id, "label", e.target.value)}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 font-mono text-xs text-white focus:outline-none focus:border-[#FF3B3B]"
                  placeholder="Slot name" />
                <input value={slot.sub} onChange={e => update(slot.id, "sub", e.target.value)}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 font-mono text-xs text-[#A0A0A0] focus:outline-none focus:border-[#FF3B3B]"
                  placeholder="Subtitle" />
              </div>
              <button onClick={() => setDraft(d => d.filter(s => s.id !== slot.id))}
                className="p-1.5 rounded hover:bg-[#FF3B3B]/10 transition-colors" style={{ color: "#555" }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <button onClick={addSlot}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed font-mono text-xs transition-colors hover:border-[#FF3B3B]/50 hover:text-white"
          style={{ borderColor: "#2A2A2A", color: "#555" }}>
          <Plus size={13} /> Add Slot
        </button>

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg font-mono text-xs border transition-colors hover:border-[#444] hover:text-white"
            style={{ background: "#0D0D0D", border: "1px solid #2A2A2A", color: "#666" }}>
            Cancel
          </button>
          <button onClick={() => { onSave(draft); onClose(); }}
            className="flex-1 py-2 rounded-lg font-mono text-xs font-bold text-black transition-opacity hover:opacity-90"
            style={{ background: "#FF3B3B" }}>
            Save Slots
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChartSnapshots() {
  const [slots,  setSlots]  = useState<Slot[]>(DEFAULT_SLOTS);
  const [images, setImages] = useState<Record<string, string | null>>({});
  const [showManage, setShowManage] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const storedSlots = localStorage.getItem(STORAGE_SLOTS);
      if (storedSlots) setSlots(JSON.parse(storedSlots));
      const storedImgs = localStorage.getItem(STORAGE_IMAGES);
      if (storedImgs) setImages(JSON.parse(storedImgs));
    } catch {}
  }, []);

  const updateImage = (id: string, url: string | null) => {
    setImages(prev => {
      const next = { ...prev, [id]: url };
      try { localStorage.setItem(STORAGE_IMAGES, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const saveSlots = (newSlots: Slot[]) => {
    setSlots(newSlots);
    try { localStorage.setItem(STORAGE_SLOTS, JSON.stringify(newSlots)); } catch {}
  };

  if (!mounted) return null;

  return (
    <>
      <div className="rounded-xl p-5" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Camera size={18} strokeWidth={2} style={{ color: "#FF3B3B" }} />
            <h3 className="font-sans font-bold text-white text-base">Proof / Chart Snapshots</h3>
          </div>
          <button
            onClick={() => setShowManage(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs transition-all hover:border-[#444] hover:text-white"
            style={{ background: "#111", border: "1px solid #2A2A2A", color: "#A0A0A0" }}>
            <Settings2 size={13} /> Manage Slots
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {slots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              image={images[slot.id] ?? null}
              onChange={(url) => updateImage(slot.id, url)}
            />
          ))}
        </div>
      </div>

      {showManage && (
        <ManageSlotsModal slots={slots} onSave={saveSlots} onClose={() => setShowManage(false)} />
      )}
    </>
  );
}
