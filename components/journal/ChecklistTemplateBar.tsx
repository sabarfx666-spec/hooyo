"use client";
import { useState, useEffect, useCallback, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useSabar, defaultBiasRules } from "@/store/SabarContext";
import { Rule, BiasRuleSet } from "@/store/types";
import {
  Layers, ChevronDown, Plus, Pencil, Trash2, X, Save, Camera, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  ChecklistTemplate, TemplateRule, TemplateSlot,
  DIRECTION_SCOPES, SESSION_SCOPES, DEFAULT_SLOTS, MAX_SLOTS,
  SYSTEM_TEMPLATE_ID, SYSTEM_TEMPLATE_NAME, TEMPLATES_EVENT,
  loadTemplates, saveTemplates, activeTemplateId, setActiveTemplateId,
  applySlots, emptyTemplate, scopeChips, newRule,
} from "@/lib/templates";

const RED = "#E53E3E";
const PANEL  = { background: "#0D0D0D", border: "1px solid #1A1A1A" };
const MODAL  = { background: "#0D0D0D", border: "1px solid #262626" };
const FIELD  = { background: "#0A0A0A", border: "1px solid #262626" };

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl font-sans text-sm text-white placeholder-[#555] focus:outline-none";
const labelCls = "font-sans text-sm font-medium mb-1.5 block";

/**
 * Modals render into <body>. The bar sits inside an .anim-fade-up wrapper, and
 * that animation's transform makes the wrapper the containing block for any
 * position:fixed child — which centred these modals on the bar instead of the
 * window and pushed their titles off the top of the screen.
 */
function Portal({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);
  return host ? createPortal(children, host) : null;
}

/**
 * Flatten a template into the live checklist, once per direction. Rules scoped
 * to the other direction are dropped; children follow their parent indented.
 * "Required off" is what draws the Either/Or badge on the checklist.
 */
const toBiasRules = (rules: TemplateRule[]): BiasRuleSet => {
  const mk = (r: TemplateRule, bias: string, indent: boolean): Rule => ({
    id: `${bias}-${r.id}`,
    label: r.label,
    category: r.category,
    checked: false,
    session: r.sessionScope,
    ...(r.required ? {} : { tag: "EITHER_OR" as const }),
    ...(r.note ? { note: r.note } : {}),
    ...(indent ? { indent: true } : {}),
  });

  const inScope = (r: TemplateRule, bias: "BULLISH" | "BEARISH") =>
    r.directionScope === "BOTH" || r.directionScope === bias;

  const build = (bias: "BULLISH" | "BEARISH"): Rule[] => {
    const out: Rule[] = [];
    for (const r of rules) {
      if (!inScope(r, bias)) continue;
      out.push(mk(r, bias, false));
      // A child is an alternative of its parent, so it takes the parent's
      // category and scope — only its label and position are its own.
      for (const c of r.children ?? []) {
        out.push(mk({ ...r, id: c.id, label: c.label, children: [] }, bias, true));
      }
    }
    return out;
  };

  return { BULLISH: build("BULLISH"), BEARISH: build("BEARISH") };
};

/* ────────────────────────── Rule row ────────────────────────── */

const selCls =
  "px-2.5 py-2 rounded-lg font-sans text-xs text-white focus:outline-none cursor-pointer";
const selStyle = { background: "#141414", border: "1px solid #262626" };

/** Children are alternatives of their parent — just a label and a delete. */
function ChildRuleRow({ rule, onPatch, onRemove }: {
  rule: TemplateRule;
  onPatch: (p: Partial<TemplateRule>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl p-3" style={FIELD}>
      <span className="shrink-0 font-sans text-sm" style={{ color: RED }}>↳</span>
      <input value={rule.label} placeholder="Child rule label..."
        className="flex-1 px-3 py-2 rounded-lg font-sans text-sm text-white placeholder-[#555] focus:outline-none"
        style={selStyle}
        onChange={e => onPatch({ label: e.target.value })} />
      <button onClick={onRemove} title="Delete child rule"
        className="p-1.5 shrink-0 transition-colors hover:opacity-70" style={{ color: RED }}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function RuleRow({ rule, canUp, canDown, onPatch, onRemove, onMove, onAddChild }: {
  rule: TemplateRule;
  canUp: boolean;
  canDown: boolean;
  onPatch: (p: Partial<TemplateRule>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onAddChild?: () => void;
}) {
  // An Either/Or group is the rule plus its alternatives
  const groupSize = 1 + (rule.children?.length ?? 0);

  return (
    <div className="rounded-xl p-3 space-y-2.5" style={FIELD}>
      {/* Label + reorder + delete */}
      <div className="flex items-center gap-2">
        <input value={rule.label} placeholder="Rule label..."
          className="flex-1 px-3 py-2 rounded-lg font-sans text-sm text-white placeholder-[#555] focus:outline-none"
          style={selStyle}
          onChange={e => onPatch({ label: e.target.value })} />
        <button onClick={() => onMove(-1)} disabled={!canUp} title="Move up"
          className="p-1.5 shrink-0 transition-colors"
          style={{ color: canUp ? "#8A8A8A" : "#333", cursor: canUp ? "pointer" : "not-allowed" }}>
          <ArrowUp size={16} />
        </button>
        <button onClick={() => onMove(1)} disabled={!canDown} title="Move down"
          className="p-1.5 shrink-0 transition-colors"
          style={{ color: canDown ? "#8A8A8A" : "#333", cursor: canDown ? "pointer" : "not-allowed" }}>
          <ArrowDown size={16} />
        </button>
        <button onClick={onRemove} title="Delete rule"
          className="p-1.5 shrink-0 transition-colors hover:opacity-70" style={{ color: RED }}>
          <Trash2 size={16} />
        </button>
      </div>

      {/* Category · direction · session */}
      <div className="grid grid-cols-3 gap-2">
        <select value={rule.category} className={selCls} style={selStyle}
          onChange={e => onPatch({ category: e.target.value as TemplateRule["category"] })}>
          <option value="BASIS" style={selStyle}>HTF</option>
          <option value="ENTRY" style={selStyle}>LTF</option>
        </select>
        <select value={rule.directionScope} className={selCls} style={selStyle}
          onChange={e => onPatch({ directionScope: e.target.value as TemplateRule["directionScope"] })}>
          {DIRECTION_SCOPES.map(s => (
            <option key={s.value} value={s.value} style={selStyle}>{s.label}</option>
          ))}
        </select>
        <select value={rule.sessionScope} className={selCls} style={selStyle}
          onChange={e => onPatch({ sessionScope: e.target.value as TemplateRule["sessionScope"] })}>
          {SESSION_SCOPES.map(s => (
            <option key={s.value} value={s.value} style={selStyle}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Required toggle */}
      <div className="flex items-center gap-2.5">
        <button onClick={() => onPatch({ required: !rule.required })}
          title={rule.required ? "Required rule" : "Optional — shows as Either/Or"}
          className="relative w-10 h-5 rounded-full shrink-0 transition-colors"
          style={{ background: rule.required ? RED : "#2A2A2A" }}>
          <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
            style={{ left: rule.required ? 22 : 2 }} />
        </button>
        <span className="font-sans text-sm" style={{ color: rule.required ? "#D0D0D0" : "#666" }}>
          Required
        </span>
        {!rule.required && (
          <span className="px-2.5 py-1 rounded-full font-sans text-xs"
            style={{ background: "#141414", border: "1px solid #2A2A2A", color: "#C0C0C0" }}>
            Either/Or · {groupSize} rule{groupSize !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {onAddChild && (
        <button onClick={onAddChild}
          className="flex items-center gap-1.5 font-sans text-sm transition-colors hover:text-white"
          style={{ color: "#8A8A8A" }}>
          <Plus size={15} /> Add Child Rule
        </button>
      )}
    </div>
  );
}

/* ────────────────────────── Create Template modal ────────────────────────── */

function CreateTemplateModal({ onCancel, onCreate }: {
  onCancel: () => void;
  onCreate: (t: ChecklistTemplate) => void;
}) {
  const [draft, setDraft] = useState<ChecklistTemplate>(() => emptyTemplate(""));
  const canCreate = draft.name.trim().length > 0;

  return (
    <Portal>
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-xl my-auto rounded-2xl p-6 space-y-5" style={MODAL}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers size={19} style={{ color: RED }} />
            <h3 className="font-sans font-bold text-white text-lg">Create Template</h3>
          </div>
          <button onClick={onCancel} className="text-[#666] hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div>
          <label className={labelCls} style={{ color: "#D0D0D0" }}>
            Template Name <span style={{ color: RED }}>*</span>
          </label>
          <input autoFocus value={draft.name} className={inputCls} style={FIELD}
            placeholder="e.g. My London Model"
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
        </div>

        <div>
          <label className={labelCls} style={{ color: "#D0D0D0" }}>Description</label>
          <textarea rows={3} value={draft.description}
            className={`${inputCls} resize-none leading-relaxed`} style={FIELD}
            placeholder="Optional description..."
            onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} style={{ color: "#D0D0D0" }}>Direction Scope</label>
            <select value={draft.directionScope} className={`${inputCls} cursor-pointer`} style={FIELD}
              onChange={e => setDraft(d => ({ ...d, directionScope: e.target.value as ChecklistTemplate["directionScope"] }))}>
              {DIRECTION_SCOPES.map(s => (
                <option key={s.value} value={s.value} style={{ background: "#0A0A0A" }}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} style={{ color: "#D0D0D0" }}>Session Scope</label>
            <select value={draft.sessionScope} className={`${inputCls} cursor-pointer`} style={FIELD}
              onChange={e => setDraft(d => ({ ...d, sessionScope: e.target.value as ChecklistTemplate["sessionScope"] }))}>
              {SESSION_SCOPES.map(s => (
                <option key={s.value} value={s.value} style={{ background: "#0A0A0A" }}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button onClick={onCancel}
            className="py-3 rounded-xl font-sans text-sm font-semibold transition-all hover:bg-white/5"
            style={{ background: "transparent", border: "1px solid #2A2A2A", color: "#D0D0D0" }}>
            Cancel
          </button>
          <button disabled={!canCreate}
            onClick={() => onCreate({ ...draft, name: draft.name.trim() })}
            className="py-3 rounded-xl font-sans text-sm font-bold text-white transition-all"
            style={{ background: RED, opacity: canCreate ? 1 : 0.4, cursor: canCreate ? "pointer" : "not-allowed" }}>
            Create &amp; Add Rules
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

/* ────────────────────────── Template editor modal ────────────────────────── */

function EditTemplateModal({ template, allTemplates, onBack, onSave, onPick }: {
  template: ChecklistTemplate;
  allTemplates: ChecklistTemplate[];
  onBack: () => void;
  onSave: (t: ChecklistTemplate) => void;
  onPick: (id: string) => void;
}) {
  const [draft, setDraft] = useState<ChecklistTemplate>(() => ({
    ...template,
    slots: template.slots.map(s => ({ ...s })),
    rules: template.rules.map(r => ({ ...r })),
  }));

  const patch = (p: Partial<ChecklistTemplate>) => setDraft(d => ({ ...d, ...p }));

  const addSlot = () => {
    if (draft.slots.length >= MAX_SLOTS) return;
    patch({ slots: [...draft.slots, { id: `s-${Date.now()}`, label: "New Slot", sub: "" }] });
  };
  const updateSlot = (id: string, field: keyof TemplateSlot, v: string) =>
    patch({ slots: draft.slots.map(s => s.id === id ? { ...s, [field]: v } : s) });
  const removeSlot = (id: string) => patch({ slots: draft.slots.filter(s => s.id !== id) });

  const addRule = () => patch({ rules: [...draft.rules, newRule()] });

  const updateRule = (id: string, p: Partial<TemplateRule>) =>
    patch({ rules: draft.rules.map(r => r.id === id ? { ...r, ...p } : r) });
  const removeRule = (id: string) => patch({ rules: draft.rules.filter(r => r.id !== id) });

  /** Swap a rule with its neighbour to reorder the checklist. */
  const moveRule = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= draft.rules.length) return;
    const next = [...draft.rules];
    [next[index], next[to]] = [next[to], next[index]];
    patch({ rules: next });
  };

  const addChild = (parentId: string) =>
    patch({ rules: draft.rules.map(r =>
      r.id === parentId ? { ...r, children: [...(r.children ?? []), newRule()] } : r) });

  const patchChild = (parentId: string, childId: string, p: Partial<TemplateRule>) =>
    patch({ rules: draft.rules.map(r =>
      r.id === parentId
        ? { ...r, children: (r.children ?? []).map(c => c.id === childId ? { ...c, ...p } : c) }
        : r) });

  const removeChild = (parentId: string, childId: string) =>
    patch({ rules: draft.rules.map(r =>
      r.id === parentId
        ? { ...r, children: (r.children ?? []).filter(c => c.id !== childId) }
        : r) });


  return (
    <Portal>
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-3xl max-h-[88vh] rounded-2xl flex flex-col" style={MODAL}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <Layers size={19} style={{ color: RED }} />
            <h3 className="font-sans font-bold text-white text-lg">{draft.name || "Untitled"}</h3>
          </div>
          <button onClick={onBack} className="text-[#666] hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-5">

          {/* Which template is being edited */}
          <div>
            <label className={labelCls} style={{ color: "#D0D0D0" }}>Editing Template</label>
            <select value={draft.id} className={`${inputCls} cursor-pointer`} style={FIELD}
              onChange={e => onPick(e.target.value)}>
              {allTemplates.map(t => (
                <option key={t.id} value={t.id} style={{ background: "#0A0A0A" }}>{t.name}</option>
              ))}
            </select>
            <p className="font-sans text-[11px] mt-1.5" style={{ color: "#666" }}>
              Note: &quot;{SYSTEM_TEMPLATE_NAME}&quot; uses the 5 built-in slots and isn&apos;t customizable.
              Create or pick a template to set your own snapshots.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} style={{ color: "#D0D0D0" }}>Template Name</label>
              <input value={draft.name} className={inputCls} style={FIELD}
                onChange={e => patch({ name: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} style={{ color: "#D0D0D0" }}>Description</label>
              <input value={draft.description} className={inputCls} style={FIELD} placeholder="Optional..."
                onChange={e => patch({ description: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} style={{ color: "#D0D0D0" }}>Direction Scope</label>
              <select value={draft.directionScope} className={`${inputCls} cursor-pointer`} style={FIELD}
                onChange={e => patch({ directionScope: e.target.value as ChecklistTemplate["directionScope"] })}>
                {DIRECTION_SCOPES.map(s => (
                  <option key={s.value} value={s.value} style={{ background: "#0A0A0A" }}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} style={{ color: "#D0D0D0" }}>Session Scope</label>
              <select value={draft.sessionScope} className={`${inputCls} cursor-pointer`} style={FIELD}
                onChange={e => patch({ sessionScope: e.target.value as ChecklistTemplate["sessionScope"] })}>
                {SESSION_SCOPES.map(s => (
                  <option key={s.value} value={s.value} style={{ background: "#0A0A0A" }}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Chart snapshots */}
          <div className="pt-1 border-t" style={{ borderColor: "#1A1A1A" }}>
            <div className="flex items-center justify-between mt-4 mb-1.5">
              <div className="flex items-center gap-2">
                <Camera size={15} style={{ color: RED }} />
                <h4 className="font-sans font-bold text-white text-sm">
                  Chart Snapshots ({draft.slots.length}/{MAX_SLOTS})
                </h4>
              </div>
              <button onClick={addSlot} disabled={draft.slots.length >= MAX_SLOTS}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans text-xs font-semibold transition-all hover:bg-white/5"
                style={{ background: "transparent", border: "1px solid #2A2A2A", color: "#D0D0D0",
                         opacity: draft.slots.length >= MAX_SLOTS ? 0.4 : 1 }}>
                <Plus size={13} /> Add Slot
              </button>
            </div>
            <p className="font-sans text-[11px] mb-3" style={{ color: "#666" }}>
              Add the charts you want for this template (e.g. 1H, 30m, Confluence). Up to {MAX_SLOTS}.
            </p>

            {draft.slots.length === 0 ? (
              <div className="rounded-xl py-7 text-center" style={{ border: "1px dashed #262626" }}>
                <p className="font-sans text-xs" style={{ color: "#555" }}>
                  No chart slots yet. Click &quot;Add Slot&quot; to create your own.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {draft.slots.map(slot => (
                  <div key={slot.id} className="flex items-center gap-2 p-2 rounded-xl" style={FIELD}>
                    <input value={slot.label} placeholder="Slot name"
                      className="flex-1 px-2.5 py-1.5 rounded-lg font-sans text-xs text-white placeholder-[#555] focus:outline-none"
                      style={{ background: "#141414", border: "1px solid #262626" }}
                      onChange={e => updateSlot(slot.id, "label", e.target.value)} />
                    <input value={slot.sub} placeholder="Subtitle (1H, 30m…)"
                      className="flex-1 px-2.5 py-1.5 rounded-lg font-sans text-xs text-[#A0A0A0] placeholder-[#555] focus:outline-none"
                      style={{ background: "#141414", border: "1px solid #262626" }}
                      onChange={e => updateSlot(slot.id, "sub", e.target.value)} />
                    <button onClick={() => removeSlot(slot.id)} title="Remove slot"
                      className="p-1.5 shrink-0 text-[#555] hover:text-[#EF4444] transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rules */}
          <div className="pt-1 border-t" style={{ borderColor: "#1A1A1A" }}>
            <div className="flex items-center justify-between mt-4 mb-3">
              <h4 className="font-sans font-bold text-white text-sm">Rules ({draft.rules.length})</h4>
              <button onClick={addRule}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans text-xs font-semibold transition-all hover:bg-white/5"
                style={{ background: "transparent", border: "1px solid #2A2A2A", color: "#D0D0D0" }}>
                <Plus size={13} /> Add Rule
              </button>
            </div>

            {draft.rules.length === 0 ? (
              <div className="rounded-xl py-7 text-center" style={{ border: "1px dashed #262626" }}>
                <p className="font-sans text-xs" style={{ color: "#555" }}>
                  No rules yet. Add rules to build your checklist.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {draft.rules.map((rule, i) => (
                  <div key={rule.id} className="space-y-2">
                    <RuleRow
                      rule={rule}
                      canUp={i > 0} canDown={i < draft.rules.length - 1}
                      onPatch={p => updateRule(rule.id, p)}
                      onRemove={() => removeRule(rule.id)}
                      onMove={dir => moveRule(i, dir)}
                      onAddChild={() => addChild(rule.id)}
                    />
                    {(rule.children ?? []).map(child => (
                      <div key={child.id} className="ml-4 pl-2"
                        style={{ borderLeft: `2px solid ${RED}55` }}>
                        <ChildRuleRow
                          rule={child}
                          onPatch={p => patchChild(rule.id, child.id, p)}
                          onRemove={() => removeChild(rule.id, child.id)}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="grid grid-cols-2 gap-3 px-6 py-5 border-t" style={{ borderColor: "#1A1A1A" }}>
          <button onClick={onBack}
            className="py-3 rounded-xl font-sans text-sm font-semibold transition-all hover:bg-white/5"
            style={{ background: "transparent", border: "1px solid #2A2A2A", color: "#D0D0D0" }}>
            Back
          </button>
          <button onClick={() => onSave(draft)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-sans text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: RED }}>
            <Save size={15} /> Save Template
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

/* ────────────────────────── My Templates modal ────────────────────────── */

function ManageTemplatesModal({ templates, onClose, onCreate, onEdit, onDelete }: {
  templates: ChecklistTemplate[];
  onClose: () => void;
  onCreate: () => void;
  onEdit: (t: ChecklistTemplate) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Portal>
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-lg my-auto rounded-2xl p-6 space-y-4" style={MODAL}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers size={19} style={{ color: RED }} />
            <h3 className="font-sans font-bold text-white text-lg">My Templates</h3>
          </div>
          <button onClick={onClose} className="text-[#666] hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {templates.length === 0 ? (
          <p className="font-sans text-sm text-center py-8" style={{ color: "#666" }}>
            No templates yet — create your first one below.
          </p>
        ) : (
          <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
            {templates.map(t => (
              <div key={t.id} className="flex items-start justify-between gap-3 rounded-xl px-4 py-3" style={FIELD}>
                <div className="min-w-0">
                  <p className="font-sans font-bold text-white text-base truncate">{t.name}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {scopeChips(t).map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full font-sans text-[10px] font-semibold uppercase"
                        style={{ background: "#141414", border: "1px solid #262626", color: "#8A8A8A" }}>
                        {c}
                      </span>
                    ))}
                    <span className="font-sans text-[10px] ml-1" style={{ color: "#555" }}>
                      {t.rules.length} rule{t.rules.length !== 1 ? "s" : ""} · {t.slots.length} slot{t.slots.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onEdit(t)} title="Edit template"
                    className="p-2 text-[#8A8A8A] hover:text-white transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => onDelete(t.id)} title="Delete template"
                    className="p-2 text-[#8A8A8A] hover:text-[#EF4444] transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={onCreate}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-sans text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ background: RED }}>
          <Plus size={16} strokeWidth={3} /> Create New Template
        </button>
      </div>
    </div>
    </Portal>
  );
}

/* ────────────────────────── The bar itself ────────────────────────── */

export function ChecklistTemplateBar() {
  const { dispatch } = useSabar();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [activeId, setActiveId]   = useState(SYSTEM_TEMPLATE_ID);
  const [mounted, setMounted]     = useState(false);
  const [open, setOpen]           = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]     = useState<ChecklistTemplate | null>(null);

  const refresh = useCallback(() => {
    setTemplates(loadTemplates());
    setActiveId(activeTemplateId());
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
    window.addEventListener(TEMPLATES_EVENT, refresh);
    return () => window.removeEventListener(TEMPLATES_EVENT, refresh);
  }, [refresh]);

  const active = templates.find(t => t.id === activeId) ?? null;
  const activeName = active?.name ?? SYSTEM_TEMPLATE_NAME;

  /** Load a template's rules + slots into the live checklist. */
  const activate = (id: string) => {
    if (id === SYSTEM_TEMPLATE_ID) {
      dispatch({ type: "SET_BIAS_RULES", payload: defaultBiasRules });
      applySlots(DEFAULT_SLOTS);
    } else {
      const t = loadTemplates().find(x => x.id === id);
      if (!t) return;
      dispatch({ type: "SET_BIAS_RULES", payload: toBiasRules(t.rules) });
      applySlots(t.slots.length ? t.slots : DEFAULT_SLOTS);
    }
    setActiveTemplateId(id);
    setOpen(false);
  };

  const persist = (list: ChecklistTemplate[]) => { saveTemplates(list); setTemplates(list); };

  const handleCreate = (t: ChecklistTemplate) => {
    persist([...loadTemplates(), t]);
    setShowCreate(false);
    setEditing(t);                       // straight into "Create & Add Rules"
  };

  const handleSave = (t: ChecklistTemplate) => {
    const list = loadTemplates();
    const next = list.some(x => x.id === t.id)
      ? list.map(x => (x.id === t.id ? t : x))
      : [...list, t];
    persist(next);
    // Keep the live checklist in step when the template being edited is active
    if (t.id === activeTemplateId()) {
      dispatch({ type: "SET_BIAS_RULES", payload: toBiasRules(t.rules) });
      applySlots(t.slots.length ? t.slots : DEFAULT_SLOTS);
    }
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    persist(loadTemplates().filter(t => t.id !== id));
    // Deleting the active template drops you back to the built-in checklist
    if (id === activeTemplateId()) activate(SYSTEM_TEMPLATE_ID);
  };

  if (!mounted) return null;

  return (
    <>
      <div>
        <p className="font-sans text-sm font-medium mb-2" style={{ color: "#A0A0A0" }}>Checklist Template</p>

        <div className="relative">
          <button onClick={() => setOpen(o => !o)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all hover:bg-white/[0.02]"
            style={PANEL}>
            <Layers size={17} style={{ color: RED }} />
            <span className="font-sans font-semibold text-white text-sm">{activeName}</span>
            {!active && (
              <span className="px-2.5 py-0.5 rounded-full font-sans text-[11px] font-semibold"
                style={{ background: "rgba(229,62,62,0.1)", border: `1px solid ${RED}55`, color: RED }}>
                Default
              </span>
            )}
            <ChevronDown size={17} className="ml-auto shrink-0" style={{ color: "#666" }} />
          </button>

          {open && (
            <>
              {/* Click-away catcher — portaled so it covers the whole window,
                  not just the animated wrapper's box */}
              <Portal>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              </Portal>
              <div className="absolute left-0 top-full mt-1 w-72 z-50 rounded-xl overflow-hidden py-1"
                style={{ background: "#0A0A0A", border: "1px solid #262626", boxShadow: "0 12px 32px rgba(0,0,0,0.7)" }}>

                {[{ id: SYSTEM_TEMPLATE_ID, name: SYSTEM_TEMPLATE_NAME }, ...templates].map(t => {
                  const isActive = t.id === activeId;
                  return (
                    <button key={t.id} onClick={() => activate(t.id)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-white/5">
                      <Layers size={15} style={{ color: isActive ? RED : "#8A8A8A" }} />
                      <span className="font-sans text-sm truncate"
                        style={{ color: isActive ? RED : "#E0E0E0" }}>{t.name}</span>
                      {isActive && (
                        <span className="ml-auto px-2 py-0.5 rounded-full font-sans text-[10px] font-semibold shrink-0"
                          style={{ background: "rgba(229,62,62,0.1)", border: `1px solid ${RED}55`, color: RED }}>
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}

                <div className="my-1 h-px" style={{ background: "#1A1A1A" }} />

                <button onClick={() => { setOpen(false); setShowCreate(true); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-white/5">
                  <Plus size={15} style={{ color: RED }} />
                  <span className="font-sans text-sm" style={{ color: RED }}>Create Template</span>
                </button>
                <button onClick={() => { setOpen(false); setShowManage(true); }}
                  className="w-full flex items-center px-4 py-2.5 transition-colors hover:bg-white/5">
                  <span className="font-sans text-sm" style={{ color: "#8A8A8A" }}>Manage Templates...</span>
                </button>
              </div>
            </>
          )}
        </div>

        {active?.description && (
          <p className="font-sans text-xs mt-1.5" style={{ color: "#666" }}>{active.description}</p>
        )}
      </div>

      {showManage && (
        <ManageTemplatesModal
          templates={templates}
          onClose={() => setShowManage(false)}
          onCreate={() => { setShowManage(false); setShowCreate(true); }}
          onEdit={t => { setShowManage(false); setEditing(t); }}
          onDelete={handleDelete}
        />
      )}

      {showCreate && (
        <CreateTemplateModal onCancel={() => setShowCreate(false)} onCreate={handleCreate} />
      )}

      {editing && (
        <EditTemplateModal
          template={editing}
          allTemplates={templates.length ? templates : [editing]}
          onBack={() => setEditing(null)}
          onSave={handleSave}
          onPick={id => {
            const next = loadTemplates().find(t => t.id === id);
            if (next) setEditing(next);
          }}
        />
      )}
    </>
  );
}
