"use client";
import { useState, useEffect, useRef } from "react";
import {
  Plus, Trash2, TrendingUp, TrendingDown, Minus,
  Upload, Image as ImageIcon, MapPin, ArrowLeft,
  ZoomIn, ZoomOut, RotateCcw, RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { VoiceMic, appendNote } from "@/components/VoiceMic";
import { VoiceNote } from "@/components/VoiceNote";
import { imgSave, imgLoad, imgDelete } from "@/lib/db";

const STORE_KEY = "sabar-outlook-entries";

/** Month pills — each value matches the MM slice of an ISO date. */
const MONTHS = [
  { value: "01", label: "Jan" }, { value: "02", label: "Feb" },
  { value: "03", label: "Mar" }, { value: "04", label: "Apr" },
  { value: "05", label: "May" }, { value: "06", label: "Jun" },
  { value: "07", label: "Jul" }, { value: "08", label: "Aug" },
  { value: "09", label: "Sep" }, { value: "10", label: "Oct" },
  { value: "11", label: "Nov" }, { value: "12", label: "Dec" },
];
// "legacy" keeps the pre-multi-chart key so older outlooks still find their image.
const chartImgKey = (entryId: string, chartId: string) =>
  chartId === "legacy" ? `outlook_${entryId}` : `outlook_${entryId}_${chartId}`;

const CHART_TAGS = ["No tag", "Monthly", "Weekly", "Daily", "4H", "1H", "15M", "5M"];

const GREEN = "#22C55E";
const RED   = "#EF4444";
const AMBER = "#F59E0B";

type OutlookBias = "BULLISH" | "BEARISH" | "NEUTRAL";

/** One chart screenshot: the image lives in IndexedDB, this is its metadata. */
interface ChartMeta {
  id: string;
  tag: string;                // timeframe label, or "No tag"
  note: string;               // notes written about this chart
}

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
  charts?: ChartMeta[];       // undefined on outlooks saved before multi-chart
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
  charts: [],
});

const weekday = (date: string) =>
  new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });

