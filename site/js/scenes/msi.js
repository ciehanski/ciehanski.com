// Scene: the Museum of Science and Industry from across the Columbia Basin in
// Jackson Park. The long Beaux-Arts front with its copper dome, the portico
// steps down to the water, cherry trees on the terrace, the space center dome
// off to the right, the downtown skyline far off behind the left wing, and the
// whole thing mirrored in the lagoon. Cherry branches frame the top.

import { W, H, canvasHi, blit, hrect, hdot, rng, rect, gradient, glow, mix } from '../px.js';
import { Precip, snowCaps, isFrozen, iceSheet } from '../weather.js';
import { Sky, drawLit } from '../sky.js';

const B = 164;                 // terrace top (the building stands on it)
const WATER = [174, 246];      // the lagoon
const MOON = { x: 300, y: 26 };
const DOME = { x: 240, y: 66, rx: 24, ry: 18 };
const LAMPS = [204, 276];
const REFLECT = 2;             // hi-res source rows per reflected row (squashed, so the whole dome fits in the lagoon)

const seasonOf = (m) => (m <= 2 || m === 11 ? 'bare' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'fall');

// Stone: pale limestone by day, floodlit gold by night.
const PAL = {
  day: {
    stone: '#e2d2b6', lite: '#f4e8d2', shade: '#bca684', deep: '#8e7a60', dark: '#5a5046', wall: '#cfbd9e',
    roof: '#9ab4a6', roofLite: '#b4cabe', roofShade: '#7a968a', dome: '#6aaa92', domeLite: '#9ad2ba', domeShade: '#4a8672',
    space: '#7e828c', spaceLite: '#a6aab4', spaceShade: '#5e626c', win: () => '#6a6a76', stair: '#d6c6aa',
  },
  night: {
    stone: '#b08a5e', lite: '#d2aa78', shade: '#76583c', deep: '#46342a', dark: '#241c22', wall: '#8a6c4c',
    roof: '#2a3840', roofLite: '#3a4a52', roofShade: '#1c262e', dome: '#3a7466', domeLite: '#58a08a', domeShade: '#22463e',
    space: '#242836', spaceLite: '#343a4a', spaceShade: '#181a24', win: (r) => (r() < 0.5 ? '#ffd08a' : '#3a2a26'), stair: '#9a7a56',
  },
};

// Leaves / blossoms by season (the cherry trees bloom pink in spring).
const CHERRY = {
  spring: ['#c46a8c', '#df92ae', '#f0bccd', '#fde8ef'],
  summer: ['#2c6a30', '#3e8a3c', '#58a64a', '#78c05c'],
  fall: ['#9a3a26', '#cc5e36', '#e69448', '#f0c060'],
};
const PARK = {
  spring: ['#4e8e3a', '#6aae48', '#8cc85c', '#b0de7c'],
  summer: ['#23582a', '#34783a', '#4c9446', '#6aae58'],
  fall: ['#8a5a26', '#c07a30', '#dca040', '#6a7a34'],
};
const NIGHT_TINT = '#0a0c1c';

// A night copy of a day layer: everything sinks into the blue dark.
function dim(src, amt = 0.72, [tr, tg, tb] = [10, 12, 28]) {
  const out = canvasHi();
  const g = out.c.getContext('2d');
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, src.width, src.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    d[i] += (tr - d[i]) * amt; d[i + 1] += (tg - d[i + 1]) * amt; d[i + 2] += (tb - d[i + 2]) * amt;
  }
  g.putImageData(img, 0, 0); g.restore();
  return out.c;
}

// A soft round clump of leaves, lit from the top-left.
function clump(g, cx, cy, rad, pal, r, dense = 0.9, night = false) {
  for (let y = cy - rad; y <= cy + rad; y += 0.5)
    for (let x = cx - rad; x <= cx + rad; x += 0.5) {
      const d = Math.hypot(x - cx, (y - cy) * 1.2) / rad;
      if (d > 1 || r() > dense * (1 - d * 0.35)) continue;
      const u = ((cx - x) + (cy - y)) / (rad * 2) + (r() - 0.5) * 0.5;
      const col = u > 0.3 ? pal[3] : u > 0 ? pal[2] : u > -0.3 ? pal[1] : pal[0];
      hdot(g, x, y, night ? mix(col, NIGHT_TINT, 0.72) : col);
    }
}

