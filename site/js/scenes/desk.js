// Scene 1: the desk, modelled on the real one. Stacked monitors with a light
// bar, a leafy desk mat, cream keyboard, little white speakers, purple RGB
// glow, and a big window onto the skyline. Amber sleeps by the keyboard.

import {
  W, H, canvas, canvasHi, blit, rng, rect, dot, hrect, hdot, hline, vline, gradient, ditherRect, glow, ellipse,
  sprite, text, mix, darken, lighten, hash, bayer, blitHi,
} from '../px.js';
import * as px from '../px.js';
import { drawSkyline, animateSkyline } from '../skyline.js';
import { Precip, paneDrops, snowCaps } from '../weather.js';
import { Sky, dayVariant, drawLit } from '../sky.js';

const PANE = { x: 97, y: 17, w: 286, h: 116 };
const TOP = { x: 162, y: 40, w: 156, h: 56 };
const BOT = { x: 160, y: 103, w: 160, h: 58 };
const CAT = { x: 328, y: 172 }; // Amber (38x20 on the scene grid, 2x detail), between the mat and the headphones
const KB = { x: 204, y: 180 };  // keyboard
const MAT = { x: 156, y: 175, w: 168 }; // desk mat, as wide as the monitors
const MUG = { x: 184, y: 176 }; // on the desk mat, within reach of the keyboard
const CANDLE = { x: 31, y: 36 };

let L;

// ------------------------------------------------------------------ Amber

// Amber, drawn at 2x (76x40 real pixels = 38x20 on the scene grid): a curled,
// sleeping orange tabby with shaded fur, back stripes, tail rings, an "M" on
// her forehead, closed eyes, pink nose and ears, cream muzzle/paws, whiskers.
const FUR = ['#8e4a1c', '#c46f28', '#e8913a', '#f6b060', '#fbd08a']; // deep -> highlight
const CREAM = ['#d9b894', '#f2d8b4', '#fbeacc'];

function inTri(px, py, [ax, ay], [bx, by], [cx, cy]) {
  const d = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const u = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / d;
  const v = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / d;
  return u >= 0 && v >= 0 && u + v <= 1;
}
const shrink = (tri, k) => {
  const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
  return tri.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
};
// distance from p to a polyline, plus how far along it the nearest point is
function alongPath(px, py, pts) {
  let best = Infinity, at = 0, run = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    const u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (len * len)));
    const d = Math.hypot(px - (ax + dx * u), py - (ay + dy * u));
    if (d < best) { best = d; at = run + u * len; }
    run += len;
  }
  return [best, at];
}
const tone = (v, x, y) => FUR[Math.max(0, Math.min(4, Math.round(v * 4 + (bayer(x, y) - 0.5) * 0.9)))];
const toneIdx = (v, x, y) => Math.max(0, Math.min(4, Math.round(v * 4 + (bayer(x, y) - 0.5) * 0.9)));

function amberFrame(breath, tailUp) {
  const earL = [[51, 6], [46, 15], [56, 14]], earR = [[65, 8], [60, 15], [68, 17]];
  const tail = [[tailUp ? 8 : 6, tailUp ? 17 : 20], [4, 26], [7, 32], [14, 35.5], [26, 36.5], [38, 35.5], [47, 33]];
  const c = sprite(76, 40, (x, y) => {
    // head
    const hx = (x - 57) / 10.5, hy = (y - 22) / 9.5;
    if (hx * hx + hy * hy <= 1) {
      if (hy > 0.2 && Math.abs(hx) < 0.62) return CREAM[hy > 0.55 ? 0 : hx < -0.1 ? 2 : 1]; // muzzle
      let i = toneIdx(0.62 - 0.5 * hy - 0.25 * hx, x, y);
      if (hy < -0.3 && Math.abs(hx) < 0.55 && Math.sin(hx * 15) > 0.55) i = Math.max(0, i - 2); // forehead "M"
      if (Math.abs(hx) > 0.8 && hy > -0.2 && hy < 0.4 && (y % 3 === 0)) i = Math.max(0, i - 1); // cheek stripes
      return FUR[i];
    }
    // ears
    if (inTri(x, y, ...earL) || inTri(x, y, ...earR)) {
      if (inTri(x, y, ...shrink(earL, 0.5)) || inTri(x, y, ...shrink(earR, 0.5))) return '#e89a9a';
      return FUR[3];
    }
    // paws tucked under the chin
    for (const [px, py] of [[45, 34], [51, 33.5]]) {
      const u = (x - px) / 3.6, v = (y - py) / 2.2;
      if (u * u + v * v <= 1) return v < -0.3 ? CREAM[2] : (x - px) % 2 === 0 && v > 0 ? CREAM[0] : CREAM[1];
    }
    // tail, curled around the front
    const [td, along] = alongPath(x, y, tail);
    if (td <= 2.6) {
      let i = toneIdx(0.6 - (td > 1.2 && y > 34 ? 0.25 : 0) - (y > 36 ? 0.2 : 0), x, y);
      if (Math.floor(along / 3.5) % 2 === 0) i = Math.max(0, i - 1); // rings
      if (along < 4) i = Math.max(0, i - 1); // darker tip
      return FUR[i];
    }
    // body
    const cy = 25 - breath * 0.6, ry = 11 + breath * 0.6;
    const bx = (x - 32) / 24, by = (y - cy) / ry;
    if (bx * bx + by * by <= 1) {
      if (by > 0.35 && bx > 0.45) return CREAM[1]; // chest fluff by the head
      let i = toneIdx(0.58 - 0.55 * by - 0.22 * bx, x, y);
      if (by < 0.55 && Math.sin(bx * 10 + by * 1.8 + 0.6) > 0.5) i = Math.max(0, i - 1); // tabby stripes
      if (by < -0.72) i = Math.max(0, i - 1); // darker along the spine
      return FUR[i];
    }
    return null;
  }, '#4a2614');
  // Face details and whiskers go on after the outline pass.
  const g = c.getContext('2d');
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  for (const [x, y] of [[51, 22], [52, 23], [53, 23], [54, 23], [55, 22], [59, 22], [60, 23], [61, 23], [62, 23], [63, 22]]) px(x, y, '#4a2410');
  px(57, 26, '#e88a8a'); px(58, 26, '#e88a8a'); px(57, 27, '#c46a6a'); px(58, 27, '#c46a6a');
  px(56, 28, '#8a4a34'); px(59, 28, '#8a4a34');
  g.fillStyle = 'rgba(255,246,228,0.8)';
  for (const [x0, y0, dx, dy] of [[50, 27, -1, -0.15], [50, 29, -1, 0.2], [65, 27, 1, -0.15], [65, 29, 1, 0.2]])
    for (let k = 0; k < 7; k++) g.fillRect(Math.round(x0 + dx * k), Math.round(y0 + dy * k), 1, 1);
  return c;
}

// ------------------------------------------------------------------ build

const deskFront = (x) => {
  const u = (x - 240) / 95;
  return Math.round(200 - (Math.abs(u) < 1 ? 5 * (1 + Math.cos(Math.PI * u)) / 2 : 0));
};

