export const TAU = Math.PI * 2;

export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

export const lerp = (a, b, t) => a + (b - a) * t;

export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));

export const smooth = (t) => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};

export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

export const easeInCubic = (t) => Math.pow(clamp(t, 0, 1), 3);

export const easeOutQuint = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 5);

export const rand = (min, max) => min + Math.random() * (max - min);

export const randInt = (min, max) => Math.floor(rand(min, max + 1));

export const pick = (items) => items[Math.floor(Math.random() * items.length)];

export const chance = (p) => Math.random() < p;

export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

export const angleTo = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);

export const approach = (value, target, delta) => {
  if (value < target) return Math.min(value + delta, target);
  return Math.max(value - delta, target);
};

export const rectsOverlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const pointInCircle = (px, py, cx, cy, r) => (px - cx) ** 2 + (py - cy) ** 2 <= r * r;

export const circleRect = (cx, cy, r, rect) => {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  return (cx - nx) ** 2 + (cy - ny) ** 2 <= r * r;
};

export function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const formatTime = (seconds) => {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export function roundedRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawGlow(ctx, x, y, radius, color, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawCrescent(ctx, x, y, radius, start, end, width, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, radius, start, end);
  ctx.stroke();
  ctx.restore();
}

export const store = {
  get(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value == null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode */
    }
  },
};
