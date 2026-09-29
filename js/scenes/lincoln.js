// Scene 2: Armitage, Lincoln Park. Brick walk-ups and greystones under the
// Brown Line, a corner tavern, a hot dog stand, and the L rumbling past.

import {
  W, H, canvas, canvasHi, blit, hrect, hdot, isHi, rng, rect, dot, hline, vline, gradient, ditherRect, glow, ellipse,
  text, textWidth, mix, darken, lighten, hash,
} from '../px.js';
import { drawSkyline, animateSkyline } from '../skyline.js';
import { Precip, snowCaps } from '../weather.js';
import { Sky, dayVariant, drawLit } from '../sky.js';

const GROUND = 204; // top of the far sidewalk
const ROAD = [214, 258];
const RAIL = 121;
const COLUMNS = [36, 146, 256, 366, 476];
const LAMPS = [110, 334, 440];
// Trains: every 30s one comes through. Most stop at Armitage (brake, doors,
// chime, pull out); the rest roll straight through.
const CYCLE = 30;
const PASS = 8;                 // seconds to cross when not stopping
const ARRIVE = 5, DWELL = 9, DEPART = 5;
const DOORS = [2, 7.6];         // open/close times within the dwell
const DOOR_OFFSETS = [18, 42];  // door x within each 64px car

let L;

// ------------------------------------------------------------------ helpers

function windowPane(g, r, x, y, w, h, out, lit = r() < 0.45) {
  const fine = isHi(g), t = fine ? 0.5 : 1;
  rect(g, x - 1, y - 1, w + 2, h + 2, '#1a141c');
  if (fine) hrect(g, x - 1, y - 1, w + 2, 0.5, '#33282e');           // frame catches the light
  if (!lit) {
    rect(g, x, y, w, h, '#161a33');
    dot(g, x + 1, y + 1, '#2c3360');
    if (r() < 0.12) { rect(g, x, y, w, h, '#1f2a55'); out.tv.push({ x: x + w / 2, y: y + h / 2 }); }
    if (fine) for (let k = 0; k < Math.min(w, h) * 2 - 2; k++) hdot(g, x + w - 1 - k * 0.5, y + 0.5 + k * 0.5, 'rgba(90,110,180,0.35)'); // glare
  } else {
    const warm = r.pick(['#ffcf7a', '#ffc070', '#ffe0a0', '#ffb877']);
    rect(g, x, y, w, h, warm);
    rect(g, x, y + h - 2, w, 2, darken(warm, 0.2));
    if (fine) { hrect(g, x, y, w, 0.5, lighten(warm, 0.3)); hrect(g, x, y + h - 2, w, 0.5, darken(warm, 0.3)); }
    const deco = r();
    if (deco < 0.25) for (let j = y + t; j < y + h; j += 2 * t) hrect(g, x, j, w, t, darken(warm, 0.18)); // blinds
    else if (deco < 0.4) { // curtains, with folds at 2x
      rect(g, x, y, 2, h, '#8a4a5a'); rect(g, x + w - 2, y, 2, h, '#8a4a5a');
      if (fine) { hrect(g, x + 0.5, y, 0.5, h, '#a8606e'); hrect(g, x + w - 1.5, y, 0.5, h, '#a8606e'); }
    } else if (deco < 0.5) { // plant
      rect(g, x + 1, y + h - 2, 3, 2, '#9a5a3a');
      if (fine) for (let k = 0; k < 9; k++) hdot(g, x + 1 + r() * 3, y + h - 5 + r() * 3, r() < 0.5 ? '#3f7a3e' : '#5aa05e');
      else { rect(g, x + 1, y + h - 4, 3, 2, '#3f7a3e'); dot(g, x + 2, y + h - 5, '#5aa05e'); }
    } else if (deco < 0.58) { // someone
      rect(g, x + 2, y + h - 5, 2, 5, '#3a2a30'); rect(g, x + 2, y + h - 7, 2, 2, '#3a2a30');
      if (fine) hrect(g, x + 1.5, y + h - 5, 3, 0.5, '#3a2a30');
    }
    out.lit.push({ x, y, w, h, c: warm, seed: (r() * 1e6) | 0 });
  }
  if (fine) { hrect(g, x + w / 2 - 0.25, y, 0.5, h, '#2a1e22'); hrect(g, x, y + Math.round(h * 0.4), w, 0.5, '#2a1e22'); } // muntins
  else vline(g, x + (w >> 1), y, h, '#2a1e22');
}

function brick(g, r, x, y, w, h, base) {
  rect(g, x, y, w, h, base);
  const mortar = darken(base, 0.18);
  if (isHi(g)) {
    // 2x: courses every 1.5 units, staggered joints, a few bricks a shade off
    for (let j = y + 1.5, row = 0; j < y + h; j += 1.5, row++) {
      hrect(g, x, j, w, 0.5, mortar);
      for (let i = x + (row % 2) * 1.5; i < x + w; i += 3) {
        hrect(g, i, j - 1, 0.5, 1, mortar);
        if (r() < 0.22) hrect(g, i + 0.5, j - 1, 2.5, 1, r() < 0.5 ? lighten(base, 0.07) : darken(base, 0.08));
      }
    }
    for (let k = 0; k < w * h * 0.03; k++) hdot(g, x + r() * w, y + r() * h, lighten(base, 0.12));
    return;
  }
  for (let j = y + 2; j < y + h; j += 3) {
    hline(g, x, j, w, mortar);
    for (let i = x + ((j >> 1) % 2) * 3; i < x + w; i += 6) if (r() < 0.8) dot(g, i, j - 1, mortar);
  }
  for (let k = 0; k < w * h * 0.02; k++) dot(g, x + r() * w, y + r() * h, lighten(base, 0.1));
}

function cornice(g, x, y, w, c) {
  rect(g, x - 2, y, w + 4, 3, lighten(c, 0.15));
  hline(g, x - 2, y + 3, w + 4, darken(c, 0.4));
  if (isHi(g)) {
    hrect(g, x - 2, y, w + 4, 0.5, lighten(c, 0.35));
    hrect(g, x - 2, y + 1.5, w + 4, 0.5, darken(c, 0.1));
    for (let i = x - 1.5; i < x + w + 1.5; i += 1.5) hrect(g, i, y + 2, 0.5, 1, darken(c, 0.25)); // dentils
    return;
  }
  for (let i = x; i < x + w; i += 4) dot(g, i, y + 3, lighten(c, 0.2));
}

