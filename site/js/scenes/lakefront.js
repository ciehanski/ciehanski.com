// Scene 3: the lakefront. The skyline over Lake Michigan, Navy Pier's wheel,
// Lake Shore Drive traffic, and someone on the revetment steps listening.

import {
  W, H, canvas, canvasHi, blit, hrect, hdot, isHi, rng, rect, dot, hline, vline, gradient, ditherRect, glow, ellipse, bayer, darken, lighten,
} from '../px.js';
import { drawSkyline, animateSkyline } from '../skyline.js';
import { Precip, snowCaps, isFrozen, iceSheet } from '../weather.js';
import { Sky, dayVariant, drawLit } from '../sky.js';
import { drawBoats } from '../boats.js';

const BASE = 170;     // skyline base / shoreline
const LAKE = [174, 236];
const WHEEL = { x: 364, y: 132, r: 27 }; // Navy Pier, out in front just left of the Hancock
const MOON = { x: 96, y: 44 };
const PERSON = { x: 236, y: 229 };
// Summer boats out on the lake by day, smaller the farther out they are.
const FLEET = [
  [60, 182, 2.2, 'sail', '#f4f2ea', 0.8], [330, 188, -3.6, 'motor', '#f4f4f4', 0.9], [200, 196, 2.8, 'sail', '#e8604a', 1.1],
  [430, 205, -4.8, 'motor', '#e8eef4', 1.3], [120, 214, 1.8, 'sail', '#f0e8d8', 1.5],
];
const LAMP = 446;

let L;