// A limb from a list of points, tapering.
function limb(g, pts, thick0, taper, col, hi) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const th = Math.max(1, thick0 - i * taper), n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n, y = y0 + ((y1 - y0) * k) / n;
      hrect(g, x - th / 2, y - th / 2, th, th, col);
      if (hi) hrect(g, x - th / 2, y - th / 2, th, 0.5, hi);
    }
  }
}

// ------------------------------------------------------------------ the far skyline

function skyline(g, night, r) {
  const base = night ? '#1c2236' : '#aebed2', lit = night ? '#262c44' : '#c2cfe0';
  // [x, width, top, spire]
  const towers = [[88, 6, 86], [95, 5, 76], [101, 7, 64, 'willis'], [110, 5, 80], [116, 6, 70], [124, 4, 84], [130, 7, 74, 'trump'], [139, 5, 82], [146, 6, 90], [154, 4, 94], [160, 6, 96]];
  for (const [x, w, top, kind] of towers) {
    hrect(g, x, top, w, 110 - top, base);
    hrect(g, x, top, 0.5, 110 - top, lit);
    if (kind === 'willis') { hrect(g, x + 1, top - 3, w - 2, 3, base); hrect(g, x + 1.5, top - 10, 0.5, 7, base); hrect(g, x + w - 2, top - 9, 0.5, 6, base); }
    if (kind === 'trump') { hrect(g, x + 1, top - 3, w - 2, 3, base); hrect(g, x + 3, top - 11, 0.5, 8, base); }
    if (night) for (let y = top + 1; y < 108; y += 1.5) for (let xx = x + 0.5; xx < x + w - 0.5; xx += 1) if (r() < 0.16) hdot(g, xx, y, r() < 0.7 ? '#e8c880' : '#a8c0e8');
  }
}

// ------------------------------------------------------------------ the museum

function column(g, P, x, top, bot, w) {
  hrect(g, x, top, w, bot - top, P.stone);
  hrect(g, x, top, 0.5, bot - top, P.lite);
  hrect(g, x + w - 1, top, 1, bot - top, P.shade);
  if (w >= 4) hrect(g, x + w / 2, top + 1, 0.5, bot - top - 2, mix(P.stone, P.shade, 0.5)); // fluting
  hrect(g, x - 0.5, top, w + 1, 1.5, P.lite);                                               // capital
  hdot(g, x - 0.5, top + 1, P.shade); hdot(g, x + w, top + 1, P.shade);                     // volutes
  hrect(g, x - 0.5, bot - 1.5, w + 1, 1.5, P.stone); hrect(g, x - 0.5, bot - 0.5, w + 1, 0.5, P.shade);
}

function pediment(g, P, x0, x1, base, peak, r) {
  const cx = (x0 + x1) / 2, half = (x1 - x0) / 2;
  for (let y = peak; y < base; y += 0.5) {
    const hw = ((y - peak) / (base - peak)) * half;
    hrect(g, cx - hw, y, hw * 2, 0.5, P.stone);
    hrect(g, cx - hw, y, 1, 0.5, P.lite); hrect(g, cx + hw - 1, y, 1, 0.5, P.shade);      // raking cornices
    const inner = hw - 3;
    if (y > peak + 3 && y < base - 1.5 && inner > 0) {
      hrect(g, cx - inner, y, inner * 2, 0.5, mix(P.stone, P.shade, 0.55));              // tympanum
      if (y > base - 7) for (let x = cx - inner + 1; x < cx + inner - 1; x += 0.5) if (r() < 0.22) hdot(g, x, y, r() < 0.5 ? P.lite : P.deep); // sculpture
    }
  }
  hrect(g, x0 - 1, base - 1, x1 - x0 + 2, 1.5, P.lite);                                     // horizontal cornice
}