function building(g, r, out, { x, w, top, color, cols, rows, winW = 6, winH = 9, stone = false, bay = false, ground = GROUND, skipBottom = 0 }) {
  const h = ground - top;
  if (stone) {
    rect(g, x, top, w, h, color);
    for (let j = top + 4; j < ground; j += 4) hline(g, x, j, w, darken(color, 0.12));
    ditherRect(g, x, top, w, h, null, lighten(color, 0.06), 0.12);
    if (isHi(g)) for (let j = top + 4; j < ground; j += 4) {
      hrect(g, x, j + 1, w, 0.5, lighten(color, 0.1));                    // rusticated course highlight
      for (let i = x + ((j / 4) % 2) * 3; i < x + w; i += 6) hrect(g, i, j - 3, 0.5, 3, darken(color, 0.08));
    }
  } else brick(g, r, x, top, w, h, color);
  vline(g, x, top, h, darken(color, 0.35));
  cornice(g, x, top, w, color);
  const usable = h - 10 - skipBottom;
  const pitchY = Math.floor(usable / rows);
  const pitchX = Math.floor(w / cols);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const wx = x + Math.floor(pitchX * i + (pitchX - winW) / 2);
      const wy = top + 8 + j * pitchY;
      rect(g, wx - 1, wy - 2, winW + 2, 1, lighten(color, 0.2)); // lintel
      windowPane(g, r, wx, wy, winW, winH, out);
      hline(g, wx - 1, wy + winH + 1, winW + 2, lighten(color, 0.12)); // sill
    }
  if (bay) {
    const bx = x + (w >> 1) - 9;
    rect(g, bx, top + 6, 18, h - 26, lighten(color, 0.08));
    vline(g, bx, top + 6, h - 26, lighten(color, 0.2));
    for (let wy = top + 10; wy < ground - 28; wy += pitchY) windowPane(g, r, bx + 3, wy, 12, winH, out);
  }
}

// ------------------------------------------------------------------ train

function buildTrain() {
  const cars = 4, carW = 62, gap = 2;
  const { c, g } = canvasHi(cars * (carW + gap), 22);
  const r = rng(8);
  for (let i = 0; i < cars; i++) {
    const cx = i * (carW + gap);
    rect(g, cx + 10, 0, 12, 2, '#7d8594'); rect(g, cx + 40, 0, 12, 2, '#7d8594');
    rect(g, cx, 2, carW, 15, '#a7afbd');
    hline(g, cx, 2, carW, '#d4dae4');
    hline(g, cx, 3, carW, '#bcc3cf');
    rect(g, cx, 15, carW, 3, '#6d7483');
    hline(g, cx, 13, carW, '#7a4a2a');
    for (let wx = cx + 2; wx < cx + carW - 6; wx += 8) {
      const door = wx - cx === 18 || wx - cx === 42;
      if (door) {
        rect(g, wx, 4, 6, 11, '#8a92a0');
        rect(g, wx + 1, 5, 4, 5, '#ffe6a8');
        vline(g, wx + 3, 4, 11, '#5c6270');
        continue;
      }
      rect(g, wx, 6, 6, 5, '#ffe6a8');
      hline(g, wx, 10, 6, '#f0c880');
      if (r() < 0.45) { // passengers
        const px = wx + r.int(0, 3);
        rect(g, px, 8, 2, 3, r.pick(['#4a3a44', '#3a3a52', '#5a3a2a']));
        rect(g, px, 7, 2, 1, r.pick(['#2a1e1a', '#6a4a2a', '#1a1a22']));
      }
    }
    rect(g, cx + 6, 18, 12, 3, '#26262e'); rect(g, cx + 44, 18, 12, 3, '#26262e');
    for (const wx of [cx + 7, cx + 14, cx + 45, cx + 52]) rect(g, wx, 19, 3, 3, '#3a3a44');
    if (i < cars - 1) rect(g, cx + carW, 6, gap, 8, '#2a2a33');
  }
  // lead car (facing right)
  const f = (cars - 1) * (carW + gap);
  rect(g, f + carW - 5, 5, 4, 5, '#20283a');
  rect(g, f + carW - 14, 3, 9, 3, '#6b3f1f');
  for (let k = 0; k < 4; k++) dot(g, f + carW - 13 + k * 2, 4, '#ffb050');
  rect(g, f + carW - 2, 12, 2, 2, '#fff6c0');
  rect(g, 0, 12, 2, 2, '#ff3030');
  // 2x detail: roof highlight, rivets, window frames, panel seams, underframe
  for (let i = 0; i < cars; i++) {
    const cx = i * (carW + gap);
    hrect(g, cx, 2, carW, 0.5, '#eef2f8');
    for (let x = cx + 1; x < cx + carW - 1; x += 1.5) { hdot(g, x, 3.5, '#9aa2b0'); hdot(g, x, 15.5, '#5a6070'); }
    for (let wx = cx + 2; wx < cx + carW - 6; wx += 8) {
      if (wx - cx === 18 || wx - cx === 42) { hrect(g, wx, 4, 0.5, 11, '#6c7482'); hrect(g, wx + 5.5, 4, 0.5, 11, '#6c7482'); continue; }
      hrect(g, wx - 0.5, 5.5, 7, 0.5, '#6c7482'); hrect(g, wx - 0.5, 11, 7, 0.5, '#8a92a0');
      hrect(g, wx + 0.5, 6, 2, 0.5, 'rgba(255,255,255,0.6)'); // glass glint
    }
    hrect(g, cx + 0.5, 4, 0.5, 11, '#8a92a0'); hrect(g, cx + carW - 1, 4, 0.5, 11, '#8a92a0');
    for (const bx of [cx + 22, cx + 30]) hrect(g, bx, 18, 5, 1.5, '#34343c');
  }
  c.logicalW = cars * (carW + gap);
  return c;
}

// Street trees follow the Chicago season: bare in winter (they still catch
// snow), a few shades of green in spring and summer, the fall mix Sep-Nov.
const TREES = [136, 398];
const TREE_PAL = {
  spring: ['#4e8e3a', '#6aae48', '#8cc85c', '#b0de7c', '#5a9a44'],
  summer: ['#2c6a30', '#3e8a3c', '#58a64a', '#78c05c', '#347a3a'],
  fall: ['#c8742a', '#e8a04a', '#d8b040', '#a8442a', '#b86a2a', '#6a8a3a'],
};
const seasonOf = (m) => (m <= 1 || m === 11 ? 'bare' : m === 2 ? 'bare' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'fall');

