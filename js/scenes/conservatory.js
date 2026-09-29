// Scene 5: the Lincoln Park Conservatory's Show House. A glass dome overhead
// with the real sky beyond it, banks of blooming azaleas and hydrangeas, a
// golden wooden bridge over a reflecting pond with stepping stones, orange
// snapdragons up front, a brick path, and trailing plants hanging from the roof.

import {
  W, H, canvasHi, blit, hrect, hdot, rng, rect, glow, ellipse,
} from '../px.js';
import { Precip, paneDrops, snowCaps } from '../weather.js';
import { Sky, drawLit } from '../sky.js';

const WALL = 118;                            // where the glass roof meets the back wall
const BRIDGE = { x0: 96, x1: 388, y: 178 };  // bridge railing: ends and deck line
const POND = [196, 236];                     // pond rows
const DOME = { x: 262, y: -46 };             // the dome's center skylight (above the frame)
const LAMPS = [[118, 176], [372, 174], [60, 214]];

let L;

// A dimmed night copy of a hi-res layer (everything is drawn in daylight colors).
function nightOf(src, a = 0.6) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height; c.hi = src.hi;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = `rgba(14,12,34,${a})`;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

// ------------------------------------------------------------------ the dome

function buildRoof() {
  const c = canvasHi(), g = c.g;
  const rib = '#e4ded0', ribLo = '#9a9080', ribHi = '#ffffff';
  const inRoof = (x, y) => y < WALL + 2 && x > -2 && x < W + 2;
  // concentric rings around the skylight, flattened by perspective
  for (const R of [58, 96, 140, 190, 246, 308, 376]) {
    for (let a = 0; a < Math.PI; a += 0.8 / R) {
      const x = DOME.x + Math.cos(a) * R, y = DOME.y + Math.sin(a) * R * 0.62;
      if (inRoof(x, y)) { hrect(g, x, y, 1, 0.5, rib); hdot(g, x, y + 0.5, ribLo); }
    }
  }
  // ribs radiating out and down from the skylight
  for (let k = 0; k <= 26; k++) {
    const a = 0.05 + (k / 26) * (Math.PI - 0.1);
    const w = k % 2 ? 1 : 1.5;
    for (let d = 40; d < 520; d += 0.5) {
      const x = DOME.x + Math.cos(a) * d, y = DOME.y + Math.sin(a) * d * 0.62;
      if (!inRoof(x, y)) continue;
      hrect(g, x - w / 2, y, w, 0.5, rib); hdot(g, x - w / 2, y, ribHi); hdot(g, x + w / 2 - 0.5, y, ribLo);
    }
  }
  // the skylight rim peeking in at the top
  for (let a = 0.2; a < Math.PI - 0.2; a += 0.01) hrect(g, DOME.x + Math.cos(a) * 58, DOME.y + Math.sin(a) * 36, 1.5, 1, rib);
  // lower glass wall: tall panes over a whitewashed base
  for (let y = WALL; y < 162; y += 0.5) hrect(g, 0, y, W, 0.5, y < 150 ? 'rgba(210,228,236,0.22)' : '#e2ded4');
  hrect(g, 0, WALL, W, 1.5, rib); hrect(g, 0, 149.5, W, 1, rib);
  for (let x = 0; x < W; x += 16) { hrect(g, x, WALL, 1, 32, rib); hdot(g, x + 1, WALL + 2, ribLo); }
  for (let x = 8; x < W; x += 16) hrect(g, x, WALL + 1, 0.5, 31, '#cfc8b8');
  for (let x = 0; x < W; x += 24) hrect(g, x, 150, 0.5, 12, '#c8c2b4');       // base panel joints
  return c;
}

// ------------------------------------------------------------------ plantings

