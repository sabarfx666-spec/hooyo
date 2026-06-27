// IndexedDB helper — chart images stored here, never in localStorage.

const DB_NAME  = 'sabar_db';
const IMG_STORE = 'images';

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

export const imgSave = async (key: string, val: string | null | undefined): Promise<void> => {
  if (!val) return;
  const db = await getDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(IMG_STORE, 'readwrite');
    tx.objectStore(IMG_STORE).put(val, key);
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
};

export const imgLoad = async (key: string): Promise<string | null> => {
  const db = await getDB();
  return new Promise((res, rej) => {
    const tx  = db.transaction(IMG_STORE, 'readonly');
    const req = tx.objectStore(IMG_STORE).get(key);
    req.onsuccess = () => res((req.result as string | undefined) ?? null);
    req.onerror   = () => rej(req.error);
  });
};

export const imgDelete = async (...keys: string[]): Promise<void> => {
  const db = await getDB();
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
