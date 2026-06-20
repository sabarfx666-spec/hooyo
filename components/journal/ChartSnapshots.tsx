"use client";
import { useState, useRef, useCallback } from "react";
import { Camera, Upload, Settings2, Clipboard } from "lucide-react";
import { cn } from "@/lib/utils";

const SLOTS = [
  { id: "weekly", label: "Weekly Proof", sub: "1W" },
  { id: "daily",  label: "Daily Proof",  sub: "1D" },
  { id: "4h",     label: "4H Proof",     sub: "4H" },
  { id: "entry",  label: "Entry Proof",  sub: "5m/15m" },
  { id: "after",  label: "After",        sub: "TP/SL Result" },
];

function Slot({
  slot,
  image,
  onChange,
}: {
  slot: { id: string; label: string; sub: string };
  image: string | null;
  onChange: (url: string | null) => void;
}) {
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  };

  return (
    <div
      tabIndex={0}
      onPaste={handlePaste}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !image && fileRef.current?.click()}
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-all duration-150 outline-none",
        dragOver
          ? "border-[#FF3B3B] bg-[#FF3B3B]/5"
          : "border-[#2A2A2A] hover:border-[#FF3B3B]/50 focus:border-[#FF3B3B]/50",
        !image && "cursor-pointer"
      )}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ""; }}
      />

      {image ? (
        <div className="relative p-1">
          <img src={image} alt={slot.label} className="w-full h-36 object-cover rounded-lg" />
          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
            <span className="font-sans text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
              {slot.label}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="text-[10px] font-mono text-white bg-black/60 hover:bg-[#FF3B3B] px-1.5 py-0.5 rounded transition-colors"
            >
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
          <button
            onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
            className="flex items-center gap-1 text-[11px] font-sans mt-0.5 hover:opacity-70 transition-opacity"
            style={{ color: "#FF3B3B" }}
          >
            <Upload size={11} /> Upload file
          </button>
        </div>
      )}
    </div>
  );
}

export function ChartSnapshots() {
  const [images, setImages] = useState<Record<string, string | null>>(
    Object.fromEntries(SLOTS.map((s) => [s.id, null]))
  );

  return (
    <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Camera size={18} strokeWidth={2} style={{ color: "#FF3B3B" }} />
          <h3 className="font-sans font-bold text-white text-base">Proof / Chart Snapshots</h3>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2A2A2A] text-xs font-sans text-[#A0A0A0] hover:text-white hover:border-[#444] transition-all">
          <Settings2 size={13} /> Manage Slots
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {SLOTS.map((slot) => (
          <Slot
            key={slot.id}
            slot={slot}
            image={images[slot.id]}
            onChange={(url) => setImages((prev) => ({ ...prev, [slot.id]: url }))}
          />
        ))}
      </div>
    </div>
  );
}