// A flowering shrub: a shaded green mound studded with clusters of blossoms.
function bloom(g, r, cx, cy, rad, flower, { density = 0.5, leaf = 0 } = {}) {
  const greens = [['#1c3a22', '#2a5230', '#3a6e3e', '#528a4e'], ['#20402a', '#2e5a36', '#467a44', '#62985a']][leaf];
  for (let y = -rad; y <= rad * 0.7; y += 0.5)
    for (let x = -rad; x <= rad; x += 0.5) {
      const d = Math.hypot(x, y * 1.25) / rad;
      if (d > 1 || r() > 0.92 - d * 0.2) continue;
      const l = (-x - y) / (rad * 2) + (r() - 0.5) * 0.5;
      hdot(g, cx + x, cy + y, l > 0.3 ? greens[3] : l > 0 ? greens[2] : l > -0.3 ? greens[1] : greens[0]);
    }
  const [lo, mid, hi] = flower;
  const n = Math.round(rad * rad * density * 0.5);
  for (let k = 0; k < n; k++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad * 0.95;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.8 - rad * 0.08;
    if (y > cy + rad * 0.6) continue;
    for (const [dx, dy, col] of [[0, 0, mid], [0.5, 0, mid], [0, 0.5, lo], [0.5, 0.5, lo], [0, -0.5, hi]]) hdot(g, x + dx, y + dy, col);
  }
}

// A snapdragon spike: a tapering column of small blossoms on a green stem.
function spike(g, r, x, base, h, pal) {
  hrect(g, x, base - h * 0.4, 0.5, h * 0.4, '#2e5a30');
  for (let y = base - h * 0.35; y > base - h; y -= 0.5) {
    const u = (base - y) / h, w = 3.2 * (1 - u) + 0.6;
    for (let dx = -w; dx <= w; dx += 0.5) if (r() < 0.8) hdot(g, x + dx + Math.sin(y) * 0.3, y, r() < 0.25 ? pal[2] : dx < 0 ? pal[1] : pal[0]);
  }
}

const PINK = ['#b83a78', '#e05aa0', '#ff9ad0'];
const MAGENTA = ['#8a1a7a', '#c02ca8', '#ee6ad0'];
const RED = ['#a01e2a', '#d8303a', '#ff6a6a'];
const WHITE = ['#b8c0c8', '#eef0f4', '#ffffff'];
const YELLOW = ['#b8901a', '#e8c030', '#fff080'];
const LAVENDER = ['#5a4a9a', '#8a78d0', '#b8a8f0'];
const CORAL = ['#c04a3a', '#f07a5a', '#ffb090'];
const SNAP = ['#c8401a', '#f0602a', '#ffb070'];