function build() {
  const r = rng(1995);

  const sky = new Sky({
    ...PANE, horizon: 118, seed: 5, stars: 80,
    moon: { x: 357, y: 27, r: 6, crescent: true },
    cloudBand: [PANE.y + 2, PANE.y + 50],
  });

  // Skyline through the window: landmarks sit in the side panes so the
  // monitor stack doesn't hide them.
  const city = canvasHi();
  const skyline = drawSkyline(city.g, {
    x0: PANE.x, width: PANE.w, baseY: 112, scale: 0.5, seed: 42,
    landmarks: [
      { type: 'aon', x: 106 }, { type: 'twopru', x: 126 }, { type: 'trump', x: 147 },
      { type: 'willis', x: 336 }, { type: 'wacker', x: 356 }, { type: 'hancock', x: 374 },
    ],
  });
  rect(city.g, PANE.x, 112, PANE.w, 21, '#0c0d1f');
  for (let y = 113; y < 133; y += 0.5)
    for (let x = PANE.x; x < PANE.x + PANE.w; x += 0.5)
      if (r() < 0.06 - (y - 113) * 0.002) hdot(city.g, x, y, r.pick(['#ffd98a', '#ffc46b', '#fff4d6', '#9fc0ff', '#ff9f6b']));
  const cityDay = dayVariant(city.c);

  // ---------------------------------------------------------------- room
  const room = canvas();
  const g = room.g;
  gradient(g, 0, 0, W, 238, ['#191526', '#211b32', '#281f3c', '#2c2242']);
  rect(g, 0, 236, W, H - 236, '#15121e');
  for (let y = 240; y < H; y += 7) hline(g, 0, y, W, '#110e18');

  // LED strip down the left corner
  rect(g, 0, 0, 2, 236, '#c69cff');

  // Window: painted trim casing around a black frame, with wall on both sides
  const trim = '#3b3550', trimHi = '#524a6c', trimLo = '#24202f';
  const fx = PANE.x - 5, fy = PANE.y - 5, fw = PANE.w + 10, fh = PANE.h + 10;
  rect(g, fx - 6, fy - 6, fw + 12, fh + 10, trim);
  hline(g, fx - 6, fy - 6, fw + 12, trimHi); vline(g, fx - 6, fy - 6, fh + 10, trimHi);
  vline(g, fx + fw + 5, fy - 6, fh + 10, trimLo);
  hline(g, fx - 1, fy - 1, fw + 2, trimLo); vline(g, fx - 1, fy - 1, fh + 1, trimLo);
  const frame = '#1b1a22', frameHi = '#34323f';
  rect(g, fx, fy, fw, fh, frame);
  g.clearRect(PANE.x, PANE.y, PANE.w, PANE.h);
  hline(g, fx, fy, fw, frameHi);
  for (const mx of [PANE.x + 95, PANE.x + 190]) { rect(g, mx, PANE.y, 3, PANE.h, frame); vline(g, mx, PANE.y, PANE.h, frameHi); }
  rect(g, PANE.x, 73, PANE.w, 2, frame); hline(g, PANE.x, 73, PANE.w, frameHi);
  g.fillStyle = 'rgba(200,210,255,0.045)';
  for (const [x0, y0] of [[PANE.x + 6, 20], [PANE.x + 234, 20], [PANE.x + 6, 76], [PANE.x + 234, 76]])
    for (let k = 0; k < 24; k++) { g.fillRect(x0 + k, y0 + 26 - k, 1, 1); g.fillRect(x0 + k + 6, y0 + 26 - k, 2, 1); }
  // sill
  const sx = fx - 10, sw = fw + 20, sy = fy + fh + 2;
  rect(g, sx, sy, sw, 3, '#4a4262'); hline(g, sx, sy, sw, '#62597e'); rect(g, sx, sy + 3, sw, 2, '#1c1826');

  // Left wall: floating walnut shelves
  const walnut = '#4a2e22', walnutHi = '#6a4432';
  const shelf = (x, y, w) => { rect(g, x, y, w, 3, walnut); hline(g, x, y, w, walnutHi); hline(g, x, y + 3, w, '#120e14'); };
  shelf(6, 44, 52);
  rect(g, 10, 35, 11, 9, '#d9d2c3'); hline(g, 10, 35, 11, '#f0ebe0');
  for (let k = 0; k < 10; k++) rect(g, 8 + r.int(0, 13), 29 + r.int(0, 6), 2, 2, r() < 0.5 ? '#4f9a54' : '#3f8a4a');
  const vine = (x, y, len, dir) => {
    for (let k = 0; k < len; k++) {
      const vx = x + Math.round(Math.sin(k * 0.3 + x) * 1.5) + (dir * k) / 6;
      dot(g, vx, y + k, '#2d5e35');
      if (k % 3 === 1) rect(g, vx + (k % 6 === 1 ? 1 : -2), y + k, 2, 2, k % 2 ? '#4f9a54' : '#3f8a4a');
    }
  };
  vine(11, 44, 46, -0.2); vine(16, 44, 30, 0.1); vine(20, 44, 58, 0.2);
  rect(g, CANDLE.x - 3, CANDLE.y + 1, 7, 7, '#b8742e'); hline(g, CANDLE.x - 3, CANDLE.y + 1, 7, '#d8944a');
  rect(g, 41, 36, 6, 8, '#e8e2d0'); rect(g, 42, 33, 4, 3, '#e8e2d0'); hline(g, 41, 38, 6, '#c83a3a');
  shelf(10, 76, 46);
  rect(g, 24, 61, 15, 15, '#101014'); rect(g, 26, 63, 11, 11, '#1a1030');
  for (const [x, y, c] of [[28, 66, '#ff5ac8'], [30, 66, '#ff5ac8'], [32, 68, '#5ae0ff'], [34, 66, '#5ae0ff'], [29, 70, '#ffe05a'], [33, 71, '#ff5ac8']]) dot(g, x, y, c);
  rect(g, 42, 69, 7, 7, '#7a4a7a'); rect(g, 49, 71, 2, 3, '#7a4a7a');
  // woven wall hanging
  for (let j = 0; j < 30; j++) {
    const w = Math.round(Math.sin((j / 30) * Math.PI) * 11) + 2;
    for (let i = -w; i <= w; i++) dot(g, 30 + i, 84 + j, (i + j) % 3 === 0 ? '#8a3a36' : '#6a2a2a');
  }
  for (let i = -8; i <= 8; i += 2) vline(g, 30 + i, 114, 4 + (i % 4 ? 1 : 0), '#6a2a2a');

  // Right wall: island-house-at-sunset poster
  const px = 424, py = 18, pw = 50, ph = 40;
  rect(g, px - 1, py - 1, pw + 2, ph + 2, '#101014');
  gradient(g, px, py, pw, 27, ['#2e2e7a', '#6a4a9a', '#c86a8a', '#f09070', '#ffc080']);
  for (const [cx, cy, rx] of [[434, 26, 7], [444, 24, 6], [462, 30, 8], [470, 26, 5], [452, 33, 6]]) {
    ellipse(g, cx, cy, rx, 2, '#f0a078'); hline(g, cx - rx + 2, cy - 2, rx * 2 - 4, '#ffd0a0');
  }
  for (let k = 0; k <= 30; k++) {
    const a = Math.PI * (0.95 + (k / 30) * 0.9);
    dot(g, 449 + Math.cos(a) * 22, 29 + Math.sin(a) * 7, '#ffe04a');
  }
  gradient(g, px, py + 27, pw, 13, ['#4a3a8a', '#2e3a7a']);
  for (let k = 0; k < 8; k++) hline(g, px + 6 + r.int(0, 36), py + 29 + r.int(0, 9), r.int(3, 8), '#f0a078');
  ellipse(g, 449, 48, 13, 2, '#e8c890'); ellipse(g, 449, 47, 10, 2, '#3a8a4a');
  rect(g, 443, 40, 11, 6, '#f090a0'); rect(g, 442, 38, 13, 2, '#c83a3a'); rect(g, 444, 36, 9, 2, '#c83a3a');
  dot(g, 446, 42, '#3a2a5a'); dot(g, 450, 42, '#3a2a5a'); rect(g, 448, 43, 2, 3, '#7a3a3a');
  for (const [tx, lean] of [[437, -1], [459, 1]]) {
    for (let k = 0; k < 11; k++) dot(g, tx + Math.round((k * lean) / 4), 46 - k, '#6a4a2a');
    const top = [tx + Math.round((10 * lean) / 4), 35];
    for (const [dx, dy] of [[-3, 1], [-2, 0], [-1, -1], [1, -1], [2, 0], [3, 1], [0, -1], [-4, 2], [4, 2]]) dot(g, top[0] + dx, top[1] + dy, '#2a7a3a');
  }

  // Carved wooden cabinet (left, under the desk)
  rect(g, 0, 200, 92, 70, '#24160f');
  for (let y = 210; y < H; y += 12)
    for (let x = 6; x < 90; x += 12) {
      for (let a = 0; a < 16; a++) dot(g, x + Math.cos((a / 16) * 6.28) * 4, y + Math.sin((a / 16) * 6.28) * 4, '#3a2418');
      dot(g, x, y, '#4a2e1e');
    }
  hline(g, 0, 200, 92, '#3a2418');

  // Desk: black top with an ergonomic curve in the front edge
  for (let x = 16; x < 464; x++) {
    const f = deskFront(x);
    vline(g, x, 170, f - 170, '#1c1a24');
    vline(g, x, f, 6, '#121017');
    dot(g, x, f, '#34313f');
  }
  hline(g, 16, 170, 448, '#2c2a38');
  rect(g, 30, 206, 5, 56, '#101014'); rect(g, 445, 206, 5, 56, '#101014');

  // Desk mat with tropical leaves
  const mat = MAT;
  const matBottom = (x) => deskFront(x) - 3;
  for (let x = mat.x; x < mat.x + mat.w; x++) vline(g, x, mat.y, matBottom(x) - mat.y, '#1f1a2c');
  const leafCols = [['#e0708e', '#b04a6a'], ['#f0a0b4', '#c0708a'], ['#3a8a82', '#2a6a66'], ['#e8d8e0', '#b8a8b8'], ['#5aa89a', '#3a7a70']];
  for (let k = 0; k < 34; k++) {
    const cx = mat.x + r() * mat.w, cy = mat.y + r() * 18;
    const len = r.int(8, 18), wid = r.range(1.5, 3.2), ang = r.range(-0.9, 0.9) + (r() < 0.5 ? Math.PI : 0);
    const [c, rib] = r.pick(leafCols);
    for (let s = -len / 2; s <= len / 2; s += 0.5) {
      const w = wid * Math.sin(((s + len / 2) / len) * Math.PI);
      for (let q = -w; q <= w; q += 0.5) {
        const x = Math.round(cx + Math.cos(ang) * s - Math.sin(ang) * q);
        const y = Math.round(cy + Math.sin(ang) * s + Math.cos(ang) * q);
        if (x < mat.x || x >= mat.x + mat.w || y < mat.y || y >= matBottom(x)) continue;
        dot(g, x, y, Math.abs(q) < 0.5 ? rib : c);
      }
    }
  }

  // Mat edge: a thin dark rim with a faint stitched line just inside it.
  const rim = '#121019', stitch = '#4a4262';
  const mx0 = mat.x, mx1 = mat.x + mat.w - 1;
  for (let x = mx0; x <= mx1; x++) {
    const bottom = matBottom(x) - 1;
    dot(g, x, mat.y, rim);
    dot(g, x, bottom, rim);
    if (x > mx0 + 1 && x < mx1 - 1 && x % 2 === 0) { dot(g, x, mat.y + 1, stitch); dot(g, x, bottom - 1, stitch); }
  }
  for (let y = mat.y; y < matBottom(mx0); y++) dot(g, mx0, y, rim);
  for (let y = mat.y; y < matBottom(mx1); y++) dot(g, mx1, y, rim);
  for (let y = mat.y + 2; y < matBottom(mx0) - 2; y += 2) { dot(g, mx0 + 1, y, stitch); dot(g, mx1 - 1, y, stitch); }

  // Monitor arm + light bar
  rect(g, 238, 160, 5, 12, '#18171e'); vline(g, 238, 160, 12, '#2c2a36');
  rect(g, 224, 170, 32, 3, '#18171e'); hline(g, 224, 170, 32, '#34323f');
  const monitor = (m) => {
    rect(g, m.x - 3, m.y - 3, m.w + 6, m.h + 6, '#0f0e14');
    hline(g, m.x - 3, m.y - 3, m.w + 6, '#2a2833');
    rect(g, m.x, m.y, m.w, m.h, '#0b0c14');
  };
  monitor(TOP);
  monitor(BOT);
  rect(g, 186, 31, 108, 4, '#16151c'); hline(g, 186, 31, 108, '#34323f');
  rect(g, 236, 35, 9, 3, '#16151c');

  // Under the monitors: speakers, mini PC, a little mesh speaker, trinkets
  const speaker = (cx) => {
    ellipse(g, cx, 164, 6, 8, '#c8c8d2');
    ellipse(g, cx, 163, 5, 7, '#ececf0');
    ellipse(g, cx, 164, 3, 3, '#8a8a98'); ellipse(g, cx, 164, 1, 1, '#4a4a58');
    rect(g, cx - 4, 172, 9, 2, '#b8b8c4');
  };
  speaker(200); speaker(280);
  rect(g, 222, 162, 36, 10, '#1a1a22'); hline(g, 222, 162, 36, '#2e2e3a');
  rect(g, 166, 159, 20, 14, '#6c6c76'); hline(g, 166, 159, 20, '#8a8a94');
  for (let y = 162; y < 172; y += 2) for (let x = 168; x < 184; x += 2) dot(g, x, y, '#54545e');
  for (const [x, c] of [[212, '#e8913a'], [216, '#5aa89a'], [220, '#e0708e'], [226, '#e8e2d0'], [230, '#6f8fa8']]) { rect(g, x, 173, 3, 2, c); dot(g, x, 173, lighten(c, 0.3)); }

  // Left of the desk: frame, papers, pencil cup (the record sleeve and props are 2x overlays)
  // (the Lucy Pearl record sleeve leaning here is drawn at 2x with the posters)
  rect(g, 80, 150, 16, 22, '#16141c'); rect(g, 82, 152, 12, 18, '#c8a080'); rect(g, 84, 156, 8, 10, '#8a6a5a');
  rect(g, 28, 177, 72, 3, '#e8e4dc'); rect(g, 30, 180, 68, 3, '#d4d0c8'); rect(g, 26, 183, 70, 2, '#c0b8b0');
  rect(g, 58, 175, 14, 3, '#f0c040'); rect(g, 40, 176, 10, 2, '#f090b0');
  rect(g, 100, 160, 10, 18, '#2a2a33'); hline(g, 100, 160, 10, '#3a3a46');
  for (const [x, h, c] of [[101, 10, '#d04040'], [103, 7, '#4060d0'], [105, 12, '#e8e2d0'], [107, 8, '#40a060']]) vline(g, x, 160 - h, h, c);
  // (the "C" mug is a 2x prop drawn with the posters)

  // Right of the desk: headphone stand
  // headphone stand + over-ear headphones (light shell so they read against the wall)
  ellipse(g, 378, 181, 8, 2, '#3e4a58'); hline(g, 371, 180, 15, '#5e6e80');
  rect(g, 377, 136, 3, 45, '#56687a'); vline(g, 377, 136, 45, '#7a8ea2');
  rect(g, 372, 134, 13, 2, '#56687a');
  for (let a = 0; a <= 28; a++) {
    const th = Math.PI + (a / 28) * Math.PI;
    const hx = 378.5 + Math.cos(th) * 12, hy = 146 + Math.sin(th) * 12;
    rect(g, hx - 1, hy - 1, 3, 3, '#2a2c36');
  }
  for (let a = 0; a <= 28; a++) {
    const th = Math.PI + (a / 28) * Math.PI;
    rect(g, 378.5 + Math.cos(th) * 12, 146 + Math.sin(th) * 12, 2, 1, '#d8dce6');
  }
  rect(g, 373, 133, 12, 2, '#3a3c48'); // headband cushion resting on the hook
  const cup = (x, inner) => {
    rect(g, x - 1, 144, 9, 16, '#2a2c36');
    rect(g, x, 145, 7, 14, '#cdd2dc'); vline(g, x, 145, 14, '#eef0f6'); hline(g, x, 145, 7, '#eef0f6');
    rect(g, x + 2, 148, 3, 8, '#9aa2b2');
    rect(g, inner, 146, 2, 12, '#3a3c48');
  };
  cup(363, 370); cup(388, 386);

  // Keyboard: cream 75% with grey/blue mods, keycaps at 2x, and a tiny OLED
  const kx = KB.x, ky = KB.y;
  rect(g, kx, ky, 58, 11, '#cfc6b4'); hline(g, kx, ky, 58, '#e4dccb'); hline(g, kx, ky + 10, 58, '#a89f8e');
  hrect(g, kx + 0.5, ky + 0.5, 57, 10, '#b9b09e');
  for (let row = 0; row < 5; row++) {
    const y = ky + 1 + row * 1.9;
    let x = kx + 1 + (row === 2 ? 0.5 : row === 3 ? 1 : 0);
    const keys = row === 4 ? [2.5, 2.5, 2.5, 18, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5] : Array.from({ length: row === 0 ? 14 : 16 }, (_, k) => (k === 0 && row > 0 ? 4 : k === 15 ? 3.5 : 2.5));
    keys.forEach((kw, k) => {
      if (x + kw > kx + (row === 0 ? 49 : 57)) return;
      const accent = (row === 0 && k === 0) || (row === 2 && k === keys.length - 1);
      const mod = kw !== 2.5 && kw !== 18 || row === 4 && kw !== 18;
      const base = accent ? '#6f8fa8' : mod ? '#a8a49c' : '#f4eee2';
      hrect(g, x, y, kw, 1.5, darken(base, 0.18));          // keycap side
      hrect(g, x + 0.5, y, kw - 1, 1, base);                // top
      hrect(g, x + 0.5, y, kw - 1, 0.5, lighten(base, 0.35)); // top highlight
      x += kw + 0.5;
    });
  }
  hrect(g, kx + 50, ky + 1, 6.5, 1.5, '#0f1020');          // OLED
  // mouse: dark outline, graphite shell, split buttons, scroll wheel, lit edge
  const mx = 278, my = 184;
  ellipse(g, mx, my, 5, 7, '#0c0c12');
  ellipse(g, mx, my, 4, 6, '#3a3a48');
  ellipse(g, mx - 1, my - 2, 2, 3, '#55556a');
  vline(g, mx, my - 6, 5, '#15151c');
  rect(g, mx, my - 5, 1, 2, '#b8b8cc');
  dot(g, mx - 3, my + 2, '#4a4a5c');
  dot(g, mx + 4, my - 1, '#7a7a9a');
  rect(g, 300, 182, 16, 7, '#c58a52'); hline(g, 300, 182, 16, '#e0a870'); vline(g, 315, 182, 7, '#9a6a3a');
  for (let k = 0; k < 4; k++) dot(g, 302 + k * 4, 185, '#b07a44');

  // Monstera (foreground, left; the chair has the right corner)
  const monsteraDx = -336;
  // (its planter is a 2x prop drawn over the rug)
  const mleaf = (cx, cy, rx, ry, tilt) => {
    for (let j = -ry; j <= ry; j++)
      for (let i = -rx; i <= rx; i++) {
        const u = i / rx, v = (j + i * tilt) / ry;
        if (u * u + v * v > 1) continue;
        if (Math.abs(u) > 0.35 && Math.abs(Math.sin(Math.atan2(v, u) * 5)) < 0.18) continue;
        dot(g, cx + i, cy + j, Math.abs(i) < 1 ? '#23592e' : j < 0 ? '#3f9a4e' : '#2f7a3e');
      }
  };
  for (const [x, y] of [[440, 238], [448, 238], [456, 238]]) for (let k = 0; k < 34; k++) dot(g, x + monsteraDx + Math.sin(k * 0.1 + x) * 4, y - k, '#23592e');
  mleaf(436 + monsteraDx, 214, 12, 8, 0.3); mleaf(462 + monsteraDx, 204, 12, 8, -0.3); mleaf(470 + monsteraDx, 226, 10, 7, -0.2); mleaf(444 + monsteraDx, 196, 9, 6, 0.2);

  // Lighting: vignette, purple bias light, magenta wash, warm light-bar pool.
  const vg = g.createRadialGradient(240, 140, 70, 240, 140, 300);
  vg.addColorStop(0, 'rgba(8,4,16,0)');
  vg.addColorStop(1, 'rgba(8,4,16,0.55)');
  g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = vg; g.fillRect(0, 0, W, H); g.restore();
  glow(g, 240, 104, 170, '#8a4cff', 0.3, 'source-atop');
  glow(g, 460, 120, 130, '#ff4fd8', 0.16, 'source-atop');
  glow(g, 10, 90, 110, '#7a6dff', 0.16, 'source-atop');
  glow(g, 240, 172, 30, '#a070ff', 0.45, 'source-atop');
  const roomDay = dayVariant(room.c, { strength: 0.45 });

  // Code and file tree for the screens.
  const cr = rng(77);
  const COLORS = ['#ff79c6', '#8be9fd', '#f1fa8c', '#e6e6f0', '#bd93f9', '#50fa7b', '#ffb86c'];
  const codeLines = Array.from({ length: 60 }, () => {
    const indent = cr.pick([0, 1, 1, 2, 2, 3]);
    if (cr() < 0.12) return { indent, toks: [] };
    if (cr() < 0.12) return { indent, toks: [[cr.int(8, 22), '#6272a4']] };
    return { indent, toks: Array.from({ length: cr.int(1, 4) }, () => [cr.int(2, 8), cr.pick(COLORS)]) };
  });
  const tree = Array.from({ length: 18 }, () => ({ depth: cr.int(0, 2), w: cr.int(5, 11), folder: cr() < 0.35 }));

  L = {
    sky, city, cityDay, skyline, room, roomDay, codeLines, tree, outside: buildTree(), posters: buildPosters(),
    amber: [amberFrame(0, false), amberFrame(1, false), amberFrame(0, true)],
    precip: new Precip({ ...PANE, density: 0.8 }, 5), hearts: [],
  };
}

