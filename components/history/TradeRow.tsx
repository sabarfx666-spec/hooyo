"use client";
import { useState, useRef } from "react";
import { Trade } from "@/store/types";
import { Badge } from "@/components/ui/Badge";
import { ChevronDown, ChevronRight, Trash2, ImagePlus, X, ZoomIn, Clipboard } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useSabar } from "@/store/SabarContext";

const TIMEFRAMES = ["5M", "15M", "4H", "Daily", "Result"] as const;
type TF = typeof TIMEFRAMES[number];

const borderColors: Record<string, string> = {
  WIN:  "border-l-[#00FF7F]",
  LOSS: "border-l-[#FF3B3B]",
  BE:   "border-l-[#6AECE1]",
  SKIP: "border-l-[#A0A0A0]",
};

const TF_COLOR: Record<TF, string> = {
  "5M":     "#6AECE1",
  "15M":    "#F59E0B",
  "4H":     "#A78BFA",
  "Daily":  "#00FF7F",
  "Result": "#FF3B3B",
};

export function TradeRow({ trade }: { trade: Trade }) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const { dispatch } = useSabar();
  const fileRefs = useRef<Partial<Record<TF, HTMLInputElement | null>>>({});

  const borderKey = trade.decision === "SKIP" ? "SKIP" : (trade.outcome ?? "SKIP");
  const border    = borderColors[borderKey] ?? "border-l-[#2A2A2A]";
  const rulesPct  = trade.totalRules > 0 ? Math.round((trade.checkedCount / trade.totalRules) * 100) : 0;
  const proofs    = trade.chartProofs ?? {};
  const hasAnyChart = Object.values(proofs).some(Boolean);

  function readFileAsDataURL(file: File, tf: TF) {
    const reader = new FileReader();
    reader.onload = () => {
      dispatch({
        type: "UPDATE_TRADE",
        payload: { id: trade.id, chartProofs: { ...proofs, [tf]: reader.result as string } },
      });
    };
    reader.readAsDataURL(file);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>, tf: TF) {
    const file = e.target.files?.[0];
    if (file) readFileAsDataURL(file, tf);
    e.target.value = "";
  }

  function handlePaste(e: React.ClipboardEvent, tf: TF) {
    const imgItem = Array.from(e.clipboardData.items).find(i => i.type.startsWith("image/"));
    if (!imgItem) return;
    const file = imgItem.getAsFile();
    if (file) readFileAsDataURL(file, tf);
  }

  function removeChart(tf: TF, ev: React.MouseEvent) {
    ev.stopPropagation();
    const updated = { ...proofs };
    delete updated[tf];
    dispatch({ type: "UPDATE_TRADE", payload: { id: trade.id, chartProofs: updated } });
  }

  return (
    <>
      <tr
        className={`group border-l-4 ${border} cursor-pointer hover:bg-[#1A1A1A] transition-colors`}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-3 py-2.5 font-mono text-xs text-[#A0A0A0] whitespace-nowrap">{formatDate(trade.date)}</td>
        <td className="px-3 py-2.5 font-mono text-xs text-[#FF0000] font-bold">{trade.pair}</td>
        <td className="px-3 py-2.5 font-mono text-xs text-white">{trade.session === "LONDON" ? "LDN" : "NY"}</td>
        <td className="px-3 py-2.5">
          <span className={`font-mono text-xs font-bold ${trade.bias === "BULLISH" ? "text-[#6AECE1]" : "text-[#FF3B3B]"}`}>
            {trade.bias === "BULLISH" ? "↑" : "↓"} {trade.bias}
          </span>
        </td>
        <td className="px-3 py-2.5">
          <Badge variant={trade.decision === "TAKE" ? "take" : "skip"}>{trade.decision}</Badge>
        </td>
        <td className="px-3 py-2.5">
          {trade.outcome ? (
            <Badge variant={trade.outcome === "WIN" ? "win" : trade.outcome === "LOSS" ? "loss" : "be"}>
              {trade.outcome}
            </Badge>
          ) : <span className="text-[#A0A0A0] font-mono text-xs">—</span>}
        </td>
        <td className="px-3 py-2.5 font-mono text-xs text-white tabular-nums">{trade.rr > 0 ? `1:${trade.rr}` : "—"}</td>
        <td className="px-3 py-2.5 font-mono text-xs tabular-nums">
          {trade.pnl !== undefined ? (
            <span className={trade.pnl >= 0 ? "text-[#00FF7F]" : "text-[#FF3B3B]"}>
              {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
            </span>
          ) : <span className="text-[#A0A0A0]">—</span>}
        </td>
        <td className="px-3 py-2.5 font-mono text-xs text-[#6AECE1]">{rulesPct}%</td>
        <td className="px-3 py-2.5">
          <div className="flex flex-wrap gap-1">
            {trade.psychology.map((p) => (
              <span key={p} className="font-mono text-[10px] text-[#A0A0A0] border border-[#2A2A2A] px-1.5 py-0.5 rounded">{p}</span>
            ))}
          </div>
        </td>

        {/* Chart indicator cell */}
        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1"
            title="Chart proof"
          >
            {TIMEFRAMES.map(tf => (
              <div
                key={tf}
                className="w-3 h-3 rounded-sm"
                style={{
                  background: proofs[tf] ? TF_COLOR[tf] : "#1A1A1A",
                  border: `1px solid ${proofs[tf] ? TF_COLOR[tf] + "88" : "#2A2A2A"}`,
                }}
              />
            ))}
          </button>
        </td>

        <td className="px-3 py-2.5 text-[#A0A0A0]">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <button
              onClick={(e) => { e.stopPropagation(); dispatch({ type: "DELETE_TRADE", payload: trade.id }); }}
              className="opacity-0 group-hover:opacity-100 text-[#333] hover:text-[#FF3B3B] transition-all duration-150"
              title="Delete trade"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr className={`border-l-4 ${border} bg-[#0D0D0D]`}>
          <td colSpan={12} className="px-4 py-4">
            <div className="flex flex-col gap-4">

              {/* Top: rules + notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <p className="text-[#A0A0A0] mb-1 uppercase tracking-wider">Rules Checked ({trade.checkedCount}/{trade.totalRules})</p>
                  <p className="text-[#6AECE1]">{trade.rulesChecked.length > 0 ? trade.rulesChecked.join(", ") : "None"}</p>
                  {trade.missingRules.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[#A0A0A0] mb-1 uppercase tracking-wider">Missing Rules</p>
                      <p className="text-[#FF3B3B]">{trade.missingRules.join(", ")}</p>
                    </div>
                  )}
                </div>
                {trade.notes && (
                  <div>
                    <p className="text-[#A0A0A0] mb-1 uppercase tracking-wider">Notes</p>
                    <p className="text-white">{trade.notes}</p>
                  </div>
                )}
              </div>

              {/* Chart proof grid */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0] mb-3">
                  Chart Proof — <span className="text-[#444]">Click slot to upload · Paste (Ctrl+V) into focused slot</span>
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {TIMEFRAMES.map(tf => {
                    const img = proofs[tf];
                    const color = TF_COLOR[tf];
                    return (
                      <div key={tf} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold" style={{ color }}>{tf}</span>
                          {img && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setLightbox(img)} className="text-[#444] hover:text-white transition-colors" title="Fullscreen">
                                <ZoomIn size={11} />
                              </button>
                              <button onClick={(e) => removeChart(tf, e)} className="text-[#444] hover:text-[#FF3B3B] transition-colors" title="Remove">
                                <X size={11} />
                              </button>
                            </div>
                          )}
                        </div>

                        <div
                          tabIndex={0}
                          onPaste={(e) => handlePaste(e, tf)}
                          onClick={() => { if (!img) fileRefs.current[tf]?.click(); }}
                          className="relative rounded-lg overflow-hidden cursor-pointer focus:outline-none group/slot"
                          style={{
                            border: `1px dashed ${img ? color + "55" : "#2A2A2A"}`,
                            background: img ? "#000" : "#0A0A0A",
                            minHeight: "120px",
                          }}
                          title={img ? "Click zoom or paste new image" : "Click to upload or paste (Ctrl+V)"}
                        >
                          {img ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={img}
                                alt={`${tf} chart`}
                                className="w-full h-full object-contain"
                                style={{ maxHeight: "180px" }}
                                onClick={() => setLightbox(img)}
                              />
                              <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover/slot:opacity-100 transition-opacity"
                                style={{ background: "rgba(0,0,0,0.6)" }}>
                                <button onClick={(e) => { e.stopPropagation(); setLightbox(img); }} className="p-1.5 rounded" style={{ background: "rgba(255,255,255,0.1)" }}>
                                  <ZoomIn size={14} className="text-white" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); fileRefs.current[tf]?.click(); }} className="p-1.5 rounded" style={{ background: "rgba(255,255,255,0.1)" }} title="Replace">
                                  <ImagePlus size={14} className="text-white" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#333] group-hover/slot:text-[#555] transition-colors">
                              <ImagePlus size={18} />
                              <div className="text-center">
                                <p className="font-sans text-[10px]">Click to upload</p>
                                <p className="font-sans text-[10px] flex items-center gap-1 justify-center mt-0.5">
                                  <Clipboard size={9} /> Paste image
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <input
                          ref={el => { fileRefs.current[tf] = el; }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFile(e, tf)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </td>
        </tr>
      )}

      {/* Lightbox */}
      {lightbox && (
        <tr>
          <td colSpan={12} className="p-0">
            <div
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.92)" }}
              onClick={() => setLightbox(null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox}
                alt="Chart fullscreen"
                className="max-w-[92vw] max-h-[92vh] rounded-lg object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => setLightbox(null)}
                className="absolute top-4 right-4 p-2 rounded-full"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                <X size={20} className="text-white" />
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