// a wing: attic, cornice, colonnade, the dim recess and windows behind, and the roof set back
function wing(g, P, x0, x1, r) {
  const top = 104, corn = 114, ent = 117, colTop = 121, colBot = 154;
  // roof, set back behind the attic, with skylight seams
  for (let y = 96; y < top; y += 0.5) {
    const inset = (top - y) * 0.8;
    hrect(g, x0 + 4 + inset, y, x1 - x0 - 8 - inset * 2, 0.5, y < 97 ? P.roofLite : P.roof);
  }
  for (let x = x0 + 8; x < x1 - 8; x += 6) hrect(g, x, 97.5, 0.5, 6.5, P.roofShade);
  // attic with recessed panels
  hrect(g, x0, top, x1 - x0, corn - top, P.stone);
  hrect(g, x0, top, x1 - x0, 0.5, P.lite);
  for (let x = x0 + 3; x < x1 - 8; x += 9) { hrect(g, x, top + 2.5, 7, 5, P.shade); hrect(g, x + 0.5, top + 3, 6, 4, mix(P.stone, P.shade, 0.3)); }
  // cornice with dentils, frieze
  hrect(g, x0 - 1, corn, x1 - x0 + 2, 1.5, P.lite);
  for (let x = x0; x < x1; x += 1) hrect(g, x, corn + 1.5, 0.5, 1, P.shade);
  hrect(g, x0, ent, x1 - x0, colTop - ent, P.stone);
  hrect(g, x0, colTop - 0.5, x1 - x0, 0.5, P.shade);
  // recess and windows between the columns
  hrect(g, x0, colTop, x1 - x0, colBot - colTop, P.deep);
  for (let x = x0 + 4.5; x < x1 - 4; x += 7) {
    hrect(g, x, colTop + 4, 2.5, 12, P.win(r)); hrect(g, x, colTop + 20, 2.5, 9, P.win(r));
    hrect(g, x, colTop + 3.5, 2.5, 0.5, P.dark);
  }
  hrect(g, x0, colTop, x1 - x0, 1.5, P.dark);                                                // shadow under the frieze
  for (let x = x0 + 1; x < x1 - 2; x += 7) column(g, P, x, colTop, colBot, 3);
  // plinth
  hrect(g, x0 - 1, colBot, x1 - x0 + 2, 6, P.shade); hrect(g, x0 - 1, colBot, x1 - x0 + 2, 0.5, P.lite);
}

// an end pavilion: a smaller temple front
function pavilion(g, P, x0, x1, r) {
  const peak = 95, base = 106, colTop = 114, colBot = 154;
  hrect(g, x0, base, x1 - x0, colBot - base, P.stone);
  hrect(g, x0, colTop, x1 - x0, colBot - colTop, P.deep);
  hrect(g, x0 + (x1 - x0) / 2 - 3, colTop + 12, 6, colBot - colTop - 12, P.win(r));          // tall doorway
  hrect(g, x0, colTop, x1 - x0, 1.5, P.dark);
  hrect(g, x0, base, x1 - x0, 0.5, P.lite);
  hrect(g, x0, base + 5, x1 - x0, 0.5, P.shade);
  const n = 4, step = (x1 - x0 - 4) / (n - 1);
  for (let i = 0; i < n; i++) column(g, P, x0 + 0.5 + i * step, colTop, colBot, 3.5);
  pediment(g, P, x0 - 1, x1 + 1, base, peak, r);
  hrect(g, x0 - 1, colBot, x1 - x0 + 2, 6, P.shade); hrect(g, x0 - 1, colBot, x1 - x0 + 2, 0.5, P.lite);
}