// ------------------------------------------------------------------ posters

// Fan-art posters drawn at 2x (real-pixel coordinates), framed and pinned.
const POSTERS = [
  { id: 'yyh', x: 61, y: 21, w: 44, h: 64, draw: drawYYH },
  { id: 'frieren', x: 61, y: 58, w: 44, h: 64, draw: drawFrieren },
  { id: 'dbz', x: 397, y: 62, w: 64, h: 80, draw: drawDBZ },
  { id: 'naruto', x: 397, y: 24, w: 44, h: 64, draw: drawNaruto },
  { id: 'vinyl', x: 36, y: 126, w: 88, h: 88, draw: drawLucyPearl, frame: '#b8b4bc', tape: false },
  // unframed props: the rug under the desk and the chair rolled out to the corner
  { id: 'rug', x: 96, y: 238, w: 656, h: 64, draw: drawRug, bare: true, shade: 0.5 },
  { id: 'planter', x: 97, y: 235, w: 58, h: 54, draw: drawPlanter, bare: true, shade: 0.35 },
  // unframed props on the desk and windowsills
  { id: 'pothos', x: 398, y: 148, w: 44, h: 64, draw: drawPothos, bare: true },
  { id: 'snake', x: 440, y: 132, w: 36, h: 96, draw: drawSnakePlant, bare: true },
  { id: 'cactus', x: 141, y: 126, w: 20, h: 28, draw: drawCactus, bare: true },
  { id: 'succulent-sill', x: 330, y: 128, w: 24, h: 24, draw: drawSucculent, bare: true },
  { id: 'succulent-desk', x: 117, y: 166, w: 24, h: 24, draw: drawSucculent, bare: true },
  { id: 'frieren-fig', x: 146, y: 157, w: 22, h: 38, draw: drawFrierenFigure, bare: true },
  { id: 'mug', x: MUG.x, y: MUG.y - 1, w: 26, h: 22, draw: drawMug, bare: true, shade: 0.3 },
  // big, in the foreground, turned away and bleeding off the bottom-right edge
  { id: 'chair', x: 352, y: 162, w: 184, h: 256, draw: (g) => { g.save(); g.translate(184, 0); g.scale(-1, 1); drawChair(g); g.restore(); }, bare: true, shade: 0.3 },
];

function vgrad(g, x, y, w, h, top, bottom) {
  for (let j = 0; j < h; j++) rect(g, x, y + j, w, 1, mix(top, bottom, j / Math.max(1, h - 1)));
}
function bigText(g, str, x, y, color, k = 2) { // the 3x5 font at k x k real pixels
  const t = canvas(str.length * 4, 5);
  text(t.g, str, 0, 0, color);
  g.drawImage(t.c, x, y, t.c.width * k, 5 * k);
}

function drawYYH(g) { // Yusuke firing the Spirit Gun
  vgrad(g, 0, 0, 44, 52, '#0c2233', '#1d5a5c');
  for (let k = 0; k < 18; k++) dot(g, (k * 17) % 44, (k * 11) % 40, '#3a7a8a');
  // spirit gun: blue orb with white core and a halo
  for (let r = 9; r > 0; r--) ellipse(g, 37, 25, r, r, r > 6 ? 'rgba(90,170,255,0.25)' : r > 3 ? '#6ab8ff' : '#e8f6ff');
  // body: green school uniform
  rect(g, 6, 30, 18, 22, '#2f7a3a'); rect(g, 6, 30, 3, 22, '#3f9a4a'); rect(g, 20, 30, 4, 22, '#1f5a2a');
  rect(g, 13, 30, 2, 22, '#1f5a2a'); for (let y = 33; y < 50; y += 5) dot(g, 16, y, '#e0c050'); // buttons
  // extended arm + pointing hand
  rect(g, 20, 27, 10, 5, '#2f7a3a'); rect(g, 20, 27, 10, 1, '#3f9a4a');
  rect(g, 30, 27, 3, 4, '#f0c49a'); rect(g, 33, 27, 3, 1, '#f0c49a'); dot(g, 30, 31, '#c8966a');
  // head: slicked-back black hair, face, ear
  rect(g, 10, 18, 9, 11, '#f0c49a'); rect(g, 10, 26, 9, 3, '#e0b088'); rect(g, 9, 21, 2, 3, '#e0a880');
  ellipse(g, 13, 15, 7, 5, '#141418'); rect(g, 6, 14, 5, 7, '#141418'); rect(g, 12, 12, 8, 3, '#141418');
  hline(g, 10, 13, 8, '#3a3a52'); hline(g, 8, 15, 4, '#3a3a52');
  rect(g, 15, 21, 3, 1, '#141418'); dot(g, 16, 22, '#3a2418'); rect(g, 15, 26, 2, 1, '#a86a50'); // brow, eye, mouth
  rect(g, 10, 29, 9, 2, '#1f5a2a'); // collar
  // title band
  rect(g, 0, 52, 44, 12, '#0e1216');
  text(g, 'YU YU', 22 - 9, 53, '#f4d04a');
  text(g, 'HAKUSHO', 22 - 13, 59, '#e8eef4');
}