function build() {
  const r = rng(2016);

  // Milky Way: a soft diagonal band of dithered haze packed with faint stars.
  const milky = canvas();
  for (let y = 0; y < 130; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.abs(y - (8 + x * 0.2)) / 22;
      const dens = Math.exp(-d * d) * 0.45;
      if (dens > bayer(x, y) + 0.05) dot(milky.g, x, y, y < 60 ? '#1c1d4a' : '#2a2258');
      if (r() < dens * 0.05) dot(milky.g, x, y, r() < 0.5 ? '#6a6aa8' : '#9a94c8');
    }
  const sky = new Sky({
    x: 0, y: 0, w: W, h: BASE + 4, horizon: BASE, seed: 21, stars: 130,
    moon: { x: MOON.x, y: MOON.y, r: 11, crescent: true }, extra: milky.c, cloudBand: [4, 90],
  });

  const city = canvasHi();
  const skyline = drawSkyline(city.g, {
    x0: 56, width: W - 56, baseY: BASE, scale: 0.88, seed: 312,
    landmarks: [
      // Drawn back to front. From North Avenue Beach looking south: the Willis and 311 S Wacker
      // stand far off in the Loop (smaller, behind); the Loop and river towers in the middle;
      // Lake Point Tower by Navy Pier; and the Michigan Avenue / Gold Coast row up front,
      // with the Hancock, by far the closest, towering over it.
      { type: 'willis', x: 300, scale: 0.8 }, { type: 'wacker', x: 322, scale: 0.78 },
      { type: 'stregis', x: 214 }, { type: 'aon', x: 242 }, { type: 'twopru', x: 264 }, { type: 'crain', x: 282 },
      { type: 'trump', x: 336 }, { type: 'marina', x: 356 },
      { type: 'lakepoint', x: 176 },
      // the left: NEMA and more high-rises
      { type: 'tower', x: 82, h: 46, w: 14 }, { type: 'tower', x: 100, h: 62, w: 12, crown: true, tint: '#7a7090' },
      { type: 'tower', x: 118, h: 52, w: 16, tint: '#6a7898' }, { type: 'nema', x: 140 },
      { type: 'tower', x: 158, h: 58, w: 12, tint: '#8a8090' }, { type: 'tower', x: 194, h: 70, w: 14, crown: true },
      { type: 'ninehundred', x: 430, scale: 0.98 }, { type: 'palmolive', x: 452, scale: 0.98 }, { type: 'drake', x: 468 },
      { type: 'hancock', x: 400, scale: 1.15 },
    ],
  });

  // Navy Pier: low buildings along the pier, lights, the wheel's A-frame.
  const p = city.g;
  const pdx = WHEEL.x - 46; // the pier is laid out around the wheel
  rect(p, pdx, BASE - 6, 100, 6, '#141630');
  rect(p, pdx + 60, BASE - 14, 30, 8, '#1a1c3a'); for (let k = 0; k < 5; k++) ellipse(p, pdx + 64 + k * 6, BASE - 14, 3, 2, '#1a1c3a');
  rect(p, pdx + 4, BASE - 10, 22, 4, '#1a1c3a');
  for (let x = 2; x < 100; x += 3) dot(p, pdx + x, BASE - 3, r() < 0.7 ? '#ffd98a' : '#9fc0ff');
  for (let k = 0; k < 28; k++) {
    dot(p, WHEEL.x - 12 + k * 0.45, BASE - 6 - k * 1.2, '#2a2c4a');
    dot(p, WHEEL.x + 12 - k * 0.45, BASE - 6 - k * 1.2, '#2a2c4a');
  }

  // Shoreline haze where the city meets the lake.
  const haze = p.createLinearGradient(0, BASE - 40, 0, BASE);
  haze.addColorStop(0, 'rgba(255,150,120,0)');
  haze.addColorStop(1, 'rgba(255,150,120,0.14)');
  p.fillStyle = haze;
  p.fillRect(0, BASE - 40, W, 40);

  // Reflection: flip & squash the skyline into the lake.
  const lakeH = LAKE[1] - LAKE[0];
  const cityDay = dayVariant(city.c);
  // Built one real-pixel row at a time from the 2x skyline: a finer reflection.
  const reflect = (src, tint) => {
    const out = canvasHi(W, lakeH);
    for (let jd = 0; jd < lakeH * 2; jd++) {
      const row = BASE * 2 - 1 - Math.floor(jd / 0.55);
      if (row < 0) break;
      out.g.drawImage(src, 0, row, W * 2, 1, 0, jd / 2, W, 0.5);
    }
    out.g.save();
    out.g.globalCompositeOperation = 'source-atop';
    const fade = out.g.createLinearGradient(0, 0, 0, lakeH);
    fade.addColorStop(0, `rgba(${tint},0.35)`);
    fade.addColorStop(1, `rgba(${tint},0.9)`);
    out.g.fillStyle = fade;
    out.g.fillRect(0, 0, W, lakeH);
    out.g.restore();
    return out.c;
  };
  const refl = reflect(city.c, '10,12,40');
  const reflDay = reflect(cityDay, '40,80,130');

  const water = canvasHi();
  gradient(water.g, 0, LAKE[0], W, lakeH, ['#15173e', '#0f1132', '#0a0b24']);
  rect(water.g, 0, BASE, W, LAKE[0] - BASE, '#0e1030');
  const waterDay = canvasHi();
  gradient(waterDay.g, 0, LAKE[0], W, lakeH, ['#5a88b8', '#3e6c9c', '#2c5480']);
  rect(waterDay.g, 0, BASE, W, LAKE[0] - BASE, '#6a8aa8');

  // Revetment steps + lamp in the foreground.
  const fg = canvasHi();
  const f = fg.g;
  const steps = [[236, '#4a4a64', '#5d5d7a'], [246, '#3e3e56', '#50506c'], [256, '#33334a', '#44445e']];
  for (const [y, c, hi] of steps) {
    rect(f, 0, y, W, H - y, c);
    hline(f, 0, y, W, hi);
    for (let x = r.int(0, 30); x < W; x += r.int(30, 60)) vline(f, x, y + 1, 9, darken(c, 0.2));
    ditherRect(f, 0, y + 2, W, 8, null, darken(c, 0.08), 0.15);
  }
  // 2x detail on the steps: a lit front edge, concrete grain, hairline joints
  for (const [y, c] of steps) {
    hrect(f, 0, y + 0.5, W, 0.5, lighten(c, 0.12));
    hrect(f, 0, y + 9.5, W, 0.5, darken(c, 0.3));
    for (let k = 0; k < 700; k++) hdot(f, r() * W, y + 1 + r() * 8.5, r() < 0.5 ? lighten(c, 0.08) : darken(c, 0.12));
    for (let x = r.int(0, 20); x < W; x += r.int(18, 34)) hrect(f, x, y + 1, 0.5, 8.5, darken(c, 0.14));
  }
  rect(f, LAMP - 1, 186, 3, 52, '#1e1e2a'); vline(f, LAMP - 1, 186, 52, '#3a3a4c');
  hrect(f, LAMP - 0.5, 186, 0.5, 52, '#4a4a5e');
  for (let j = 192; j < 232; j += 8) hrect(f, LAMP - 1.5, j, 4, 0.5, '#2a2a36');
  rect(f, LAMP - 3, 234, 7, 3, '#1e1e2a');
  rect(f, LAMP - 3, 180, 7, 6, '#ffe8b0'); rect(f, LAMP - 4, 178, 9, 2, '#1e1e2a'); dot(f, LAMP, 177, '#1e1e2a');
  glow(f, LAMP, 240, 50, '#ffcf80', 0.3, 'source-atop');
  glow(f, PERSON.x, 236, 40, '#ffcf80', 0.1, 'source-atop');

  // Someone on the steps, back to us, headphones on. A thermos beside them.
  const px = PERSON.x, py = PERSON.y;
  rect(f, px, py - 2, 12, 9, '#3d3a5c');
  rect(f, px + 1, py - 4, 10, 2, '#3d3a5c');
  vline(f, px + 11, py - 3, 9, '#5a5480');
  vline(f, px, py - 2, 9, '#2a2840');
  rect(f, px + 3, py - 5, 6, 2, '#34304e');
  ellipse(f, px + 6, py - 9, 3, 3, '#2a1e1a');
  for (let k = -3; k <= 3; k++) dot(f, px + 6 + k, py - 12 + Math.round(k * k / 5), '#e8913a');
  rect(f, px + 2, py - 10, 1, 3, '#e8913a'); rect(f, px + 9, py - 10, 1, 3, '#e8913a');
  rect(f, px + 17, py + 1, 3, 6, '#b8262e'); hline(f, px + 17, py + 1, 3, '#e0444a'); rect(f, px + 17, py, 3, 1, '#c8ccd8');
  // 2x detail: hoodie folds and rim light, hood seam, finer headphones, hair, thermos shine
  hrect(f, px + 10.5, py - 3, 0.5, 9, '#6a6494');
  for (const [dx, dy] of [[3, 1], [6, 2], [8, 0.5], [4, 4]]) hrect(f, px + dx, py + dy, 1.5, 0.5, '#2e2c48');
  hrect(f, px + 3, py - 5, 6, 0.5, '#46406a');
  for (let k = -3; k <= 3; k += 0.5) hdot(f, px + 6 + k, py - 12.5 + Math.round((k * k) / 5 * 2) / 2, '#f6a85a');
  hrect(f, px + 1.5, py - 10.5, 1.5, 3.5, '#c46f28'); hrect(f, px + 9, py - 10.5, 1.5, 3.5, '#c46f28');
  for (let k = 0; k < 6; k++) hdot(f, px + 4 + k, py - 11 + (k % 2) * 0.5, '#4a3428');
  hrect(f, px + 17.5, py + 1.5, 0.5, 5, '#ec6a6a');

  L = {
    sky, city, cityDay, skyline, refl, reflDay, water, waterDay, fg, fgDay: dayVariant(fg.c),
    cars: Array.from({ length: 22 }, () => ({ x: r() * W, v: r.range(14, 26), dir: r() < 0.5 ? 1 : -1 })),
    precip: new Precip({ x: 0, y: 0, w: W, h: 262, ground: 236 }, 21),
    // Light snow on the step edges and lamp, a few patches on the treads;
    // the person (and their thermos) stay clear.
    snow: snowCaps(fg.c, {
      seed: 4, coverage: 0.75, exclude: [{ x: PERSON.x - 2, y: PERSON.y - 16, w: 26, h: 26 }],
      extra(g, top, edge, r) {
        for (const y of [237, 247, 257])
          for (let x = r.int(0, 20); x < W; ) {
            const len = r.int(8, 30);
            for (let k = 0; k < len; k++) {
              const px = x + k;
              if (px >= PERSON.x - 3 && px <= PERSON.x + 24) continue;
              if (r() < 0.7) dot(g, px, y, top);
              if (r() < 0.3) dot(g, px, y + 1, edge);
            }
            x += len + r.int(10, 40);
          }
      },
    }),
    snowCover: 0,
    boat: r() * W,
  };
}