function drawMuseum(g, P, r) {
  // the space center dome, off to the right and behind
  for (let y = 136; y < B; y += 0.5) {
    const hw = 34 * Math.sqrt(Math.max(0, 1 - ((y - B) / 28) ** 2));
    for (let x = 456 - hw; x < 456 + hw; x += 0.5) {
      const u = (x - 456) / Math.max(1, hw);
      hdot(g, x, y, u < -0.5 ? P.spaceLite : u < 0.4 ? P.space : P.spaceShade);
    }
  }
  hrect(g, 424, 150, 56, 0.5, P.spaceShade);

  wing(g, P, 92, 198, r);
  wing(g, P, 282, 388, r);
  pavilion(g, P, 50, 92, r);
  pavilion(g, P, 388, 430, r);

  // center block, drum and dome
  hrect(g, 194, 88, 92, 66, P.stone); hrect(g, 194, 88, 92, 0.5, P.lite);
  hrect(g, 208, 78, 64, 10, P.stone); hrect(g, 208, 78, 64, 1, P.lite); hrect(g, 208, 86.5, 64, 1.5, P.shade);
  for (let x = 210; x < 270; x += 4) hrect(g, x + 3, 79, 0.5, 7.5, P.shade);
  hrect(g, 214, DOME.y, 52, 12, P.stone); hrect(g, 213, DOME.y - 1, 54, 1.5, P.lite);
  for (let x = 216; x < 264; x += 5) { hrect(g, x, DOME.y + 3, 2, 6, P.win(r)); hrect(g, x + 3.5, DOME.y + 1, 0.5, 10, P.shade); }
  hrect(g, 262, DOME.y, 4, 12, P.shade);
  for (let y = DOME.y - DOME.ry; y < DOME.y - 1; y += 0.5) {
    const hw = DOME.rx * Math.sqrt(Math.max(0, 1 - ((y - DOME.y) / DOME.ry) ** 2));
    for (let x = DOME.x - hw; x < DOME.x + hw; x += 0.5) {
      const u = (x - DOME.x) / Math.max(1, hw);
      let c = u < -0.45 ? P.domeLite : u < 0.4 ? P.dome : P.domeShade;
      for (const rib of [-0.7, -0.38, 0, 0.38, 0.7]) if (Math.abs(u - rib) < 0.035) c = mix(c, P.domeShade, 0.6);
      hdot(g, x, y, c);
    }
  }
  hrect(g, DOME.x - DOME.rx, DOME.y - 1.5, DOME.rx * 2, 1, P.lite);
  // lantern and finial
  hrect(g, 236, 42, 8, 7, P.stone); hrect(g, 236, 42, 8, 0.5, P.lite); hrect(g, 243, 42, 1, 7, P.shade);
  for (let x = 237; x < 243; x += 2) hrect(g, x, 43.5, 1, 4, P.win(r));
  for (let y = 38; y < 42; y += 0.5) { const hw = (y - 37) * 1.2; hrect(g, 240 - hw, y, hw * 2, 0.5, P.dome); }
  hrect(g, 239.75, 34, 0.5, 4, P.deep);

  // the south portico: six big columns under the main pediment
  const colTop = 114, colBot = 154;
  hrect(g, 196, 106, 88, colTop - 106, P.stone); hrect(g, 196, 110, 88, 0.5, P.shade);
  hrect(g, 196, colTop, 88, colBot - colTop, P.deep);
  hrect(g, 234, colTop + 14, 12, colBot - colTop - 14, P.dark);                              // the big doors
  hrect(g, 234.5, colTop + 14.5, 11, 0.5, P.win(r));
  for (const x of [212, 250, 264]) hrect(g, x, colTop + 8, 5, 20, P.win(r));
  hrect(g, 214, colTop + 8, 5, 20, P.win(r));
  hrect(g, 196, colTop, 88, 2, P.dark);
  for (let i = 0; i < 6; i++) column(g, P, 199 + i * 14.6, colTop, colBot, 5);
  pediment(g, P, 194, 286, 106, 86, r);
  hrect(g, 194, colBot, 92, 4, P.shade); hrect(g, 194, colBot, 92, 0.5, P.lite);

  // the grand steps down to the water
  for (let y = colBot + 4, k = 0; y < WATER[0]; y += 1, k++) {
    const inset = Math.max(0, 8 - k * 0.8);
    hrect(g, 202 + inset, y, 76 - inset * 2, 1, k % 2 ? P.stair : P.lite);
  }
  hrect(g, 200, colBot + 4, 3, WATER[0] - colBot - 4, P.stone); hrect(g, 277, colBot + 4, 3, WATER[0] - colBot - 4, P.shade);

  // terrace balustrade and the stone embankment into the lagoon
  for (const [x0, x1] of [[0, 200], [280, W]]) {
    hrect(g, x0, B - 5, x1 - x0, 1, P.lite);
    for (let x = x0 + 0.5; x < x1; x += 1.5) hrect(g, x, B - 4, 0.5, 4, x % 12 < 1.5 ? P.stone : P.shade);
    for (let x = x0; x < x1; x += 12) hrect(g, x, B - 5, 1.5, 5, P.stone);
  }
  hrect(g, 0, B, 200, WATER[0] - B, P.wall); hrect(g, 280, B, 200, WATER[0] - B, P.wall);
  hrect(g, 0, B, 200, 0.5, P.lite); hrect(g, 280, B, 200, 0.5, P.lite);
  for (let y = B + 3; y < WATER[0]; y += 3) for (let x = (y % 6 ? 0 : 5); x < W; x += 10) if (x < 200 || x > 280) hrect(g, x, y, 0.5, 3, P.shade);
  for (let y = B + 3; y < WATER[0]; y += 3) { hrect(g, 0, y, 200, 0.5, P.shade); hrect(g, 280, y, 200, 0.5, P.shade); }
  hrect(g, 0, WATER[0] - 1.5, W, 1.5, P.deep);                                               // wet stone at the waterline

  // a few people out on the terrace and the steps
  const folks = [[186, B - 1, '#c8584a'], [192, B - 1, '#4a6a9a'], [226, colBot + 9, '#e8c040'], [231, colBot + 9, '#6a4a8a'], [258, colBot + 12, '#3a8a6a'], [296, B - 1, '#d88aa0'], [340, B - 1, '#4a4a5a']];
  for (const [x, y, c] of folks) {
    const cc = P === PAL.night ? mix(c, NIGHT_TINT, 0.55) : c;
    hrect(g, x, y - 4, 1.5, 2.5, cc); hrect(g, x, y - 1.5, 1.5, 1.5, P === PAL.night ? '#1a1820' : '#3a3440');
    hrect(g, x + 0.25, y - 5.5, 1, 1.5, P === PAL.night ? '#6a5040' : '#e0b090');
  }
  // lampposts by the steps
  for (const x of LAMPS) {
    hrect(g, x, 140, 1, B - 140, '#26262e'); hrect(g, x - 1, B - 2, 3, 2, '#26262e');
    hrect(g, x - 1.5, 136, 4, 4, '#26262e'); hrect(g, x - 1, 136.5, 3, 3, P === PAL.night ? '#ffe6a8' : '#dcd6c6');
    hrect(g, x - 2, 135.5, 5, 1, '#26262e');
  }
}

