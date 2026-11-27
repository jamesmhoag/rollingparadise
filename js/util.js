// Small shared helpers: seeded RNG, math, formatting.

export class RNG {
  constructor(seed = Date.now()) { this.s = seed >>> 0; }
  next() { // mulberry32
    let t = (this.s += 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n) { return Math.floor(this.next() * n); }
  range(a, b) { return a + this.int(b - a + 1); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[this.int(arr.length)]; }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = this.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  weighted(items, weightFn) {
    const ws = items.map(weightFn); const total = ws.reduce((x, y) => x + y, 0);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const sum = (arr, f = (x) => x) => arr.reduce((t, x) => t + f(x), 0);
export const clone = (o) => structuredClone(o);

// 1234567 -> "1,234,567¢"
export const cents = (n) => `${Math.round(n).toLocaleString('en-US')}¢`;
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// order of indices 0..n-1 starting from an anchor: 'start', 'end' or 'center' (center, left, right, left, right…)
export function order1D(n, anchor) {
  const idx = [...Array(n).keys()];
  if (anchor === 'start') return idx;
  if (anchor === 'end') return idx.reverse();
  const mid = Math.floor((n - 1) / 2); const out = [mid];
  for (let d = 1; out.length < n; d++) { if (mid - d >= 0) out.push(mid - d); if (mid + d < n) out.push(mid + d); }
  return out;
}

// 3-vectors as [x, y, z] (the dice are drawn from these)
export const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const vlen = (a) => Math.hypot(a[0], a[1], a[2]);
export const vnorm = (a) => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// how far apart two spaces are, in steps along rows and columns; and a sort that puts the nearest to `o` first
export const steps = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
export const nearestTo = (o) => (x, y) => steps(x, o) - steps(y, o);

// a hex colour made darker (k under 1) or lighter (over 1); anything that is not #rrggbb is given back as it is
export const shade = (hex, k) => (/^#[0-9a-f]{6}$/i.test(hex || '') ? '#' + [1, 3, 5].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k))).toString(16).padStart(2, '0')).join('') : hex);
