// Scene 4: downtown from Fullerton beach. The skyline far down the shore, the
// Gold Coast high-rises marching toward us, the harbor lighthouse blinking on
// the breakwater, and the curved concrete revetment sweeping into the lake.

import {
  W, H, canvasHi, blit, hrect, hdot, rng, rect, dot, hline, vline, gradient, glow, ellipse, darken, lighten, mix,
} from '../px.js';
import { drawSkyline, animateSkyline } from '../skyline.js';
import { Precip, snowCaps, isFrozen, iceSheet } from '../weather.js';
import { Sky, dayVariant, drawLit } from '../sky.js';

const BASE = 150;                        // shoreline / horizon
const WHEEL = { x: 128, y: BASE - 12, r: 9 }; // Navy Pier's Centennial Wheel, far down the shore
const LIGHT_K = 0.7;                           // lighthouse scale
const LIGHT = { x: 74, y: BASE - 20 * LIGHT_K }; // Chicago Harbor Light's lamp, on the breakwater
const MOON = { x: 118, y: 40 };

// Revetment edge: x of the lake edge at row y (the concrete is to the right).
const edgeX = (y) => {
  const u = Math.min(1, Math.max(0, (y - BASE) / (H - BASE)));
  return 300 + 180 * Math.pow(1 - u, 1.35);
};

let L;

// Park-strip trees along Lake Shore Drive, by Chicago season: bare trunks in winter
// (which catch snow), greens in spring/summer, the fall mix now.
const TREE_PAL = {
  spring: ['#4e8e3a', '#6aae48', '#8cc85c', '#3a6a2e'],
  summer: ['#1f3f2a', '#2a5234', '#3a6a3a', '#173020'],
  fall: ['#a8582a', '#d8903a', '#c8a038', '#5a6a2a'],
};
const seasonOf = (m) => (m <= 2 || m === 11 ? 'bare' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'fall');

function buildTrees(season) {
  const r = rng(4242);
  const day = canvasHi(), night = canvasHi();
  const pal = TREE_PAL[season];
  for (let k = 0; k < 60; k++) {                      // trunks and bare crowns
    const x = 338 + k * ((W - 338) / 60) + r() * 2, u = (x - 336) / (W - 336), h = 4 + u * 12;
    for (const [c, col] of [[day, '#4a3a30'], [night, '#16121a']]) {
      hrect(c.g, x, BASE - h * 0.5, 0.5, h * 0.5, col);
      if (!pal) for (let b = 0; b < 4; b++) hdot(c.g, x + (r() - 0.5) * h * 0.5, BASE - h * (0.5 + r() * 0.5), col);
    }
  }
  if (pal) for (let k = 0; k < 3200; k++) {
    const x = 336 + r() * (W - 336), u = (x - 336) / (W - 336);
    const y = BASE - Math.pow(r(), 0.7) * (5 + u * 14);
    const col = pal[Math.floor(r() * pal.length)];
    hdot(day.g, x, y, col);
    hdot(night.g, x, y, mix(col, '#0a0c1c', 0.6));
  }
  return { day: day.c, night: night.c, snow: snowCaps(day.c, { seed: 17, coverage: 0.7 }) };
}

