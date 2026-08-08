"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { VoiceMic, appendNote } from "@/components/VoiceMic";
import {
  ArrowLeft, Plus, Trash2, StickyNote, Undo2, Redo2,
  Maximize, Download, ZoomIn, ZoomOut, ChevronDown, ChevronRight,
} from "lucide-react";

const STORE_KEY = "sabar-plan-map";

const TEAL = "#2DD4BF";
const NODE_W = 200;
const NODE_H = 64;

type NodeKind = "topic" | "note";

interface MapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  parentId: string | null;
  kind: NodeKind;
  collapsed?: boolean;
}

const rootNode = (): MapNode => ({
  id: "root", text: "Main idea", x: 320, y: 60, parentId: null, kind: "topic",
});

export default function PlanPage() {
  const [nodes, setNodes]     = useState<MapNode[]>([]);
  const [loaded, setLoaded]   = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [scale, setScale]     = useState(1);

  // undo / redo stacks
  const past   = useRef<MapNode[][]>([]);
  const future = useRef<MapNode[][]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const parsed: MapNode[] = raw ? JSON.parse(raw) : [];
      setNodes(parsed.length ? parsed : [rootNode()]);
    } catch { setNodes([rootNode()]); }
    setLoaded(true);
  }, []);

  const save = useCallback((next: MapNode[]) => {
    setNodes(next);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  /** Commit a change and push the previous state onto the undo stack. */
  const commit = useCallback((next: MapNode[]) => {
    past.current.push(nodes);
    if (past.current.length > 50) past.current.shift();
    future.current = [];
    save(next);
  }, [nodes, save]);

  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(nodes);
    save(prev);
  };
  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(nodes);
    save(next);
  };

  /* ── node operations ── */
  const addChild = (parentId: string, kind: NodeKind = "topic") => {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;
    const siblings = nodes.filter(n => n.parentId === parentId);
    const node: MapNode = {
      id: `n-${Date.now()}`,
      text: "",
      x: parent.x + NODE_W + 90,
      y: parent.y + siblings.length * (NODE_H + 26),
      parentId,
      kind,
    };
    commit([...nodes, node]);
    setSelected(node.id);
    setEditing(node.id);
  };

  const addSibling = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node || !node.parentId) return addChild(id);
    addChild(node.parentId);
  };

  const addTopic = (kind: NodeKind = "topic") => {
    const node: MapNode = {
      id: `n-${Date.now()}`,
      text: "",
      x: 80 + (nodes.length % 4) * 40,
      y: 220 + (nodes.length % 5) * 40,
      parentId: null,
      kind,
    };
    commit([...nodes, node]);
    setSelected(node.id);
    setEditing(node.id);
  };

  const updateNode = (id: string, patch: Partial<MapNode>) =>
    save(nodes.map(n => (n.id === id ? { ...n, ...patch } : n)));

  /** Remove a node and everything hanging off it. */
  const removeNode = (id: string) => {
    if (id === "root") return;
    const doomed = new Set<string>([id]);
    let grew = true;
    while (grew) {
      grew = false;
      nodes.forEach(n => {
        if (n.parentId && doomed.has(n.parentId) && !doomed.has(n.id)) {
          doomed.add(n.id); grew = true;
        }
      });
    }
    commit(nodes.filter(n => !doomed.has(n.id)));
    setSelected(null);
    setEditing(null);
  };

  const toggleCollapse = (id: string) =>
    updateNode(id, { collapsed: !nodes.find(n => n.id === id)?.collapsed });

  /** Ids hidden because an ancestor is collapsed. */
  const hidden = new Set<string>();
  nodes.forEach(n => {
    let p = n.parentId;
    while (p) {
      const parent = nodes.find(x => x.id === p);
      if (!parent) break;
      if (parent.collapsed) { hidden.add(n.id); break; }
      p = parent.parentId;
    }
  });
  const visible = nodes.filter(n => !hidden.has(n.id));

  /* ── drag ── */
  const startDrag = (e: React.PointerEvent, node: MapNode) => {
    if (editing === node.id) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = canvasRef.current?.getBoundingClientRect();
    drag.current = {
      id: node.id,
      dx: (e.clientX - (rect?.left ?? 0)) / scale - node.x,
      dy: (e.clientY - (rect?.top ?? 0)) / scale - node.y,
      moved: false,
    };
    setSelected(node.id);
  };

  const onDragMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    d.moved = true;
    const rect = canvasRef.current?.getBoundingClientRect();
    const x = Math.max(0, (e.clientX - (rect?.left ?? 0)) / scale - d.dx);
    const y = Math.max(0, (e.clientY - (rect?.top ?? 0)) / scale - d.dy);
    setNodes(prev => prev.map(n => (n.id === d.id ? { ...n, x, y } : n)));
  };

  const endDrag = () => {
    if (drag.current?.moved) save(nodes);
    drag.current = null;
  };

  /* ── keyboard: Tab = branch, Enter = sibling, F2 = edit, Del = remove ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selected || editing) return;
      if (e.key === "Tab")    { e.preventDefault(); addChild(selected); }
      if (e.key === "Enter")  { e.preventDefault(); addSibling(selected); }
      if (e.key === "F2")     { e.preventDefault(); setEditing(selected); }
      if (e.key === "Delete") { e.preventDefault(); removeNode(selected); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(nodes, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sabar-plan.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const fit = () => setScale(1);

  if (!loaded) return null;

  const btn = "flex items-center gap-1.5 px-3 py-2 rounded-xl font-sans text-sm font-semibold transition-all hover:bg-white/5";
  const btnStyle = { background: "rgba(255,255,255,0.03)", border: "1px solid #262626", color: "#D0D0D0" };

  return (
    <div className="max-w-5xl mx-auto p-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${TEAL}1A`, border: `1px solid ${TEAL}55` }}>
            <StickyNote size={19} style={{ color: TEAL }} />
          </div>
          <div>
            <h1 className="font-sans font-bold text-white text-lg">Plan</h1>
            <p className="font-sans text-xs" style={{ color: "#8A8A8A" }}>
              Mind map for setups, ideas and strategy trees
            </p>
          </div>
        </div>
        <Link href="/history"
          className="flex items-center gap-1.5 text-xs font-mono text-[#444] hover:text-white transition-colors">
          <ArrowLeft size={13} /> Back to Journal
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap px-3 py-2 rounded-2xl"
        style={{ background: "rgba(16,16,16,0.9)", border: "1px solid #262626" }}>
        <button className={btn} style={btnStyle} onClick={() => addTopic("topic")}>
          <Plus size={15} /> Topic
        </button>
        <button className={btn} style={btnStyle} onClick={() => addTopic("note")}>
          <StickyNote size={15} /> Note
        </button>
        <div className="w-px h-6 mx-1" style={{ background: "#262626" }} />
        <button className={btn} style={btnStyle} onClick={undo} title="Undo"><Undo2 size={15} /></button>
        <button className={btn} style={btnStyle} onClick={redo} title="Redo"><Redo2 size={15} /></button>
        <button className={btn} style={btnStyle} onClick={fit} title="Reset zoom"><Maximize size={15} /></button>
        <div className="w-px h-6 mx-1" style={{ background: "#262626" }} />
        {/* dictates into whichever node is selected */}
        {selected ? (
          <VoiceMic label="Voice note"
            onText={t => {
              const n = nodes.find(x => x.id === selected);
              if (n) updateNode(selected, { text: appendNote(n.text, t) });
            }} />
        ) : (
          <span className="font-sans text-xs px-2" style={{ color: "#555" }}>
            Select a node to dictate
          </span>
        )}
        <div className="w-px h-6 mx-1" style={{ background: "#262626" }} />
        <button className={btn} style={btnStyle} onClick={exportJson}>
          <Download size={15} /> Export
        </button>
        {selected && selected !== "root" && (
          <button className={btn} onClick={() => removeNode(selected)}
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", color: "#EF4444" }}>
            <Trash2 size={15} /> Delete
          </button>
        )}
      </div>

      {/* Canvas */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{ border: "1px solid #262626", background: "rgba(10,10,12,0.75)" }}>
        <div
          ref={canvasRef}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={() => { setSelected(null); setEditing(null); }}
          className="relative select-none"
          style={{
            height: 600,
            overflow: "auto",
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: `${26 * scale}px ${26 * scale}px`,
          }}
        >
          <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 2000, height: 1400, position: "relative" }}>
            {/* curved links parent → child */}
            <svg className="absolute inset-0 pointer-events-none" width={2000} height={1400}>
              {visible.filter(n => n.parentId).map(n => {
                const p = nodes.find(x => x.id === n.parentId);
                if (!p || hidden.has(p.id)) return null;
                const x1 = p.x + NODE_W, y1 = p.y + NODE_H / 2;
                const x2 = n.x,          y2 = n.y + NODE_H / 2;
                const mid = (x1 + x2) / 2;
                return (
                  <path key={n.id}
                    d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                    stroke={TEAL} strokeWidth={2.5} fill="none" opacity={0.85} />
                );
              })}
            </svg>

            {visible.map(node => {
              const isRoot = node.parentId === null && node.id === "root";
              const isSel  = selected === node.id;
              const isEdit = editing === node.id;
              const kids   = nodes.filter(n => n.parentId === node.id).length;
              return (
                <div key={node.id}
                  onPointerDown={e => startDrag(e, node)}
                  onClick={e => { e.stopPropagation(); setSelected(node.id); }}
                  onDoubleClick={() => setEditing(node.id)}
                  className="absolute group flex items-center rounded-2xl px-4"
                  style={{
                    left: node.x, top: node.y, width: NODE_W, minHeight: NODE_H,
                    background: isRoot ? TEAL : node.kind === "note" ? "rgba(245,158,11,0.10)" : "rgba(16,22,26,0.95)",
                    border: `2px solid ${isRoot ? TEAL : node.kind === "note" ? "rgba(245,158,11,0.5)" : `${TEAL}66`}`,
                    boxShadow: isSel ? `0 0 0 3px ${TEAL}44` : "0 4px 14px rgba(0,0,0,0.5)",
                    cursor: isEdit ? "text" : "grab",
                  }}
                >
                  {isEdit ? (
                    <textarea autoFocus value={node.text}
                      onPointerDown={e => e.stopPropagation()}
                      onChange={e => updateNode(node.id, { text: e.target.value })}
                      onBlur={() => { setEditing(null); save(nodes); }}
                      placeholder="Type…"
                      className="w-full bg-transparent font-sans text-base font-bold focus:outline-none resize-none py-3 leading-snug"
                      style={{ color: isRoot ? "#04211f" : "#fff" }} />
                  ) : (
                    <p className="w-full font-sans text-base font-bold py-3 leading-snug break-words"
                      style={{ color: isRoot ? "#04211f" : node.text ? "#fff" : "#667" }}>
                      {node.text || "Double-click to edit"}
                    </p>
                  )}

                  {/* add child */}
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); addChild(node.id); }}
                    title="Add branch (Tab)"
                    className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: TEAL, color: "#04211f" }}>
                    <Plus size={15} strokeWidth={3} />
                  </button>

                  {/* collapse toggle */}
                  {kids > 0 && (
                    <button
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); toggleCollapse(node.id); }}
                      title={node.collapsed ? `Expand ${kids}` : "Collapse"}
                      className="absolute -right-3.5 -bottom-3.5 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(10,14,16,0.95)", border: `1.5px solid ${TEAL}`, color: TEAL }}>
                      {node.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* zoom controls */}
        <div className="absolute left-3 bottom-3 flex flex-col rounded-xl overflow-hidden"
          style={{ background: "rgba(16,16,16,0.95)", border: "1px solid #262626" }}>
          <button onClick={() => setScale(s => Math.min(2, +(s + 0.1).toFixed(2)))}
            className="w-9 h-9 flex items-center justify-center hover:bg-white/5" title="Zoom in">
            <ZoomIn size={15} color="#ccc" />
          </button>
          <button onClick={() => setScale(s => Math.max(0.4, +(s - 0.1).toFixed(2)))}
            className="w-9 h-9 flex items-center justify-center hover:bg-white/5" title="Zoom out">
            <ZoomOut size={15} color="#ccc" />
          </button>
          <button onClick={fit}
            className="w-9 h-9 flex items-center justify-center hover:bg-white/5" title="Reset">
            <Maximize size={14} color="#ccc" />
          </button>
        </div>

        {/* shortcut hint */}
        <div className="absolute right-3 bottom-3 px-3 py-1.5 rounded-lg font-sans text-[11px]"
          style={{ background: "rgba(16,16,16,0.95)", border: "1px solid #262626", color: "#777" }}>
          Tab = branch · Enter = sibling · F2 = edit · Del = remove
        </div>
      </div>
    </div>
  );
}