// ------------------------------------------------------------------ seasonal layers

// Branch skeletons for the cherry limbs framing the top of the view.
const FRAME = [
  { pts: [[-4, 84], [12, 64], [34, 46], [60, 32], [92, 22], [126, 16]], th: 6 },
  { pts: [[34, 46], [40, 24], [30, 6], [20, -4]], th: 3.5 },
  { pts: [[60, 32], [82, 36], [104, 44]], th: 2.5 },
  { pts: [[-2, 22], [22, 14], [52, 6], [84, -2]], th: 3.5 },
  { pts: [[484, 96], [462, 70], [440, 50], [410, 32], [378, 22], [350, 18]], th: 6 },
  { pts: [[440, 50], [430, 64], [416, 74]], th: 2.5 },
  { pts: [[462, 70], [470, 42], [476, 10]], th: 3 },
  { pts: [[482, 26], [452, 12], [422, 4], [396, -2]], th: 3.5 },
];
const TERRACE = [70, 112, 150, 182, 298, 330, 368, 410];

function buildSeason(season, bldNight, bldDay) {
  const r = rng(season.length * 97 + 5);
  const back = canvasHi(), front = canvasHi(), frame = canvasHi();
  const cherry = CHERRY[season], park = PARK[season];

  // park trees at the sides, behind the museum
  const trees = [[8, 124, 22], [30, 110, 18], [-6, 146, 20], [44, 138, 12], [446, 128, 20], [468, 112, 22], [488, 140, 18], [182, 132, 10], [298, 134, 10]];
  for (const [cx, cy, rad] of trees) {
    limb(back.g, [[cx, B], [cx + 1, cy + rad * 0.2], [cx - 2, cy - rad * 0.3]], 3, 0.8, '#3a2e28');
    if (park) clump(back.g, cx, cy, rad, park, r, 0.95);
    else for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.4; limb(back.g, [[cx, cy + 4], [cx + Math.cos(a) * rad * 0.6, cy + Math.sin(a) * rad * 0.6], [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]], 1.5, 0.5, '#4a3e38'); }
  }
  // cherry trees along the terrace
  for (const x of TERRACE) {
    limb(front.g, [[x, B - 1], [x, B - 8], [x - 3, B - 13]], 1.5, 0.3, '#4a3428');
    limb(front.g, [[x, B - 8], [x + 4, B - 14]], 1, 0.2, '#4a3428');
    if (cherry) { clump(front.g, x, B - 15, 7, cherry, r, season === 'spring' ? 0.98 : 0.9); clump(front.g, x + 4, B - 12, 5, cherry, r, 0.9); }
    else for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.2; limb(front.g, [[x, B - 10], [x + Math.cos(a) * 7, B - 10 + Math.sin(a) * 7]], 0.8, 0.2, '#5a4a40'); }
  }
  // lily pads on the right of the lagoon (not in winter)
  if (season !== 'bare')
    for (let k = 0; k < 26; k++) {
      const x = 330 + r() * 150, y = 226 + r() * 18, rx = 2 + r() * 3;
      for (let j = -1; j <= 1; j += 0.5) hrect(front.g, x - rx * Math.sqrt(1 - j * j), y + j * 0.8, rx * 2 * Math.sqrt(1 - j * j), 0.5, j < 0 ? '#6a9a4a' : '#4a7a3a');
      hrect(front.g, x, y - 0.5, 0.5, 1, '#2a4a2a');
      if (season === 'summer' && r() < 0.25) { hdot(front.g, x - 0.5, y - 1, '#f6e8f0'); hdot(front.g, x, y - 1.5, '#f0a8c0'); }
    }

  // the cherry limbs framing the top
  const bark = canvasHi();
  for (const { pts, th } of FRAME) limb(bark.g, pts, th, th * 0.16, '#3a2a24', '#5a4034');
  if (cherry) {
    for (const { pts } of FRAME)
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 11);
        for (let k = 0; k < n; k++) {
          const u = (k + r()) / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
          if (y > 76) continue;
          clump(frame.g, x + (r() - 0.5) * 14, y + (r() - 0.3) * 12, 6 + r() * 7, cherry, r, season === 'spring' ? 0.8 : 0.9);
        }
      }
    if (season === 'spring') for (let k = 0; k < 160; k++) {                      // loose petals and blossom bits hanging off the clumps
      const f = FRAME[Math.floor(r() * FRAME.length)].pts, p = f[Math.floor(r() * f.length)];
      hdot(frame.g, p[0] + (r() - 0.5) * 30, p[1] + r() * 16, r() < 0.5 ? cherry[3] : cherry[2]);
    }
  }

  // composite what the water mirrors: the background, the museum and the terrace trees
  const mirror = (bld, night) => {
    const c = canvasHi();
    c.g.drawImage(night ? dim(back.c) : back.c, 0, 0, W, H);
    c.g.drawImage(bld, 0, 0, W, H);
    c.g.drawImage(night ? dim(front.c) : front.c, 0, 0, W, H);
    return reflect(c.c, night ? '12,16,48' : '60,120,150', night ? 0.5 : 0.38);
  };
  return {
    back: back.c, backNight: dim(back.c), front: front.c, frontNight: dim(front.c),
    bark: bark.c, barkNight: dim(bark.c, 0.8), frame: frame.c, frameNight: dim(frame.c),
    refl: mirror(bldDay, false), reflNight: mirror(bldNight, true),
    snow: snowCaps(bark.c, { seed: 21, coverage: 0.8 }),
  };
}