function drawFrieren(g) { // Frieren in a flower meadow, staff in hand
  vgrad(g, 0, 0, 44, 42, '#8cc4ec', '#e4f2f8');
  for (let k = 0; k < 3; k++) ellipse(g, 8 + k * 14, 8 + (k % 2) * 4, 5, 2, '#ffffff');
  vgrad(g, 0, 42, 44, 14, '#78b868', '#4e8e48');
  for (let k = 0; k < 26; k++) dot(g, (k * 13) % 44, 43 + (k * 7) % 12, k % 3 ? '#6a8ae8' : '#ffffff');
  // staff with a red gem in a gold ring
  vline(g, 34, 10, 46, '#8a5a34'); vline(g, 35, 10, 46, '#6a4224');
  ellipse(g, 34.5, 9, 3, 3, '#e0b84a'); ellipse(g, 34.5, 9, 1.5, 1.5, '#d8384a');
  // twin tails and hair
  rect(g, 10, 20, 4, 30, '#e6eaf2'); rect(g, 30, 20, 4, 26, '#e6eaf2');
  vline(g, 11, 22, 26, '#c4ccd8'); vline(g, 32, 22, 22, '#c4ccd8');
  ellipse(g, 22, 16, 9, 8, '#eef2f8');
  // face, pointed elf ears, green eyes, gold earrings
  rect(g, 16, 15, 12, 12, '#f8e2d0'); rect(g, 16, 24, 12, 3, '#f0d0bc');
  for (let k = 0; k < 4; k++) { dot(g, 15 - k, 19 - (k >> 1), '#f8e2d0'); dot(g, 28 + k, 19 - (k >> 1), '#f8e2d0'); }
  dot(g, 14, 21, '#e0b040'); dot(g, 29, 21, '#e0b040');
  rect(g, 18, 19, 2, 2, '#2e8a6a'); rect(g, 24, 19, 2, 2, '#2e8a6a'); dot(g, 18, 19, '#8ae0c0'); dot(g, 24, 19, '#8ae0c0');
  rect(g, 21, 24, 2, 1, '#d89a8a');
  rect(g, 16, 13, 12, 3, '#eef2f8'); dot(g, 22, 15, '#c4ccd8'); // bangs + part
  // white capelet with gold trim
  rect(g, 13, 28, 18, 18, '#f6f6fa'); rect(g, 13, 28, 2, 18, '#ffffff'); rect(g, 27, 28, 4, 18, '#cfd4e0');
  hline(g, 13, 45, 18, '#d8b050'); vline(g, 22, 29, 16, '#d8b050'); rect(g, 21, 29, 3, 2, '#d8b050');
  // title band
  rect(g, 0, 56, 44, 8, '#243442');
  text(g, 'FRIEREN', 22 - 13, 57, '#f4f6fa');
}

function drawDBZ(g) { // Goku and the four-star ball
  vgrad(g, 0, 0, 64, 80, '#ffd04a', '#f0701c');
  for (let k = 0; k < 16; k++) { // speed rays from the center
    const a = (k / 16) * Math.PI * 2;
    for (let d = 12; d < 60; d += 1.5) dot(g, 32 + Math.cos(a) * d, 40 + Math.sin(a) * d, k % 2 ? '#ffe08a' : '#f8a040');
  }
  // four-star dragon ball
  ellipse(g, 49, 20, 10, 10, '#d8741a'); ellipse(g, 48, 19, 9, 9, '#f29a1c');
  ellipse(g, 45, 15, 4, 3, '#ffd88a'); dot(g, 43, 14, '#ffffff');
  for (const [sx, sy] of [[46, 20], [52, 18], [50, 24], [44, 25]]) { hline(g, sx - 1, sy, 3, '#d8282a'); vline(g, sx, sy - 1, 3, '#d8282a'); }
  // orange gi with a blue undershirt and belt
  rect(g, 10, 56, 36, 24, '#f07a1c'); rect(g, 10, 56, 4, 24, '#ff9a3a'); rect(g, 40, 56, 6, 24, '#c85a10');
  for (let k = 0; k < 7; k++) hline(g, 24 - k, 56 + k, k * 2 + 1, '#2a4aa8');
  rect(g, 10, 74, 36, 3, '#2a4aa8');
  ellipse(g, 17, 63, 3, 3, '#f8f4ec'); dot(g, 17, 63, '#141418'); dot(g, 16, 62, '#141418');
  // face and neck
  rect(g, 20, 48, 9, 8, '#f0c49a');
  rect(g, 17, 32, 15, 17, '#f6d0a8'); rect(g, 17, 45, 15, 4, '#e8b890');
  rect(g, 19, 38, 4, 1, '#141418'); rect(g, 26, 38, 4, 1, '#141418');   // brows
  rect(g, 20, 40, 2, 2, '#141418'); rect(g, 27, 40, 2, 2, '#141418');   // eyes
  dot(g, 21, 40, '#ffffff'); dot(g, 28, 40, '#ffffff');
  rect(g, 22, 46, 5, 1, '#a8604a');                                    // grin
  // spiky hair
  const spikes = [[12, 36, 14, 20], [15, 30, 18, 14], [20, 28, 23, 12], [26, 28, 30, 13], [31, 30, 36, 18], [34, 36, 40, 26]];
  rect(g, 14, 26, 21, 8, '#141418');
  for (const [x0, y0, tx, ty] of spikes)
    for (let k = 0; k <= 12; k++) { const u = k / 12; rect(g, x0 + (tx - x0) * u - (1 - u) * 2, y0 + (ty - y0) * u, Math.max(1, (1 - u) * 6), 2, '#141418'); }
  for (const [x, y] of [[20, 24], [26, 22], [31, 25]]) dot(g, x, y, '#3a3a52');
  rect(g, 16, 32, 3, 5, '#141418'); rect(g, 30, 32, 3, 4, '#141418'); // side hair
  // title: "DBZ" with a red outline
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) bigText(g, 'DBZ', 3 + dx, 3 + dy, '#b81818');
  bigText(g, 'DBZ', 3, 3, '#ffe84a');
}

function drawNaruto(g) { // spiky hair, Leaf headband, whiskers, orange jacket, Uzumaki spiral
  vgrad(g, 0, 0, 44, 52, '#16305e', '#3a6aa8');
  for (let a = 0; a < 26; a += 0.12) { // the red spiral behind him
    const r = 1.5 + a * 0.62;
    if (r > 19) break;
    dot(g, 22 + Math.cos(a) * r, 22 + Math.sin(a) * r, 'rgba(200,48,58,0.8)');
  }
  // orange and black jacket with a white collar
  rect(g, 7, 36, 30, 16, '#f07a1c'); rect(g, 7, 36, 3, 16, '#ff9a3a'); rect(g, 33, 36, 4, 16, '#c85a10');
  rect(g, 7, 34, 30, 5, '#1c1c24'); rect(g, 14, 32, 16, 3, '#f0f0f4'); vline(g, 22, 35, 17, '#8a8e98');
  // face: skin, blue eyes, whisker marks, grin
  rect(g, 14, 18, 16, 13, '#f6d4ac'); rect(g, 15, 31, 14, 2, '#e8c098'); rect(g, 17, 33, 10, 1, '#e8c098');
  rect(g, 17, 22, 3, 2, '#2e6ad8'); rect(g, 25, 22, 3, 2, '#2e6ad8'); dot(g, 17, 22, '#bfe0ff'); dot(g, 25, 22, '#bfe0ff');
  for (const y of [25, 27, 29]) { hline(g, 14, y, 3, '#8a5a3a'); hline(g, 27, y, 3, '#8a5a3a'); }
  rect(g, 19, 28, 6, 2, '#8a3a2a'); rect(g, 20, 28, 4, 1, '#ffffff');
  // Hidden Leaf headband: blue cloth with a metal plate
  rect(g, 11, 15, 22, 4, '#243a8a'); rect(g, 16, 14, 12, 5, '#c8ccd8'); hline(g, 16, 14, 12, '#eef0f6');
  for (const [x, y] of [[21, 15], [22, 15], [23, 16], [22, 17], [21, 17], [20, 16], [24, 17], [25, 18]]) dot(g, x, y, '#4e5260');
  // spiky blond hair
  ellipse(g, 22, 11, 11, 6, '#f4d03a');
  for (const [bx, by, tx, ty] of [[12, 12, 4, 6], [15, 8, 10, 0], [20, 6, 18, -2], [25, 6, 28, -1], [29, 8, 35, 1], [32, 12, 40, 7], [12, 16, 6, 20], [32, 16, 38, 21]])
    for (let k = 0; k <= 10; k++) { const u = k / 10; rect(g, bx + (tx - bx) * u - (1 - u) * 2, by + (ty - by) * u, Math.max(1, (1 - u) * 5), 2, u > 0.6 ? '#fff08a' : '#f4d03a'); }
  for (const [x, y] of [[17, 9], [23, 7], [28, 9]]) dot(g, x, y, '#d8a824');
  // title band
  rect(g, 0, 52, 44, 12, '#1c1c28');
  text(g, 'NARUTO', 22 - 11, 55, '#f08a2a');
}

