export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, v) => b === a ? 0 : (v - a) / (b - a);
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const dist2 = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; };
export const sign = v => v < 0 ? -1 : v > 0 ? 1 : 0;
export const deg = r => r * 180 / Math.PI;
export const rad = d => d * Math.PI / 180;

export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed = 1) { this.next = typeof seed === 'function' ? seed : mulberry32(hashSeed(String(seed))); }
  f() { return this.next(); }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  weighted(items, weightFn) {
    let total = 0;
    for (const it of items) total += Math.max(0.0001, weightFn(it));
    let r = this.next() * total;
    for (const it of items) { r -= Math.max(0.0001, weightFn(it)); if (r <= 0) return it; }
    return items[items.length - 1];
  }
  gauss(mean = 0, sd = 1) {
    let u = 0, v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }
}

export const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
export const choice = arr => arr[Math.floor(Math.random() * arr.length)];
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = arr => new RNG(Math.random() * 1e9 | 0).shuffle(arr);
export const fmt = (n, d = 0) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
export const pad2 = n => String(n).padStart(2, '0');
export const fmtClock = s => `${pad2(Math.floor(s / 60))}:${pad2(Math.floor(s % 60))}`;
export const money = v => {
  if (v >= 1e9) return `€${(v / 1e9).toFixed(1).replace('.', ',')}B`;
  if (v >= 1e6) return `€${(v / 1e6).toFixed(1).replace('.', ',')}M`;
  if (v >= 1e3) return `€${Math.round(v / 1e3)}K`;
  return `€${Math.round(v)}`;
};
export const moneyShort = v => {
  if (v >= 1e9) return `€${(v / 1e9).toFixed(2).replace('.', ',')}B`;
  if (v >= 1e6) return `€${(v / 1e6).toFixed(1).replace('.', ',')}M`;
  return `€${Math.round(v / 1e3)}K`;
};
export const roman = n => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n);
export const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const escapeAttr = escapeHtml;
export const slug = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function hexToRgb(hex) {
  let h = String(hex || '#ffffff').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}
export function shade(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  if (amt >= 0) return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  return rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
}
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(lerp(A.r, B.r, t), lerp(A.g, B.g, t), lerp(A.b, B.b, t));
}
export function textColor(bg) {
  const { r, g, b } = hexToRgb(bg);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 150 ? '#0b1a24' : '#ffffff';
}
export function rgba(hex, a = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
export function deepClone(obj) {
  if (typeof structuredClone === 'function') {
    try { return structuredClone(obj); } catch (e) { /* fall through */ }
  }
  return JSON.parse(JSON.stringify(obj));
}
export function pointSegDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
export function normalize(x, y) {
  const l = Math.hypot(x, y);
  if (l < 1e-6) return { x: 0, y: 0, len: 0 };
  return { x: x / l, y: y / l, len: l };
}
export function angleLerp(a, b, t) {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * t;
}
export function shuffleInPlace(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
export function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}
export function storageAvailable() {
  try { const k = '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch { return false; }
}
export function vibrate(pattern = 12) {
  try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
}
export function safeCssColor(c, fallback = '#35d6ff') {
  return /^#[0-9a-f]{3,8}$/i.test(String(c)) ? c : fallback;
}
export function ordinal(n) { return `${n}º`; }
export function ratingColor(v) {
  if (v >= 85) return '#ffcf4a';
  if (v >= 78) return '#43e57a';
  if (v >= 70) return '#35d6ff';
  if (v >= 62) return '#8fb0c7';
  return '#ff9a3d';
}