// The lagoon's mirror image of everything above the waterline.
function reflect(src, tint, alpha) {
  const h = WATER[1] - WATER[0], out = canvasHi(W, h);
  for (let jd = 0; jd < h * 2; jd++) {
    const sy = WATER[0] * 2 - 1 - Math.floor(jd * REFLECT);
    if (sy < 0) break;
    out.g.drawImage(src, 0, sy, W * 2, 1, 0, jd / 2, W, 0.5);
  }
  out.g.save(); out.g.globalCompositeOperation = 'source-atop';
  out.g.fillStyle = `rgba(${tint},${alpha})`; out.g.fillRect(0, 0, W, h); out.g.restore();
  return out.c;
}

// ------------------------------------------------------------------ build

let L;

function build() {
  const sky = new Sky({
    x: 0, y: 0, w: W, h: WATER[0] + 2, horizon: 150, seed: 77, stars: 120,
    moon: { x: MOON.x, y: MOON.y, r: 7, crescent: true }, cloudBand: [6, 80],
  });

  const far = canvasHi(), farNight = canvasHi();
  skyline(far.g, false, rng(3)); skyline(farNight.g, true, rng(3));

  const bld = canvasHi(), bldNight = canvasHi();
  drawMuseum(bld.g, PAL.day, rng(8));
  drawMuseum(bldNight.g, PAL.night, rng(8));

  // water: the lagoon's own colour under the reflection
  const h = WATER[1] - WATER[0];
  const water = canvasHi(), waterDay = canvasHi();
  gradient(water.g, 0, WATER[0], W, h, ['#10163a', '#0a0e2c']);
  gradient(waterDay.g, 0, WATER[0], W, h, ['#5aa0c4', '#3a7ea6']);

  // the near bank: grass, dry stalks, reeds and cattails
  const fg = canvasHi(), f = fg.g, r = rng(41);
  const edge = (x) => WATER[1] - 2 + Math.sin(x * 0.05) * 1.5 + Math.sin(x * 0.17) * 0.8;
  for (let x = 0; x < W; x += 0.5) {
    const e = edge(x);
    hrect(f, x, e, 0.5, H - e, '#3e5e2e');
    hrect(f, x, e, 0.5, 1, '#6a8a44');
  }
  for (let k = 0; k < 2600; k++) {
    const x = r() * W, e = edge(x), y = e + r() * (H - e), l = 1 + r() * 3;
    hrect(f, x, y - l, 0.5, l, r() < 0.35 ? '#b8a068' : r() < 0.5 ? '#5e8040' : '#2c4a22');
  }
  const reeds = (x0, x1, n) => {
    for (let k = 0; k < n; k++) {
      const x = x0 + r() * (x1 - x0), top = WATER[1] - 16 - r() * 22, lean = (r() - 0.5) * 4, col = r() < 0.5 ? '#8a8a4a' : '#b0a060';
      for (let y = top; y < WATER[1] + 2; y += 0.5) hdot(f, x + lean * (1 - (y - top) / (WATER[1] + 2 - top)), y, col);
      if (r() < 0.35) { hrect(f, x + lean - 0.25, top + 1, 1, 4, '#5a3a22'); hrect(f, x + lean, top - 1, 0.5, 2, col); }
    }
  };
  reeds(0, 70, 60); reeds(410, W, 50); reeds(150, 170, 8);
  for (let k = 0; k < 40; k++) {                                                   // a few tall dry stalks, like the photo
    const x = r() < 0.5 ? r() * 90 : W - r() * 90, e = edge(x), top = e - 4 - r() * 10, col = '#c8b07a';
    hrect(f, x, top, 0.5, e - top + 4, col);
    if (r() < 0.5) hrect(f, x - 1, top, 2, 0.5, col);
  }

  L = {
    sky, far: far.c, farNight: farNight.c, bld: bld.c, bldNight: bldNight.c,
    water: water.c, waterDay: waterDay.c, fg: fg.c, fgNight: dim(fg.c, 0.7), season: {},
    fgBare: dim(fg.c, 0.45, [150, 128, 84]),
    precip: new Precip({ x: 0, y: 0, w: W, h: H, ground: 262 }, 71),
    snowBld: snowCaps(bldNight.c, { seed: 17, coverage: 0.8, maxY: B * 2 }), snowFg: snowCaps(fg.c, { seed: 19, coverage: 0.7 }), snowCover: 0,
  };
}

