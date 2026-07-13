// IndexedDB helper — chart images cached here, never in localStorage.
// Images are ALSO synced to Supabase Storage (bucket "charts") when the
// user is logged in, so they follow the account across devices and
// survive the browser's site data being cleared.

import { getSupabase } from "./supabase";

const DB_NAME  = 'sabar_db';
const IMG_STORE = 'images';
const BUCKET = 'charts';

let _db: IDBDatabase | null = null;

const getDB = (): Promise<IDBDatabase> => {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IMG_STORE);
    req.onsuccess  = () => { _db = req.result; resolve(_db!); };
    req.onerror    = () => reject(req.error);
  });
};

// ── Cloud layer (Supabase Storage) ─────────────────────────────
// Each image is stored as a text object holding its data-URL, at
// charts/<user-id>/<key>.txt — RLS policies keep it private per user.

const cloudMissing = new Set<string>(); // known-absent keys, skip repeat downloads

const cloudPath = async (key: string): Promise<string | null> => {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  const uid = data.session?.user.id;
  return uid ? `${uid}/${key}.txt` : null;
};

const cloudUpload = async (key: string, val: string): Promise<void> => {
  try {
    const sb = getSupabase();
    const path = await cloudPath(key);
    if (!sb || !path) return;
    await sb.storage.from(BUCKET).upload(path, new Blob([val], { type: 'text/plain' }), { upsert: true });
    cloudMissing.delete(key);
  } catch {}
};

const cloudDownload = async (key: string): Promise<string | null> => {
  try {
    if (cloudMissing.has(key)) return null;
    const sb = getSupabase();
    const path = await cloudPath(key);
    if (!sb || !path) return null;
    const { data, error } = await sb.storage.from(BUCKET).download(path);
    if (error || !data) { cloudMissing.add(key); return null; }
    return await data.text();
  } catch { return null; }
};

const cloudRemove = async (keys: string[]): Promise<void> => {
  try {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    await sb.storage.from(BUCKET).remove(keys.map(k => `${uid}/${k}.txt`));
  } catch {}
};

// ── Local layer (IndexedDB) with cloud sync ────────────────────

export const imgSave = async (key: string, val: string | null | undefined): Promise<void> => {
  if (!val) return;
  const db = await getDB();
  cloudUpload(key, val); // fire-and-forget so the UI never waits on the network
  return new Promise((res, rej) => {
    const tx = db.transaction(IMG_STORE, 'readwrite');
    tx.objectStore(IMG_STORE).put(val, key);
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
};

export const imgLoad = async (key: string): Promise<string | null> => {
  const db = await getDB();
  const local = await new Promise<string | null>((res, rej) => {
    const tx  = db.transaction(IMG_STORE, 'readonly');
    const req = tx.objectStore(IMG_STORE).get(key);
    req.onsuccess = () => res((req.result as string | undefined) ?? null);
    req.onerror   = () => rej(req.error);
  });
  if (local) return local;
  // Not on this device — try the cloud, then cache locally for next time
  const remote = await cloudDownload(key);
  if (remote) {
    try {
      const tx = db.transaction(IMG_STORE, 'readwrite');
      tx.objectStore(IMG_STORE).put(remote, key);
    } catch {}
  }
  return remote;
};

export const imgDelete = async (...keys: string[]): Promise<void> => {
  const db = await getDB();
  cloudRemove(keys);
  const tx = db.transaction(IMG_STORE, 'readwrite');
  const store = tx.objectStore(IMG_STORE);
  keys.forEach(k => store.delete(k));
};

const PROOF_SLOTS = ['Weekly', 'Daily', '4H', '15M', '5M', 'Result'] as const;

export const imgSaveTrade = async (tradeId: string, trade: {
  imgBefore?: string | null;
  imgAfter?: string | null;
  chartProof?: string | null;
  chartProofs?: Partial<Record<typeof PROOF_SLOTS[number], string>>;
}): Promise<void> => {
  const saves: Promise<void>[] = [
    imgSave(`${tradeId}_before`,  trade.imgBefore),
    imgSave(`${tradeId}_after`,   trade.imgAfter),
    imgSave(`${tradeId}_proof`,   trade.chartProof),
  ];
  for (const slot of PROOF_SLOTS) {
    const val = trade.chartProofs?.[slot];
    if (val) saves.push(imgSave(`${tradeId}_${slot}`, val));
  }
  await Promise.all(saves);
};

export const imgLoadTrade = async (tradeId: string): Promise<{
  imgBefore: string | null;
  imgAfter:  string | null;
  chartProof: string | null;
  chartProofs: Partial<Record<typeof PROOF_SLOTS[number], string>>;
}> => {
  const [before, after, proof, ...proofSlots] = await Promise.all([
    imgLoad(`${tradeId}_before`),
    imgLoad(`${tradeId}_after`),
    imgLoad(`${tradeId}_proof`),
    ...PROOF_SLOTS.map(s => imgLoad(`${tradeId}_${s}`)),
  ]);
  const chartProofs: Partial<Record<typeof PROOF_SLOTS[number], string>> = {};
  PROOF_SLOTS.forEach((s, i) => { if (proofSlots[i]) chartProofs[s] = proofSlots[i]!; });
  return { imgBefore: before, imgAfter: after, chartProof: proof, chartProofs };
};

export const imgDeleteTrade = (tradeId: string): Promise<void> =>
  imgDelete(
    `${tradeId}_before`,
    `${tradeId}_after`,
    `${tradeId}_proof`,
    ...PROOF_SLOTS.map(s => `${tradeId}_${s}`)
  );
