// Holiday lights: from November 20 through the end of February, strings of
// bulbs on the trees (and the odd lamp post) in every scene. By day they're
// just coloured bulbs; from dusk they glow and twinkle.

import { rng, hrect } from './px.js';

// Is it the season? `date` is Chicago time. A ?month= preview counts the whole
// of November as in season, so the lights show up when previewing it.
export function lightsOn(date, monthOverride) {
  if (monthOverride != null) return [10, 11, 0, 1].includes(monthOverride);
  const m = date.getMonth();
  return m === 11 || m === 0 || m === 1 || (m === 10 && date.getDate() >= 20);
}

export const MULTI = ['#ff3b3b', '#ffcc33', '#3bd16a', '#3b9bff', '#ff7ad9', '#ff8a2a'];
export const WARM = ['#ffe2a0', '#fff0c8', '#ffd890', '#ffe8b8'];

export const bulb = (r, x, y, palette) => ({ x, y, c: r.pick ? r.pick(palette) : palette[Math.floor(r() * palette.length)], ph: r() * 6.28, sp: 0.8 + r() * 1.8 });

// A string wrapped along a branch (a polyline): bulbs every `spacing`, each a
// little above or below the line, the way a hand-wrapped string sits.
export function alongBranch(pts, { spacing = 3.5, wrap = 1.2, seed = 1, palette = MULTI, maxY = Infinity } = {}) {
  const r = rng(seed), out = [];
  let carry = r() * spacing, side = 1;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (!len) continue;
    const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;                  // perpendicular, for the wrap
    for (let d = carry; d < len; d += spacing) {
      const u = d / len, x = x0 + (x1 - x0) * u + nx * wrap * side, y = y0 + (y1 - y0) * u + ny * wrap * side;
      side = -side;
      if (y <= maxY) out.push(bulb(r, x, y, palette));
    }
    carry = (carry - len) % spacing; if (carry < 0) carry += spacing;
  }
  return out;
}

// Bulbs scattered through a crown (an ellipse), for a tree wrapped all over.
export function inCrown(cx, cy, rx, ry, count, { seed = 1, palette = WARM } = {}) {
  const r = rng(seed), out = [];
  for (let k = 0; k < count; k++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.92;
    out.push(bulb(r, cx + Math.cos(a) * d * rx, cy + Math.sin(a) * d * ry, palette));
  }
  return out;
}

// A string spiralling down a post: only the bulbs on the front of the post show.
export function spiral(x, top, bottom, { radius = 2, pitch = 4, seed = 1, palette = MULTI } = {}) {
  const r = rng(seed), out = [];
  for (let y = top; y <= bottom; y += pitch / 6) {
    const a = ((y - top) / pitch) * Math.PI * 2;
    if (Math.cos(a) < 0.1) continue;                                     // round the back of the post
    if (Math.round((y - top) / (pitch / 6)) % 2) continue;
    out.push(bulb(r, x + Math.sin(a) * radius, y, palette));
  }
  return out;
}

// One soft glow sprite per colour, reused for every bulb.
const glows = new Map();
function glowSprite(color) {
  if (!glows.has(color)) {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const g = c.getContext('2d');
    const n = parseInt(color.slice(1), 16), rgb = `${n >> 16},${(n >> 8) & 255},${n & 255}`;
    const grad = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, `rgba(${rgb},1)`);
    grad.addColorStop(0.35, `rgba(${rgb},0.35)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 16, 16);
    glows.set(color, c);
  }
  return glows.get(color);
}

// Draw a set of bulbs. `size` is the bulb in scene units (0.5 for far-off
// trees), `glow` the radius of its halo at night. The twinkle is slow, so each
// set is drawn into its own small layer about 8 times a second and that layer
// is reused in between: hundreds of bulbs cost two image draws per frame.
const layers = new WeakMap();
const REDRAW = 0.12;                                                       // seconds between redraws

function bounds(bulbs, pad) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const b of bulbs) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x); y1 = Math.max(y1, b.y); }
  x0 = Math.floor(x0 - pad); y0 = Math.floor(y0 - pad);
  return { x0, y0, w: Math.ceil(x1 + pad) - x0, h: Math.ceil(y1 + pad) - y0 };
}
function layer(w, h) {
  const c = document.createElement('canvas');
  c.width = w * 2; c.height = h * 2;
  const g = c.getContext('2d');
  return { c, g };
}

export function drawLights(g, bulbs, t, env, { size = 1, glow = 3, alpha = 1 } = {}) {
  if (!env.sky.lights || !bulbs?.length || alpha <= 0) return;
  const night = 1 - env.sky.daylight;
  let L = layers.get(bulbs);
  if (!L) {
    const box = bounds(bulbs, glow + size);
    L = { box, core: layer(box.w, box.h), halo: layer(box.w, box.h), at: -1e9 };
    layers.set(bulbs, L);
  }
  if (Math.abs(t - L.at) >= REDRAW) {
    L.at = t;
    const { box, core, halo } = L, lit = 0.45 + 0.55 * night;
    for (const { g: lg } of [core, halo]) { lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, box.w * 2, box.h * 2); lg.setTransform(2, 0, 0, 2, -box.x0 * 2, -box.y0 * 2); }
    for (const b of bulbs) {
      const tw = 0.55 + 0.45 * Math.sin(t * b.sp + b.ph);             // each bulb twinkles at its own pace
      core.g.globalAlpha = lit * (0.65 + 0.35 * tw);
      hrect(core.g, b.x - size / 2, b.y - size / 2, size, size, b.c);
      if (night > 0.15) {
        halo.g.globalAlpha = night * 0.6 * tw;
        halo.g.drawImage(glowSprite(b.c), b.x - glow, b.y - glow, glow * 2, glow * 2);
      }
    }
  }
  const { box } = L;
  g.save();
  g.globalAlpha = alpha;
  g.drawImage(L.core.c, box.x0, box.y0, box.w, box.h);
  if (night > 0.15) { g.globalCompositeOperation = 'lighter'; g.drawImage(L.halo.c, box.x0, box.y0, box.w, box.h); }
  g.restore();
}
