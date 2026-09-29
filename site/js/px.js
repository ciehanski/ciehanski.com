// Pixel-art toolkit: every scene is drawn at a fixed low resolution and
// scaled up with nearest-neighbour filtering, so everything here works in
// whole pixels.

export const W = 480;
export const H = 270;
// The screen canvas is drawn at 2x (960x540). Scene art still uses the 480x270
// grid (each unit = 2x2 real pixels); the h* helpers below draw at half-units
// for finer detail on top.
export const S = 2;

export function canvas(w = W, h = H) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return { c, g };
}

// A canvas at S-times resolution that you draw on in logical (480x270) units.
// Draw it elsewhere with drawImage(c, x, y, c.width / S, c.height / S).
export function canvasHi(w = W, h = H) {
  const c = document.createElement('canvas');
  c.width = w * S;
  c.height = h * S;
  const g = c.getContext('2d');
  g.setTransform(S, 0, 0, S, 0, 0);
  g.imageSmoothingEnabled = false;
  c.hi = true;
  return { c, g };
}

// Draw a layer at its logical size, whether it's a 1x or a hi-res canvas.
export function blit(g, img, x = 0, y = 0) {
  if (img.hi) g.drawImage(img, x, y, img.width / S, img.height / S);
  else g.drawImage(img, x, y);
}

// True when drawing onto a hi-res surface (so half-unit detail is visible).
export const isHi = (g) => g.getTransform().a > 1;