function drawWheel(g, t) {
  const { x, y, r } = WHEEL;
  const a0 = t * 0.12;
  for (let k = 0; k < 14; k++) { // thin spokes, one real pixel wide
    const a = a0 + (k / 14) * Math.PI * 2;
    for (let d = 3; d < r; d += 0.5) hdot(g, x + Math.cos(a) * d, y + Math.sin(a) * d, '#2c3060');
  }
  for (let k = 0; k < 360; k++) { const a = (k / 360) * Math.PI * 2; hdot(g, x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r - 1), '#262a52'); } // inner rim
  const n = 84;
  for (let k = 0; k < n; k++) {
    const a = a0 + (k / n) * Math.PI * 2;
    const hue = (k * 360 / n + t * 40) % 360;
    hdot(g, x + Math.cos(a) * r, y + Math.sin(a) * r, `hsl(${hue},85%,68%)`);
    if (k % 6 === 0) { // gondolas
      const gx = x + Math.cos(a) * (r + 2), gy = y + Math.sin(a) * (r + 2);
      hrect(g, gx - 0.5, gy - 0.5, 1.5, 1.5, '#e8e0ff');
    }
  }
  ellipse(g, x, y, 2, 2, '#e8e0ff');
  glow(g, x, y, r + 12, '#c080ff', 0.14);
}