function buildMid(r) {
  const c = canvasHi(), g = c.g;
  // planted ground behind everything: dark leafy beds from the wall down to the pond
  for (let y = 150; y < POND[0] + 2; y += 0.5)
    for (let x = 0; x < W; x += 0.5) {
      const n = r();
      hdot(g, x, y, n < 0.3 ? '#1a3020' : n < 0.6 ? '#223c28' : n < 0.85 ? '#2c4a30' : '#3a5e3a');
    }
  // leafy back plantings: small trees and vines along the glass
  for (let x = -10; x < W + 10; x += 22 + r() * 16) bloom(g, r, x, 138 + r() * 8, 18 + r() * 8, WHITE, { density: 0.02, leaf: 1 });
  // wooden lattice on the right, as in the Show House
  for (let x = 300; x < W; x += 3) for (let y = 142; y < 176; y += 0.5) if ((Math.floor(x + y * 2) % 6) < 1) hdot(g, x + (y - 142) * 0.4, y, '#6a4a3a');
  hrect(g, 300, 141, 180, 1, '#5a3e30');
  // banks of flowers behind the bridge, layered back to front
  const back = [[20, 160, 22, MAGENTA], [60, 154, 20, WHITE], [98, 160, 18, PINK], [138, 156, 22, MAGENTA], [178, 160, 16, YELLOW],
    [214, 154, 22, PINK], [252, 160, 18, WHITE], [292, 156, 20, LAVENDER], [330, 160, 18, RED], [368, 154, 22, PINK], [410, 158, 20, CORAL], [452, 156, 24, MAGENTA]];
  for (const [x, y, rad, pal] of back) bloom(g, r, x, y, rad, pal, { density: 0.55 });
  const front = [[40, 176, 16, RED], [150, 178, 14, WHITE], [240, 178, 16, CORAL], [330, 178, 14, YELLOW], [430, 176, 18, PINK]];
  for (const [x, y, rad, pal] of front) bloom(g, r, x, y, rad, pal, { density: 0.6, leaf: 1 });
  // the bridge: a gently arched golden-wood railing with pickets
  const wood = '#d8a050', woodHi = '#f4c878', woodLo = '#9a6a30';
  const arc = (x) => BRIDGE.y - Math.sin(((x - BRIDGE.x0) / (BRIDGE.x1 - BRIDGE.x0)) * Math.PI) * 6;
  for (let x = BRIDGE.x0; x <= BRIDGE.x1; x += 0.5) {
    const y = arc(x);
    hrect(g, x, y - 12, 0.5, 1.5, woodHi); hrect(g, x, y - 10.5, 0.5, 1, wood);  // top rail
    hrect(g, x, y - 1, 0.5, 2.5, wood); hdot(g, x, y + 1.5, woodLo);             // deck edge
  }
  for (let x = BRIDGE.x0; x <= BRIDGE.x1; x += 4) {                              // pickets
    const y = arc(x);
    hrect(g, x, y - 10, 1.5, 9, wood); hrect(g, x, y - 10, 0.5, 9, woodHi); hrect(g, x + 1.5, y - 10, 0.5, 9, woodLo);
  }
  for (let x = BRIDGE.x0; x <= BRIDGE.x1; x += 32) {                             // posts with caps
    const y = arc(x);
    rect(g, x - 1, y - 15, 3, 16, wood); hrect(g, x - 1.5, y - 16, 4, 1.5, woodHi); hrect(g, x + 1.5, y - 15, 0.5, 16, woodLo);
  }
  // pond rim stones
  for (let x = 40; x < 440; x += 3 + r() * 3) ellipse(g, x, POND[0] - 1 + Math.sin(x * 0.05) * 1.5, 2.5, 1.5, r() < 0.5 ? '#8a8478' : '#6a6458');
  return c;
}

const mix2 = (a, b, u) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * u).toString(16).padStart(2, '0')).join(''); };