function buildTrees(season) {
  const r = rng(77);
  const { c, g } = canvasHi();
  const bark = '#3a2a22';
  for (const tx of TREES) {
    rect(g, tx - 1, 150, 3, GROUND - 150, bark);
    rect(g, tx - 8, GROUND - 1, 17, 2, '#241c20');
    for (const [dx, dy, from] of [[-13, -12, 166], [12, -14, 164], [-6, -19, 158], [7, -20, 156], [-16, -2, 162], [16, -4, 160], [3, -24, 152]]) {
      const n = Math.max(Math.abs(dx), Math.abs(dy));
      for (let k = 0; k <= n; k++) dot(g, tx + (dx * k) / n, from + ((156 + dy - from) * k) / n, bark);
    }
    const pal = TREE_PAL[season];
    if (!pal) continue;
    // leaves at 2x: twice as many, one real pixel each, in little clusters
    const count = (season === 'fall' ? 400 : 520) * 3;
    for (let k = 0; k < count; k++) {
      const ang = r() * Math.PI * 2, d = Math.sqrt(r());
      const x = tx + Math.cos(ang) * d * 19, y = 156 + Math.sin(ang) * d * 15;
      const lightSide = y < 152 || x < tx - 6;
      const col = lightSide && r() < 0.5 ? pal[3] : y > 162 && r() < 0.5 ? pal[0] : r.pick(pal);
      hrect(g, x, y, 1, 0.5, col);
      if (r() < 0.25) hdot(g, x, y + 0.5, pal[0]);
    }
  }
  const night = canvasHi();
  blit(night.g, c);
  night.g.globalCompositeOperation = 'source-atop';
  night.g.fillStyle = 'rgba(12,14,30,0.62)';
  night.g.fillRect(0, 0, W, H);
  return { day: c, night: night.c, snow: snowCaps(c, { seed: 6, coverage: 0.6 }) };
}

function drawSnow(g, snow, day, amount) {
  if (amount < 0.01) return;
  g.globalAlpha = amount;
  blit(g, snow.night);
  g.globalAlpha = amount * day;
  blit(g, snow.day);
  g.globalAlpha = 1;
}

// A modern car in profile (EV-ish fastback or compact SUV), facing right, drawn at
// 2x. x = rear bumper, y = the ground line under the wheels.
function modernCar(g, x, y, body, { suv = false } = {}) {
  const fill = (pts, col) => { // crisp polygon at half-unit resolution
    const ys = pts.map((p) => p[1]);
    for (let yy = Math.min(...ys); yy < Math.max(...ys); yy += 0.5) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
        const yc = yy + 0.25;
        if (yc >= Math.min(y1, y2) && yc < Math.max(y1, y2)) xs.push(x1 + ((yc - y1) / (y2 - y1)) * (x2 - x1));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) hrect(g, xs[i], yy, xs[i + 1] - xs[i], 0.5, col);
    }
  };
  const L = 46, roof = suv ? 15 : 13, belt = suv ? 8.5 : 7.5;
  const hi = lighten(body, 0.28), lo = darken(body, 0.3);
  // lower body with rounded ends
  fill([[x + 1, y - 3], [x, y - 5], [x + 1, y - belt], [x + L - 3, y - belt], [x + L, y - 5.5], [x + L, y - 3.5], [x + L - 1, y - 3]], body);
  // cabin: sloped rear glass, long roof, raked windshield
  const rTop = suv ? x + 9 : x + 13, fTop = suv ? x + 33 : x + 31;
  fill([[x + 3, y - belt], [rTop, y - roof], [fTop, y - roof], [x + 39, y - belt]], body);
  fill([[x + 5, y - belt], [rTop + 1, y - roof + 1], [fTop - 0.5, y - roof + 1], [x + 37, y - belt]], '#141a26'); // glass
  hrect(g, x + 22, y - roof + 1, 1, roof - belt - 1, body);                          // B-pillar
  fill([[fTop - 5, y - roof + 1], [fTop - 3, y - roof + 1], [fTop - 7, y - belt], [fTop - 9, y - belt]], 'rgba(170,190,235,0.35)'); // glare
  hrect(g, rTop, y - roof, fTop - rTop, 0.5, hi);                                      // roof highlight
  hrect(g, x + 1, y - belt, L - 4, 0.5, hi);                                           // shoulder line
  hrect(g, x + 2, y - 5.5, L - 4, 0.5, lighten(body, 0.12));                           // character line
  hrect(g, x + 1, y - 3.5, L - 2, 0.5, '#15151c');                                     // black lower trim
  hrect(g, x + 22, y - belt, 0.5, belt - 3.5, lo); hrect(g, x + 12, y - belt, 0.5, belt - 3.5, lo); // door seams
  hrect(g, x + 17, y - 6.5, 2, 0.5, lighten(body, 0.45)); hrect(g, x + 27, y - 6.5, 2, 0.5, lighten(body, 0.45)); // flush handles
  hrect(g, fTop - 1, y - belt - 1, 2, 1, '#1a1a22');                                   // mirror
  hrect(g, x + L - 3, y - 6.5, 3, 0.5, '#e8f4ff'); hrect(g, x + L - 2.5, y - 6, 2.5, 0.5, '#9ad0ff'); // LED headlight strip
  hrect(g, x, y - 6.5, 2, 1, '#e02838');                                               // tail light bar
  for (const wx of [x + 10, x + 36]) {                                                 // wheels: arch, tire, alloy
    ellipse(g, wx, y - 3, 4, 3.5, '#0c0c10');
    ellipse(g, wx, y - 2.5, 3, 2.5, '#18181e');
    ellipse(g, wx, y - 2.5, 1.8, 1.6, '#6a6e7a');
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; hdot(g, wx + Math.cos(a) * 1.2, y - 2.5 + Math.sin(a) * 1.1, '#2a2c34'); }
    hdot(g, wx, y - 2.5, '#c8ccd8');
  }
}

// Clickable areas that ride along with the vehicles; zero-sized when off screen.
const TRAIN_HS = { id: 'train', x: 0, y: 0, w: 0, h: 0, label: 'Brown Line' };
const BUS_HS = { id: 'bus', x: 0, y: 0, w: 0, h: 0, label: 'CTA bus' };
const place = (hs, x, y, w, h) => Object.assign(hs, { x, y, w, h });

// ------------------------------------------------------------------ bus

