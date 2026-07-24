"use client";
import { useState, useEffect, useRef } from "react";
import {
  Plus, Trash2, TrendingUp, TrendingDown, Minus,
  Upload, X, Image as ImageIcon, MapPin,
} from "lucide-react";
import { VoiceMic, appendNote } from "@/components/VoiceMic";
import { imgSave, imgLoad, imgDelete } from "@/lib/db";

const STORE_KEY = "sabar-outlook-entries";
const outlookImgKey = (id: string) => `outlook_${id}`;

const GREEN = "#22C55E";
const RED   = "#EF4444";
const AMBER = "#F59E0B";

type OutlookBias = "BULLISH" | "BEARISH" | "NEUTRAL";

interface OutlookEntry {
  id: string;
  date: string;               // YYYY-MM-DD
  pair: string;
  bias: OutlookBias;
  sessions: string[];         // Asian / London / New York
  timeframes: string[];       // Weekly / Daily / 4H / 1H / 15M
  confidence: number;         // 0–100
  biasNote: string;           // 1-line weekly bias
  analysis: string;           // full analysis / game plan
  hasImage: boolean;
}

const SESSIONS   = ["Asian", "London", "New York"];
const TIMEFRAMES = ["Weekly", "Daily", "4H", "1H", "15M"];
const PAIRS      = ["EUR/USD", "GBP/USD", "XAU/USD", "GBP/JPY", "USD/JPY"];

const BIAS_META: Record<OutlookBias, { label: string; color: string; Icon: typeof TrendingUp }> = {
  BULLISH: { label: "Bullish", color: GREEN,     Icon: TrendingUp   },
  BEARISH: { label: "Bearish", color: RED,       Icon: TrendingDown },
  NEUTRAL: { label: "Neutral", color: "#9A9A9A", Icon: Minus        },
};

const newEntry = (): OutlookEntry => ({
  id: `ol-${Date.now()}`,
  date: new Date().toISOString().split("T")[0],
  pair: "EUR/USD",
  bias: "NEUTRAL",
  sessions: [],
  timeframes: [],
  confidence: 50,
  biasNote: "",
  analysis: "",
  hasImage: false,
});

const weekday = (date: string) =>
  new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });

