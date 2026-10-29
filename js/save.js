const DB_NAME = 'pes2027stickman';
const DB_VERSION = 1;
const STORE = 'saves';
const PROFILE_KEY = 'pes2027_profile';
const SLOT_PREFIX = 'pes2027_slot_';

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB indisponível'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'slot' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let result;
    try { result = fn(store); } catch (e) { reject(e); return; }
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
  });
}

export class SaveSystem {
  constructor() {
    this.db = null;
    this.ready = false;
  }

  async init() {
    try {
      this.db = await openDb();
      this.ready = true;
    } catch {
      this.ready = false;
    }
    return this.ready;
  }

  async saveSlot(slot, data) {
    const payload = { slot, updatedAt: Date.now(), data };
    if (this.ready) {
      try {
        await tx(this.db, 'readwrite', s => s.put(payload));
        return true;
      } catch { /* fall through */ }
    }
    try {
      localStorage.setItem(SLOT_PREFIX + slot, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  async loadSlot(slot) {
    if (this.ready) {
      try {
        const row = await tx(this.db, 'readonly', s => s.get(slot));
        if (row?.data) return row.data;
      } catch { /* fall through */ }
    }
    try {
      const raw = localStorage.getItem(SLOT_PREFIX + slot);
      if (!raw) return null;
      const row = JSON.parse(raw);
      return row?.data || null;
    } catch {
      return null;
    }
  }

  async deleteSlot(slot) {
    if (this.ready) {
      try { await tx(this.db, 'readwrite', s => s.delete(slot)); } catch { /* ignore */ }
    }
    localStorage.removeItem(SLOT_PREFIX + slot);
  }

  async listSlots(max = 4) {
    const out = [];
    for (let i = 0; i < max; i++) {
      let row = null;
      if (this.ready) {
        try { row = await tx(this.db, 'readonly', s => s.get(i)); } catch { /* ignore */ }
      }
      if (!row) {
        try { row = JSON.parse(localStorage.getItem(SLOT_PREFIX + i) || 'null'); } catch { row = null; }
      }
      out.push(row ? { slot: i, updatedAt: row.updatedAt, meta: row.data?.meta || null } : { slot: i, empty: true });
    }
    return out;
  }

  loadProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  saveProfile(profile) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      return true;
    } catch { return false; }
  }

  clearProfile() {
    localStorage.removeItem(PROFILE_KEY);
  }
}