function drawLucyPearl(g) { // the Lucy Pearl (2000) sleeve: a 3x2 photo collage + yellow script
  rect(g, 0, 0, 88, 88, '#e8e6e0');
  const panel = (px, py, fn) => { g.save(); g.beginPath(); g.rect(px, py, 28, 42); g.clip(); g.translate(px, py); fn(); g.restore(); };
  const grey = ['#1c1c20', '#3a3a40', '#5e5e66', '#8a8a92', '#b8b8c0', '#e4e4ea'];
  // top-left: guitarist, bare arms, brown guitar
  panel(1, 1, () => {
    rect(g, 0, 0, 28, 42, '#d8d0c4'); rect(g, 6, 0, 14, 42, '#2a2226');
    rect(g, 2, 4, 5, 20, '#8a5a3a'); rect(g, 19, 6, 6, 18, '#7a4a2e'); rect(g, 20, 6, 2, 18, '#9a6a48');
    for (let k = 0; k < 16; k++) { rect(g, 4 + k, 28 - k * 0.6, 3, 5, '#8a4a22'); }
    for (let k = 0; k < 20; k++) dot(g, 3 + k, 31 - k * 0.6, '#e8d8b0');
    ellipse(g, 7, 30, 5, 4, '#6a3818'); ellipse(g, 7, 30, 1.5, 1.5, '#1c1410');
  });
  // top-middle: close-up face (black and white)
  panel(30, 1, () => {
    rect(g, 0, 0, 28, 42, grey[1]); ellipse(g, 14, 20, 12, 18, grey[2]); ellipse(g, 12, 16, 8, 10, grey[3]);
    rect(g, 6, 14, 5, 2, grey[0]); rect(g, 17, 14, 5, 2, grey[0]); dot(g, 8, 14, grey[5]); dot(g, 19, 14, grey[5]);
    rect(g, 13, 17, 2, 7, grey[2]); rect(g, 12, 23, 4, 1, grey[1]);
    rect(g, 9, 29, 10, 2, grey[1]); rect(g, 10, 31, 8, 1, grey[4]);
  });
  // top-right: red and pink with a yellow shape and a hand
  panel(59, 1, () => {
    rect(g, 0, 0, 28, 42, '#d8384a'); rect(g, 0, 26, 28, 16, '#e87aa0');
    ellipse(g, 15, 24, 11, 9, '#f0d040'); ellipse(g, 12, 21, 5, 4, '#f8e880');
    rect(g, 20, 2, 6, 10, '#6a4a3a'); rect(g, 18, 10, 9, 4, '#7a5646'); rect(g, 0, 36, 9, 6, '#3a6ac8');
  });
  // bottom-left: big smile, glasses (black and white)
  panel(1, 45, () => {
    rect(g, 0, 0, 28, 42, grey[4]); ellipse(g, 14, 18, 10, 13, grey[1]); rect(g, 4, 30, 20, 12, grey[0]);
    rect(g, 6, 13, 7, 4, grey[3]); rect(g, 15, 13, 7, 4, grey[3]); rect(g, 13, 14, 2, 1, grey[3]);
    rect(g, 7, 14, 5, 2, grey[0]); rect(g, 16, 14, 5, 2, grey[0]);
    ellipse(g, 14, 23, 6, 3, grey[0]); rect(g, 9, 22, 10, 2, grey[5]);
  });
  // bottom-middle: hands, a blue ring, silver bracelets
  panel(30, 45, () => {
    rect(g, 0, 0, 28, 42, '#5a3a30'); ellipse(g, 14, 8, 10, 7, '#7a4e3e'); rect(g, 8, 6, 12, 3, '#9a3a4a');
    ellipse(g, 12, 24, 9, 7, '#8a5a44'); ellipse(g, 20, 28, 7, 6, '#7a4e3a');
    ellipse(g, 18, 22, 3, 2.5, '#4aa8e0'); dot(g, 17, 21, '#c8ecff');
    for (let k = 0; k < 3; k++) rect(g, 4 + k * 2, 34 + k, 12, 1, '#d0d4dc');
  });
  // bottom-right: man in a white hood (black and white)
  panel(59, 45, () => {
    rect(g, 0, 0, 28, 42, grey[2]); ellipse(g, 14, 20, 13, 20, grey[5]); ellipse(g, 14, 20, 8, 11, grey[0]);
    ellipse(g, 14, 19, 6, 9, grey[1]); rect(g, 10, 17, 3, 1, grey[4]); rect(g, 16, 17, 3, 1, grey[4]);
    rect(g, 11, 25, 6, 1, grey[3]); rect(g, 0, 36, 28, 6, grey[5]);
  });
  // the yellow "Lucy Pearl" script across the middle, crisp pixels with a dark edge
  const sc = canvas(88, 26);
  sc.g.font = 'italic 700 21px "Brush Script MT", "Segoe Script", cursive';
  sc.g.fillStyle = '#000';
  sc.g.fillText('Lucy Pearl', 4, 20);
  const src = sc.g.getImageData(0, 0, 88, 26).data;
  const on = (x, y) => x >= 0 && y >= 0 && x < 88 && y < 26 && src[(y * 88 + x) * 4 + 3] > 110;
  for (let y = 0; y < 26; y++)
    for (let x = 0; x < 88; x++) {
      if (on(x, y)) dot(g, x, 31 + y, on(x, y - 1) ? '#f0d020' : '#fff08a');
      else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) dot(g, x, 31 + y, '#5a4a10');
    }
}

// Desk & sill props at 2x (unframed): plants and a Frieren figurine.
function heartLeaf(g, cx, cy, s, pal, vari) {
  ellipse(g, cx - s * 0.45, cy - s * 0.2, s * 0.55, s * 0.5, pal[0]);
  ellipse(g, cx + s * 0.45, cy - s * 0.2, s * 0.55, s * 0.5, pal[0]);
  for (let k = 0; k <= s; k++) hline(g, cx - (s - k) * 0.9, cy + k * 0.6, (s - k) * 1.8 + 1, pal[0]);
  ellipse(g, cx - s * 0.35, cy - s * 0.3, s * 0.3, s * 0.25, pal[1]); // light side
  vline(g, cx, cy - s * 0.4, s, pal[2]);                              // vein
  if (vari) for (let k = 0; k < s; k++) dot(g, cx + 1 + (k % 2), cy - s * 0.3 + k * 0.6, '#d8d890');
}

function drawPothos(g) { // white ceramic pot, heart-shaped variegated leaves, trailing vines
  const pal = ['#3f8a4a', '#62ae5a', '#2a6a38'];
  // trailing vines behind and in front of the pot
  for (const [x0, len, dir] of [[11, 22, -0.25], [33, 18, 0.2], [16, 14, -0.1]])
    for (let k = 0; k < len; k++) {
      const x = x0 + dir * k + Math.sin(k * 0.5) * 1.2, y = 42 + k;
      dot(g, x, y, '#2a5a30');
      if (k % 5 === 2) heartLeaf(g, x + (k % 10 === 2 ? 2 : -2), y, 2.5, pal, k % 3 === 0);
    }
  // pot
  rect(g, 10, 42, 24, 20, '#e8e4dc'); rect(g, 10, 42, 3, 20, '#ffffff'); rect(g, 29, 42, 5, 20, '#b8b2a8');
  rect(g, 8, 40, 28, 3, '#f4f0e8'); hline(g, 8, 40, 28, '#ffffff'); ellipse(g, 22, 41, 11, 1.2, '#3a2a20');
  hline(g, 11, 61, 22, '#9a948a');
  // leaf mound
  for (const [x, y, s, v] of [[10, 36, 5, 0], [34, 37, 5, 1], [15, 30, 6, 1], [29, 30, 6, 0], [22, 26, 6, 0], [18, 22, 5, 1], [27, 21, 5, 0], [22, 34, 5, 1], [7, 41, 4, 0], [37, 42, 4, 1]])
    heartLeaf(g, x, y, s, pal, v);
}

function drawSnakePlant(g) { // terracotta pot, tall banded sword leaves with yellow edges
  const leaves = [[9, 46, -1], [13, 70, -0.3], [17, 58, 0.1], [21, 76, 0.2], [25, 52, 0.5], [28, 40, 1]];
  for (const [x, hgt, lean] of leaves)
    for (let j = 0; j < hgt; j++) {
      const w = Math.max(1, 5 * (1 - Math.pow(j / hgt, 3)));
      const cx = x + lean * j * 0.12;
      const band = Math.floor((j + x) / 4) % 2 ? '#5a8a4a' : '#2e5a34';
      hline(g, cx - w / 2, 76 - j, w, band);
      if (w > 2) { dot(g, cx - w / 2, 76 - j, '#c8c060'); dot(g, cx + w / 2 - 1, 76 - j, '#c8c060'); }
    }
  rect(g, 6, 76, 24, 20, '#c8703a'); rect(g, 6, 76, 3, 20, '#e08a50'); rect(g, 25, 76, 5, 20, '#a85a2a');
  rect(g, 4, 74, 28, 4, '#d88048'); hline(g, 4, 74, 28, '#f0a068');
}

function drawCactus(g) { // tiny terracotta pot, ribbed cactus with spines and a pink flower
  rect(g, 4, 18, 12, 10, '#c8703a'); rect(g, 4, 18, 2, 10, '#e08a50'); rect(g, 3, 17, 14, 2, '#d88048');
  rect(g, 6, 4, 8, 14, '#4a8a4a'); ellipse(g, 10, 5, 4, 3, '#4a8a4a');
  rect(g, 1, 9, 4, 3, '#4a8a4a'); rect(g, 1, 6, 3, 4, '#4a8a4a'); rect(g, 15, 11, 3, 2, '#4a8a4a'); rect(g, 16, 8, 2, 4, '#4a8a4a');
  vline(g, 8, 4, 14, '#6aaa5a'); vline(g, 11, 4, 14, '#3a7a3a');
  for (let k = 0; k < 10; k++) dot(g, 6 + (k * 3) % 8, 5 + (k * 5) % 12, '#f0f4e8');
  ellipse(g, 10, 2, 2.5, 1.5, '#f07aa8'); dot(g, 10, 2, '#ffe070');
}

function drawSucculent(g) { // blue ceramic pot, rosette with pink tips
  rect(g, 5, 14, 14, 10, '#6a8ab0'); rect(g, 5, 14, 2, 10, '#8aaad0'); rect(g, 16, 14, 3, 10, '#4a6a90'); rect(g, 4, 13, 16, 2, '#7a9ac0');
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    const x = 12 + Math.cos(a) * 6, y = 10 + Math.sin(a) * 3.5;
    ellipse(g, x, y, 2.2, 1.6, '#8ac0a0'); dot(g, x + Math.cos(a) * 2, y + Math.sin(a) * 1.2, '#e08a9a');
  }
  ellipse(g, 12, 9, 3, 2, '#a8d8b8'); dot(g, 12, 8, '#c8f0d8');
}

function drawFrierenFigure(g) { // a little Frieren on a round base, staff in hand
  ellipse(g, 11, 35, 9, 2.5, '#1c1c24'); ellipse(g, 11, 34, 8, 2, '#3a3a48');                 // base
  // staff
  vline(g, 18, 6, 28, '#8a5a34'); ellipse(g, 18, 5, 2.5, 2.5, '#e0b84a'); ellipse(g, 18, 5, 1.2, 1.2, '#d8384a');
  // white capelet + skirt with gold trim, legs
  rect(g, 8, 29, 2, 5, '#e8d8c8'); rect(g, 12, 29, 2, 5, '#e8d8c8');
  rect(g, 5, 17, 12, 12, '#f6f6fa'); rect(g, 5, 17, 2, 12, '#ffffff'); rect(g, 14, 17, 3, 12, '#cfd4e0');
  hline(g, 5, 28, 12, '#d8b050'); vline(g, 11, 18, 10, '#d8b050');
  rect(g, 16, 20, 2, 2, '#f8e2d0'); // hand on the staff
  // twin tails and hair
  rect(g, 3, 9, 3, 16, '#e6eaf2'); rect(g, 16, 9, 3, 14, '#e6eaf2'); vline(g, 4, 11, 12, '#c4ccd8');
  ellipse(g, 11, 8, 6, 5, '#eef2f8');
  // face, ears, eyes
  rect(g, 7, 7, 8, 8, '#f8e2d0'); rect(g, 7, 6, 8, 2, '#eef2f8');
  dot(g, 6, 10, '#f8e2d0'); dot(g, 5, 9, '#f8e2d0'); dot(g, 16, 10, '#f8e2d0'); dot(g, 17, 9, '#f8e2d0');
  dot(g, 9, 10, '#2e8a6a'); dot(g, 13, 10, '#2e8a6a'); dot(g, 11, 13, '#d89a8a');
}