function build() {
  const r = rng(1893);

  const sky = new Sky({
    x: 0, y: 0, w: W, h: BASE + 2, horizon: BASE, seed: 33, stars: 120,
    moon: { x: MOON.x, y: MOON.y, r: 9, crescent: true }, cloudBand: [6, 80],
  });

  // Skyline: far downtown small and hazy; the Gold Coast rises closer on the right.
  const city = canvasHi();
  const skyline = drawSkyline(city.g, {
    x0: 200, width: W - 200, baseY: BASE, scale: 0.6, seed: 1871, fillHeight: 0.7,
    landmarks: [
      { type: 'lakepoint', x: 206, scale: 0.62 },
      { type: 'willis', x: 272, scale: 0.46 }, { type: 'wacker', x: 284, scale: 0.44 },
      { type: 'aon', x: 238, scale: 0.55 }, { type: 'twopru', x: 250, scale: 0.55 },
      { type: 'trump', x: 262, scale: 0.6 }, { type: 'nema', x: 226, scale: 0.55 },
      { type: 'hancock', x: 300, scale: 0.78 },
      { type: 'ninehundred', x: 318, scale: 0.62 }, { type: 'palmolive', x: 330, scale: 0.6 },
      // Gold Coast: taller and closer toward the right edge
      { type: 'tower', x: 346, h: 64, w: 12, tint: '#9a8070', scale: 0.8 },
      { type: 'tower', x: 360, h: 72, w: 14, tint: '#b08a6a', crown: true, scale: 0.85 },
      { type: 'tower', x: 376, h: 86, w: 14, tint: '#8a6a5a', scale: 0.9 },
      { type: 'tower', x: 392, h: 80, w: 16, tint: '#c8b8a0', scale: 0.95 },
      { type: 'tower', x: 410, h: 98, w: 16, tint: '#9a5a4a', scale: 1 },
      { type: 'tower', x: 428, h: 92, w: 18, tint: '#b89a7a', crown: true, scale: 1.05 },
      { type: 'tower', x: 448, h: 110, w: 18, tint: '#8a5040', scale: 1.1 },
      { type: 'tower', x: 470, h: 120, w: 22, tint: '#a87a5a', scale: 1.15 },
    ],
  });
  const c = city.g;
  // (the park-strip trees in front of the Gold Coast are a seasonal layer: see buildTrees)
  // Breakwater, lighthouse and the far pier on the left.
  rect(c, 14, BASE - 2, 176, 2, '#1c1e30');
  for (let x = 16; x < 188; x += 1.5) hdot(c, x, BASE - 2, '#2a2c44');
  // Navy Pier: the long pier, Festival Hall's domes, the headhouse, and the wheel's A-frame.
  rect(c, 92, BASE - 3, 92, 3, '#1c1e30');                                   // pier deck
  hrect(c, 92, BASE - 3, 92, 0.5, '#34364e');
  rect(c, 98, BASE - 7, 16, 4, '#22243a'); hrect(c, 98, BASE - 7, 16, 0.5, '#3a3c56');   // headhouse
  rect(c, 140, BASE - 6, 34, 3, '#20223a');                                  // Festival Hall
  for (let k = 0; k < 4; k++) ellipse(c, 144 + k * 8, BASE - 6, 3.5, 2.5, '#282a44');     // its domes
  rect(c, 176, BASE - 8, 6, 5, '#22243a'); ellipse(c, 179, BASE - 8, 3, 2, '#282a44');   // the ballroom at the end
  for (let k = 0; k <= 16; k++) {                                            // A-frame legs
    const u = k / 16;
    hdot(c, WHEEL.x - 6 + u * 6, BASE - 3 + u * (WHEEL.y - BASE + 3), '#34365a');
    hdot(c, WHEEL.x + 6 - u * 6, BASE - 3 + u * (WHEEL.y - BASE + 3), '#34365a');
  }
  // Chicago Harbor Light: concrete crib, fog-signal house, white tower, gallery, lantern, red cap.
  {
    const x = LIGHT.x;
    c.save(); c.translate(x, BASE); c.scale(LIGHT_K, LIGHT_K); c.translate(-x, -BASE); // drawn full-size, scaled down
    rect(c, x - 10, BASE - 3, 20, 3, '#3a3c4e'); hrect(c, x - 10, BASE - 3, 20, 0.5, '#5a5c70');   // crib
    rect(c, x - 9, BASE - 8, 9, 5, '#e2e0ea'); hrect(c, x - 9, BASE - 8, 1, 5, '#ffffff');          // fog-signal house
    for (let k = 0; k < 4; k++) hrect(c, x - 9.5 + k * 0.5, BASE - 9 - k * 0.5, 10 - k, 0.5, '#b8302a'); // its red roof
    hrect(c, x - 7, BASE - 6, 1, 1.5, '#2a2c40'); hrect(c, x - 4, BASE - 6, 1, 1.5, '#2a2c40');        // windows
    for (let y = BASE - 17; y < BASE - 3; y += 0.5) {                                                   // tapered tower
      const u = (y - (BASE - 17)) / 14, hw = 1.6 + u * 1.2;
      hrect(c, x - hw, y, hw * 2, 0.5, '#e8e6f0');
      hrect(c, x - hw, y, 0.5, 0.5, '#ffffff'); hrect(c, x + hw - 0.5, y, 0.5, 0.5, '#b0aec0');
    }
    hrect(c, x - 0.5, BASE - 12, 1, 1.5, '#2a2c40');                                                    // tower window
    hrect(c, x - 2.5, BASE - 18, 5, 1, '#1a1a22'); for (let k = -2; k <= 2; k += 1) hrect(c, x + k, BASE - 19, 0.5, 1, '#1a1a22'); // gallery + rail
    hrect(c, x - 1.5, BASE - 21.5, 3, 3, '#2a2c3a');                                                    // lantern frame
    hrect(c, x - 1, BASE - 21, 2, 2, '#6a7090');                                                        // glass
    for (let k = 0; k < 4; k++) hrect(c, x - 1.75 + k * 0.25, BASE - 22 - k * 0.5, 3.5 - k * 0.5, 0.5, '#b8302a'); // red cap
    hdot(c, x, BASE - 24, '#1a1a22');                                                                    // vent ball
    c.restore();
  }
  // Haze where the city meets the lake.
  const haze = c.createLinearGradient(0, BASE - 50, 0, BASE);
  haze.addColorStop(0, 'rgba(255,150,120,0)');
  haze.addColorStop(1, 'rgba(255,150,120,0.16)');
  c.fillStyle = haze;
  c.fillRect(0, BASE - 50, W, 50);
  const cityDay = dayVariant(city.c);

  // Reflection of the whole shore, squashed, one real-pixel row at a time.
  const lakeH = H - BASE;
  const reflect = (src, tint) => {
    const out = canvasHi(W, lakeH);
    for (let jd = 0; jd < lakeH * 2; jd++) {
      const row = BASE * 2 - 1 - Math.floor(jd / 0.6);
      if (row < 0) break;
      out.g.drawImage(src, 0, row, W * 2, 1, 0, jd / 2, W, 0.5);
    }
    out.g.save();
    out.g.globalCompositeOperation = 'source-atop';
    const fade = out.g.createLinearGradient(0, 0, 0, lakeH);
    fade.addColorStop(0, `rgba(${tint},0.3)`);
    fade.addColorStop(1, `rgba(${tint},0.92)`);
    out.g.fillStyle = fade;
    out.g.fillRect(0, 0, W, lakeH);
    out.g.restore();
    return out.c;
  };
  const refl = reflect(city.c, '10,12,40');
  const reflDay = reflect(cityDay, '40,90,130');

  const water = canvasHi();
  gradient(water.g, 0, BASE, W, lakeH, ['#1a1c46', '#12143a', '#0c0d2a', '#080920']);
  const waterDay = canvasHi();
  gradient(waterDay.g, 0, BASE, W, lakeH, ['#7aa8c8', '#4a88a8', '#2a6a8a', '#1a5070']);

  // The revetment: a curved concrete walk with a stepped block edge into the lake.
  const fg = canvasHi();
  const f = fg.g;
  for (let y = BASE + 0.5; y < H; y += 0.5) {
    const x0 = edgeX(y), u = (y - BASE) / (H - BASE);
    const face = 1.5 + u * 5;                                      // the block face grows toward us
    hrect(f, x0, y, face, 0.5, mix('#24222e', '#34323e', u));      // stepped edge face
    hrect(f, x0 + face, y, W - x0 - face, 0.5, mix('#4a4658', '#6a6474', u)); // walkway
  }
  for (let y = BASE + 2; y < H; y += 2 + (y - BASE) / 18) {           // block joints along the edge
    const x0 = edgeX(y), u = (y - BASE) / (H - BASE);
    hrect(f, x0, y, 1.5 + u * 5, 0.5, '#26242e');
  }
  for (let k = 0; k < 1400; k++) {                                   // concrete grain
    const y = BASE + 2 + r() * (H - BASE - 2), x = edgeX(y) + 6 + r() * (W - edgeX(y));
    if (x < W) hdot(f, x, y, r() < 0.5 ? '#76707e' : '#3e3a4a');
  }
  for (let y = BASE + 6; y < H; y += 9) {                            // expansion joints on the walk
    const x0 = edgeX(y) + 4 + (y - BASE) / 20;
    hrect(f, x0, y, W - x0, 0.5, '#3a3646');
  }
  // A little foam along the blocks, plus a lamppost and bench on the walk.
  const lamp = { x: 452, y: 186 };
  rect(f, lamp.x - 0.5, lamp.y - 34, 1.5, 34, '#1e1e2a'); rect(f, lamp.x - 2, lamp.y - 38, 4, 4, '#ffe8b0');
  rect(f, 412, 200, 22, 2, '#4a3226'); rect(f, 412, 196, 22, 1.5, '#4a3226'); rect(f, 414, 202, 1, 4, '#1e1e2a'); rect(f, 431, 202, 1, 4, '#1e1e2a');

  L = {
    sky, city, cityDay, skyline, refl, reflDay, water, waterDay, fg, fgDay: dayVariant(fg.c, { strength: 1 }), lamp,
    precip: new Precip({ x: 0, y: 0, w: W, h: H, ground: 250 }, 44),
    snow: snowCaps(fg.c, { seed: 8, coverage: 0.6 }), snowCover: 0, trees: {},
    boat: r() * W,
  };
}

