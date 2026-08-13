/**
 * Checklist templates: saved variants of the A+ checklist (rules + chart slots)
 * that can be swapped from the dashboard.
 *
 * "System Default (A+)" is virtual — it is not stored in the template list and
 * cannot be edited. Activating it restores the built-in rules and the five
 * built-in chart slots.
 */

export type DirectionScope = "BOTH" | "BULLISH" | "BEARISH";
export type SessionScope   = "BOTH" | "ASIAN" | "LONDON" | "NEW_YORK";

export interface TemplateRule {
  id: string;
  label: string;
  category: "BASIS" | "ENTRY";
  /** Which direction / session this rule shows up for. */
  directionScope: DirectionScope;
  sessionScope: SessionScope;
  /** Required rules are plain; optional ones render as Either/Or alternatives. */
  required: boolean;
  /** Sub-rules, drawn indented under their parent on the checklist. */
  children?: TemplateRule[];
  note?: string;
}

export const newRule = (): TemplateRule => ({
  id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  label: "",
  category: "BASIS",
  directionScope: "BOTH",
  sessionScope: "BOTH",
  required: true,
  children: [],
});

export interface TemplateSlot {
  id: string;
  label: string;
  sub: string;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string;
  directionScope: DirectionScope;
  sessionScope: SessionScope;
  slots: TemplateSlot[];
  rules: TemplateRule[];
}

export const SYSTEM_TEMPLATE_ID = "system";
export const SYSTEM_TEMPLATE_NAME = "System Default (A+)";
export const MAX_SLOTS = 10;

export const TEMPLATES_KEY = "sabar-checklist-templates";
export const ACTIVE_TEMPLATE_KEY = "sabar-active-template";

/** The five built-in snapshot slots — what System Default restores. */
export const DEFAULT_SLOTS: TemplateSlot[] = [
  { id: "weekly", label: "Weekly Proof", sub: "1W" },
  { id: "daily",  label: "Daily Proof",  sub: "1D" },
  { id: "4h",     label: "4H Proof",     sub: "4H" },
  { id: "entry",  label: "Entry Proof",  sub: "5m/15m" },
  { id: "after",  label: "After",        sub: "TP/SL Result" },
];

export const DIRECTION_SCOPES: { value: DirectionScope; label: string }[] = [
  { value: "BOTH",    label: "Both"    },
  { value: "BULLISH", label: "Bullish" },
  { value: "BEARISH", label: "Bearish" },
];

export const SESSION_SCOPES: { value: SessionScope; label: string }[] = [
  { value: "BOTH",     label: "Both"     },
  { value: "ASIAN",    label: "Asian"    },
  { value: "LONDON",   label: "London"   },
  { value: "NEW_YORK", label: "New York" },
];

/** Fired whenever templates or the active template change, so every panel
 *  on the dashboard (rules, snapshots, progress) can re-read at once. */
export const TEMPLATES_EVENT = "sabar-templates-changed";

export function emitTemplatesChanged() {
  try { window.dispatchEvent(new Event(TEMPLATES_EVENT)); } catch {}
}

export function loadTemplates(): ChecklistTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    return raw ? (JSON.parse(raw) as ChecklistTemplate[]) : [];
  } catch { return []; }
}

export function saveTemplates(list: ChecklistTemplate[]) {
  try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list)); } catch {}
  emitTemplatesChanged();
}

export function activeTemplateId(): string {
  try { return localStorage.getItem(ACTIVE_TEMPLATE_KEY) ?? SYSTEM_TEMPLATE_ID; }
  catch { return SYSTEM_TEMPLATE_ID; }
}

export function setActiveTemplateId(id: string) {
  try { localStorage.setItem(ACTIVE_TEMPLATE_KEY, id); } catch {}
  emitTemplatesChanged();
}

/** Write a template's snapshot slots into the store ChartSnapshots reads. */
export function applySlots(slots: TemplateSlot[]) {
  try { localStorage.setItem("sabar-proof-slots", JSON.stringify(slots)); } catch {}
}

export const emptyTemplate = (name: string): ChecklistTemplate => ({
  id: `tpl-${Date.now()}`,
  name,
  description: "",
  directionScope: "BOTH",
  sessionScope: "BOTH",
  slots: [],
  rules: [],
});

const scopeLabel = (v: string) => v.replace("_", " ");

/** Short chips shown under a template's name in the manage list. */
export const scopeChips = (t: ChecklistTemplate) =>
  [scopeLabel(t.directionScope), scopeLabel(t.sessionScope)];