// A CTA bus: white, blue-and-red stripe, "73 Armitage" on the sign. Faces left.
function buildBus() {
  const bw = 104, bh = 25;
  const { c, g } = canvasHi(bw, bh);
  rect(g, 3, 1, bw - 4, 20, '#e8eaee');                 // body
  rect(g, 1, 3, 3, 16, '#e8eaee');                      // rounded nose
  hline(g, 3, 1, bw - 4, '#ffffff');
  rect(g, 60, 0, 22, 2, '#c8ccd4');                     // roof HVAC
  rect(g, 3, 17, bw - 4, 4, '#c0c4cc');                 // skirt
  hline(g, 1, 14, bw - 2, '#1f5aa8'); hline(g, 1, 15, bw - 2, '#1f5aa8');
  hline(g, 1, 16, bw - 2, '#c8102e');
  // windshield + destination sign
  rect(g, 1, 4, 7, 9, '#1a2436'); dot(g, 2, 5, '#4a5a7a');
  rect(g, 2, 1, 13, 3, '#101014');
  for (const [x, y] of [[3, 2], [4, 2], [6, 2], [7, 2], [10, 2], [11, 2], [12, 2], [13, 2]]) dot(g, x, y, '#ff9a2a'); // LED "73 ARMITAGE"
  dot(g, 4, 1, '#ff9a2a'); dot(g, 7, 1, '#ff9a2a'); dot(g, 3, 3, '#ff9a2a'); dot(g, 7, 3, '#ff9a2a');
  // Glass: pale, see-through, with a diagonal glare. Seat backs inside and
  // two passengers riding along.
  const glass = (x, y, w, h) => {
    g.clearRect(x, y, w, h);
    g.fillStyle = 'rgba(214,230,242,0.55)';
    g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (let k = 0; k < Math.min(w, h); k++) if (k < 3) g.fillRect(x + w - 3 + k - Math.floor(k / 2), y + k, 1, 1);
    g.fillRect(x + 1, y + h - 2, 1, 1);
  };
  const riders = { 28: ['#3a2a22', '#e0b890', '#2f6a8a'], 73: ['#c89a4a', '#c89070', '#8a3a4a'] };
  glass(10, 4, 6, 13); vline(g, 13, 4, 13, '#8a92a0'); // front door
  for (let x = 19; x < bw - 6; x += 9) {
    if (x > 52 && x < 62) { glass(x, 4, 6, 13); vline(g, x + 3, 4, 13, '#8a92a0'); continue; } // rear door
    glass(x, 4, 8, 8);
    rect(g, x + 1, 9, 2, 3, '#34405a'); rect(g, x + 5, 9, 2, 3, '#34405a'); // seat backs
    const who = riders[x];
    if (who) {
      const [hair, skin, shirt] = who;
      rect(g, x + 3, 8, 3, 4, shirt);
      rect(g, x + 3, 6, 3, 2, skin);
      hline(g, x + 3, 5, 3, hair); dot(g, x + 3, 6, hair);
    }
  }
  // wheels
  for (const wx of [18, 82]) { ellipse(g, wx, 21, 4, 4, '#141418'); ellipse(g, wx, 21, 2, 2, '#6a6e78'); }
  // 2x detail: window frames, roof highlight, mirror, bike rack, wheel wells
  hrect(g, 3, 1, bw - 4, 0.5, '#ffffff');
  for (let x = 19; x < bw - 6; x += 9) if (!(x > 52 && x < 62)) { hrect(g, x - 0.5, 3.5, 9, 0.5, '#9aa0ac'); hrect(g, x - 0.5, 12, 9, 0.5, '#9aa0ac'); }
  hrect(g, -0 + 0.5, 3, 0.5, 4, '#2a2e38'); hrect(g, 0, 3, 1.5, 0.5, '#2a2e38');       // mirror arm
  for (let k = 0; k < 3; k++) hrect(g, 0, 17 + k, 1.5, 0.5, '#8a8e98');           // bike rack
  for (const wx of [18, 82]) { hrect(g, wx - 5, 16.5, 10, 0.5, '#6a6e78'); }
  // lights
  rect(g, 0, 16, 2, 2, '#fff6c0');
  rect(g, bw - 2, 15, 2, 3, '#ff3030');
  c.logicalW = bw;
  return c;
}

// ------------------------------------------------------------------ build