export default {
  id: 'fullerton',
  focus: 0.5,
  name: 'Fullerton Beach',
  blurb: 'Downtown from the north shore',
  ambience: { waves: 1, city: 0.15, rain: 0.8 },

  hotspots: [
    { id: 'lighthouse', x: LIGHT.x - 8, y: LIGHT.y - 4, w: 16, h: BASE - LIGHT.y + 5, label: 'Harbor Light' },
    { id: 'wheel', x: 92, y: WHEEL.y - WHEEL.r - 2, w: 92, h: BASE - WHEEL.y + WHEEL.r + 2, label: 'Navy Pier' },
    { id: 'moon', x: MOON.x - 11, y: MOON.y - 11, w: 22, h: 22, label: 'Moon' },
  ],

  build() { if (!L) build(); },

  draw(g, t, dt, env) {
    if (!L) build();
    const day = env.sky.daylight, night = 1 - day;
    L.sky.draw(g, t, dt, env);
    drawLit(g, L.water.c, L.waterDay.c, day);
    if (env.sky.overcast > 0.05) {
      g.globalAlpha = env.sky.overcast * 0.5;
      rect(g, 0, BASE, W, H - BASE, day > 0.5 ? '#5e6878' : '#10111e');
      g.globalAlpha = 1;
    }
    drawLit(g, L.city.c, L.cityDay, day);
    if (night > 0.2) animateSkyline(g, L.skyline, t, { glowScale: 0.6 });
    const season = seasonOf(env.sky.month ?? 6);
    L.trees[season] ??= buildTrees(season);
    const trees = L.trees[season];
    drawLit(g, trees.night, trees.day, day);

    // Navy Pier's Centennial Wheel, far down the shore, turning slowly.
    {
      const { x, y, r } = WHEEL, a0 = t * 0.12, lit = 0.4 + 0.6 * night;
      for (let k = 0; k < 12; k++) {                                          // thin spokes
        const a = a0 + (k / 12) * Math.PI * 2;
        for (let d = 1; d < r; d += 0.5) hdot(g, x + Math.cos(a) * d, y + Math.sin(a) * d, `rgba(60,64,110,${0.5 + 0.5 * lit})`);
      }
      for (let k = 0; k < 56; k++) {                                          // rim lights
        const a = a0 + (k / 56) * Math.PI * 2;
        hdot(g, x + Math.cos(a) * r, y + Math.sin(a) * r, `hsla(${(k * 360 / 56 + t * 40) % 360},85%,${55 + 15 * lit}%,${lit})`);
      }
      for (let k = 0; k < 14; k++) {                                          // gondolas
        const a = a0 + (k / 14) * Math.PI * 2;
        hrect(g, x + Math.cos(a) * (r + 1) - 0.5, y + Math.sin(a) * (r + 1) - 0.25, 1, 1, `rgba(232,224,255,${0.4 + 0.6 * lit})`);
      }
      hrect(g, x - 0.5, y - 0.5, 1, 1, '#e8e0ff');
      if (night > 0.3) glow(g, x, y, r + 8, '#c080ff', 0.16 * night);
      // pier lights, twinkling
      for (let px = 94; px < 184; px += 2) {
        const on = Math.sin(px * 1.7 + t * 1.3) > -0.6;
        hdot(g, px, BASE - 2, on ? (px % 6 ? '#ffd98a' : '#9fc0ff') : '#3a3040');
      }
      if (night > 0.3) glow(g, 158, BASE - 6, 20, '#ffcf80', 0.14 * night);
    }

    // The harbor light: a rotating beacon. The beam sweeps across; it flares when it faces us.
    const ph = t * 0.9, facing = Math.cos(ph), side = Math.sin(ph);
    const flare = Math.pow(Math.max(0, facing), 10);
    const beamA = (0.25 + 0.75 * night) * (1 - env.sky.overcast * 0.6);
    {
      const { x, y } = LIGHT;
      // the sweeping beam: a soft wedge whose length shows which way it's pointing
      const len = 56 * Math.abs(side) * (1 - flare * 0.7), dir = side > 0 ? 1 : -1;
      if (len > 4 && beamA > 0.05) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        const grad = g.createLinearGradient(x, y, x + dir * len, y);
        grad.addColorStop(0, `rgba(255,236,200,${0.45 * beamA})`);
        grad.addColorStop(1, 'rgba(255,236,200,0)');
        g.fillStyle = grad;
        g.beginPath(); g.moveTo(x, y - 0.5); g.lineTo(x + dir * len, y - 4); g.lineTo(x + dir * len, y + 3); g.lineTo(x, y + 0.5); g.closePath(); g.fill();
        g.restore();
      }
      hrect(g, x - 0.75, y - 0.75, 1.5, 1.5, flare > 0.05 || night > 0.3 ? '#fff4d8' : '#8a90b0'); // lamp
      glow(g, x, y, 10, '#ffe6b0', (0.35 + 0.4 * flare) * beamA);
      if (flare > 0.02) {
        glow(g, x, y, 26 * flare + 6, '#fff0d0', 0.8 * flare * beamA);
        g.save(); g.globalCompositeOperation = 'lighter';                       // cross-shaped flare streaks
        g.fillStyle = `rgba(255,240,210,${0.7 * flare * beamA})`;
        g.fillRect(x - 14 * flare, y - 0.25, 28 * flare, 0.5); g.fillRect(x - 0.25, y - 6 * flare, 0.5, 12 * flare);
        g.restore();
      }
    }

    const frozen = isFrozen(env.sky.month ?? 6);
    if (frozen) { const ice = iceSheet(BASE + 0.5, H, { seed: 6 }); drawLit(g, ice.night, ice.day, day); }
    else {
      // Reflection with a ripple, finer rows toward the horizon.
      for (let jd = 0; jd < (H - BASE) * 2; jd++) {
        const j = jd / 2;
        const wob = Math.round((Math.sin(j * 0.5 + t * 1.5) * (1 + j / 40) + Math.sin(j * 1.2 - t * 2.1) * 0.6) * 2) / 2;
        g.drawImage(L.refl, 0, jd, W * 2, 1, wob, BASE + j, W, 0.5);
        if (day > 0.01) { g.globalAlpha = day; g.drawImage(L.reflDay, 0, jd, W * 2, 1, wob, BASE + j, W, 0.5); g.globalAlpha = 1; }
      }
      // Moonlight or sun glitter across the open water.
      const moonA = night * (1 - env.sky.overcast * 0.8) * (0.15 + 0.85 * (env.sky.moonLight ?? 1));
      for (let y = BASE + 2; y < H && moonA > 0.05; y += 1) {
        const w = 2 + (y - BASE) * 0.16, wob = Math.sin(y * 0.8 + t * 2) * 2;
        if (Math.sin(y * 1.7 + t * 3) > -0.2) hrect(g, MOON.x - w / 2 + wob, y, w, 0.5, `rgba(255,245,215,${(y % 2 ? 0.38 : 0.2) * moonA})`);
      }
      const sunA = (1 - env.sky.overcast) * Math.min(1, Math.max(0, (env.sky.elevation + 1) / 4));
      if (sunA > 0.05) {
        const sx = 16 + env.sky.sunX * (W - 32), warm = Math.min(1, env.sky.golden * 1.4);
        for (let y = BASE + 1; y < H; y += 1) {
          const w = 3 + (y - BASE) * 0.22, wob = Math.sin(y * 0.8 + t * 2) * 2;
          if (Math.sin(y * 1.9 + t * 3.2) > -0.3) hrect(g, sx - w / 2 + wob, y, w, 0.5, warm > 0.3 ? `rgba(255,190,120,${0.42 * sunA})` : `rgba(255,250,230,${0.38 * sunA})`);
        }
      }
      // the beacon's streak on the water, brightest when it faces us
      if (beamA > 0.05) for (let y = BASE + 1; y < BASE + 60; y += 1) {
        const fade = 1 - (y - BASE) / 60, wob = Math.sin(y * 0.9 + t * 2) * 1.5;
        if (Math.sin(y * 1.7 + t * 3) > -0.3) hrect(g, LIGHT.x - 1 + wob, y, 2 + flare * 3, 0.5, `rgba(255,236,190,${(0.12 + 0.5 * flare) * fade * beamA})`);
      }

      // A sailboat drifting far out.
      L.boat = (L.boat + dt * 1.6) % (W + 40);
      const bx = Math.round(L.boat - 20), by = BASE + 10;
      if (bx < edgeX(by) - 8) {
        for (let k = 0; k < 6; k++) hrect(g, bx + 3 - k * 0.5, by - k, k * 0.5 + 0.5, 1, '#2a2c50');
        hrect(g, bx + 3, by - 8, 0.5, 8, '#2a2c50'); hrect(g, bx, by + 0.5, 7, 1, '#20223e');
        if (Math.floor(t * 1.2) % 2) { hdot(g, bx + 3, by - 8.5, '#ffffff'); glow(g, bx + 3, by - 8.5, 3, '#ffffff', 0.4); }
      }

    }
    drawLit(g, L.fg.c, L.fgDay, day);
    // foam where the lake meets the blocks
    if (!frozen) for (let y = BASE + 2; y < H; y += 1) {
      const v = Math.sin(y * 0.4 + t * 1.4) + Math.sin(y * 0.13 - t * 0.6);
      if (v > 0.6) hrect(g, edgeX(y) - 1 - (v > 1.2 ? 0.5 : 0), y, 1 + (v > 1.2 ? 0.5 : 0), 0.5, v > 1.2 ? '#c8d4ff' : '#7a86b8');
    }
    glow(g, L.lamp.x, L.lamp.y - 36, 26, '#ffcf80', (0.35 + 0.02 * Math.sin(t * 2)) * night);

    const snowing = env.weather === 'snow';
    L.snowCover += ((snowing ? 1 : 0) - L.snowCover) * Math.min(1, dt * (snowing ? 0.25 : 0.6));
    if (L.snowCover > 0.01) {
      for (const sn of [L.snow, trees.snow]) {
        g.globalAlpha = L.snowCover; blit(g, sn.night);
        g.globalAlpha = L.snowCover * day; blit(g, sn.day);
      }
      g.globalAlpha = 1;
    }
    L.precip.draw(g, dt, env.weather, t);
  },

  click(id, api) {
    if (id === 'moon' && api.moonName) return api.say('', `A ${api.moonName()} over Fullerton.`);
    const lines = {
      lighthouse: [['', 'The Chicago Harbor Light, guarding the mouth of the river since 1893.']],
      wheel: [['', 'Navy Pier, way down the shore. You can just make out the wheel turning.']],
    };
    const pool = lines[id];
    if (pool) api.say(...pool[Math.floor(Math.random() * pool.length)]);
  },
};