function drawRug(g) { // oriental rug in perspective: navy/gold border, red field, medallion
  const Wd = 656, Hd = 64;
  const img = g.createImageData(Wd, Hd);
  const put = (x, y, hex) => { const n = parseInt(hex.slice(1), 16); img.data.set([n >> 16, (n >> 8) & 255, n & 255, 255], (y * Wd + x) * 4); };
  for (let j = 0; j < Hd; j++) {
    const v = j / (Hd - 1);
    const left = 48 * (1 - v), right = 608 + 48 * v; // wider toward us
    for (let x = Math.floor(left); x < Math.ceil(right); x++) {
      const u = (x - left) / (right - left);
      let c;
      const edge = Math.min(u, 1 - u);
      if (edge < 0.012 || v < 0.05) c = '#1c2440';                       // outer binding
      else if (edge < 0.02 || (v >= 0.05 && v < 0.08)) c = '#e0d0a8';    // cream line
      else if (edge < 0.07 || v < 0.24) {                                  // patterned border
        const k = (Math.floor(u * 90) + Math.floor(v * 14)) % 4;
        c = k === 0 ? '#c89a3a' : k === 2 ? '#8a2226' : '#26346a';
      } else if (edge < 0.078 || (v >= 0.24 && v < 0.27)) c = '#e0d0a8';  // inner cream line
      else {                                                              // field
        const du = (u - 0.5) / 0.17, dv = (v - 0.78) / 0.5;
        const m = du * du + dv * dv;
        if (m < 0.18) c = m < 0.06 ? '#8a2226' : '#c89a3a';               // medallion center
        else if (m < 0.9) c = m > 0.8 ? '#e0d0a8' : '#223066';            // medallion
        else {
          const lat = Math.abs(((u * 22) % 1) - 0.5) + Math.abs(((v * 5) % 1) - 0.5);
          c = lat < 0.1 ? '#b0402e' : '#8a2226';
        }
      }
      // shadow where the rug runs under the desk, with a little dithered wear
      if ((1 - v) * 0.5 > bayer(x, j) + 0.12) c = mix(c, '#0c0a14', 0.45);
      put(x, j, c);
    }
  }
  g.putImageData(img, 0, 0);
}

function drawChair(g) { // Steelcase-style task chair, orange upholstery, turned sideways as if just left
  const K = 2; // drawn big: it's in the foreground, closest to the viewer
  const rect = (x, y, w, h, c) => px.rect(g, x * K, y * K, Math.max(1, w * K), Math.max(1, h * K), c);
  const dot = (gg, x, y, c) => rect(x, y, 1, 1, c);
  const vline = (gg, x, y, h, c) => rect(x, y, 1, h, c);
  const hline = (gg, x, y, w, c) => rect(x, y, w, 1, c);
  const ellipse = (gg, x, y, rx, ry, c) => px.ellipse(g, x * K, y * K, rx * K, ry * K, c);
  // crisp polygon fill (no anti-aliasing) in real 2x pixels
  const poly = (pts0, col) => {
    const pts = pts0.map(([x, y]) => [x * K, y * K]);
    const ys = pts.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
        if ((y + 0.5 >= Math.min(y1, y2)) && (y + 0.5 < Math.max(y1, y2))) xs.push(x1 + ((y + 0.5 - y1) / (y2 - y1)) * (x2 - x1));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) px.rect(g, Math.round(xs[i]), y, Math.round(xs[i + 1]) - Math.round(xs[i]), 1, col);
    }
  };
  const O = { hi: '#f6a052', mid: '#e27a2c', lo: '#bc5a1c', side: '#8a3c12' };
  const shell = '#1c1c22', shellHi = '#34343e', chrome = '#a4aab6';
  // five-star base + casters
  for (const [x, y] of [[8, 115], [86, 113], [26, 122], [68, 122], [52, 106]]) {
    poly([[46, 111], [49, 109], [x + 2, y - 1], [x, y + 1]], shell);
    ellipse(g, x, y + 2, 3, 2.5, '#0e0e12'); dot(g, x - 1, y + 1, '#4a4a56');
  }
  ellipse(g, 47, 110, 5, 2.5, shellHi);
  // gas cylinder: black sleeve + chrome piston
  rect(44, 96, 7, 14, shell); rect(45, 84, 5, 12, chrome); vline(g, 46, 84, 12, '#e4e8f0');
  rect(38, 82, 20, 4, shell); // mechanism
  // seat cushion (turned ~40°): top face, front and side thickness
  poly([[14, 72], [58, 64], [86, 74], [40, 84]], O.mid);
  poly([[14, 72], [58, 64], [62, 66], [20, 74]], O.hi);                 // back edge catches light
  poly([[40, 84], [86, 74], [86, 79], [40, 90]], O.lo);                 // front face
  poly([[14, 72], [40, 84], [40, 90], [14, 77]], O.side);               // left face
  for (let k = 0; k < 8; k++) dot(g, 28 + k * 5, 75 + (k % 2), O.lo);    // seam
  // backrest (behind the seat, turned): orange face with a black shell edge, rounded top
  const back = [[6, 72], [30, 80], [32, 24], [28, 12], [20, 6], [10, 6], [4, 14], [3, 24]];
  poly(back.map(([x, y]) => [x + 3, y - 2]), shell);                    // shell peeking out on the right
  poly(back, O.mid);
  poly([[5, 24], [6, 14], [11, 8], [19, 8], [24, 12], [9, 20]], O.hi);  // top highlight
  poly([[4, 44], [31, 52], [31, 60], [4, 52]], O.lo);                   // lumbar band
  poly([[6, 72], [30, 80], [30, 83], [6, 75]], O.side);
  for (let y = 14; y < 70; y += 6) hline(g, 6, y, 2, O.lo);             // stitch on the left edge
  // T-armrest on the seat's near side (the edge closest to the viewer, (40,84)->(86,74)):
  // post from the middle of that edge, pad running parallel to it, in front of the seat
  rect(62, 62, 4, 18, shell); vline(g, 62, 62, 18, shellHi);
  poly([[48, 64], [80, 57], [80, 61], [48, 68]], shell); poly([[48, 64], [80, 57], [80, 58], [48, 65]], shellHi);
}

function drawPlanter(g) { // glazed ceramic planter for the monstera, tapered, with a rim and soil
  const W2 = 58, glaze = ['#2c5a5e', '#3a7478', '#52969a', '#7ab8b8'];
  for (let y = 10; y < 54; y++) {
    const inset = (y - 10) * 0.12, x0 = 6 + inset, w = W2 - 12 - inset * 2;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const shade = u < 0.12 ? 3 : u < 0.35 ? 2 : u < 0.8 ? 1 : 0;           // light from the left
      const drip = y < 22 + ((x * 7) % 5) ? 1 : 0;                          // glaze drips near the top
      dot(g, x0 + x, y, glaze[Math.min(3, shade + drip)]);
    }
  }
  for (let y = 32; y < 35; y++) hline(g, 9, y, W2 - 18, '#244a4e');       // incised band
  rect(g, 2, 4, W2 - 4, 7, '#3a7478'); hline(g, 2, 4, W2 - 4, '#8ac8c8'); hline(g, 2, 10, W2 - 4, '#1e3e42'); // rim
  rect(g, 6, 6, W2 - 12, 3, '#2a1a12');                                      // soil
  for (let k = 0; k < 10; k++) dot(g, 8 + ((k * 13) % (W2 - 16)), 6 + (k % 3), '#4a3222');
}

function drawMug(g) { // cream ceramic mug with a big orange "C" (for ciehanski), coffee inside
  const W2 = 22, H2 = 22;
  // handle
  rect(g, 20, 5, 5, 12, '#d8d2c6'); rect(g, 21, 8, 2, 6, '#1c1a24'); hline(g, 20, 5, 5, '#f0ece4');
  // body with left-lit shading
  for (let x = 0; x < W2; x++) {
    const u = x / W2;
    rect(g, x, 1, 1, H2 - 2, u < 0.12 ? '#fbf8f2' : u < 0.7 ? '#efe9de' : u < 0.9 ? '#d8d2c6' : '#bfb8ac');
  }
  rect(g, 0, 0, W2, 2, '#f8f4ec'); rect(g, 1, 1, W2 - 2, 2, '#4a2a1a'); dot(g, 5, 1, '#7a4a2e'); // rim + coffee
  hline(g, 0, H2 - 1, W2, '#a8a296');                                                                  // base
  // the "C": thick ring, open on the right, with a darker outline
  const cx = 10.5, cy = 11.5;
  for (let y = 3; y < H2 - 1; y++)
    for (let x = 1; x < W2 - 1; x++) {
      const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.05), a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
      if (Math.abs(a) < 0.72) continue;                               // the opening
      if (d >= 3.4 && d <= 7.4) dot(g, x, y, d > 6.6 || d < 4.1 ? '#b8601c' : '#e8913a');
    }
}

function buildPosters() {
  return POSTERS.map((p) => {
    const art = p.bare ? canvas(p.w, p.h) : canvas(p.w + 2, p.h + 2);
    if (p.bare) p.draw(art.g);
    else {
      rect(art.g, 0, 0, p.w + 2, p.h + 2, p.frame || '#141218'); // thin frame
      art.g.save(); art.g.translate(1, 1); p.draw(art.g); art.g.restore();
      if (p.tape !== false) rect(art.g, (p.w + 2) / 2 - 4, 0, 8, 3, 'rgba(236,228,206,0.9)'); // tape
    }
    // lit to match the room: purple dusk at night, softer by day
    const tint = (a) => {
      const c = canvas(art.c.width, art.c.height);
      c.g.drawImage(art.c, 0, 0);
      c.g.globalCompositeOperation = 'source-atop';
      c.g.fillStyle = `rgba(36,18,64,${a})`;
      c.g.fillRect(0, 0, c.c.width, c.c.height);
      return c.c;
    };
    const shade = p.shade ?? (p.bare ? 0.38 : 0.5);
    return { ...p, night: tint(shade), day: tint(shade * 0.35), dx: p.bare ? 0 : -0.5 };
  });
}

function drawPosters(g, day) {
  for (const p of L.posters) {
    blitHi(g, p.night, p.x + p.dx, p.y + p.dx);
    if (day > 0.01) { g.globalAlpha = day * 0.8; blitHi(g, p.day, p.x + p.dx, p.y + p.dx); g.globalAlpha = 1; }
  }
}

// ------------------------------------------------------------------ the tree outside

// Branches reach in from the left edge of the window; leaf clumps sit along
// them. Kept loose and dithered so the skyline shows through.
const BRANCHES = [
  [[92, 118], [110, 86], [127, 63], [150, 45], [172, 34]],
  [[110, 86], [103, 62], [100, 40]],
  [[127, 63], [138, 42], [164, 25], [205, 19]],
  [[92, 44], [116, 31], [142, 22]],
];
// ...and one faint twig poking into the bottom-right pane from the right, with a couple of clumps.
const CORNER = { pts: [[386, 128], [375, 120], [364, 116]], clumps: [[366, 113, 5], [378, 118, 4]] };

const SEASON = [ // by month: [palette key, share of clumps kept, share turned]
  ['bare', 0, 0], ['bare', 0, 0], ['bare', 0, 0], ['spring', 0.45, 0],
  ['spring', 0.85, 0], ['summer', 1, 0], ['summer', 1, 0], ['summer', 1, 0],
  ['fall', 1, 0.3], ['fall', 0.85, 0.7], ['fall', 0.5, 0.95], ['bare', 0, 0],
];
const LEAF = {
  spring0: ['#4e8e3a', '#78b84e', '#a8dc72'],
  spring1: ['#5a9a3a', '#8cc85a', '#bce48a'],
  spring2: ['#468a48', '#6ab468', '#98d88a'],
  summer0: ['#2c6a30', '#3e8a3c', '#62ae52'],
  summer1: ['#347a2a', '#52a03a', '#80c85a'],
  summer2: ['#2a6040', '#3e8a56', '#66b478'],
  green: ['#2f5e2c', '#3f7a3a', '#5a9848'],
  orange: ['#8a4a1a', '#c8742a', '#e8a04a'],
  yellow: ['#9a7a1a', '#d0a832', '#f0d060'],
  red: ['#6a2418', '#a8402a', '#d0663a'],
};