export default {
  id: 'lakefront',
  focus: 0.5,
  name: 'The Lakefront',
  blurb: 'Skyline over Lake Michigan',
  ambience: { waves: 1, city: 0.25, rain: 0.8 },

  hotspots: [],

  build() { if (!L) build(); },

  draw(g, t, dt, env) {
    if (!L) build();
    const day = env.sky.daylight, night = 1 - day;
    L.sky.draw(g, t, dt, env);
    // shooting star every ~14s
    const sp = t % 14;
    if (sp < 0.9 && env.sky.night > 0.6 && env.sky.overcast < 0.5) {
      const k = Math.floor(t / 14);
      const sx = 120 + ((k * 97) % 260), sy = 14 + ((k * 31) % 40);
      for (let i = 0; i < 16; i++) {
        const u = sp / 0.9 - i * 0.018;
        if (u < 0 || u > 1) continue;
        g.globalAlpha = (1 - i / 16) * (1 - sp / 0.9) + 0.1;
        dot(g, sx - u * 70, sy + u * 26, i < 2 ? '#ffffff' : '#c9d2ff');
      }
      g.globalAlpha = 1;
      L.shooting = { x: sx - (sp / 0.9) * 70, y: sy + (sp / 0.9) * 26 };
    } else L.shooting = null;

    drawLit(g, L.water.c, L.waterDay.c, day);
    if (env.sky.overcast > 0.05) {
      g.globalAlpha = env.sky.overcast * 0.55;
      rect(g, 0, BASE, W, LAKE[1] - BASE, day > 0.5 ? '#5e6878' : '#10111e');
      g.globalAlpha = 1;
    }
    drawLit(g, L.city.c, L.cityDay, day);
    g.globalAlpha = 0.35 + 0.65 * night;
    drawWheel(g, t);
    g.globalAlpha = 1;
    if (night > 0.2) animateSkyline(g, L.skyline, t);

    // Lake Shore Drive traffic along the shore.
    for (const c of L.cars) {
      c.x = (c.x + c.dir * c.v * dt + W) % W;
      if (c.dir > 0) { hrect(g, c.x, BASE + 1, 0.5, 0.5, '#fff6d8'); hrect(g, c.x + 1, BASE + 1, 0.5, 0.5, '#fff6d8'); }
      else { hrect(g, c.x, BASE + 2, 0.5, 0.5, '#ff4a4a'); hrect(g, c.x + 1, BASE + 2, 0.5, 0.5, '#c03030'); }
    }

    const frozen = isFrozen(env.sky.month ?? 6);
    if (frozen) { const ice = iceSheet(LAKE[0], LAKE[1], { seed: 4 }); drawLit(g, ice.night, ice.day, day); }
    else {
      // Reflection with a gentle ripple.
      for (let jd = 0; jd < (LAKE[1] - LAKE[0]) * 2; jd++) { // one real-pixel row at a time
        const j = jd / 2;
        const wob = Math.round((Math.sin(j * 0.55 + t * 1.6) * (1 + j / 30) + Math.sin(j * 1.3 - t * 2.3) * 0.6) * 2) / 2;
        g.drawImage(L.refl, 0, jd, W * 2, 1, wob, LAKE[0] + j, W, 0.5);
        if (day > 0.01) { g.globalAlpha = day; g.drawImage(L.reflDay, 0, jd, W * 2, 1, wob, LAKE[0] + j, W, 0.5); g.globalAlpha = 1; }
      }
      // sun glitter on the water when the sun is up and not buried in clouds
      const sunA = (1 - env.sky.overcast) * Math.min(1, Math.max(0, (env.sky.elevation + 1) / 4));
      if (sunA > 0.05) {
        const sx = 16 + env.sky.sunX * (W - 32);
        const warm = Math.min(1, env.sky.golden * 1.4);
        for (let y = LAKE[0] + 1; y < LAKE[1]; y += 1) {
          const w = 3 + (y - LAKE[0]) * 0.25;
          const wob = Math.sin(y * 0.8 + t * 2) * 2;
          if (Math.sin(y * 1.9 + t * 3.2) > -0.3)
            hrect(g, sx - w / 2 + wob, y, w, 0.5, warm > 0.3 ? `rgba(255,190,120,${0.45 * sunA})` : `rgba(255,250,230,${0.4 * sunA})`);
        }
      }
      // moonlight path
      const moonA = night * (1 - env.sky.overcast * 0.8) * (0.15 + 0.85 * (env.sky.moonLight ?? 1));
      for (let y = LAKE[0] + 1; y < LAKE[1] && moonA > 0.05; y += 1) {
        const w = 2 + (y - LAKE[0]) * 0.18;
        const wob = Math.sin(y * 0.8 + t * 2) * 2;
        const on = Math.sin(y * 1.7 + t * 3) > -0.2;
        if (on) hrect(g, MOON.x - w / 2 + wob, y, w, 0.5, `rgba(255,245,215,${(y % 2 ? 0.4 : 0.22) * moonA})`);
      }
      // wheel reflection shimmer
      for (let y = LAKE[0] + 1; y < LAKE[0] + 34; y += 1) {
        const hue = (y * 9 + t * 40) % 360;
        hrect(g, WHEEL.x - 12 + Math.sin(y + t * 2) * 2, y, 24, 0.5, `hsla(${hue},80%,65%,${0.28 * night * (1 - (y - LAKE[0]) / 34)})`);
      }

      const summer = (env.sky.month ?? 6) >= 5 && (env.sky.month ?? 6) <= 7;
      if (summer) drawBoats(g, t, FLEET, FLEET.length, day);
      // A sailboat drifting with its masthead light.
      L.boat = (L.boat + dt * 2.5) % (W + 40);
      const bx = Math.round(L.boat - 20), by = 196;
      for (let k = 0; k < 9; k++) hline(g, bx + 5 - Math.floor(k / 2), by - k, Math.floor(k / 2) + 1, '#2a2c50');
      vline(g, bx + 5, by - 12, 12, '#2a2c50');
      rect(g, bx, by + 1, 12, 2, '#20223e');
      if (Math.floor(t * 1.2) % 2) { dot(g, bx + 5, by - 13, '#ffffff'); glow(g, bx + 5, by - 13, 5, '#ffffff', 0.4); }

      // foam lapping at the steps (behind the foreground, so it never covers the person)
      for (let x = 0; x < W; x += 0.5) {
        const v = Math.sin(x * 0.12 + t * 1.3) + Math.sin(x * 0.05 - t * 0.7);
        if (v > 0.7) hdot(g, x, 235.5 - (v > 1.3 ? 1 : v > 1 ? 0.5 : 0), v > 1.3 ? '#c8d4ff' : '#7a86b8');
      }
    }
    drawLit(g, L.fg.c, L.fgDay, day);
    const snowing = env.weather === 'snow';
    L.snowCover += ((snowing ? 1 : 0) - L.snowCover) * Math.min(1, dt * (snowing ? 0.25 : 0.6));
    if (L.snowCover > 0.01) {
      g.globalAlpha = L.snowCover;
      blit(g, L.snow.night);
      g.globalAlpha = L.snowCover * day;
      blit(g, L.snow.day);
      g.globalAlpha = 1;
    }
    glow(g, LAMP, 183, 34, '#ffcf80', (0.4 + 0.02 * Math.sin(t * 2)) * night);
    // thermos steam
    for (let k = 0; k < 5; k++) {
      const life = (t * 0.5 + k / 5) % 1;
      g.fillStyle = `rgba(230,230,255,${0.3 * (1 - life)})`;
      g.fillRect(Math.round(PERSON.x + 18 + Math.sin(life * 6 + k) * 1.5), Math.round(PERSON.y - 1 - life * 12), 1, 1);
    }

    L.precip.draw(g, dt, env.weather, t);
  },

  click() {},
};