export default function WeeklyOutlookPage() {
  const [entries, setEntries]       = useState<OutlookEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterPair, setFilterPair] = useState("");
  const [filterBias, setFilterBias] = useState("");
  const [image, setImage]           = useState<string | null>(null);
  const [dragOver, setDragOver]     = useState(false);
  const [loaded, setLoaded]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed: OutlookEntry[] = JSON.parse(raw);
        setEntries(parsed);
        if (parsed.length > 0) setSelectedId(parsed[0].id);
      }
    } catch {}
    setLoaded(true);
  }, []);

  const entry = entries.find(e => e.id === selectedId) ?? null;

  // Load image from IndexedDB when selection changes
  useEffect(() => {
    setImage(null);
    if (!selectedId) return;
    let alive = true;
    imgLoad(outlookImgKey(selectedId)).then(img => { if (alive) setImage(img); }).catch(() => {});
    return () => { alive = false; };
  }, [selectedId]);

  function persist(next: OutlookEntry[]) {
    setEntries(next);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch {}
  }

  function update(patch: Partial<OutlookEntry>) {
    if (!entry) return;
    persist(entries.map(e => e.id === entry.id ? { ...e, ...patch } : e));
  }

  function addEntry() {
    const e = newEntry();
    persist([e, ...entries]);
    setSelectedId(e.id);
  }

  function removeEntry(id: string) {
    imgDelete(outlookImgKey(id)).catch(() => {});
    const next = entries.filter(e => e.id !== id);
    persist(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  }

  function readImg(file: File | null | undefined) {
    if (!entry || !file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setImage(url);
      imgSave(outlookImgKey(entry.id), url).catch(() => {});
      update({ hasImage: true });
    };
    reader.readAsDataURL(file);
  }

  function removeImg() {
    if (!entry) return;
    setImage(null);
    imgDelete(outlookImgKey(entry.id)).catch(() => {});
    update({ hasImage: false });
  }

  const toggleIn = (list: string[], v: string) =>
    list.includes(v) ? list.filter(x => x !== v) : [...list, v];

  const sorted   = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const filtered = sorted.filter(e =>
    (!filterPair || e.pair === filterPair) &&
    (!filterBias || e.bias === filterBias)
  );
  const pairOptions = Array.from(new Set([...PAIRS, ...entries.map(e => e.pair)]));

  const selectCls = "px-3 py-2 rounded-lg font-sans text-xs text-white focus:outline-none";
  const selectStyle = { background: "#141414", border: "1px solid #2A2A2A" };

  if (!loaded) return null;

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 pb-10">

      {/* ── LEFT: entry list ── */}
      <div className="rounded-2xl p-4 h-fit" style={{ background: "rgba(20,20,20,0.6)", border: "1px solid #262626" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-sans font-bold text-white text-lg">Weekly Outlook</h1>
          <button onClick={addEntry}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-sans text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: RED, boxShadow: `0 0 14px 2px ${RED}44` }}>
            <Plus size={15} strokeWidth={3} /> New
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <select className={`${selectCls} flex-1`} style={selectStyle}
            value={filterPair} onChange={e => setFilterPair(e.target.value)}>
            <option value="">All Pairs</option>
            {pairOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className={`${selectCls} flex-1`} style={selectStyle}
            value={filterBias} onChange={e => setFilterBias(e.target.value)}>
            <option value="">All Bias</option>
            <option value="BULLISH">Bullish</option>
            <option value="BEARISH">Bearish</option>
            <option value="NEUTRAL">Neutral</option>
          </select>
        </div>

        {/* Entry list */}
        {filtered.length === 0 ? (
          <p className="font-sans text-sm text-center py-8" style={{ color: "#666" }}>
            No outlooks yet — hit <span style={{ color: RED }}>+ New</span>
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map(e => {
              const active = e.id === selectedId;
              const meta = BIAS_META[e.bias];
              return (
                <button key={e.id} onClick={() => setSelectedId(e.id)}
                  className="w-full text-left rounded-xl px-4 py-3 transition-all duration-200 border"
                  style={active
                    ? { background: "rgba(239,68,68,0.07)", borderColor: `${RED}66`, boxShadow: `0 0 14px 1px ${RED}22` }
                    : { background: "rgba(255,255,255,0.02)", borderColor: "#222" }}>
                  <div className="flex items-center justify-between">
                    <span className="font-sans font-bold text-white text-sm">{weekday(e.date)}</span>
                    <span className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: meta.color, boxShadow: `0 0 6px 1px ${meta.color}88` }} />
                  </div>
                  <p className="font-sans text-[11px] mt-0.5" style={{ color: "#777" }}>{e.date}</p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md font-sans text-[10px] font-semibold"
                      style={{ background: "#1C1C1C", border: "1px solid #2E2E2E", color: "#C0C0C0" }}>
                      {e.pair}
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-sans text-[10px] font-semibold"
                      style={{ background: `${meta.color}14`, border: `1px solid ${meta.color}44`, color: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── RIGHT: detail panel ── */}
      {entry ? (
        <div className="rounded-2xl p-6 space-y-6" style={{ background: "rgba(20,20,20,0.6)", border: "1px solid #262626" }}>

          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-4 border-b" style={{ borderColor: "#222" }}>
            <div>
              <h2 className="font-sans font-bold text-white text-xl">
                {weekday(entry.date)} <span style={{ color: "#666" }}>— {entry.date}</span>
              </h2>
              <p className="font-sans text-xs mt-1" style={{ color: "#8A8A8A" }}>Weekly market outlook &amp; game plan</p>
            </div>
            <button onClick={() => removeEntry(entry.id)}
              className="p-2 rounded-lg transition-colors hover:bg-[#EF444414]"
              style={{ border: "1px solid #2A2A2A", color: "#666" }}
              title="Delete outlook">
              <Trash2 size={15} />
            </button>
          </div>

          {/* Pair + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="font-sans text-sm font-medium mb-2" style={{ color: "#A0A0A0" }}>Pair</p>
              <input list="outlook-pairs" value={entry.pair}
                onChange={e => update({ pair: e.target.value.toUpperCase() })}
                className="w-full font-sans text-sm text-white px-4 py-3 rounded-xl focus:outline-none placeholder-[#555]"
                style={{ background: "#101010", border: "1px solid #262626" }} />
              <datalist id="outlook-pairs">
                {pairOptions.map(p => <option key={p} value={p} />)}
              </datalist>
            </div>
            <div>
              <p className="font-sans text-sm font-medium mb-2" style={{ color: "#A0A0A0" }}>Date</p>
              <input type="date" value={entry.date}
                onChange={e => { if (e.target.value) update({ date: e.target.value }); }}
                className="w-full font-sans text-sm text-white px-4 py-3 rounded-xl focus:outline-none"
                style={{ background: "#101010", border: "1px solid #262626", colorScheme: "dark" }} />
            </div>
          </div>

          {/* Bias */}
          <div>
            <p className="font-sans text-sm font-medium mb-2" style={{ color: "#A0A0A0" }}>Bias</p>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(BIAS_META) as OutlookBias[]).map(b => {
                const { label, color, Icon } = BIAS_META[b];
                const active = entry.bias === b;
                return (
                  <button key={b} onClick={() => update({ bias: b })}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl font-sans font-semibold text-sm transition-all duration-200 border"
                    style={active
                      ? { color: b === "NEUTRAL" ? "#fff" : "#fff", borderColor: color,
                          background: `${color}1F`, boxShadow: `0 0 16px 2px ${color}33` }
                      : { color: "#8A8A8A", borderColor: "#2A2A2A", background: "rgba(255,255,255,0.02)" }}>
                    <Icon size={16} strokeWidth={2.5} style={{ color: active ? color : "#8A8A8A" }} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sessions */}
          <div>
            <p className="font-sans text-sm font-medium mb-2" style={{ color: "#A0A0A0" }}>Sessions</p>
            <div className="flex flex-wrap gap-2.5">
              {SESSIONS.map(s => {
                const active = entry.sessions.includes(s);
                return (
                  <button key={s} onClick={() => update({ sessions: toggleIn(entry.sessions, s) })}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full font-sans text-sm font-medium border transition-all duration-200"
                    style={active
                      ? { color: AMBER, borderColor: AMBER, background: `${AMBER}14`, boxShadow: `0 0 12px 1px ${AMBER}33` }
                      : { color: "#B0B0B0", borderColor: "#2E2E2E", background: "#161616" }}>
                    <MapPin size={13} style={{ color: active ? AMBER : "#8A8A8A" }} />
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeframes */}
          <div>
            <p className="font-sans text-sm font-medium mb-2" style={{ color: "#A0A0A0" }}>Timeframes</p>
            <div className="flex flex-wrap gap-2.5">
              {TIMEFRAMES.map(tf => {
                const active = entry.timeframes.includes(tf);
                return (
                  <button key={tf} onClick={() => update({ timeframes: toggleIn(entry.timeframes, tf) })}
                    className="px-4 py-2 rounded-full font-sans text-sm font-medium border transition-all duration-200"
                    style={active
                      ? { color: GREEN, borderColor: GREEN, background: `${GREEN}14`, boxShadow: `0 0 12px 1px ${GREEN}33` }
                      : { color: "#B0B0B0", borderColor: "#2E2E2E", background: "#161616" }}>
                    {tf}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confidence */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-sans text-sm font-medium" style={{ color: "#A0A0A0" }}>Confidence</p>
              <p className="font-sans text-sm font-bold" style={{ color: RED }}>{entry.confidence}%</p>
            </div>
            <input type="range" min={0} max={100} step={5} value={entry.confidence}
              onChange={e => update({ confidence: Number(e.target.value) })}
              className="w-full"
              style={{ accentColor: RED }} />
          </div>

          {/* Weekly bias note */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-sans text-sm font-medium" style={{ color: "#A0A0A0" }}>Weekly Bias</p>
              <VoiceMic onText={t => update({ biasNote: appendNote(entry.biasNote, t) })} />
            </div>
            <input value={entry.biasNote}
              onChange={e => update({ biasNote: e.target.value })}
              placeholder="One-line weekly bias..."
              className="w-full font-sans text-sm text-white px-4 py-3 rounded-xl focus:outline-none placeholder-[#555]"
              style={{ background: "#101010", border: "1px solid #262626" }} />
          </div>

          {/* Analysis */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-sans text-sm font-medium" style={{ color: "#A0A0A0" }}>Analysis / Game Plan</p>
              <VoiceMic onText={t => update({ analysis: appendNote(entry.analysis, t) })} />
            </div>
            <textarea value={entry.analysis}
              onChange={e => update({ analysis: e.target.value })}
              placeholder="Full analysis — setups to watch, key levels, news, rules..."
              rows={4}
              className="w-full font-sans text-sm text-white px-4 py-3 rounded-xl focus:outline-none placeholder-[#555] resize-none leading-relaxed"
              style={{ background: "#101010", border: "1px solid #262626" }} />
          </div>

          {/* Chart image */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ImageIcon size={15} style={{ color: RED }} />
                <p className="font-sans text-sm font-medium" style={{ color: "#A0A0A0" }}>Chart / Image</p>
              </div>
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans text-xs font-semibold transition-all hover:opacity-80"
                style={{ color: RED, border: `1px solid ${RED}44`, background: `${RED}0D` }}>
                <Plus size={12} /> Add Image
              </button>
            </div>

            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { readImg(e.target.files?.[0]); e.target.value = ""; }} />

            {image ? (
              <div className="relative group rounded-xl overflow-hidden" style={{ border: "1px solid #262626" }}>
                <img src={image} alt="Chart" className="w-full object-contain" style={{ maxHeight: 420, background: "#0A0A0A" }} />
                <button onClick={removeImg}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#EF4444]">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div tabIndex={0}
                onPaste={e => {
                  const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith("image/"));
                  if (item) { readImg(item.getAsFile()); e.preventDefault(); }
                }}
                onDrop={e => { e.preventDefault(); setDragOver(false); readImg(e.dataTransfer.files?.[0]); }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl cursor-pointer transition-all py-10 focus:outline-none border-2 border-dashed"
                style={{
                  borderColor: dragOver ? RED : "#2A2A2A",
                  background: dragOver ? `${RED}08` : "rgba(255,255,255,0.02)",
                }}>
                <Upload size={22} style={{ color: "#555" }} />
                <p className="font-sans text-sm" style={{ color: "#8A8A8A" }}>Click, paste (Ctrl+V) or drag &amp; drop</p>
                <p className="font-sans text-xs" style={{ color: "#555" }}>Chart screenshot for this outlook</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl flex flex-col items-center justify-center gap-3 py-24"
          style={{ background: "rgba(20,20,20,0.6)", border: "1px solid #262626" }}>
          <p className="font-sans text-base" style={{ color: "#8A8A8A" }}>No outlook selected</p>
          <button onClick={addEntry}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-sans text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: RED, boxShadow: `0 0 14px 2px ${RED}44` }}>
            <Plus size={15} strokeWidth={3} /> New Outlook
          </button>
        </div>
      )}
    </div>
  );
}
