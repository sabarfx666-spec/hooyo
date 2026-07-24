"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSabar } from "@/store/SabarContext";
import { Trade } from "@/store/types";
import { Camera, X, Upload, ZoomIn, ZoomOut, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { VoiceMic, appendNote } from "@/components/VoiceMic";
import { imgLoadTrade } from "@/lib/db";
import { getGrade } from "@/lib/utils";

type TF = "Weekly" | "Daily" | "4H" | "15M" | "5M" | "Result";

const TIMEFRAMES: { key: TF; label: string }[] = [
  { key: "Weekly", label: "1W" },
  { key: "Daily",  label: "1D" },
  { key: "4H",     label: "4H" },
  { key: "15M",    label: "15M" },
  { key: "5M",     label: "5M" },
  { key: "Result", label: "Result" },
];

const chartNotesKey = (id: string) => `sabar-chartnotes-${id}`;

function tradePct(t: Trade) {
  return t.totalRules > 0 ? Math.round((t.checkedCount / t.totalRules) * 100) : 0;
}

/**
 * Full chart-snapshot editor: timeframe tabs, upload/paste/drop per chart,
 * a note per chart, and Save All. Persists images to IndexedDB (via UPDATE_TRADE)
 * and per-chart notes to localStorage.
 */
export function ChartSnapshotPanel({ trade, onClose }: { trade: Trade; onClose: () => void }) {
  const { dispatch } = useSabar();
  const [proofs, setProofs]     = useState<Partial<Record<TF, string>>>(trade.chartProofs ?? {});
  const [tfNotes, setTfNotes]   = useState<Partial<Record<TF, string>>>({});
  const [activeTf, setActiveTf] = useState<TF>("Weekly");
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom]         = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);

  const openZoom = (src: string) => { setZoom(src); setZoomLevel(1); };

  // Load saved proofs (IndexedDB) + notes (localStorage) on open
  useEffect(() => {
    let alive = true;
    imgLoadTrade(trade.id).then(({ chartProofs }) => {
      if (alive && chartProofs && Object.keys(chartProofs).length) {
        setProofs(prev => ({ ...(chartProofs as Partial<Record<TF, string>>), ...prev }));
      }
    }).catch(() => {});
    try {
      const raw = localStorage.getItem(chartNotesKey(trade.id));
      if (raw) setTfNotes(JSON.parse(raw));
    } catch {}
    return () => { alive = false; };
  }, [trade.id]);

  // Paste anywhere while open
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => setProofs(p => ({ ...p, [activeTf]: ev.target?.result as string }));
      reader.readAsDataURL(file);
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [activeTf]);

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = ev => setProofs(p => ({ ...p, [activeTf]: ev.target?.result as string }));
    reader.readAsDataURL(file);
  }, [activeTf]);

  const saveAll = () => {
    dispatch({ type: "UPDATE_TRADE", payload: { id: trade.id, chartProofs: proofs as Trade["chartProofs"] } });
    try { localStorage.setItem(chartNotesKey(trade.id), JSON.stringify(tfNotes)); } catch {}
    onClose();
  };

  const g = getGrade(tradePct(trade));
  const tfLabel = TIMEFRAMES.find(t => t.key === activeTf)?.label;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="flex flex-col w-full max-w-[440px] h-full shadow-2xl anim-slide-right"
        style={{ background: "#0A0A0A", borderLeft: "1px solid #262626" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#1A1A1A" }}>
          <div className="flex items-center gap-2">
            <Camera size={16} style={{ color: "#EF4444" }} />
            <span className="font-sans font-bold text-white text-sm">Chart Snapshots</span>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold"
              style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}>{trade.pair}</span>
          </div>
          <button onClick={onClose} className="text-[#666] hover:text-white transition-colors"><X size={16} /></button>
        </div>

        {/* Meta */}
        <div className="px-5 py-3 border-b" style={{ borderColor: "#1A1A1A" }}>
          <p className="font-mono text-[10px] text-[#666]">
            {new Date(trade.date).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}
            {" • "}{trade.bias === "BEARISH" ? "Bearish" : "Bullish"}
            {" • "}{trade.session === "ASIAN" ? "Asian" : trade.session === "LONDON" ? "London" : "New York"}
          </p>
        </div>

        {/* Info grid */}
        <div className="px-5 py-3 border-b grid grid-cols-2 gap-2" style={{ borderColor: "#1A1A1A" }}>
          {[
            { label: "Outcome", value: trade.outcome ?? "—", color: trade.outcome === "WIN" ? "#22C55E" : trade.outcome === "LOSS" ? "#EF4444" : "#6AECE1" },
            { label: "Grade",   value: g.letter, color: g.color },
            { label: "Status",  value: trade.decision === "TAKE" ? "Taken" : "Skipped", color: "#fff" },
            { label: "Pair",    value: trade.pair, color: "#EF4444" },
          ].map(({ label, value, color }) => (
            <div key={label} className="px-3 py-2 rounded-lg" style={{ background: "#111", border: "1px solid #1A1A1A" }}>
              <p className="font-mono text-[9px] text-[#555] mb-0.5">{label}</p>
              <p className="font-mono text-xs font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Timeframe tabs */}
        <div className="flex gap-1 px-4 py-3 border-b overflow-x-auto" style={{ borderColor: "#1A1A1A" }}>
          {TIMEFRAMES.map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTf(key)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold transition-all"
              style={activeTf === key
                ? { background: "#EF4444", color: "#fff" }
                : { background: "#111", border: "1px solid #1A1A1A", color: proofs[key] ? "#fff" : "#555" }}>
              {label}
              {proofs[key] && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#22C55E" }} />}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <p className="font-sans text-xs font-bold text-white">
            {activeTf} <span className="text-[#555] font-normal">({tfLabel})</span>
          </p>

          {/* Drop zone */}
          <div
            className="relative rounded-xl overflow-hidden transition-all cursor-pointer"
            style={{ border: `2px dashed ${dragging ? "#EF4444" : "#262626"}`, background: "#0D0D0D", minHeight: 200 }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f); }}
            onClick={() => !proofs[activeTf] && fileRef.current?.click()}
          >
            {proofs[activeTf] ? (
              <div className="relative group">
                <img src={proofs[activeTf]} alt={activeTf} className="w-full object-contain rounded-xl" style={{ maxHeight: 280 }} />
                {/* Hover actions: zoom · replace · delete */}
                <div className="absolute inset-0 flex items-center justify-center gap-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "rgba(0,0,0,0.35)" }}>
                  <button title="Zoom" onClick={e => { e.stopPropagation(); openZoom(proofs[activeTf]!); }}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: "rgba(20,20,20,0.9)", border: "1px solid #333" }}>
                    <ZoomIn size={15} color="#fff" />
                  </button>
                  <button title="Replace" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: "rgba(20,20,20,0.9)", border: "1px solid #333" }}>
                    <RefreshCw size={15} color="#fff" />
                  </button>
                  <button title="Delete" onClick={e => { e.stopPropagation(); setProofs(p => { const n = { ...p }; delete n[activeTf]; return n; }); }}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: "#EF4444" }}>
                    <Trash2 size={15} color="#fff" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Camera size={28} style={{ color: "#2A2A2A" }} />
                <p className="font-sans font-bold text-xs text-white">{activeTf}</p>
                <p className="font-mono text-[10px] text-[#555]">{tfLabel}</p>
                <p className="font-mono text-[9px] text-[#444] mt-1">Click + Ctrl+V or drag &amp; drop</p>
                <button
                  onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold mt-1 transition-all hover:opacity-90"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <Upload size={11} /> Upload
                </button>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ""; }} />

          {/* Per-tf note */}
          <div className="flex items-center justify-between mt-2 mb-1">
            <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "#555" }}>Note · {activeTf}</p>
            <VoiceMic onText={txt => setTfNotes(p => ({ ...p, [activeTf]: appendNote(p[activeTf], txt) }))} />
          </div>
          <textarea
            value={tfNotes[activeTf] ?? ""}
            onChange={e => setTfNotes(p => ({ ...p, [activeTf]: e.target.value }))}
            placeholder={`Add note for ${activeTf} chart...`}
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg font-mono text-xs text-white placeholder-[#444] focus:outline-none resize-none"
            style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}
          />
        </div>

        {/* Save */}
        <div className="px-4 py-4 border-t" style={{ borderColor: "#1A1A1A" }}>
          <button onClick={saveAll}
            className="w-full py-3 rounded-xl font-sans text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: "#EF4444" }}>
            💾 Save All Notes
          </button>
        </div>
      </div>

      {/* Zoom lightbox */}
      {zoom && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setZoom(null)}>

          {/* scrollable image area */}
          <div className="w-full h-full overflow-auto flex items-center justify-center p-10" onClick={() => setZoom(null)}>
            <img src={zoom} alt="Chart zoom"
              className="rounded-lg select-none"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center", transition: "transform 0.15s ease", maxWidth: "none" }}
              onClick={e => e.stopPropagation()} />
          </div>

          {/* zoom toolbar */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-xl"
            style={{ background: "rgba(20,20,20,0.95)", border: "1px solid #333" }}
            onClick={e => e.stopPropagation()}>
            <button title="Zoom out" onClick={() => setZoomLevel(z => Math.max(0.25, Math.round((z - 0.25) * 100) / 100))}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10">
              <ZoomOut size={15} color="#fff" />
            </button>
            <span className="font-mono text-xs font-bold text-white w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
            <button title="Zoom in" onClick={() => setZoomLevel(z => Math.min(5, Math.round((z + 0.25) * 100) / 100))}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10">
              <ZoomIn size={15} color="#fff" />
            </button>
            <div className="w-px h-5 mx-1" style={{ background: "#333" }} />
            <button title="Reset" onClick={() => setZoomLevel(1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10">
              <RotateCcw size={14} color="#fff" />
            </button>
          </div>

          {/* close */}
          <button onClick={() => setZoom(null)}
            className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:opacity-90"
            style={{ background: "rgba(20,20,20,0.95)", border: "1px solid #333" }}>
            <X size={16} color="#fff" />
          </button>
        </div>
      )}
    </div>
  );
}