function build() {
  const r = rng(1871);
  const out = { lit: [], tv: [] };

  const sky = new Sky({ x: 0, y: 0, w: W, h: 150, horizon: 118, seed: 9, stars: 90, moon: { x: 64, y: 34, r: 9 }, cloudBand: [4, 70] });

  // Downtown on the southern horizon, hazy and far.
  const city = canvasHi();
  const skyline = drawSkyline(city.g, {
    x0: 0, width: W, baseY: 116, scale: 0.46, seed: 11, fillHeight: 0.8,
    pal: { far: '#1f2246', farLit: '#3b3f6a', mid: '#1b1d3e', near: '#171935', lit: ['#c8a26a', '#e0b67a', '#d8c090', '#e8d8b0', '#f0e2c0', '#9fb0d8', '#8aa0d0'] },
    landmarks: [
      { type: 'trump', x: 116 }, { type: 'aon', x: 344 }, { type: 'willis', x: 372 },
      { type: 'hancock', x: 452 },
    ],
  });

  const cityDay = dayVariant(city.c);

  // Street-front buildings.
  const town = canvasHi();
  const g = town.g;
  building(g, r, out, { x: 150, w: 100, top: 58, color: '#4a3440', cols: 7, rows: 7, winW: 7, winH: 8 });
  building(g, r, out, { x: 248, w: 86, top: 88, color: '#3e3040', cols: 4, rows: 4 });
  building(g, r, out, { x: 0, w: 86, top: 70, color: '#6b3a34', cols: 4, rows: 4, skipBottom: 26 });
  building(g, r, out, { x: 84, w: 66, top: 96, color: '#5d5a6c', cols: 2, rows: 3, stone: true, bay: true, skipBottom: 4 });
  building(g, r, out, { x: 332, w: 80, top: 84, color: '#7a5e44', cols: 3, rows: 4, skipBottom: 6 });
  building(g, r, out, { x: 410, w: 70, top: 100, color: '#5a3232', cols: 3, rows: 3, skipBottom: 6 });
  // rooftop deck railing
  for (let x = 414; x < 476; x += 4) vline(g, x, 94, 6, '#2a1a1e');
  hline(g, 414, 94, 62, '#2a1a1e');

  // Tavern storefront on the corner
  rect(g, 4, 178, 78, 26, '#1e1418');
  rect(g, 8, 184, 30, 18, '#ffb060'); rect(g, 46, 184, 32, 18, '#ffb060');
  ditherRect(g, 8, 184, 30, 18, null, '#e89048', 0.4); ditherRect(g, 46, 184, 32, 18, null, '#e89048', 0.4);
  for (let k = 0; k < 5; k++) { rect(g, 12 + k * 5, 194, 2, 8, '#3a2224'); rect(g, 12 + k * 5, 192, 2, 2, '#2a1a1a'); }
  rect(g, 40, 182, 5, 22, '#3a2224');
  rect(g, 2, 170, 82, 7, '#1b3b2a'); hline(g, 2, 170, 82, '#2f5a42');
  for (let x = 2; x < 84; x += 6) rect(g, x, 177, 3, 2, '#1b3b2a');

  // Greystone stoop
  for (let k = 0; k < 6; k++) rect(g, 100 + k * 2, 192 + k * 2, 22 - k * 4 + 12, 2, k % 2 ? '#5d5a6c' : '#6d6a7c');
  rect(g, 112, 176, 10, 16, '#2a1e22'); rect(g, 113, 177, 8, 6, '#ffcf7a');

  // Hot dog stand
  rect(g, 256, 150, 74, 54, '#8c7a5a');
  ditherRect(g, 256, 150, 74, 54, null, '#7a6a4c', 0.25);
  rect(g, 258, 154, 70, 13, '#b8262e'); hline(g, 258, 154, 70, '#e0444a'); hline(g, 258, 166, 70, '#7a141a');
  text(g, 'HOT DOGS', 290 - textWidth('HOT DOGS') / 2 + 8, 158, '#ffd23a');
  // the dog
  rect(g, 262, 158, 14, 5, '#f0c070'); rect(g, 263, 157, 12, 2, '#b8542a'); hline(g, 264, 157, 10, '#ffd23a');
  for (let k = 0; k < 5; k++) dot(g, 265 + k * 2, 156, '#4aa04a');
  rect(g, 262, 174, 66, 26, '#fff0c0');
  ditherRect(g, 262, 174, 66, 26, null, '#ffe4a0', 0.35);
  hline(g, 262, 188, 66, '#d8c080');
  for (const [x, c] of [[268, '#b8262e'], [284, '#3f7a3e'], [300, '#ffd23a'], [314, '#b8262e']]) rect(g, x, 180, 8, 6, c);
  rect(g, 272, 190, 4, 10, '#3a2a30'); rect(g, 272, 187, 4, 3, '#2a1a1a'); // someone ordering
  rect(g, 256, 200, 74, 4, '#5a4a38');
  // Divvy bikes
  for (let k = 0; k < 3; k++) {
    const bx = 284 + k * 12;
    rect(g, bx, 198, 1, 6, '#6b6f78');
    ellipse(g, bx - 3, 201, 2, 2, '#3db7e4'); ellipse(g, bx + 4, 201, 2, 2, '#3db7e4');
    dot(g, bx - 3, 201, '#1b1a26'); dot(g, bx + 4, 201, '#1b1a26');
    hline(g, bx - 3, 199, 8, '#3db7e4');
  }

  // Armitage station house (street level, under the tracks)
  const sx = 164;
  rect(g, sx, 160, 78, 44, '#7a3a2e');
  brick(g, r, sx, 160, 78, 44, '#7a3a2e');
  cornice(g, sx, 158, 78, '#7a3a2e');
  // CTA entrance sign: the blue CTA badge, the line colours, and where the trains are
  rect(g, sx + 8, 164, 62, 9, '#22242c'); hline(g, sx + 8, 164, 62, '#3a3d4a');
  rect(g, sx + 10, 165, 17, 7, '#00a1de'); hline(g, sx + 10, 165, 17, '#4cc4ef');
  text(g, 'CTA', sx + 18.5 - textWidth('CTA') / 2, 166, '#ffffff');
  text(g, 'TRAINS', sx + 49 - textWidth('TRAINS') / 2, 166, '#f0f0f4');
  rect(g, sx + 30, 171, 19, 1, '#8a5230'); rect(g, sx + 49, 171, 19, 1, '#7a4ac0');
  for (const ax of [sx + 6, sx + 58]) {
    rect(g, ax, 180, 14, 18, '#ffd48a');
    for (let j = 0; j < 5; j++) hline(g, ax + 2 - (j === 0 ? 0 : 1) + (j > 2 ? 2 : 0), 178 + j - 3, 10, '#7a3a2e');
    vline(g, ax + 7, 180, 18, '#5a2a22');
  }
  rect(g, sx + 28, 178, 22, 26, '#241a1e'); rect(g, sx + 30, 180, 8, 22, '#ffd48a'); rect(g, sx + 40, 180, 8, 22, '#ffd48a');
  vline(g, sx + 39, 178, 26, '#3a2224');
  // CTA sign pole
  rect(g, 246, 150, 2, 54, '#3a3a44');
  rect(g, 242, 138, 10, 14, '#1a1a22'); hline(g, 242, 138, 10, '#3a3a4a');
  ellipse(g, 247, 142, 2, 2, '#7a4a2a'); ellipse(g, 247, 148, 2, 2, '#7b3fa0');

  // The L: lattice truss girder + columns + knee braces.
  const el = canvasHi();
  const e = el.g;
  const steel = '#2e3d3a', steelHi = '#46605a', steelLo = '#1c2624';
  for (const cx of COLUMNS) {
    rect(e, cx - 3, 135, 6, GROUND - 135, steel);
    vline(e, cx - 3, 135, GROUND - 135, steelHi);
    vline(e, cx + 2, 135, GROUND - 135, steelLo);
    rect(e, cx - 5, GROUND - 3, 10, 3, steelLo);
    for (let k = 0; k < 14; k++) { dot(e, cx - 4 - k, 136 + k, steel); dot(e, cx + 3 + k, 136 + k, steel); dot(e, cx - 4 - k, 137 + k, steelLo); dot(e, cx + 3 + k, 137 + k, steelLo); }
    for (let j = 140; j < GROUND - 4; j += 8) hline(e, cx - 3, j, 6, steelLo);
  }
  rect(e, 0, RAIL + 2, W, 3, steel); hline(e, 0, RAIL + 2, W, steelHi);
  rect(e, 0, RAIL + 12, W, 3, steel); hline(e, 0, RAIL + 14, W, steelLo);
  for (let x = 0; x < W; x += 8)
    for (let k = 0; k < 8; k++) { dot(e, x + k, RAIL + 5 + k, steel); dot(e, x + 8 - k, RAIL + 5 + k, steel); }
  for (let x = 2; x < W; x += 4) { dot(e, x, RAIL + 3, steelLo); dot(e, x, RAIL + 13, steelHi); }
  hline(e, 0, RAIL, W, '#7a7f8a'); hline(e, 0, RAIL + 1, W, '#1a1a1e');
  // platform canopy at Armitage
  rect(e, 146, 90, 110, 4, '#3a2a2e'); hline(e, 146, 90, 110, '#5a4448'); hline(e, 146, 94, 110, '#1a1216');
  for (const px of [152, 182, 212, 242]) vline(e, px, 94, RAIL - 94, '#2a2224');
  rect(e, 176, 99, 42, 9, '#15151c'); hline(e, 176, 99, 42, '#3a3a4a');
  text(e, 'ARMITAGE', 197 - textWidth('ARMITAGE') / 2, 101, '#e8e8f0');
  vline(e, 180, 94, 5, '#2a2224'); vline(e, 214, 94, 5, '#2a2224');
  for (let x = 146; x < 256; x += 2) dot(e, x, RAIL - 5, '#3a2a2e');
  hline(e, 146, RAIL - 6, 110, '#3a2a2e');
  // someone waiting on the platform
  rect(e, 226, RAIL - 12, 3, 8, '#2e2a3e'); rect(e, 226, RAIL - 14, 3, 2, '#e0b890'); dot(e, 226, RAIL - 14, '#2a1a14');

  // 2x detail on the L: rivet rows along the girders and columns
  for (let x = 0.5; x < W; x += 1.5) { hdot(e, x, RAIL + 2.5, '#5a7068'); hdot(e, x, RAIL + 13.5, '#16201e'); }
  for (const cx of COLUMNS) for (let j = 137; j < GROUND - 4; j += 2) { hdot(e, cx - 2, j, '#56706a'); hdot(e, cx + 1.5, j, '#16201e'); }
  hrect(e, 0, RAIL, W, 0.5, '#b8bec8'); // polished rail top

  // Street, lamps, trees, parked cars (foreground layer)
  const st = canvasHi();
  const s = st.g;
  rect(s, 0, GROUND, W, 8, '#3a3548');
  for (let x = 0; x < W; x += 12) vline(s, x, GROUND, 8, '#2e2a3c');
  hline(s, 0, GROUND, W, '#4a4460');
  rect(s, 0, ROAD[0] - 2, W, 2, '#5a5470');
  rect(s, 0, ROAD[0], W, ROAD[1] - ROAD[0], '#1b1a26');
  ditherRect(s, 0, ROAD[0], W, ROAD[1] - ROAD[0], null, '#211f2e', 0.3);
  for (let x = 6; x < W; x += 24) rect(s, x, 236, 12, 1, '#8a7a3a');
  rect(s, 0, ROAD[1], W, 2, '#5a5470');
  rect(s, 0, ROAD[1] + 2, W, H - ROAD[1], '#34304a');
  for (let x = 6; x < W; x += 14) vline(s, x, ROAD[1] + 2, H - ROAD[1], '#2a2640');
  // 2x detail: slab seams, curb lip, asphalt grain, a manhole cover
  for (let x = 0; x < W; x += 6) hrect(s, x, GROUND + 3.5, 0.5, 4, '#322e42');
  hrect(s, 0, ROAD[0] - 2, W, 0.5, '#7a7494'); hrect(s, 0, ROAD[1], W, 0.5, '#7a7494');
  for (let k = 0; k < 900; k++) hdot(s, r() * W, ROAD[0] + 1 + r() * (ROAD[1] - ROAD[0] - 2), r() < 0.5 ? '#26243a' : '#15141e');
  ellipse(s, 188, 247, 6, 1.5, '#15141c'); for (let k = -4; k <= 4; k += 2) hrect(s, 188 + k, 246.5, 0.5, 1, '#2a2838');


  // Parked cars along the curb (their own layer, in front of the street trees).
  const parked = canvasHi();
  modernCar(parked.g, 8, 215, '#7a2a36');
  modernCar(parked.g, 98, 215, '#e8e8ec', { suv: true });
  modernCar(parked.g, 336, 215, '#2a4a6a');

  for (const lx of LAMPS) {
    rect(s, lx - 1, 148, 3, GROUND - 146, '#1e1e26');
    vline(s, lx - 1, 148, GROUND - 146, '#3a3a48');
    hrect(s, lx - 0.5, 148, 0.5, GROUND - 146, '#4a4a5a'); // 2x: a thin highlight down the post
    for (let j = 152; j < GROUND - 6; j += 10) hrect(s, lx - 1.5, j, 4, 0.5, '#2a2a34'); // bands
    rect(s, lx - 3, GROUND - 4, 7, 4, '#1e1e26');
    rect(s, lx - 3, 146, 7, 2, '#1e1e26');
    rect(s, lx - 2, 139, 5, 7, '#ffe8b0');
    rect(s, lx - 1, 138, 3, 1, '#ffe8b0');
    rect(s, lx - 2, 136, 5, 2, '#1e1e26');
    dot(s, lx, 135, '#1e1e26');
  }
  // hydrant
  rect(s, 90, 197, 5, 7, '#c8ccd8'); rect(s, 89, 199, 7, 2, '#c8ccd8'); rect(s, 90, 196, 5, 1, '#b8262e');

  // Parking signs: "2 HR" and "no parking"
  const post = (x, top) => { rect(s, x, top, 1, GROUND + 2 - top, '#6a6e7a'); dot(s, x, top, '#8a8e9a'); };
  post(424, 180);
  rect(s, 417, 178, 15, 10, '#f2f2ee'); hline(s, 417, 178, 15, '#ffffff'); rect(s, 417, 178, 15, 2, '#2a8a4a');
  text(s, '2HR', 419, 181, '#2a8a4a');
  post(60, 180);
  rect(s, 55, 178, 11, 10, '#f2f2ee'); hline(s, 55, 178, 11, '#ffffff');
  text(s, 'P', 59, 181, '#1a1a22');
  for (let k = 0; k < 7; k++) { dot(s, 57 + k, 179 + k, '#d0283a'); dot(s, 58 + k, 179 + k, '#d0283a'); }
  for (let a = 0; a < 20; a++) dot(s, 60.5 + Math.cos((a / 20) * 6.28) * 4, 183 + Math.sin((a / 20) * 6.28) * 4, '#d0283a');

  // CTA bus stop sign by the station
  post(156, 178);
  rect(s, 152, 176, 9, 10, '#f4f4f0');
  rect(s, 152, 176, 9, 3, '#1f5aa8');
  rect(s, 154, 177, 5, 1, '#bfe0ff'); // tiny bus mark
  text(s, '73', 153, 180, '#c8102e');

  // Street trash can in front of the hot dog stand
  rect(s, 314, 192, 10, 12, '#1c1e24');
  for (let x = 315; x < 323; x += 2) vline(s, x, 194, 9, '#2e323c');
  rect(s, 313, 190, 12, 2, '#2a2e38'); hline(s, 313, 190, 12, '#4a4e5a');
  rect(s, 317, 188, 4, 2, '#2a2e38');

  // Light pools on the sidewalk from lamps and storefronts (baked).
  for (const lx of LAMPS) glow(s, lx, GROUND + 4, 36, '#ffcf80', 0.25, 'source-atop');
  glow(s, 292, GROUND + 4, 44, '#fff0c0', 0.22, 'source-atop');
  glow(s, 44, GROUND + 4, 40, '#ffb060', 0.22, 'source-atop');

  const reflections = [
    ...LAMPS.map((x) => ({ x, w: 5, c: '#ffcf80' })),
    { x: 292, w: 60, c: '#fff0c0' }, { x: 23, w: 30, c: '#ffb060' }, { x: 62, w: 32, c: '#ffb060' },
    { x: 203, w: 30, c: '#ffd48a' },
  ];

  // Windows hidden behind storefronts shouldn't be picked to blink on and off.
  const covered = [[164, 156, 78, 48], [256, 150, 74, 54], [2, 168, 82, 36], [100, 174, 34, 30]];
  out.lit = out.lit.filter((w) => !covered.some(([x, y, cw, ch]) => w.x < x + cw && w.x + w.w > x && w.y < y + ch && w.y + w.h > y));
  out.tv = out.tv.filter((v) => !covered.some(([x, y, cw, ch]) => v.x >= x && v.x < x + cw && v.y >= y && v.y < y + ch));

  L = {
    sky, city, cityDay, skyline, town, el, st, out, train: buildTrain(), bus: buildBus(), reflections,
    townDay: dayVariant(town.c), elDay: dayVariant(el.c, { strength: 0.8 }), stDay: dayVariant(st.c),
    precip: new Precip({ x: 0, y: 0, w: W, h: 262, ground: ROAD[0] }, 9),
    fired: new Set(), sparks: [],
    parked: parked.c, parkedDay: dayVariant(parked.c), parkedSnow: snowCaps(parked.c, { seed: 21, coverage: 0.85 }),
    // Snow that builds up while it's snowing: roofs, ledges, trees, cars, signs.
    // Sidewalks stay mostly clear; the plows leave piles along the curb.
    snow: {
      town: snowCaps(town.c, { seed: 1, coverage: 0.9 }),
      // canopy, signs and braces only: trains keep the rails clear, and the lattice stays readable
      el: snowCaps(el.c, { seed: 2, coverage: 0.75, exclude: [{ x: 0, y: RAIL - 2, w: W, h: 18 }] }),
      st: snowCaps(st.c, {
        seed: 3, coverage: 0.6, exclude: [{ x: 0, y: GROUND - 1, w: W, h: 3 }],
        extra(g, top, edge, r) {
          const cars = [[4, 56], [94, 146], [332, 384]];
          for (let x = 0; x < W; ) {
            const len = r.int(6, 22);
            if (r() < 0.6) for (let k = 0; k < len; k++) {
              const px = x + k;
              if (cars.some(([a, b]) => px >= a && px <= b)) continue;
              const hgt = Math.sin((k / len) * Math.PI) * 2.2;
              for (let j = 0; j < hgt; j++) dot(g, px, ROAD[0] - 3 - j, j ? top : edge);
            }
            x += len + r.int(4, 16);
          }
          for (let x = 0; x < W; x++) if (r() < 0.35) dot(g, x, GROUND, r() < 0.5 ? top : edge); // a dusting at the wall line
        },
      }),
    },
    snowCover: 0,
    trees: {},
  };
}