export default {
  id: 'msi',
  focus: 0.5,
  name: 'Museum of Science & Industry',
  blurb: 'Across the lagoon in Jackson Park',
  ambience: { waves: 0.15, city: 0.12, rain: 1 },

  hotspots: [],

  build() { if (!L) build(); },

  draw(g, t, dt, env) {
    if (!L) build();
    const day = env.sky.daylight, night = 1 - day, month = env.sky.month ?? 6;
    const season = seasonOf(month);
    if (!L.season[season]) L.season[season] = buildSeason(season, L.bldNight, L.bld);
    const S = L.season[season];

    L.sky.draw(g, t, dt, env);
    drawLit(g, L.farNight, L.far, day);
    if (night > 0.3) for (const [x, y, p] of [[102.5, 54, 0], [106.5, 55, 0.5], [133, 53, 1.1]])       // aviation beacons
      if (Math.sin(t * 2.2 + p) > 0.3) hdot(g, x, y, `rgba(255,70,60,${night})`);
    drawLit(g, S.backNight, S.back, day);
    drawLit(g, L.bldNight, L.bld, day);
    drawLit(g, S.frontNight, S.front, day);

    // floodlights on the facade at night
    if (night > 0.05) {
      for (const x of [53, 110, 160, 240, 320, 370, 427]) glow(g, x, 146, 30, '#ffc070', 0.14 * night);
      glow(g, DOME.x, DOME.y - 6, 30, '#9ae0c8', 0.1 * night);
      for (const x of LAMPS) glow(g, x + 0.5, 138, 16, '#ffd890', 0.45 * night);
    }

    // the lagoon: its colour, the mirrored museum with a slow ripple, a shimmer line along the embankment
    const ice = isFrozen(month);
    drawLit(g, L.water, L.waterDay, day);
    const h = WATER[1] - WATER[0];
    for (let jd = 0; jd < h * 2; jd++) {
      const j = jd / 2, amp = ice ? 0 : 0.4 + j * 0.02;
      const wob = Math.round(Math.sin(j * 0.5 + t * 0.8) * amp * 2) / 2;
      g.drawImage(S.reflNight, 0, jd, W * 2, 1, wob, WATER[0] + j, W, 0.5);
      if (day > 0.01) { g.globalAlpha = day; g.drawImage(S.refl, 0, jd, W * 2, 1, wob, WATER[0] + j, W, 0.5); g.globalAlpha = 1; }
    }
    if (night > 0.05) for (const x of [53, 110, 160, 240, 320, 370, 427]) glow(g, x, WATER[0] + 16, 26, '#ffc070', 0.07 * night);
    if (ice) {                                                                        // frozen over, snow drifted across
      const sheet = iceSheet(WATER[0], WATER[1], { seed: 12 }); drawLit(g, sheet.night, sheet.day, day);
    } else {
      hrect(g, 0, WATER[0], W, 0.5, `rgba(220,235,255,${0.15 + 0.15 * day})`);
      for (let k = 0; k < 18; k++) {
        const y = WATER[0] + 3 + ((k * 13) % (h - 8)), len = 8 + ((k * 29) % 24);
        const x = ((k * 83 + t * (2 + (k % 3))) % (W + len)) - len;
        hrect(g, x, y, len, 0.5, `rgba(255,248,230,${0.08 + 0.08 * (k % 2)})`);
      }
      // a pair of ducks paddling across
      for (const [off, y, speed] of [[0, 214, 3.2], [9, 216, 3.2], [260, 232, 2.4]]) {
        const x = ((t * speed + off) % (W + 60)) - 30;
        const body = mix('#7a5a3a', NIGHT_TINT, night * 0.7), head = mix('#2a6a3a', NIGHT_TINT, night * 0.7);
        hrect(g, x - 5, y + 1.5, 4, 0.5, `rgba(255,255,255,${0.2 + 0.15 * day})`);    // wake
        hrect(g, x - 1, y - 1, 4, 2, body); hrect(g, x - 1, y - 1, 4, 0.5, mix(body, '#ffffff', 0.15));
        hrect(g, x + 2.5, y - 2.5, 1.5, 1.5, head); hdot(g, x + 4, y - 2, mix('#e0a030', NIGHT_TINT, night * 0.6));
      }
    }

    if (season === 'bare' && !L.fgBareNight) L.fgBareNight = dim(L.fgBare, 0.7);
    if (season === 'bare') drawLit(g, L.fgBareNight, L.fgBare, day);           // winter: the grass goes straw-brown
    else drawLit(g, L.fgNight, L.fg, day);
    drawLit(g, S.barkNight, S.bark, day);
    const sway = Math.round(Math.sin(t * 0.6) * 2) / 2;
    g.save(); g.translate(sway, 0); drawLit(g, S.frameNight, S.frame, day); g.restore();

    const snowing = env.weather === 'snow';
    L.snowCover += ((snowing ? 1 : 0) - L.snowCover) * Math.min(1, dt * (snowing ? 0.25 : 0.6));
    if (L.snowCover > 0.01) {
      for (const sn of [L.snowBld, L.snowFg, S.snow]) {
        g.globalAlpha = L.snowCover; blit(g, sn.night);
        g.globalAlpha = L.snowCover * day; blit(g, sn.day);
      }
      g.globalAlpha = 1;
    }
    L.precip.draw(g, dt, env.weather, t);
  },

  click() {},
};
