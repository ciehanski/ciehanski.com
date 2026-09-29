// Scene 5: Olive Park. The Hancock straight across the water, big park trees
// framing the view, the railing along the lake, benches, a lamppost, and
// someone sitting by the water.

import {
  W, H, canvas, canvasHi, blit, hrect, hdot, rng, rect, dot, hline, vline, gradient, glow, ellipse, darken, lighten, mix,
} from '../px.js';
import { drawSkyline, animateSkyline } from '../skyline.js';
import { Precip, snowCaps, isFrozen, iceSheet } from '../weather.js';
import { Sky, dayVariant, drawLit } from '../sky.js';
import { drawBoats } from '../boats.js';

const BASE = 196;          // skyline base / far shore
const WATER = [196, 212];
const RAIL = 206;          // top rail of the fence
const WALK = 214;          // front of the paved walk
const LAMP = { x: 452, top: 64 };
const MOON = { x: 318, y: 36 };

let L;

// Seasonal canopy palettes (by Chicago month).
const LEAVES = {
  spring: ['#4e8e3a', '#6aae48', '#8cc85c', '#b0de7c'],
  summer: ['#2c6a30', '#3e8a3c', '#58a64a', '#78c05c'],
  fall: ['#b86a2a', '#e8a04a', '#d8b040', '#6a8a3a'],
};
const seasonOf = (m) => (m <= 2 || m === 11 ? 'bare' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'fall');

// Branch skeletons for the two framing trees (scene units).
const BRANCHES = [
  // left tree: trunk from the bottom-left, limbs reaching over the top-left
  [[18, 214], [22, 160], [30, 110], [44, 70], [70, 36], [110, 14], [150, 4]],
  [[26, 136], [56, 112], [96, 100], [138, 96]],
  [[34, 96], [8, 66], [0, 40]],
  [[52, 60], [96, 46], [132, 42], [170, 30]],
  [[80, 26], [60, 8], [40, 0]],
  // right tree: limbs reaching in from the top-right
  [[480, 70], [440, 58], [400, 40], [370, 22], [350, 6]],
  [[440, 58], [420, 82], [396, 96]],
  [[480, 20], [446, 12], [410, 6]],
];

function buildCanopy(season, r0) {
  const r = rng(r0);
  const bark = canvasHi(), barkNight = canvasHi();
  for (const [c, col, hi] of [[bark, '#4a3424', '#6a4a34'], [barkNight, '#140f16', '#221a24']])
    BRANCHES.forEach((pts, bi) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        const thick = Math.max(1.5, (bi === 0 ? 12 : bi === 5 ? 6 : 4) - i * (bi === 0 ? 1.6 : 0.9));
        const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
        for (let k = 0; k <= n; k++) {
          const x = x0 + ((x1 - x0) * k) / n, y = y0 + ((y1 - y0) * k) / n;
          rect(c.g, x - thick / 2, y, thick, 1, col);
          hrect(c.g, x - thick / 2, y, 0.5, 1, hi);
        }
      }
    });
  const pal = LEAVES[season];
  const leaves = canvasHi(), leavesNight = canvasHi();
  if (pal) {
    // Leaf clumps along the limbs: round, dense, lit from the top-left, with gaps between.
    const clumps = [];
    BRANCHES.forEach((pts, bi) => {
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 14);
        for (let k = 0; k < n; k++) {
          const u = (k + r()) / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
          if (y > 150) continue;                       // leave the lower trunk bare
          clumps.push([x + (r() - 0.5) * 16, y + (r() - 0.6) * 14, 7 + r() * 8]);
        }
      }
    });
    const sparse = season === 'spring' ? 0.55 : season === 'fall' ? 0.8 : 0.92;
    for (const [cx, cy, rad] of clumps)
      for (let y = cy - rad; y <= cy + rad; y += 0.5)
        for (let x = cx - rad; x <= cx + rad; x += 0.5) {
          const d = Math.hypot(x - cx, (y - cy) * 1.2) / rad;
          if (d > 1 || r() > sparse * (1 - d * 0.35)) continue;
          const lightU = ((cx - x) + (cy - y)) / (rad * 2) + (r() - 0.5) * 0.5;
          const col = lightU > 0.3 ? pal[3] : lightU > 0 ? pal[2] : lightU > -0.3 ? pal[1] : pal[0];
          hdot(leaves.g, x, y, col);
          hdot(leavesNight.g, x, y, mix(col, '#0a0c1c', 0.72));
        }
  }
  return {
    bark: bark.c, barkNight: barkNight.c, leaves: leaves.c, leavesNight: leavesNight.c,
    snow: snowCaps(bark.c, { seed: 12, coverage: 0.75 }),
  };
}