// Where the train is at time t (or null), and what it's doing.
function trainAt(t) {
  const cycle = Math.floor(t / CYCLE), p = t - cycle * CYCLE;
  const dir = cycle % 2 ? -1 : 1;
  const tw = L.train.logicalW;
  const enter = dir > 0 ? -tw : W, exit = dir > 0 ? W : -tw;
  const stopX = Math.round(201 - tw / 2); // middle cars at the platform
  if (hash(cycle, 77) >= 0.6) {
    if (p > PASS) return null;
    return { cycle, p, dir, stops: false, x: enter + (exit - enter) * (p / PASS), doors: 0, moving: true };
  }
  if (p < ARRIVE) {
    const u = p / ARRIVE;
    return { cycle, p, dir, stops: true, x: enter + (stopX - enter) * (1 - (1 - u) ** 2), doors: 0, moving: u < 0.97 };
  }
  if (p < ARRIVE + DWELL) {
    const d = p - ARRIVE;
    const open = Math.min(1, Math.max(0, Math.min((d - DOORS[0]) / 0.4, (DOORS[1] + 0.4 - d) / 0.4)));
    return { cycle, p, dir, stops: true, x: stopX, doors: open, moving: false };
  }
  if (p < ARRIVE + DWELL + DEPART) {
    const u = (p - ARRIVE - DWELL) / DEPART;
    return { cycle, p, dir, stops: true, x: stopX + (exit - stopX) * u * u, doors: 0, moving: u > 0.03 };
  }
  return null;
}