function leafClump(r, radius, pal, night) {
  const size = radius * 2 + 3;
  const cols = night ? pal.map((c) => mix(c, '#0a0c1c', 0.72)) : pal;
  return sprite(size, size, (x, y) => {
    const dx = x - radius - 1, dy = y - radius - 1;
    const d = Math.sqrt(dx * dx + dy * dy) / radius;
    if (d > 0.75 + r() * 0.35 || r() < 0.22) return null;
    const light = (-dx - dy) / (radius * 2) + (r() - 0.5) * 0.5;
    return light > 0.25 ? cols[2] : light > -0.2 ? cols[1] : cols[0];
  });
}

function buildTree() {
  const r = rng(314);
  const bark = canvas(), barkNight = canvas();
  for (const [c, col] of [[bark, '#4a3424'], [barkNight, '#120e16']])
    for (const pts of BRANCHES)
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        const thick = Math.max(1, 3 - i);
        const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
        for (let k = 0; k <= n; k++) rect(c.g, x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, thick, thick, col);
      }
  const twig = canvas(), twigNight = canvas();
  for (const [c, col] of [[twig, '#4a3424'], [twigNight, '#120e16']])
    for (let i = 0; i < CORNER.pts.length - 1; i++) {
      const [x0, y0] = CORNER.pts[i], [x1, y1] = CORNER.pts[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
      for (let k = 0; k <= n; k++) rect(c.g, x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, 2 - i, 2 - i, col);
    }
  // clumps along every branch segment
  const clumps = [];
  for (const pts of BRANCHES)
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      for (let k = 0; k < 2; k++) {
        const u = 0.4 + k * 0.5;
        clumps.push({ x: x0 + (x1 - x0) * u + r.range(-4, 4), y: y0 + (y1 - y0) * u + r.range(-6, 2), radius: r.int(4, 8), roll: r(), phase: r() * 6 });
      }
    }
  for (const [x, y, radius] of CORNER.clumps) clumps.push({ x, y, radius, roll: r() * 0.4, phase: r() * 6, faint: true });
  // sprites per palette, day + night, built on demand
  const sprites = new Map();
  const get = (key, i, night) => {
    const k = `${key}:${i}:${night}`;
    if (!sprites.has(k)) sprites.set(k, leafClump(rng(i * 7 + 1), clumps[i].radius, LEAF[key], night));
    return sprites.get(k);
  };
  // Snow on the branches, and on top of each leaf clump (same shape in every season).
  const barkSnow = snowCaps(bark.c, { seed: 5, coverage: 0.85 });
  const clumpSnow = new Map();
  const snowFor = (key, i) => {
    if (!clumpSnow.has(i)) clumpSnow.set(i, snowCaps(get(key, i, false), { seed: 30 + i, coverage: 0.8 }));
    return clumpSnow.get(i);
  };
  return { bark: bark.c, barkNight: barkNight.c, twig: twig.c, twigNight: twigNight.c, clumps, get, barkSnow, snowFor, snow: 0 };
}

// Night/day snow canvases drawn at `amount` of full accumulation.
function drawSnowAt(g, snow, x, y, day, amount) {
  g.globalAlpha = amount;
  blit(g, snow.night, x, y);
  g.globalAlpha = amount * day;
  blit(g, snow.day, x, y);
  g.globalAlpha = 1;
}

const FAINT = 0.42;

function drawTree(g, t, env, dt) {
  const T = L.outside;
  const [season, keep, turned] = SEASON[env.sky.month ?? 6];
  const day = env.sky.daylight;
  const snowing = env.weather === 'snow';
  T.snow += ((snowing ? 1 : 0) - T.snow) * Math.min(1, dt * (snowing ? 0.25 : 0.6));
  drawLit(g, T.barkNight, T.bark, day);
  g.globalAlpha = FAINT; blit(g, T.twigNight); g.globalAlpha = FAINT * day; blit(g, T.twig); g.globalAlpha = 1;
  if (T.snow > 0.01) drawSnowAt(g, T.barkSnow, 0, 0, day, T.snow);
  if (!keep) return;
  T.clumps.forEach((c, i) => {
    if (c.roll > keep) return;
    const key = season !== 'fall' ? season + (i % 3) // a few shades of green, clump by clump
      : c.roll < keep * turned ? ['orange', 'yellow', 'red'][i % 3] : 'green';
    const sway = Math.round(Math.sin(t * 0.7 + c.phase) * 1.2);
    const x = Math.round(c.x - c.radius - 1 + sway), y = Math.round(c.y - c.radius - 1);
    const a = c.faint ? FAINT : 1;                                      // the corner twig stays barely there
    g.globalAlpha = a;
    g.drawImage(T.get(key, i, true), x, y);
    if (day > 0.01) {
      g.globalAlpha = day * a;
      g.drawImage(T.get(key, i, false), x, y);
    }
    g.globalAlpha = 1;
    if (T.snow > 0.01) drawSnowAt(g, T.snowFor(key, i), x, y, day, T.snow);
  });
}

// ------------------------------------------------------------------ screens

function code(g, t, x, y, w, rows, speed = 1.4, offset = 20) {
  // text lines are one real pixel tall on a 1.5-unit pitch (twice the old density)
  const pos = t * speed + offset;
  const cur = Math.floor(pos), frac = pos - cur;
  for (let k = 0; k < rows; k++) {
    const ln = L.codeLines[(cur - rows + 1 + k + 600) % L.codeLines.length];
    const ly = y + k * 1.5;
    let lx = x + ln.indent * 2;
    const total = ln.toks.reduce((a, [tw]) => a + tw * 0.5 + 0.5, 0);
    const reveal = k === rows - 1 ? total * frac : total;
    let used = 0;
    for (const [tw, c] of ln.toks) {
      const len = tw * 0.5;
      const vis = Math.max(0, Math.min(len, reveal - used, x + w - lx));
      if (vis > 0) hrect(g, lx, ly, vis, 0.5, c);
      used += len + 0.5; lx += len + 0.5;
    }
    if (k === rows - 1 && Math.floor(t * 2.5) % 2 === 0) hrect(g, Math.min(x + w - 0.5, x + ln.indent * 2 + reveal), ly - 0.5, 0.5, 1.5, '#ffb86c');
  }
}

function drawTop(g, t) {
  const s = TOP;
  rect(g, s.x, s.y, s.w, s.h, '#15171f');
  // IDE (left): file tree + editor
  const ide = 72;
  rect(g, s.x, s.y, ide, 3, '#22252f');
  rect(g, s.x, s.y + 3, 18, s.h - 3, '#1b1e28');
  for (let i = 0; i < 33; i++) {
    const f = L.tree[i % L.tree.length];
    const y = s.y + 4.5 + i * 1.5;
    if (y > s.y + s.h - 1) break;
    if (i === 9) hrect(g, s.x, y - 0.5, 18, 1.5, '#2a3050');
    hrect(g, s.x + 1.5 + f.depth * 1.5, y, 1, 0.5, f.folder ? '#e8c060' : '#8a93b8');
    hrect(g, s.x + 3 + f.depth * 1.5, y, Math.min(f.w * 0.7, 14 - f.depth * 1.5), 0.5, f.folder ? '#c8ccd8' : '#7a8098');
  }
  rect(g, s.x + 18, s.y + 3, ide - 18, s.h - 3, '#181a24');
  code(g, t, s.x + 21, s.y + 5, ide - 22, 33);
  vline(g, s.x + ide, s.y, s.h, '#2a2d3a');
  // terminal (right): an agent session with scrolling output
  const tx = s.x + ide + 2, tw = s.w - ide - 3;
  rect(g, tx, s.y, tw, 3, '#22252f');
  const step = Math.floor(t * 1.3);
  for (let k = 0; k < 30; k++) {
    const n = step * 2 + k, y = s.y + 5 + k * 1.5;
    const h1 = hash(n, 11), h2 = hash(n, 12);
    if (h1 < 0.14) { hrect(g, tx + 2, y, 1, 0.5, '#e8913a'); hrect(g, tx + 4, y, 8 + Math.floor(h2 * 30), 0.5, '#e6e6f0'); }
    else if (h1 < 0.22) { hrect(g, tx + 2, y, 2, 0.5, '#50fa7b'); hrect(g, tx + 5, y, 6 + Math.floor(h2 * 24), 0.5, '#8a93b8'); }
    else if (h1 < 0.3) continue;
    else hrect(g, tx + 4, y, 5 + Math.floor(h2 * (tw - 10)), 0.5, h2 < 0.2 ? '#bd93f9' : '#9aa0b8');
  }
  const by = s.y + s.h - 6;
  rect(g, tx + 1, by - 1, tw - 2, 5, '#1c1f2a');
  dot(g, tx + 3, by + 1, Math.floor(t * 3) % 2 ? '#e8913a' : '#ffb86c');
  rect(g, tx + 6, by + 1, 16, 1, '#6a7090');
  if (Math.floor(t * 2) % 2) rect(g, tx + 24, by, 1, 3, '#e6e6f0');
}

// Bottom-right: a Slack-style chat. Messages trickle in; someone's typing.
const PEOPLE = [['#e8913a', 5], ['#5aa89a', 7], ['#bd93f9', 4], ['#e0708e', 6], ['#6f8fa8', 8]];
function drawChat(g, t, s) {
  rect(g, s.x, s.y, s.w, s.h, '#1a1d21');
  // sidebar: workspace, channels, unread badges
  const sb = 20;
  rect(g, s.x, s.y, sb, s.h, '#3f0e40');
  rect(g, s.x + 2, s.y + 2, 12, 2, '#e8e0ea');
  for (let k = 0; k < 9; k++) {
    const y = s.y + 7 + k * 5;
    if (k === 2) rect(g, s.x, y - 1, sb, 4, '#1164a3');
    const unread = k === 4 || k === 6;
    dot(g, s.x + 2, y, '#b89ab8');
    hrect(g, s.x + 4, y, 6 + ((k * 5) % 7), 0.5, unread || k === 2 ? '#ffffff' : '#b89ab8');
    if (unread) rect(g, s.x + 16, y - 1, 3, 3, '#e01e5a');
  }
  // channel header
  const mx = s.x + sb;
  dot(g, mx + 2, s.y + 1, '#d1d2d3'); hrect(g, mx + 4, s.y + 1, 18, 0.5, '#d1d2d3');
  hline(g, mx, s.y + 4, s.w - sb, '#2c2e33');
  // messages: a new one every ~3.5s, newest at the bottom
  const rate = 3.5, n = Math.floor(t / rate), frac = (t % rate) / rate;
  let y = s.y + s.h - 9;
  for (let k = 0; k < 6; k++) {
    const id = n - k;
    const [c, nameW] = PEOPLE[Math.floor(hash(id, 3) * PEOPLE.length)];
    const lines = 1 + Math.floor(hash(id, 4) * 2);
    y -= 6 + lines * 2;
    if (y < s.y + 6) break;
    rect(g, mx + 2, y, 3, 3, c);
    hrect(g, mx + 7, y, nameW, 0.5, '#ffffff');
    hrect(g, mx + 8 + nameW, y, 4, 0.5, '#616061');
    for (let l = 0; l < lines * 2; l++) hrect(g, mx + 7, y + 2 + l * 1, 8 + Math.floor(hash(id, 5 + l) * (s.w - sb - 18)), 0.5, '#aeb0b3');
    if (hash(id, 9) < 0.25) { rect(g, mx + 7, y + 3 + lines * 2, 5, 2, '#2c2e33'); dot(g, mx + 8, y + 3 + lines * 2, '#f2c744'); }
  }
  // composer + typing indicator
  rect(g, mx + 2, s.y + s.h - 7, s.w - sb - 4, 5, '#222529');
  hline(g, mx + 2, s.y + s.h - 7, s.w - sb - 4, '#565856');
  if (frac > 0.45) for (let d = 0; d < 3; d++) if (Math.floor(t * 4) % 3 >= d) dot(g, mx + 4 + d * 2, s.y + s.h - 5, '#8a8b8d');
}