function buildFront(r) {
  const c = canvasHi(), g = c.g;
  // below the pond: a stone floor edged with low greenery
  for (let y = POND[1]; y < H; y += 0.5) {
    const u = (y - POND[1]) / (H - POND[1]);
    for (let x = 0; x < W; x += 0.5) {
      const n = r();
      hdot(g, x, y, y < POND[1] + 3 ? (n < 0.5 ? '#8a8478' : '#6a6458') : n < 0.12 ? '#3a5e3a' : (Math.floor(x / 6) + Math.floor(y / 3)) % 2 ? mix2('#9a9282', '#7a7264', u) : mix2('#928a7a', '#726a5c', u));
    }
  }
  // curved brick herringbone path, lower left, with a stone curb
  const pathEdge = (y) => 170 - (y - POND[1]) * 3.2;                  // right edge of the path at row y
  for (let y = POND[1] + 2; y < H; y += 0.5) {
    const x1 = pathEdge(y);
    for (let x = 0; x < x1; x += 0.5) {
      const cell = (Math.floor(x / 3) + Math.floor(y / 1.5)) % 2, joint = ((x * 2) % 6 < 0.6) || ((y * 2) % 3 < 0.6);
      hdot(g, x, y, joint ? '#6a3a2a' : cell ? '#b8604a' : '#a0503c');
    }
    hrect(g, x1, y, 4, 0.5, '#a09a8c'); hdot(g, x1, y, '#c8c2b4');        // curb
  }
  // stepping stones across the pond
  for (const [x, y, rr] of [[180, 224, 5], [200, 216, 4.5], [222, 226, 5], [246, 218, 4.5], [268, 228, 5], [292, 220, 4.5], [140, 230, 5.5]]) {
    ellipse(g, x, y + 0.8, rr, rr * 0.4, '#4a4a58'); ellipse(g, x, y, rr, rr * 0.4, '#eceae4'); hrect(g, x - rr * 0.5, y - rr * 0.25, rr * 0.8, 0.5, '#ffffff');
  }
  // front beds: pink and red on the left, snapdragons and lavender on the right
  for (const [x, y, rad, pal] of [[16, 232, 22, PINK], [52, 246, 18, RED], [10, 262, 20, MAGENTA], [74, 222, 14, WHITE]]) bloom(g, r, x, y, rad, pal, { density: 0.7, leaf: 1 });
  bloom(g, r, 420, 240, 34, LAVENDER, { density: 0.35 });
  bloom(g, r, 470, 250, 26, PINK, { density: 0.6 });
  for (let k = 0; k < 26; k++) {
    const x = 340 + k * 5.2 + r() * 3, base = 262 + r() * 10, h = 38 + r() * 26;
    spike(g, r, x, base, h, SNAP);
  }
  // hanging curtains of silvery trailing plants framing both sides
  for (const side of [0, 1])
    for (let k = 0; k < 34; k++) {
      const x0 = side ? W - 3 - k * 1.1 - r() * 3 : 3 + k * 1.1 + r() * 3, len = 60 + r() * 120;
      for (let d = 0; d < len; d += 1.5) {                           // a strand of little round leaves
        const x = x0 + Math.sin(d * 0.07 + k) * 1.5, shade = r();
        const col = shade < 0.35 ? '#e4ece2' : shade < 0.7 ? '#b4c8b2' : '#86a086';
        hrect(g, x - 0.5, d, 1, 1, col); hdot(g, x + (k % 2 ? 0.5 : -1), d + 0.5, '#6a846a');
      }
    }
  // a hanging basket spilling yellow flowers
  const bx = 170, by = 34;
  for (let d = 0; d < by - 6; d += 0.5) hdot(g, bx, d, '#3a3a40');
  bloom(g, r, bx, by + 6, 14, YELLOW, { density: 1.1, leaf: 1 });
  ellipse(g, bx, by + 9, 8, 3, '#5a4230');
  for (let k = 0; k < 30; k++) { const x = bx - 10 + r() * 20; for (let d = 0; d < 6 + r() * 12; d += 0.5) hdot(g, x, by + 10 + d, r() < 0.4 ? '#e8c030' : '#3a6e3e'); }
  // path lamps
  for (const [lx, ly] of LAMPS) { rect(g, lx - 0.5, ly - 12, 1.5, 12, '#1a1a20'); ellipse(g, lx + 0.25, ly - 14, 2, 2, '#f4ecd6'); }
  return c;
}

function build() {
  const r = rng(1892);
  const sky = new Sky({ x: 0, y: 0, w: W, h: 162, horizon: 150, seed: 92, stars: 60, moon: { x: 400, y: 30, r: 8, crescent: true }, cloudBand: [4, 90] });
  const roof = buildRoof();
  const mid = buildMid(r);
  const front = buildFront(r);
  // the pond reflects the bridge and flower banks, flipped and darkened
  const pondH = POND[1] - POND[0];
  const reflect = (src, tint, a) => {
    const out = canvasHi(W, pondH);
    for (let jd = 0; jd < pondH * 2; jd++) out.g.drawImage(src, 0, POND[0] * 2 - 2 - jd, W * 2, 1, 0, jd / 2, W, 0.5);
    out.g.save(); out.g.globalCompositeOperation = 'source-atop'; out.g.fillStyle = `rgba(${tint},${a})`; out.g.fillRect(0, 0, W, pondH); out.g.restore();
    return out.c;
  };
  L = {
    sky, roof: roof.c, roofNight: nightOf(roof.c, 0.35),
    mid: nightOf(mid.c), midDay: mid.c, front: nightOf(front.c), frontDay: front.c,
    refl: reflect(mid.c, '8,10,30', 0.7), reflDay: reflect(mid.c, '20,40,60', 0.35),
    roofSnow: snowCaps(roof.c, { seed: 41, coverage: 0.85 }), snowCover: 0,
    precip: new Precip({ x: 0, y: 0, w: W, h: WALL, density: 0.7 }, 83),
  };
}