// ------------------------------------------------------------------ scene

export default {
  id: 'lincoln',
  focus: 0.5,
  name: 'Armitage',
  blurb: 'Brown Line, Lincoln Park',
  ambience: { city: 0.6, rain: 1 },
  silent: true, // sound is off in this scene for now; delete this line to bring back the L, the bus and the street

  hotspots: [
    { id: 'tavern', x: 0, y: 168, w: 86, h: 36, label: 'Tavern' },
    TRAIN_HS,
    { id: 'moon', x: 50, y: 20, w: 28, h: 28, label: 'Moon' },
    { id: 'busstop', x: 150, y: 174, w: 13, h: 30, label: 'Bus stop' },
    { id: 'trash', x: 312, y: 186, w: 14, h: 18, label: 'Trash can' },
    { id: 'parking', x: 417, y: 176, w: 15, h: 28, label: 'Parking sign' },
    { id: 'noparking', x: 53, y: 176, w: 15, h: 28, label: 'No parking' },
    BUS_HS,
    { id: 'skyline', x: 340, y: 40, w: 130, h: 40, label: 'Skyline' },
  ],

  build() { if (!L) build(); },

  draw(g, t, dt, env) {
    if (!L) build();
    const day = env.sky.daylight, night = 1 - day;
    const snowing = env.weather === 'snow';
    L.snowCover += ((snowing ? 1 : 0) - L.snowCover) * Math.min(1, dt * (snowing ? 0.25 : 0.6));
    L.sky.draw(g, t, dt, env);
    drawLit(g, L.city.c, L.cityDay, day);
    if (night > 0.2) animateSkyline(g, L.skyline, t, { glowScale: 0.7 });
    drawLit(g, L.town.c, L.townDay, day);
    drawSnow(g, L.snow.town, day, L.snowCover);

    // windows occasionally switching off/on, TVs flickering
    for (const w of L.out.lit) {
      if (w.seed % 13 || day > 0.5) continue;
      const off = hash(Math.floor(t / 7), w.seed) < 0.3;
      if (off) rect(g, w.x, w.y, w.w, w.h, '#161a33');
    }
    for (const tv of L.out.tv) {
      const c = ['#3a5aff', '#5a8aff', '#8a6aff', '#2a3aaa'][Math.floor(t * 3 + tv.x) % 4];
      glow(g, tv.x, tv.y, 6, c, 0.4 * night);
    }

    // Neon: tavern sign buzzes, hot dog marquee chases.
    const buzz = hash(Math.floor(t * 8), 5) < 0.06;
    if (!buzz) {
      text(g, 'TAVERN', 61 - textWidth('TAVERN') / 2, 172, '#ff5a6a');
      glow(g, 61, 174, 26, '#ff3050', 0.35 * (0.3 + 0.7 * night));
    } else text(g, 'TAVERN', 61 - textWidth('TAVERN') / 2, 172, '#5a2a30');
    for (let k = 0; k < 18; k++) {
      const on = (k + Math.floor(t * 6)) % 3 === 0;
      dot(g, 259 + k * 4, 152, on ? '#ffe680' : '#7a5a20');
      dot(g, 259 + k * 4, 168, on ? '#7a5a20' : '#ffe680');
    }
    glow(g, 293, 160, 40, '#ff6040', 0.18 * night);

    // The train.
    const tr = trainAt(t);
    if (!tr) place(TRAIN_HS, 0, 0, 0, 0);
    if (tr) {
      const fire = (name, at, o) => {
        const key = tr.cycle + name;
        if (!L.fired.has(key) && tr.p >= at && tr.p - at < 0.6) { L.fired.add(key); env.sfx?.(name, o); }
      };
      if (!tr.stops) fire('train', 0, { sec: PASS, dir: tr.dir });
      else {
        fire('train-arrive', 0, { sec: ARRIVE, dir: tr.dir });
        fire('doors', ARRIVE + DOORS[1] - 2.2);
        fire('train-depart', ARRIVE + DWELL, { sec: DEPART + 1, dir: tr.dir });
      }
      if (L.fired.size > 40) L.fired = new Set([...L.fired].slice(-10));

      const tw = L.train.logicalW;
      const x = Math.round(tr.x);
      place(TRAIN_HS, x, RAIL - 21, tw, 22);
      g.save();
      if (tr.dir < 0) { g.translate(x + tw, 0); g.scale(-1, 1); blit(g, L.train, 0, RAIL - 21); }
      else blit(g, L.train, x, RAIL - 21);
      g.restore();
      for (let k = 0; k < 4; k++) glow(g, x + 31 + k * 64, RAIL - 12, 34, '#ffe0a0', 0.14 * (0.3 + 0.7 * night));
      if (tr.doors > 0) {
        for (let car = 0; car < 4; car++)
          for (const off of DOOR_OFFSETS) {
            const local = car * 64 + off;
            const dx = x + (tr.dir > 0 ? local : tw - local - 6);
            const gap = Math.round(tr.doors * 4);
            rect(g, dx + 3 - gap / 2, RAIL - 17, gap, 11, '#fff0c8');
            glow(g, dx + 3, RAIL - 4, 8, '#ffe8b0', 0.3 * tr.doors);
          }
      }
      if (tr.moving && Math.random() < 0.06) L.sparks.push({ x: x + Math.random() * tw, life: 0.12 });
      const head = tr.dir > 0 ? x + tw : x;
      glow(g, head, RAIL - 7, 22, '#fff6c0', 0.35 * (0.3 + 0.7 * night));
    }
    L.sparks = L.sparks.filter((s) => {
      s.life -= dt;
      glow(g, s.x, RAIL + 1, 10, '#a0c8ff', 0.8);
      dot(g, s.x, RAIL + 1, '#ffffff'); dot(g, s.x + 1, RAIL, '#cfe4ff'); dot(g, s.x - 1, RAIL + 2, '#cfe4ff');
      return s.life > 0;
    });
    drawLit(g, L.el.c, L.elDay, day);
    drawSnow(g, L.snow.el, day, L.snowCover);
    glow(g, 197, 104, 30, '#ffe8c0', 0.12 * night);

    drawLit(g, L.st.c, L.stDay, day);
    const season = seasonOf(env.sky.month ?? 6);
    if (!L.trees[season]) L.trees[season] = buildTrees(season);
    const trees = L.trees[season];
    drawLit(g, trees.night, trees.day, day);
    drawSnow(g, L.snow.st, day, L.snowCover);
    drawSnow(g, trees.snow, day, L.snowCover);
    drawLit(g, L.parked, L.parkedDay, day);
    drawSnow(g, L.parkedSnow, day, L.snowCover);
    for (const lx of LAMPS) glow(g, lx, 142, 30, '#ffcf80', (0.34 + 0.02 * Math.sin(t * 2 + lx)) * night);

    // Wet-road reflections: stronger in the rain, always a little.
    const wet = L.precip.amount * (env.weather === 'snow' ? 0.3 : 1);
    const refl = (0.12 + 0.35 * wet) * (0.2 + 0.8 * night);
    for (const rf of L.reflections) {
      for (let y = ROAD[0] + 1; y < ROAD[1]; y++) {
        const fade = 1 - (y - ROAD[0]) / (ROAD[1] - ROAD[0]);
        const wob = Math.round(Math.sin(y * 0.9 + t * 3) * (1 + wet));
        g.fillStyle = rf.c;
        g.globalAlpha = refl * fade * (y % 2 ? 1 : 0.6);
        g.fillRect(Math.round(rf.x - rf.w / 2 + wob), y, rf.w, 1);
      }
    }
    g.globalAlpha = 1;

    // A car cruises by now and then.
    const cp = (t + 7) % 17;
    if (cp < 5) {
      const x = -80 + (cp / 5) * (W + 120);
      const colors = ['#3a3a44', '#d8dadf', '#8a1e28', '#2a4a7a'];
      modernCar(g, Math.round(x * 2) / 2, 252, colors[Math.floor((t + 7) / 17) % colors.length], { suv: Math.floor((t + 7) / 17) % 3 === 1 });
      glow(g, x + 50, 246, 26, '#e8f4ff', 0.3 * night);                    // LED headlights
      glow(g, x - 2, 246, 8, '#ff3040', 0.3 * night);
    }

    // The 73 Armitage bus rolls through the far lane every ~40s (no stop).
    const BUS_EVERY = 41, BUS_CROSS = 7.5;
    const bc = Math.floor((t + 20) / BUS_EVERY), bp = (t + 20) - bc * BUS_EVERY;
    if (bp < BUS_CROSS) {
      if (L.lastBus !== bc) { L.lastBus = bc; env.sfx?.('bus', { sec: BUS_CROSS, dir: -1 }); }
      const bw = L.bus.logicalW;
      const x = Math.round(W + 10 - (bp / BUS_CROSS) * (W + bw + 20));
      const y = ROAD[0] - 3;
      place(BUS_HS, x, y, bw, 25);
      blit(g, L.bus, x, y);
      for (let k = 0; k < 3; k++) glow(g, x + 30 + k * 26, y + 8, 22, '#e8f0ff', 0.1 * night);
      glow(g, x - 6, y + 17, 26, '#fff6c0', 0.35 * night);
    } else place(BUS_HS, 0, 0, 0, 0);

    L.precip.draw(g, dt, env.weather, t);
  },

  click(id, api) {
    const lines = {
      busstop: [['', 'Route 73 Armitage. Next bus in 7 minutes. It\u2019s always 7 minutes.']],
      trash: [['', 'A Chicago street trash can. Please don\u2019t feed it deep dish.']],
      parking: [['', '2 hour parking, permit only after 6pm, except Tuesdays for street cleaning. Good luck.']],
      noparking: [['', 'No parking. Tow zone. They are not kidding.']],
      bus: [['', 'The 73 Armitage bus. It\u2019s not stopping for you.']],
      tavern: [['', 'Old Style on tap and the Cubs game on mute. Last call is at 2.']],
      train: [['', 'This is a Brown Line train to Kimball. Doors closing.'], ['', 'Next stop: Diversey.']],
      moon: [['', 'Same moon as everywhere, but it’s better over Lincoln Park.']],
      skyline: [['', 'Downtown, three miles south. Close enough to see, far enough to be quiet.']],
    };
    const pool = lines[id];
    if (!pool) return;
    if (id === 'train') { // cycle through in order so a line never repeats back-to-back
      L.trainLine = ((L.trainLine ?? -1) + 1) % pool.length;
      return api.say(...pool[L.trainLine]);
    }
    api.say(...pool[Math.floor(Math.random() * pool.length)]);
  },
};