// Bottom-left: a browser with a video site open, playing a little lofi loop.
function drawBrowser(g, t, s) {
  rect(g, s.x, s.y, s.w, s.h, '#0f0f0f');
  // browser chrome: tab strip + address bar
  rect(g, s.x, s.y, s.w, 3, '#202124');
  rect(g, s.x + 2, s.y, 26, 3, '#35363a'); dot(g, s.x + 4, s.y + 1, '#ff0033'); rect(g, s.x + 6, s.y + 1, 14, 1, '#9aa0a6');
  rect(g, s.x + 29, s.y + 1, 16, 1, '#5f6368');
  rect(g, s.x, s.y + 3, s.w, 4, '#35363a');
  rect(g, s.x + 8, s.y + 4, s.w - 16, 2, '#202124'); dot(g, s.x + 9, s.y + 4, '#9aa0a6'); rect(g, s.x + 12, s.y + 4, 26, 1, '#9aa0a6');
  // site header: logo + search
  const hy = s.y + 8;
  rect(g, s.x + 2, hy, 5, 4, '#ff0033'); dot(g, s.x + 4, hy + 1, '#ffffff'); dot(g, s.x + 4, hy + 2, '#ffffff'); dot(g, s.x + 5, hy + 1, '#ffffff');
  rect(g, s.x + 8, hy + 1, 8, 2, '#f1f1f1');
  rect(g, s.x + 22, hy, 32, 4, '#121212'); hline(g, s.x + 22, hy, 32, '#303030'); rect(g, s.x + 54, hy, 5, 4, '#222222');
  dot(g, s.x + s.w - 4, hy + 1, '#e8913a');
  // the video + its progress bar
  const p = { x: s.x + 2, y: s.y + 14, w: 54, h: 30 };
  lofiVideo(g, t, p);
  const prog = Math.round(((t / 90) % 1) * p.w);
  hline(g, p.x, p.y + p.h - 1, p.w, '#5a5a5a');
  hline(g, p.x, p.y + p.h - 1, prog, '#ff0033');
  dot(g, p.x + prog, p.y + p.h - 1, '#ff4060');
  // title and channel under the player
  hrect(g, p.x, p.y + p.h + 2, 44, 0.5, '#f1f1f1');
  hrect(g, p.x, p.y + p.h + 3.5, 30, 0.5, '#f1f1f1');
  rect(g, p.x, p.y + p.h + 7, 3, 3, '#e8913a'); hrect(g, p.x + 5, p.y + p.h + 8, 16, 0.5, '#aaaaaa');
  rect(g, p.x + 38, p.y + p.h + 7, 12, 3, '#f1f1f1');
  // up-next column
  const cx = s.x + 58;
  ['#6a4a9a', '#c86a8a', '#3a6a8a', '#e8913a', '#4a8a6a'].forEach((hue, k) => {
    const y = s.y + 14 + k * 8;
    rect(g, cx, y, 11, 6, hue);
    dot(g, cx + 5, y + 2, '#ffffff'); dot(g, cx + 5, y + 3, '#ffffff'); dot(g, cx + 6, y + 2, '#ffffff');
    hrect(g, cx + 13, y, 9, 0.5, '#f1f1f1'); hrect(g, cx + 13, y + 1, 7, 0.5, '#f1f1f1'); hrect(g, cx + 13, y + 2.5, 6, 0.5, '#aaaaaa');
  });
}

// A tiny lofi video: someone at a desk, rain on the window, head bobbing.
function lofiVideo(g, t, p) {
  for (let j = 0; j < p.h; j++) hline(g, p.x, p.y + j, p.w, j < p.h * 0.5 ? '#3a2a5e' : j < p.h * 0.8 ? '#5a3a6e' : '#2a1e3a');
  const wx = p.x + 30, wy = p.y + 4, ww = 18, wh = 13;
  rect(g, wx - 1, wy - 1, ww + 2, wh + 2, '#1a1226');
  rect(g, wx, wy, ww, wh, '#1c2a5a');
  dot(g, wx + 13, wy + 3, '#fff4c8'); dot(g, wx + 14, wy + 3, '#fff4c8'); dot(g, wx + 13, wy + 4, '#fff4c8');
  for (let k = 0; k < 7; k++) dot(g, wx + ((k * 5 + Math.floor(t * 3)) % ww), wy + ((k * 7 + Math.floor(t * 24)) % wh), '#8aa0e0');
  vline(g, wx + ww / 2, wy, wh, '#1a1226');
  rect(g, p.x, p.y + 21, p.w, 2, '#6a4a3a');
  glow(g, p.x + 12, p.y + 18, 10, '#ffb070', 0.35);
  rect(g, p.x + 9, p.y + 17, 4, 4, '#e8c080');
  const bob = Math.sin(t * 5.2) > 0 ? 1 : 0;
  rect(g, p.x + 17, p.y + 14, 8, 8, '#241830');
  ellipse(g, p.x + 21, p.y + 11 + bob, 3, 3, '#2a1e1a');
  for (let k = -3; k <= 3; k++) dot(g, p.x + 21 + k, p.y + 8 + bob + Math.round((k * k) / 5), '#ff8fb1');
  dot(g, p.x + 18, p.y + 11 + bob, '#ff8fb1'); dot(g, p.x + 24, p.y + 11 + bob, '#ff8fb1');
}

// ------------------------------------------------------------------ scene

export default {
  id: 'desk',
  focus: 0.5,
  name: 'My Desk',
  blurb: 'Coding and such',
  ambience: { keys: 1, city: 0.35, rain: 0.5 },

  hotspots: [
    { id: 'amber', x: CAT.x, y: CAT.y + 2, w: 38, h: 18, label: 'Amber' },
    { id: 'top', x: TOP.x - 3, y: TOP.y - 3, w: TOP.w + 6, h: TOP.h + 6, label: 'Projects' },
    { id: 'poster', x: 422, y: 16, w: 54, h: 44, label: 'Poster' },
    { id: 'frierenfig', x: 146, y: 157, w: 11, h: 19, label: 'Frieren' },
    { id: 'vinyl', x: 36, y: 126, w: 45, h: 45, label: 'Lucy Pearl' },
    { id: 'mug', x: MUG.x - 2, y: MUG.y - 8, w: 17, h: 20, label: 'Mug' },
    { id: 'shelf', x: 4, y: 26, w: 56, h: 54, label: 'Shelves' },
  ],

  build() { if (!L) build(); },

  draw(g, t, dt, env) {
    if (!L) build();
    const day = env.sky.daylight;
    const night = 1 - day;
    L.sky.draw(g, t, dt, env);
    drawLit(g, L.city.c, L.cityDay, day);
    if (night > 0.2) animateSkyline(g, L.skyline, t, { glowScale: 0.6 });
    drawTree(g, t, env, dt);
    L.precip.draw(g, dt, env.weather, t);
    if (env.weather === 'rain') paneDrops(g, PANE, t, 1);
    drawLit(g, L.room.c, L.roomDay, day * 0.8);
    drawPosters(g, day);
    if (day > 0.3) glow(g, 240, 150, 180, '#dfe8ff', 0.12 * day);

    drawTop(g, t);
    drawBrowser(g, t, { x: BOT.x, y: BOT.y, w: 82, h: BOT.h });
    drawChat(g, t, { x: BOT.x + 84, y: BOT.y, w: BOT.w - 84, h: BOT.h });
    vline(g, BOT.x + 82, BOT.y, BOT.h, '#2a2d3a'); vline(g, BOT.x + 83, BOT.y, BOT.h, '#0b0c14');
    glow(g, TOP.x + 78, TOP.y + 28, 90, '#6d8dff', 0.08);
    glow(g, BOT.x + 80, BOT.y + 29, 90, '#8a6dff', 0.08);

    // light bar: on after dark, off during the day
    const bar = Math.min(1, Math.max(0, (night - 0.25) / 0.5));
    hline(g, 188, 35, 104, bar > 0.5 ? '#fff4dc' : '#3a3844');
    if (bar > 0.01) {
      glow(g, 240, 40, 60, '#ffe8c0', 0.22 * bar);
      glow(g, 240, 184, 110, '#ffe6c0', 0.2 * bar);
    }
    // LED strip, candle
    for (let y = 0; y < 236; y += 24) glow(g, 1, y + 12, 18, '#b070ff', 0.18 * (0.4 + night * 0.6));
    const fl = 0.8 + 0.2 * Math.sin(t * 9) * Math.sin(t * 5.3);
    dot(g, CANDLE.x, CANDLE.y, fl > 0.85 ? '#fff0b0' : '#ffb040');
    glow(g, CANDLE.x, CANDLE.y, 14, '#ffb050', 0.4 * fl * (0.3 + night * 0.7));

    // keyboard OLED + mini PC LED
    for (let i = 0; i < 10; i++) hdot(g, KB.x + 50.5 + i * 0.5, KB.y + 1.5 + ((Math.floor(t * 4) + i) % 3 === 0 ? 0 : 0.5), '#5ce1e6');
    dot(g, 252, 167, Math.floor(t) % 3 ? '#a070ff' : '#4a2a8a');

    // Amber
    const breathing = Math.floor(t * 0.8) % 2;
    const flick = hash(Math.floor(t / 1.3), 9) < 0.12;
    blitHi(g, L.amber[flick ? 2 : breathing], CAT.x, CAT.y);
    if (hash(Math.floor(t / 4), 3) < 0.6) {
      const life = (t % 4) / 4;
      g.globalAlpha = Math.max(0, 1 - life);
      text(g, life < 0.5 ? 'z' : 'Z', CAT.x + 31 + life * 6, CAT.y + 2 - life * 14, '#e8e0ff');
      g.globalAlpha = 1;
    }
    L.hearts = L.hearts.filter((h) => {
      h.life -= dt; h.y -= dt * 14; h.x += Math.sin(h.life * 8) * dt * 6;
      g.globalAlpha = Math.min(1, h.life);
      for (const [i, j] of [[1, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [2, 2], [3, 2], [2, 3]]) dot(g, h.x + i, h.y + j, '#ff6f91');
      g.globalAlpha = 1;
      return h.life > 0;
    });

  },

  click(id, api) {
    const lines = {
      amber: [['Amber', 'Amber is supervising my work as usual.']],
      vinyl: [['', 'Lucy Pearl (2000). Raphael Saadiq, Dawn Robinson, Ali Shaheed Muhammad. Still in rotation.']],
      frierenfig: [['', 'A tiny Frieren, guarding the monitor. She has the patience for it.']],
      poster: [['', 'A little pink house on an island. Rent’s cheaper than Lincoln Park.']],
      mug: [['', 'C is for ciehanski. Also for coffee, number three. (It is not decaf.)']],
      shelf: [['', 'A plant, a candle, and a few small friends.']],
    };
    if (id === 'amber') {
      for (let k = 0; k < 3; k++) L.hearts.push({ x: CAT.x + 24 + k * 3, y: CAT.y + 1 - k * 4, life: 1.6 + k * 0.2 });
      api.sfx('purr');
    }
    if (id === 'top') return api.open('projects');
    const pool = lines[id];
    if (pool) api.say(...pool[Math.floor(Math.random() * pool.length)]);
  },
};