// Deterministic PRNG (mulberry32) so scenes look the same on every visit.
export function rng(seed) {
  let s = seed | 0;
  const r = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (a, b) => a + r() * (b - a);
  r.int = (a, b) => Math.floor(a + r() * (b - a + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.chance = (p) => r() < p;
  return r;
}

// Cheap stateless hash for per-frame flicker decisions.
export function hash(a, b = 0) {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- colour

export function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function toHex([r, g, b]) {
  return '#' + ((1 << 24) | (clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).slice(1);
}

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export const darken = (c, t) => mix(c, '#000000', t);
export const lighten = (c, t) => mix(c, '#ffffff', t);

// ---------------------------------------------------------------- drawing

export function rect(g, x, y, w, h, c) {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function dot(g, x, y, c) {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), 1, 1);
}

export function hline(g, x, y, w, c) { rect(g, x, y, w, 1, c); }

// Half-unit drawing (one real pixel on the 2x screen) for fine detail.
const half = (v) => Math.round(v * 2) / 2;
export function hrect(g, x, y, w, h, c) {
  g.fillStyle = c;
  g.fillRect(half(x), half(y), half(w) || 0.5, half(h) || 0.5);
}
export function hdot(g, x, y, c) { hrect(g, x, y, 0.5, 0.5, c); }

// Draw a sprite that was authored at 2x (e.g. sprite(64, 34, ...)) so it
// covers half its pixel size in logical units: twice the detail, same footprint.
export function blitHi(g, img, x, y) {
  g.drawImage(img, Math.round(x * 2) / 2, Math.round(y * 2) / 2, img.width / S, img.height / S);
}
export function vline(g, x, y, h, c) { rect(g, x, y, 1, h, c); }

// 4x4 Bayer matrix, normalised to (0,1).
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

// Vertical gradient through a list of colours, rendered as flat bands with
// ordered dithering at each transition – the classic pixel-art sky. Each
// segment steps through `levels` dither densities (0, 1/4, 1/2, 3/4, 1).
// On a hi-res canvas the dither runs at the finer, real-pixel grid.
export function gradient(g, x, y, w, h, colors, opts = {}) {
  const k = g.getTransform().a;
  if (k !== 1) {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    gradient(g, Math.round(x * k), Math.round(y * k), Math.round(w * k), Math.round(h * k), colors, opts);
    g.restore();
    return;
  }
  const { levels = 4 } = opts;
  const img = g.getImageData(x, y, w, h);
  const d = img.data;
  const cols = colors.map(rgb);
  const n = cols.length - 1;
  for (let j = 0; j < h; j++) {
    const p = (j / Math.max(1, h - 1)) * n;
    const i = Math.min(n - 1, Math.floor(p));
    const t = Math.floor((p - i) * (levels + 1)) / levels;
    for (let k = 0; k < w; k++) {
      const c = t > bayer(x + k, y + j) ? cols[i + 1] : cols[i];
      const o = (j * w + k) * 4;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
  }
  g.putImageData(img, x, y);
}

// Fill a rect with colour b over colour a at the given density using Bayer dithering.
export function ditherRect(g, x, y, w, h, a, b, density) {
  if (a) rect(g, x, y, w, h, a);
  g.fillStyle = b;
  for (let j = 0; j < h; j++)
    for (let k = 0; k < w; k++)
      if (density > bayer(x + k, y + j)) g.fillRect(x + k, y + j, 1, 1);
}

// Soft additive light – the one non-pixel effect, it's what makes lofi scenes glow.
export function glow(g, x, y, r, color, alpha = 0.5, mode = 'lighter') {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  const [R, G, B] = rgb(color);
  grad.addColorStop(0, `rgba(${R},${G},${B},${alpha})`);
  grad.addColorStop(0.4, `rgba(${R},${G},${B},${alpha * 0.35})`);
  grad.addColorStop(1, `rgba(${R},${G},${B},0)`);
  g.save();
  g.globalCompositeOperation = mode;
  g.fillStyle = grad;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.restore();
}

// Filled pixel ellipse (no anti-aliasing).
export function ellipse(g, cx, cy, rx, ry, c) {
  g.fillStyle = c;
  for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++) {
    const k = Math.round(rx * Math.sqrt(Math.max(0, 1 - (j * j) / (ry * ry))));
    if (k > 0 || Math.abs(j) < ry) g.fillRect(Math.round(cx - k), Math.round(cy + j), k * 2 + 1, 1);
  }
}

// Build a sprite from a function (x, y) => colour|null, then outline it.
export function sprite(w, h, fn, outline) {
  const { c, g } = canvas(w, h);
  const cells = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells.push(fn(x, y));
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? null : cells[y * w + x]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = at(x, y);
      if (v) dot(g, x, y, v);
      else if (outline && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) dot(g, x, y, outline);
    }
  return c;
}

// Parse an ASCII sprite: rows of characters mapped through a palette.
export function ascii(rows, pal) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  return sprite(w, h, (x, y) => pal[rows[y][x]] || null);
}

// ---------------------------------------------------------------- 3x5 font

const GLYPHS = {
  A: '25755', B: '65656', C: '34443', D: '65556', E: '74647', F: '74644', G: '34553',
  H: '55755', I: '72227', J: '11152', K: '55655', L: '44447', M: '57755', N: '65555',
  O: '25552', P: '65644', Q: '25563', R: '65655', S: '34216', T: '72222', U: '55557',
  V: '55552', W: '55775', X: '55255', Y: '55222', Z: '71247',
  0: '75557', 1: '26227', 2: '61247', 3: '61216', 4: '55711', 5: '74616', 6: '34757',
  7: '71222', 8: '75757', 9: '75716',
  ' ': '00000', '.': '00002', '!': '22202', '-': '00700', ':': '02020', '/': '11244',
  '#': '57575', '?': '61202', "'": '22000', '&': '25272', '+': '02720',
};

export function textWidth(str) {
  return str.length * 4 - 1;
}

export function text(g, str, x, y, color) {
  g.fillStyle = color;
  let cx = Math.round(x);
  for (const ch of str.toUpperCase()) {
    const glyph = GLYPHS[ch] || GLYPHS['?'];
    for (let row = 0; row < 5; row++) {
      const bits = +glyph[row];
      for (let col = 0; col < 3; col++) if (bits & (4 >> col)) g.fillRect(cx + col, y + row, 1, 1);
    }
    cx += 4;
  }
}

// ---------------------------------------------------------------- misc

export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const fract = (v) => v - Math.floor(v);
