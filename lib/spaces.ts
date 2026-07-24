// Space system — separate work areas, each with its own journal, trades,
// accounts, habits and settings. Implemented by swapping the app's
// localStorage keys in and out of per-space snapshots; the cloud row
// stores every space side by side (see cloudSync.ts).

export interface Space { id: string; name: string; }

interface Registry { current: string; spaces: Space[]; }

const REG_KEY     = "sabar-spaces";
const DATA_PREFIX = "sabar-space-data::";

// Keys that stay global across spaces (auth, theme, the registry itself).
const EXCLUDE = new Set([REG_KEY, "sabar-theme", "sabar-accounts", "sabar-session", "sabar-notion-imgs"]);

export function getRegistry(): Registry {
  try {
    const raw = localStorage.getItem(REG_KEY);
    if (raw) {
      const r = JSON.parse(raw) as Registry;
      if (r?.current && Array.isArray(r.spaces) && r.spaces.length > 0) return r;
    }
  } catch {}
  return { current: "default", spaces: [{ id: "default", name: "Main" }] };
}

function saveRegistry(r: Registry): void {
  localStorage.setItem(REG_KEY, JSON.stringify(r));
}

export const currentSpaceId = (): string =>
  typeof window === "undefined" ? "default" : getRegistry().current;

export const listSpaces = (): Space[] => getRegistry().spaces;

function swappableKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith("sabar-")) continue;
    if (EXCLUDE.has(k) || k.startsWith(DATA_PREFIX)) continue;
    keys.push(k);
  }
  return keys;
}

/** Save the live keys into the current space's snapshot, load the target's, reload. */
export function switchSpace(id: string): void {
  const reg = getRegistry();
  if (id === reg.current || !reg.spaces.some(s => s.id === id)) return;

  const snap: Record<string, string> = {};
  for (const k of swappableKeys()) {
    const v = localStorage.getItem(k);
    if (v !== null) snap[k] = v;
  }
  localStorage.setItem(DATA_PREFIX + reg.current, JSON.stringify(snap));

  for (const k of swappableKeys()) localStorage.removeItem(k);

  try {
    const raw = localStorage.getItem(DATA_PREFIX + id);
    if (raw) {
      const data = JSON.parse(raw) as Record<string, string>;
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
    }
  } catch {}

  reg.current = id;
  saveRegistry(reg);
  window.location.reload();
}

/** Create a fresh empty space and switch into it. */
export function createSpace(name: string): void {
  const reg = getRegistry();
  const id = "sp_" + Date.now().toString(36);
  reg.spaces.push({ id, name: name.trim() || "Space" });
  saveRegistry(reg);
  switchSpace(id);
}

/** Delete a non-active space (its local snapshot is removed; cloud copy stays). */
export function deleteSpace(id: string): void {
  const reg = getRegistry();
  if (id === reg.current || id === "default") return;
  reg.spaces = reg.spaces.filter(s => s.id !== id);
  localStorage.removeItem(DATA_PREFIX + id);
  saveRegistry(reg);
}