function build() {
  const r = rng(1937);

  const sky = new Sky({
    x: 0, y: 0, w: W, h: BASE + 2, horizon: BASE, seed: 55, stars: 110,
    moon: { x: MOON.x, y: MOON.y, r: 8, crescent: true }, cloudBand: [10, 90],
  });

  // Across the water: the Streeterville / Gold Coast wall with the Hancock in the middle.
  const city = canvasHi();
  const skyline = drawSkyline(city.g, {
    x0: 60, width: 400, baseY: BASE, scale: 0.95, seed: 611, fillHeight: 0.85,
    landmarks: [
      { type: 'tower', x: 136, h: 92, w: 18, tint: '#d8d4d0' },                  // pale tower on the left
      { type: 'tower', x: 158, h: 70, w: 16, tint: '#7a8aa8' },
      { type: 'tower', x: 186, h: 118, w: 16, tint: '#c8c4c0', crown: true },      // tall pale tower
      { type: 'ninehundred', x: 208, scale: 0.85 },
      { type: 'tower', x: 276, h: 96, w: 16, tint: '#6a8ab8' },                    // blue glass
      { type: 'tower', x: 296, h: 84, w: 18, tint: '#a07a6a', crown: true },
      { type: 'tower', x: 318, h: 74, w: 16, tint: '#5a7aa8' },
      { type: 'tower', x: 338, h: 90, w: 18, tint: '#9a6a5a' },
      { type: 'palmolive', x: 360, scale: 0.9 },
      { type: 'tower', x: 382, h: 86, w: 20, tint: '#6a9ac8' },
      { type: 'tower', x: 404, h: 72, w: 16, tint: '#b8a898' },
      { type: 'tower', x: 426, h: 64, w: 18, tint: '#7a7a98' },
      { type: 'hancock', x: 246, scale: 1.2 },
    ],
  });
  // Lake Shore Drive trees and the far shore line.
  for (let k = 0; k < 2600; k++) hdot(city.g, 60 + r() * 400, BASE - Math.pow(r(), 0.8) * 7, r() < 0.5 ? '#1f3f2a' : r() < 0.5 ? '#2a5234' : '#173020');
  const cityDay = dayVariant(city.c);

  // Water: a strip, with a squashed reflection.
  const waterH = WATER[1] - WATER[0];
  const water = canvasHi(), waterDay = canvasHi();
  gradient(water.g, 0, WATER[0], W, waterH, ['#161a44', '#0e1236']);
  gradient(waterDay.g, 0, WATER[0], W, waterH, ['#5ab8c8', '#3a98b0']);
  const reflect = (src, tint) => {
    const out = canvasHi(W, waterH);
    for (let jd = 0; jd < waterH * 2; jd++) out.g.drawImage(src, 0, BASE * 2 - 1 - Math.floor(jd / 0.5), W * 2, 1, 0, jd / 2, W, 0.5);
    out.g.save(); out.g.globalCompositeOperation = 'source-atop';
    out.g.fillStyle = `rgba(${tint},0.55)`; out.g.fillRect(0, 0, W, waterH); out.g.restore();
    return out.c;
  };
  const refl = reflect(city.c, '10,14,44'), reflDay = reflect(cityDay, '40,130,150');

  // Foreground: railing, paved walk, lawn, benches, lamppost, and a person by the water.
  const fg = canvasHi();
  const f = fg.g;
  // paved walk
  for (let y = WALK - 2; y < H; y += 0.5) {
    const u = (y - WALK) / (H - WALK);
    hrect(f, 0, y, W, 0.5, mix('#2e2a36', '#3a3442', Math.max(0, u)));
  }
  for (let k = 0; k < 2400; k++) hdot(f, r() * W, WALK + r() * (H - WALK), r() < 0.5 ? '#46404e' : '#221e2a');
  for (let y = WALK + 8; y < H; y += 12 + (y - WALK) / 6) hrect(f, 0, y, W, 0.5, '#24202c'); // slab joints
  // lawn in the lower right
  for (let y = 238; y < H; y += 0.5) {
    const x0 = 330 - (y - 238) * 2.2;
    hrect(f, x0, y, W - x0, 0.5, y < 239 ? '#3a4a30' : '#1e3420');
  }
  for (let k = 0; k < 1600; k++) { const y = 239 + r() * (H - 239), x0 = 330 - (y - 238) * 2.2; hrect(f, x0 + r() * (W - x0), y, 0.5, 1, r() < 0.5 ? '#2e4a28' : '#14281a'); }
  // railing: posts, top rail, mid rail
  const steel = '#2a2c36', steelHi = '#6a6e80';
  hrect(f, 0, RAIL, W, 1, steel); hrect(f, 0, RAIL, W, 0.5, steelHi);
  hrect(f, 0, RAIL + 4, W, 0.5, steel);
  for (let x = 2; x < W; x += 3) hrect(f, x, RAIL, 0.5, 8, steel);
  for (let x = 0; x < W; x += 30) { rect(f, x, RAIL - 1, 1.5, 10, steel); hrect(f, x, RAIL - 1, 0.5, 10, steelHi); }
  hrect(f, 0, RAIL + 8, W, 1, '#5a5460'); // curb
  // benches (with a little perspective: bigger toward us)
  const bench = (x, y, w) => {
    const leg = w * 0.08;
    rect(f, x, y, w, 2, '#6a5040'); hrect(f, x, y, w, 0.5, '#8a6a52');
    rect(f, x + leg, y + 2, leg, 5, '#3a3a44'); rect(f, x + w - leg * 2, y + 2, leg, 5, '#3a3a44');
    rect(f, x - 1, y + 2, w + 2, 0.5, '#2a2a34');
  };
  bench(34, 222, 44); bench(96, 222, 44); bench(236, 230, 64); bench(372, 216, 48);
  // someone sitting on the bench by the water, back to us, taking in the skyline
  {
    const cx = 408, seat = 216;                                                  // centre of the back, bench seat top
    const hood = '#8a3a6a', hoodHi = '#b4588a', hoodSh = '#6a2a52', hoodDk = '#4e1e3e';
    const hair = '#2e1c18', hairHi = '#553428', hairSh = '#1a0f0e';
    // jeans at the hips, on the seat
    hrect(f, cx - 6, seat - 4, 12, 4, '#2a3a5a'); hrect(f, cx - 6, seat - 4, 12, 0.5, '#3a4e74'); hrect(f, cx - 0.25, seat - 3.5, 0.5, 3.5, '#1e2a44');
    // hoodie: sloped shoulders, lamp light on the right edge, arms resting forward
    const top = 196, hem = seat - 4;
    for (let y = top; y < hem; y += 0.5) {
      const u = y - top, hw = u < 3 ? 4 + Math.sqrt(u / 3) * 2.6 : 6.6 - (u - 3) * 0.04;
      hrect(f, cx - hw, y, hw * 2, 0.5, hood);
      hrect(f, cx - hw, y, 1, 0.5, hoodSh);
      hrect(f, cx + hw - 1, y, 1, 0.5, hoodHi);
      if (u > 3.5) { const ax = 4.4 - (u - 3.5) * 0.06; hdot(f, cx - ax, y, hoodDk); hdot(f, cx + ax - 0.5, y, hoodSh); } // arm seams
    }
    hrect(f, cx - 6.4, hem - 1.5, 12.8, 1.5, hoodSh);                              // ribbed hem
    for (let x = cx - 6; x < cx + 6.4; x += 1) hrect(f, x, hem - 1.5, 0.5, 1.5, hoodDk);
    hrect(f, cx - 1.5, 204, 3, 0.5, hoodSh); hrect(f, cx - 1, 207.5, 2.5, 0.5, hoodSh);   // a couple of soft folds
    // the hood, bunched at the back of the neck
    for (let y = top - 1; y < top + 5; y += 0.5) { const hw = 4.2 - (y - top + 1) * 0.5; hrect(f, cx - hw, y, hw * 2, 0.5, y < top ? hoodHi : hoodSh); }
    hrect(f, cx - 2, top + 2, 4, 0.5, hoodDk);
    // head, with shoulder-length hair falling over the hood
    for (let y = 187; y < 199; y += 0.5) {
      const hw = y < 193 ? 3.6 * Math.sqrt(Math.max(0, 1 - ((y - 191.5) / 4.6) ** 2)) : 3.6 + (y - 193) * 0.12;
      const ragged = y > 197 ? ((y * 4) % 3) * 0.5 : 0;
      hrect(f, cx - hw + ragged, y, hw * 2 - ragged * 2, 0.5, hair);
      if (y < 192) hrect(f, cx + hw * 0.05, y, hw * 0.6, 0.5, hairHi);              // sheen
      hdot(f, cx - hw + ragged, y, hairSh);
    }
    for (const [x, y0, l, c] of [[-2, 190, 7, hairSh], [0, 189, 8, hairHi], [1.5, 191, 6, hairSh], [-0.5, 193, 5, hairHi]]) hrect(f, cx + x, y0, 0.5, l, c); // strands
    // headphones: band over the crown, cups at the ears
    for (let k = -3.5; k <= 3.5; k += 0.5) hdot(f, cx + k, 186.5 + (k * k) / 10, '#3a3a4a');
    for (const sx of [-1, 1]) {
      const x = sx < 0 ? cx - 4.3 : cx + 2.8;
      hrect(f, x, 190, 1.5, 3.5, '#24242e'); hrect(f, sx < 0 ? x : x + 1, 190.5, 0.5, 2.5, '#55556a');
    }
    // a coffee next to them on the bench
    hrect(f, cx + 9, seat - 4, 2.5, 4, '#e8e4dc'); hrect(f, cx + 9, seat - 2.5, 2.5, 1.5, '#8a5a3a'); hrect(f, cx + 8.75, seat - 4.5, 3, 0.5, '#f4f2ee');
  }
  // lamppost: tall, black, with a lantern head
  const lx = LAMP.x;
  rect(f, lx - 1, LAMP.top + 8, 2.5, H - LAMP.top - 8, '#141418'); hrect(f, lx - 0.5, LAMP.top + 8, 0.5, H - LAMP.top - 8, '#3a3a46');
  for (let j = LAMP.top + 30; j < H - 10; j += 36) rect(f, lx - 2, j, 4.5, 1.5, '#141418');
  rect(f, lx - 4, H - 10, 9, 10, '#141418');
  rect(f, lx - 4, LAMP.top + 2, 8.5, 8, '#1a1a20'); rect(f, lx - 3, LAMP.top + 3, 6.5, 6, '#ffe8b0');
  rect(f, lx - 5, LAMP.top, 10.5, 2, '#141418'); ellipse(f, lx + 0.25, LAMP.top - 1, 3, 2, '#141418');

  L = {
    sky, city, cityDay, skyline, water, waterDay, refl, reflDay, fg, fgDay: dayVariant(fg.c, { strength: 1 }),
    canopy: {},
    precip: new Precip({ x: 0, y: 0, w: W, h: H, ground: 262 }, 66),
    snow: snowCaps(fg.c, { seed: 14, coverage: 0.7 }), snowCover: 0,
  };
}