export default {
  id: 'conservatory',
  focus: 0.5,
  name: 'The Conservatory',
  blurb: 'Lincoln Park Conservatory',
  ambience: { rain: 1.2, city: 0.04 },

  hotspots: [],

  build() { if (!L) build(); },

  draw(g, t, dt, env) {
    if (!L) build();
    const day = env.sky.daylight, night = 1 - day;
    L.sky.draw(g, t, dt, env);
    L.precip.draw(g, dt, env.weather, t);
    if (env.weather === 'rain') paneDrops(g, { x: 0, y: 0, w: W, h: WALL }, t, 1, 11);
    g.save(); g.globalAlpha = 0.08; rect(g, 0, 0, W, 162, '#b8e0c8'); g.restore();   // old glass tint
    drawLit(g, L.roofNight, L.roof, day);
    const snowing = env.weather === 'snow';
    L.snowCover += ((snowing ? 1 : 0) - L.snowCover) * Math.min(1, dt * (snowing ? 0.25 : 0.6));
    if (L.snowCover > 0.01) {
      g.globalAlpha = L.snowCover; blit(g, L.roofSnow.night);
      g.globalAlpha = L.snowCover * day; blit(g, L.roofSnow.day); g.globalAlpha = 1;
    }

    drawLit(g, L.mid, L.midDay, day);

    // the pond: dark water, the bridge and flowers mirrored with a slow shimmer
    rect(g, 30, POND[0], 420, POND[1] - POND[0], day > 0.5 ? '#2a4a52' : '#0e1628');
    for (let jd = 0; jd < (POND[1] - POND[0]) * 2; jd++) {
      const j = jd / 2, wob = Math.round(Math.sin(j * 0.45 + t * 0.8) * 0.8 * 2) / 2;
      g.drawImage(L.refl, 0, jd, W * 2, 1, wob, POND[0] + j, W, 0.5);
      if (day > 0.01) { g.globalAlpha = day; g.drawImage(L.reflDay, 0, jd, W * 2, 1, wob, POND[0] + j, W, 0.5); g.globalAlpha = 1; }
    }
    for (let k = 0; k < 10; k++) {                                   // soft light streaks on the water
      const y = POND[0] + 3 + (k % 5) * 6, len = 12 + ((k * 29) % 26);
      const x = 40 + ((k * 83 + t * (2 + (k % 3))) % 380);
      hrect(g, x, y, len, 0.5, `rgba(255,240,220,${0.1 + 0.08 * day})`);
    }

    // dappled sunbeams slanting through the dome
    const beams = day * (1 - env.sky.overcast) * Math.min(1, Math.max(0, env.sky.elevation / 10));
    if (beams > 0.03) {
      const lean = (env.sky.sunX - 0.5) * -140;
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 5; k++) {
        const x0 = 90 + k * 78 + Math.sin(t * 0.1 + k) * 4, w = 12 + (k % 3) * 8;
        const grad = g.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, `rgba(255,246,214,${0.14 * beams})`); grad.addColorStop(1, 'rgba(255,246,214,0)');
        g.fillStyle = grad;
        g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + w, 0); g.lineTo(x0 + w + lean, H); g.lineTo(x0 + lean, H); g.closePath(); g.fill();
      }
      g.restore();
    }

    drawLit(g, L.front, L.frontDay, day);
    for (const [lx, ly] of LAMPS) {
      glow(g, lx, ly - 14, 14, '#ffcf80', 0.32 * night + 0.03);
      glow(g, lx, ly + 2, 30, '#ffb860', 0.1 * night);
    }
  },

  click() {},
};
