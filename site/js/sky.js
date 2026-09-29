// Real-time Chicago sky: sun position from the actual date/time (no API),
// sky gradients that follow the sun's elevation, stars/moon that fade with
// daylight, drifting clouds from live cloud cover, and daylight variants of
// the (night-painted) scene layers.

import { canvas, canvasHi, blit, rng, gradient, glow, dot, ellipse, bayer, rgb, mix, hash } from './px.js';

const LAT = 41.8781, LON = -87.6298;
const RAD = Math.PI / 180;

// ------------------------------------------------------------------ sun

// Low-precision solar position (good to ~0.5°, plenty for pixels).
export function sunPosition(date) {
  const d = date.getTime() / 86400000 - 10957.5; // days since J2000
  const g = (357.529 + 0.98560028 * d) * RAD;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const e = (23.439 - 0.00000036 * d) * RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = ((18.697374558 + 24.06570982441908 * d) % 24) * 15;
  const ha = (gmst + LON) * RAD - ra;
  const lat = LAT * RAD;
  const sinEl = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha);
  const el = Math.asin(sinEl);
  const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(ha));
  return { elevation: el / RAD, azimuth: ((az / RAD) + 360) % 360 };
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Moon phase: 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter.
// Mean synodic month from a known new moon (2000-01-06 18:14 UTC); within
// a few hours of the true phase, which is invisible at this pixel size.
export function moonPhase(date) {
  const days = (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  const p = (days / 29.530588853) % 1;
  return p < 0 ? p + 1 : p;
}

export function moonName(p) {
  const names = ['new moon', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full moon', 'waning gibbous', 'last quarter', 'waning crescent'];
  return names[Math.round(p * 8) % 8];
}

// Everything scenes need to know about the light right now.
export function skyState(date, { cover = 0.15, weather = 'clear' } = {}) {
  const { elevation, azimuth } = sunPosition(date);
  const wet = weather === 'rain' || weather === 'snow';
  const clouds = Math.max(cover, wet ? 0.92 : 0);
  return {
    elevation,
    azimuth,
    daylight: smooth(-7, 6, elevation),            // 0 = night, 1 = full day
    night: 1 - smooth(-13, -5, elevation),          // how "starry" it is
    golden: Math.exp(-(((elevation - 1) / 6) ** 2)),   // sunrise/sunset glow
    morning: azimuth < 180,
    sunX: Math.min(1, Math.max(0, (azimuth - 70) / 220)), // east → west across the frame
    clouds,
    overcast: smooth(0.55, 0.95, clouds),
    month: date.getMonth(), // 0 = January; drives seasonal touches like the tree
    moon: moonPhase(date),
    moonLight: (1 - Math.cos(2 * Math.PI * moonPhase(date))) / 2, // lit fraction, 0..1
  };
}

export function phaseLabel(s) {
  if (s.elevation < -12) return 'night';
  if (s.elevation < -4) return s.morning ? 'before dawn' : 'late dusk';
  if (s.elevation < 6) return s.morning ? 'sunrise' : 'sunset';
  if (s.elevation < 15) return s.morning ? 'morning' : 'golden hour';
  return 'daytime';
}

// ------------------------------------------------------------------ sky gradient

// Keyframes along the sun's elevation. Colours run top → horizon.
const KEYS = [
  { e: -18, c: ['#06071c', '#0c0e2e', '#171846', '#2c2156', '#4d2d62', '#7a4064'] },
  { e: -9, c: ['#0a0d2c', '#15194a', '#2c2860', '#5a3470', '#9a4a72', '#c86a78'] },
  { e: -4, c: ['#141c4c', '#2a3070', '#5a4282', '#a4507a', '#e2706c', '#ffa066'] },
  { e: 1, c: ['#26407e', '#4a5c9a', '#8a6a9c', '#e08480', '#ffa870', '#ffd08a'] },
  { e: 7, c: ['#3a68b4', '#5a86c8', '#86a6d4', '#c0b8c8', '#f0c8a8', '#ffe0b8'] },
  { e: 20, c: ['#2f6cc4', '#4a86d6', '#6ea2e2', '#96bdea', '#bcd4ee', '#dce8f2'] },
  { e: 50, c: ['#2464c2', '#3e7ed6', '#5e98e2', '#86b4ea', '#aeccf0', '#d0e2f4'] },
];
const OVERCAST_NIGHT = ['#0e0f1c', '#15162a', '#1d1d34', '#27253e', '#332c46', '#43344e'];
const OVERCAST_DAY = ['#6e7686', '#7c8494', '#8a92a2', '#9aa0ae', '#a8aeba', '#b6bac4'];

// ------------------------------------------------------------------ clouds

function cloudMask(r, w, h) {
  const count = r.int(4, 7);
  const puffs = Array.from({ length: count }, (_, i) => ({
    x: (w * (i + 0.5)) / count + r.range(-3, 3),
    y: h * r.range(0.45, 0.7),
    rx: r.range(w * 0.12, w * 0.24),
    ry: r.range(h * 0.28, h * 0.5),
  }));
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (y > h * 0.82) continue; // flat base
      let best = 0;
      for (const p of puffs) {
        const d = ((x - p.x) / p.rx) ** 2 + ((y - p.y) / p.ry) ** 2;
        if (d <= 1) best = Math.max(best, 1 - d);
      }
      if (!best) continue;
      const top = 1 - y / h;
      const v = best * 0.6 + top * 0.6;
      m[y * w + x] = v > 0.75 ? 3 : v > 0.45 ? 2 : 1;
    }
  return { m, w, h };
}

function paintCloud({ m, w, h }, pal) {
  const { c, g } = canvas(w, h);
  const img = g.createImageData(w, h);
  const cols = [null, rgb(pal[0]), rgb(pal[1]), rgb(pal[2])];
  for (let i = 0; i < m.length; i++) {
    let v = m[i];
    if (!v) continue;
    const x = i % w, y = (i / w) | 0;
    if (v < 3 && bayer(x, y) < 0.25 && m[i - w] > v) v++; // dithered edges between tones
    const col = cols[v];
    img.data.set([col[0], col[1], col[2], 255], i * 4);
  }
  g.putImageData(img, 0, 0);
  return c;
}

const CLOUD_PAL = {
  night: ['#1a1a33', '#24243f', '#322f4e'],
  dusk: ['#5a3a6a', '#c46a78', '#ffb488'],
  day: ['#b4bccc', '#e2e6ee', '#ffffff'],
  grey: ['#6a7080', '#848a98', '#9ca2ae'],
  greyNight: ['#141524', '#1b1c2e', '#23233a'],
};

// ------------------------------------------------------------------ Sky

export class Sky {
  // rect: area of the sky; horizon: y where the sun sets; cloudBand: [y0, y1]
  constructor({ x = 0, y = 0, w, h, horizon, seed = 1, stars = 90, moon = null, extra = null, cloudBand = null }) {
    Object.assign(this, { x, y, w, h, horizon: horizon ?? y + h, moon, extra });
    const r = rng(seed);
    this.stars = Array.from({ length: stars }, () => ({ x: x + r() * w, y: y + Math.pow(r(), 1.3) * h * 0.8, p: r() * 6, b: r() }));
    this.cache = new Map();
    const [c0, c1] = cloudBand || [y + 4, y + h * 0.55];
    this.clouds = Array.from({ length: 14 }, (_, i) => {
      const cw = r.int(26, 64), ch = Math.round(cw * r.range(0.28, 0.4));
      return { mask: cloudMask(r, cw, ch), x: x + r() * (w + 60) - 30, y: c0 + r() * Math.max(1, c1 - c0 - ch), v: r.range(1.2, 3.2), rank: r() };
    }).sort((a, b) => a.rank - b.rank);
    this.painted = new Map();
  }

  #grad(key, colors) {
    if (!this.cache.has(key)) {
      const { c, g } = canvasHi(this.x + this.w, this.y + this.h); // fine 2x dither
      gradient(g, this.x, this.y, this.w, this.h, colors);
      this.cache.set(key, c);
    }
    return this.cache.get(key);
  }

  #blit(g, c) { g.drawImage(c, 0, 0, c.width / 2, c.height / 2); }

  #cloudSprite(cl, palName) {
    const k = palName + ':' + this.clouds.indexOf(cl);
    if (!this.painted.has(k)) this.painted.set(k, paintCloud(cl.mask, CLOUD_PAL[palName]));
    return this.painted.get(k);
  }

  draw(g, t, dt, env) {
    const s = env.sky;
    // gradient: blend the two keyframes around the current elevation
    let i = KEYS.findIndex((k) => k.e > s.elevation);
    if (i === -1) i = KEYS.length - 1;
    if (i === 0) i = 1;
    const a = KEYS[i - 1], b = KEYS[i];
    const u = Math.min(1, Math.max(0, (s.elevation - a.e) / (b.e - a.e)));
    this.#blit(g, this.#grad('k' + (i - 1), a.c));
    if (u > 0.02) { g.globalAlpha = u; this.#blit(g, this.#grad('k' + i, b.c)); }
    if (s.overcast > 0.02) {
      g.globalAlpha = s.overcast * 0.9 * (1 - s.daylight);
      this.#blit(g, this.#grad('on', OVERCAST_NIGHT));
      g.globalAlpha = s.overcast * 0.9 * s.daylight;
      this.#blit(g, this.#grad('od', OVERCAST_DAY));
    }
    g.globalAlpha = 1;

    const starA = s.night * (1 - s.overcast * 0.95);
    if (this.extra && starA > 0.02) { g.globalAlpha = starA; blit(g, this.extra); g.globalAlpha = 1; }
    if (starA > 0.02) {
      for (const st of this.stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * (0.8 + st.b) + st.p);
        if (tw < 0.3 || st.b > starA + 0.3) continue;
        g.globalAlpha = starA;
        dot(g, st.x, st.y, st.b > 0.9 && tw > 0.8 ? '#ffffff' : tw > 0.6 ? '#c9d2ff' : '#5d5e98');
      }
      g.globalAlpha = 1;
    }

    // Moon: fades out as the sky brightens or clouds roll in.
    const m = this.moon;
    const moonA = (1 - s.daylight) * (1 - s.overcast * 0.8);
    if (m && moonA > 0.05) {
      // Real phase: light the disc up to the terminator (waxing lit on the
      // right, waning on the left, as seen from Chicago), faint earthshine elsewhere.
      const p = s.moon ?? 0.5;
      const k = Math.cos(2 * Math.PI * p);
      g.globalAlpha = moonA;
      glow(g, m.x, m.y, m.r * 4, '#d8d0ff', 0.28 * moonA * (0.25 + 0.75 * (s.moonLight ?? 1)));
      const R = m.r + 0.5;
      for (let j = -m.r; j <= m.r; j++)
        for (let i = -m.r; i <= m.r; i++) {
          if (i * i + j * j > R * R) continue;
          const w = Math.sqrt(Math.max(0, 1 - (j / R) ** 2));
          const nx = i / R;
          const lit = p < 0.5 ? nx > k * w : nx < -k * w;
          const crater = hash(i + 40, j + 40) < 0.09 && i * i + j * j < (m.r - 1) ** 2;
          dot(g, m.x + i, m.y + j, !lit ? 'rgba(52,56,96,0.45)' : crater ? '#d8cfb0' : i + j > m.r * 0.5 ? '#efe6c8' : '#fff8e4');
        }
      g.globalAlpha = 1;
    }

    // Sun: tracks the real azimuth/elevation, reddens near the horizon.
    const sunVisible = s.elevation > -2 && s.overcast < 0.9;
    if (sunVisible) {
      const sx = this.x + 16 + s.sunX * (this.w - 32);
      const span = this.horizon - this.y - 10;
      const sy = this.horizon - Math.min(50, Math.max(-6, s.elevation)) / 55 * span;
      const low = 1 - smooth(0, 14, s.elevation);
      const core = mix('#fff6dc', '#ffb060', low);
      const rim = mix('#ffe7a0', '#ff7a40', low);
      const r = Math.round(6 + low * 2);
      const a = 1 - s.overcast;
      g.globalAlpha = a;
      glow(g, sx, sy, 60 + low * 40, low > 0.5 ? '#ff9050' : '#fff0c0', 0.35 * a);
      ellipse(g, sx, sy, r, r, rim);
      ellipse(g, sx, sy, r - 1, r - 1, core);
      g.globalAlpha = 1;
    }

    // Clouds: count follows cloud cover, colour follows the light.
    const n = Math.round(2 + s.clouds * (this.clouds.length - 2));
    const palA = s.daylight > 0.5 ? 'day' : 'night';
    const grey = s.overcast > 0.5;
    const base = grey ? (s.daylight > 0.5 ? 'grey' : 'greyNight') : palA;
    const duskA = grey ? 0 : s.golden * 0.9;
    for (let k = 0; k < n; k++) {
      const cl = this.clouds[k];
      cl.x += cl.v * dt * (0.6 + s.clouds);
      const span = this.w + 80;
      const x = this.x - 40 + ((cl.x - this.x + 40) % span + span) % span;
      const fade = k === n - 1 ? 0.6 : 1;
      g.globalAlpha = fade * (s.clouds < 0.3 ? 0.75 : 1);
      g.drawImage(this.#cloudSprite(cl, base), Math.round(x), Math.round(cl.y));
      if (duskA > 0.05) { g.globalAlpha = fade * duskA; g.drawImage(this.#cloudSprite(cl, 'dusk'), Math.round(x), Math.round(cl.y)); }
    }
    g.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ daylight

// Scenes are painted at night. This derives a daytime version of a layer:
// lit windows become glass, dark night tones open up into daylight colours.
export function dayVariant(src, { strength = 1, glass = '#8ea6c2' } = {}) {
  const { c, g } = canvas(src.width, src.height);
  c.hi = src.hi; // same pixel density as its source
  g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, src.width, src.height);
  const d = img.data;
  const G = rgb(glass), G2 = rgb(mix(glass, '#3c4a62', 0.45));
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const r = d[i], gr = d[i + 1], b = d[i + 2];
    const lum = 0.3 * r + 0.59 * gr + 0.11 * b;
    const x = (i >> 2) % src.width, y = ((i >> 2) / src.width) | 0;
    let out;
    const spread = Math.max(r, gr, b) - Math.min(r, gr, b);
    // tinted & bright = a lit window (neutral whites are signs, yellows are paint)
    if (lum > 150 && spread >= 35 && b >= 100) {
      out = (x + y) % 3 ? G : G2; // a lit window by day is just glass
    } else {
      const f = (v) => 255 * Math.pow(v / 255, 0.62);
      let R = f(r) * 1.02, Gg = f(gr), B = f(b) * 0.9;
      const l = 0.3 * R + 0.59 * Gg + 0.11 * B;
      out = [R + (l - R) * 0.18 + 6, Gg + (l - Gg) * 0.18 + 4, B + (l - B) * 0.18];
    }
    const k = strength;
    d[i] = r + (out[0] - r) * k; d[i + 1] = gr + (out[1] - gr) * k; d[i + 2] = b + (out[2] - b) * k;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Draw a night layer with its day variant blended over it.
export function drawLit(g, night, day, daylight) {
  blit(g, night);
  if (day && daylight > 0.01) {
    g.globalAlpha = daylight;
    blit(g, day);
    g.globalAlpha = 1;
  }
}