// Olive Park boats: lots in summer, the odd one in spring and fall, none once the lake freezes.
const FLEET = [
  [40, 199.5, 3.2, 'sail', '#f4f2ea', 0.9], [300, 202, -4.4, 'motor', '#f4f4f4', 1.05], [170, 200.5, 2.4, 'sail', '#f0e8d8', 0.95],
  [420, 203.5, 5.5, 'motor', '#e8eef4', 1.1], [240, 198.5, -2, 'sail', '#f4f2ea', 0.85], [90, 204, -3, 'sail', '#e8604a', 1.15],
];
const boatsOut = (month) => { const s = seasonOf(month); return s === 'summer' ? FLEET.length : s === 'bare' ? 0 : 1; };

export default {
  id: 'olive',
  focus: 0.5,
  name: 'Olive Park',
  blurb: 'The Hancock across the water',
  ambience: { waves: 0.6, city: 0.3, rain: 1 },

  hotspots: [],

  build() { if (!L) build(); },

  draw(g, t, dt, env) {
    if (!L) build();
    const day = env.sky.daylight, night = 1 - day;
    L.sky.draw(g, t, dt, env);
    drawLit(g, L.city.c, L.cityDay, day);
    if (night > 0.2) animateSkyline(g, L.skyline, t, { glowScale: 0.8 });

    const month = env.sky.month ?? 6, frozen = isFrozen(month);
    if (frozen) { const ice = iceSheet(WATER[0], WATER[1], { seed: 8 }); drawLit(g, ice.night, ice.day, day); }
    else {
      drawLit(g, L.water.c, L.waterDay.c, day);
      for (let jd = 0; jd < (WATER[1] - WATER[0]) * 2; jd++) {
        const j = jd / 2, wob = Math.round(Math.sin(j * 0.35 + t * 0.7) * 0.6 * 2) / 2; // calm water: a slow, gentle shimmer
        g.drawImage(L.refl, 0, jd, W * 2, 1, wob, WATER[0] + j, W, 0.5);
        if (day > 0.01) { g.globalAlpha = day; g.drawImage(L.reflDay, 0, jd, W * 2, 1, wob, WATER[0] + j, W, 0.5); g.globalAlpha = 1; }
      }
      // soft horizontal light streaks drifting slowly, and a bright line along the far shore
      hrect(g, 0, WATER[0], W, 0.5, `rgba(200,220,255,${0.18 + 0.12 * day})`);
      for (let k = 0; k < 14; k++) {
        const y = WATER[0] + 2 + (k % 6) * 1.5, len = 10 + ((k * 37) % 30);
        const x = ((k * 71 + t * (3 + (k % 3))) % (W + len)) - len;
        hrect(g, x, y, len, 0.5, `rgba(255,245,225,${0.12 + 0.1 * (k % 2)})`);
      }

      drawBoats(g, t, FLEET, boatsOut(month), day);
    }
    drawLit(g, L.fg.c, L.fgDay, day);
    glow(g, LAMP.x, LAMP.top + 6, 40, '#ffcf80', (0.4 + 0.02 * Math.sin(t * 2)) * night);
    glow(g, LAMP.x, H - 20, 60, '#ffcf80', 0.12 * night);

    // Framing trees, by season, swaying a touch.
    const season = seasonOf(env.sky.month ?? 6);
    if (!L.canopy[season]) L.canopy[season] = buildCanopy(season, 71);
    const c = L.canopy[season];
    drawLit(g, c.barkNight, c.bark, day);
    const sway = Math.round(Math.sin(t * 0.6) * 1 * 2) / 2;
    g.save(); g.translate(sway, 0);
    drawLit(g, c.leavesNight, c.leaves, day);
    g.restore();

    const snowing = env.weather === 'snow';
    L.snowCover += ((snowing ? 1 : 0) - L.snowCover) * Math.min(1, dt * (snowing ? 0.25 : 0.6));
    if (L.snowCover > 0.01) {
      for (const sn of [L.snow, c.snow]) {
        g.globalAlpha = L.snowCover; blit(g, sn.night);
        g.globalAlpha = L.snowCover * day; blit(g, sn.day);
      }
      g.globalAlpha = 1;
    }
    L.precip.draw(g, dt, env.weather, t);
  },

  click() {},
};