export default function WeeklyOutlookPage() {
  const [entries, setEntries]       = useState<OutlookEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterPair, setFilterPair] = useState("");
  const [filterBias, setFilterBias] = useState("");
  /** "" = All months, otherwise "01".."12" matched against the entry date. */
  const [filterMonth, setFilterMonth] = useState("");
  const [chartImages, setChartImages] = useState<Record<string, string>>({});
  const [dragOver, setDragOver]     = useState(false);
  const [loaded, setLoaded]         = useState(false);
  const [zoomId, setZoomId]         = useState<string | null>(null);
  const [zoomOpen, setZoomOpen]     = useState(false);
  const [zoomLevel, setZoomLevel]   = useState(1);
  const [pan, setPan]               = useState({ x: 0, y: 0 });
  const panStart = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const didPan = useRef(false);
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
  const charts: ChartMeta[] = entry?.charts ?? [];

  // Load this outlook's chart images from IndexedDB when the selection changes.
  // Outlooks saved before multi-chart have one image under the old key — it gets
  // adopted as a "legacy" chart so nothing disappears.
  useEffect(() => {
    setChartImages({});
    const e = entries.find(x => x.id === selectedId);
    if (!selectedId || !e) return;
    let alive = true;

    (async () => {
      if (!e.charts) {
        const old = await imgLoad(chartImgKey(selectedId, "legacy")).catch(() => null);
        const migrated: ChartMeta[] = old ? [{ id: "legacy", tag: "No tag", note: "" }] : [];
        if (!alive) return;
        persist(entries.map(x => x.id === selectedId ? { ...x, charts: migrated } : x));
        if (old) setChartImages({ legacy: old });
        return;
      }
      const loaded = await Promise.all(
        e.charts.map(c => imgLoad(chartImgKey(selectedId, c.id)).catch(() => null))
      );
      if (!alive) return;
      const map: Record<string, string> = {};
      e.charts.forEach((c, i) => { if (loaded[i]) map[c.id] = loaded[i]!; });
      setChartImages(map);
    })();

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
    const victim = entries.find(e => e.id === id);
    (victim?.charts ?? [{ id: "legacy" } as ChartMeta]).forEach(c =>
      imgDelete(chartImgKey(id, c.id)).catch(() => {}));
    const next = entries.filter(e => e.id !== id);
    persist(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  }

  /** Add one chart per dropped/pasted/picked image file. */
  function addCharts(files: FileList | File[] | null | undefined) {
    if (!entry || !files) return;
    const list = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!list.length) return;

    list.forEach((file, i) => {
      const chartId = `c-${Date.now()}-${i}`;
      const reader = new FileReader();
      reader.onload = ev => {
        const url = ev.target?.result as string;
        setChartImages(prev => ({ ...prev, [chartId]: url }));
        imgSave(chartImgKey(entry.id, chartId), url).catch(() => {});
        setEntries(prev => {
          const next = prev.map(e => e.id === entry.id
            ? { ...e, hasImage: true, charts: [...(e.charts ?? []), { id: chartId, tag: "No tag", note: "" }] }
            : e);
          try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch {}
          return next;
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function updateChart(chartId: string, patch: Partial<ChartMeta>) {
    if (!entry) return;
    update({ charts: (entry.charts ?? []).map(c => c.id === chartId ? { ...c, ...patch } : c) });
  }

  function removeChart(chartId: string) {
    if (!entry) return;
    imgDelete(chartImgKey(entry.id, chartId)).catch(() => {});
    setChartImages(prev => { const n = { ...prev }; delete n[chartId]; return n; });
    const rest = (entry.charts ?? []).filter(c => c.id !== chartId);
    update({ charts: rest, hasImage: rest.length > 0 });
  }

  const resetZoom = () => { setZoomLevel(1); setPan({ x: 0, y: 0 }); };

  // Drag to move the zoomed chart around
  const startPan = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    panStart.current = { sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y };
    didPan.current = false;
  };
  const movePan = (e: React.PointerEvent) => {
    const s = panStart.current;
    if (!s) return;
    if (Math.abs(e.clientX - s.sx) > 3 || Math.abs(e.clientY - s.sy) > 3) didPan.current = true;
    setPan({ x: s.ox + (e.clientX - s.sx), y: s.oy + (e.clientY - s.sy) });
  };
  const endPan = () => { panStart.current = null; };

  // A drag ends with a click on the backdrop — don't treat that as "close".
  const closeZoomUnlessDragged = () => {
    if (didPan.current) { didPan.current = false; return; }
    setZoomOpen(false);
  };

  const toggleIn = (list: string[], v: string) =>
    list.includes(v) ? list.filter(x => x !== v) : [...list, v];

  const sorted   = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const filtered = sorted.filter(e =>
    (!filterPair  || e.pair === filterPair) &&
    (!filterBias  || e.bias === filterBias) &&
    (!filterMonth || e.date.slice(5, 7) === filterMonth)
  );
  const pairOptions = Array.from(new Set([...PAIRS, ...entries.map(e => e.pair)]));

  const selectCls = "px-3 py-2 rounded-lg font-sans text-xs text-white focus:outline-none";
  const selectStyle = { background: "#141414", border: "1px solid #2A2A2A" };

  if (!loaded) return null;

  return (
    <div className="max-w-5xl mx-auto pb-10">

      {/* The topbar only shows on the checklist, so this page needs its own way back. */}
      <Link href="/"
        className="inline-flex items-center gap-1.5 mb-3 text-xs font-mono text-[#444] hover:text-white transition-colors">
        <ArrowLeft size={13} /> Back to Checklist
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">

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

        {/* Month filter */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {MONTHS.map(m => {
            const active = filterMonth === m.value;
            return (
              <button key={m.value}
                /* Clicking the active month clears it — that's the way back to every month. */
                onClick={() => setFilterMonth(active ? "" : m.value)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-sans text-[11px] font-semibold transition-all"
                style={{
                  background: active ? RED : "#141414",
                  border: `1px solid ${active ? RED : "#2A2A2A"}`,
                  color: active ? "#FFF" : "#8A8A8A",
                  boxShadow: active ? `0 0 10px ${RED}55` : "none",
                }}>
                <TrendingUp size={11} strokeWidth={2.5} />
                {m.label}
              </button>
            );
          })}
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
              <VoiceMic label="Voice note" onText={t => update({ biasNote: appendNote(entry.biasNote, t) })} />
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
              <VoiceMic label="Voice note" onText={t => update({ analysis: appendNote(entry.analysis, t) })} />
            </div>
            <textarea value={entry.analysis}
              onChange={e => update({ analysis: e.target.value })}
              placeholder="Full analysis — setups to watch, key levels, news, rules..."
              rows={4}
              className="w-full font-sans text-sm text-white px-4 py-3 rounded-xl focus:outline-none placeholder-[#555] resize-none leading-relaxed"
              style={{ background: "#101010", border: "1px solid #262626" }} />
            <div className="mt-2">
              <VoiceNote fieldKey={`outlook-${entry.id}-analysis`} />
            </div>
          </div>

          {/* Chart image */}
          {/* Charts — a growing list; each has its own timeframe tag and notes */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon size={15} style={{ color: RED }} />
              <p className="font-sans text-sm font-medium" style={{ color: "#A0A0A0" }}>Chart / Image</p>
              {charts.length > 0 && (
                <span className="font-sans text-xs" style={{ color: "#555" }}>{charts.length}</span>
              )}
            </div>

            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => { addCharts(e.target.files); e.target.value = ""; }} />

            <div className="space-y-4">
              {charts.map((chart, i) => {
                const img = chartImages[chart.id];
                return (
                  <div key={chart.id} className="rounded-xl overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #262626" }}>
                    {img ? (
                      <div className="relative group">
                        <img src={img} alt={`Chart ${i + 1}`} className="w-full object-contain"
                          style={{ maxHeight: 460, background: "#0A0A0A" }} />
                        {/* hover controls — pointer-events-none while hidden so an
                            invisible overlay can't swallow clicks */}
                        <div className="absolute inset-0 flex items-center justify-center gap-2.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity"
                          style={{ background: "rgba(0,0,0,0.35)" }}>
                          <button title="Zoom" onClick={() => { setZoomId(chart.id); setZoomOpen(true); resetZoom(); }}
                            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                            style={{ background: "rgba(20,20,20,0.95)", border: "1px solid #333" }}>
                            <ZoomIn size={15} color="#fff" />
                          </button>
                          <button title="Delete" onClick={() => removeChart(chart.id)}
                            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                            style={{ background: "rgba(239,68,68,0.9)", border: "1px solid rgba(239,68,68,0.5)" }}>
                            <Trash2 size={14} color="#fff" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-10 font-sans text-xs" style={{ color: "#555" }}>
                        Image missing
                      </div>
                    )}

                    {/* tag + label */}
                    <div className="flex items-center gap-2.5 px-3 pt-3">
                      <select value={chart.tag}
                        onChange={e => updateChart(chart.id, { tag: e.target.value })}
                        className="px-3 py-1.5 rounded-lg font-sans text-xs text-white focus:outline-none cursor-pointer"
                        style={{ background: "#141414", border: "1px solid #2A2A2A" }}>
                        {CHART_TAGS.map(t => (
                          <option key={t} value={t} style={{ background: "#141414" }}>{t}</option>
                        ))}
                      </select>
                      <span className="font-sans text-xs" style={{ color: "#777" }}>Chart {i + 1}</span>
                      <span className="ml-auto">
                        <VoiceMic label="Voice note"
                          onText={t => updateChart(chart.id, { note: appendNote(chart.note, t) })} />
                      </span>
                    </div>

                    {/* per-chart notes */}
                    <textarea value={chart.note}
                      onChange={e => updateChart(chart.id, { note: e.target.value })}
                      placeholder="Write notes about this chart..."
                      rows={3}
                      className="w-full mt-2.5 mx-3 font-sans text-sm text-white px-3 py-2.5 rounded-lg focus:outline-none placeholder-[#555] resize-none leading-relaxed"
                      style={{ background: "#101010", border: "1px solid #262626", width: "calc(100% - 1.5rem)" }} />
                    <div className="px-3 pb-3 pt-2">
                      <VoiceNote fieldKey={`chart-${entry.id}-${chart.id}`} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* add more — click, paste or drop */}
            <div tabIndex={0}
              onPaste={e => {
                const files = Array.from(e.clipboardData.items)
                  .filter(i => i.type.startsWith("image/"))
                  .map(i => i.getAsFile())
                  .filter(Boolean) as File[];
                if (files.length) { addCharts(files); e.preventDefault(); }
              }}
              onDrop={e => { e.preventDefault(); setDragOver(false); addCharts(e.dataTransfer.files); }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              className={`flex items-center justify-center gap-2 rounded-xl cursor-pointer transition-all py-4 focus:outline-none border-2 border-dashed ${charts.length ? "mt-4" : ""}`}
              style={{
                borderColor: dragOver ? RED : "#2A2A2A",
                background: dragOver ? `${RED}08` : "rgba(255,255,255,0.02)",
              }}>
              <Plus size={16} style={{ color: "#777" }} />
              <p className="font-sans text-sm" style={{ color: "#8A8A8A" }}>
                Add more charts <span style={{ color: "#555" }}>· Paste (Ctrl+V) · Drag &amp; Drop</span>
              </p>
            </div>
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

      {/* Zoom lightbox */}
      {zoomOpen && zoomId && chartImages[zoomId] && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={closeZoomUnlessDragged}>

          <div className="w-full h-full overflow-hidden flex items-center justify-center p-10 touch-none"
            style={{ cursor: zoomLevel > 1 ? (panStart.current ? "grabbing" : "grab") : "default" }}
            onClick={closeZoomUnlessDragged}
            onPointerDown={e => { if (zoomLevel > 1) startPan(e); }}
            onPointerMove={movePan}
            onPointerUp={endPan}
            onPointerCancel={endPan}>
            {/* 100% fits the whole chart on screen; zooming scales up from there */}
            <img src={chartImages[zoomId]} alt="Chart zoom" draggable={false}
              className="rounded-lg select-none max-w-full max-h-[85vh] object-contain"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                transformOrigin: "center",
                transition: panStart.current ? "none" : "transform 0.15s ease",
              }}
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
            <button title="Reset" onClick={resetZoom}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10">
              <RotateCcw size={14} color="#fff" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
