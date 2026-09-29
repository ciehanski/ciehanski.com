// Procedural Chicago skyline, shared by every scene. Landmarks are hand-shaped;
// the filler buildings around them are generated from a seed.

import { rect, dot, hdot, vline, hline, mix, lighten, darken, glow, rng, isHi } from './px.js';

export const NIGHT = {
  far: '#1d2140',
  farLit: '#3b3f6a',
  mid: '#161931',
  near: '#0e1024',
  lit: ['#ffd98a', '#ffd98a', '#ffc46b', '#ffe9b8', '#fff4d6', '#bcd6ff', '#9fc0ff'],
  beacon: '#ff3b3b',
};

// Lights up windows on a building face. Floors switch on as a group so the
// pattern reads as offices/apartments rather than static noise.
function windows(g, r, x, y, w, h, pal, out, { dx = 2, dy = 2, p = 0.35, cool = 0.25 } = {}) {
  // On a hi-res canvas windows are one real pixel on a grid twice as fine.
  const fine = isHi(g), k = fine ? 0.5 : 1, put = fine ? hdot : dot;
  for (let j = y + 1; j < y + h - 1; j += dy * k) {
    const floorP = r() < 0.18 ? 0 : Math.pow(r(), 1.5) * p * 2;
    for (let i = x + 1; i < x + w - 1; i += dx * k) {
      if (r() >= floorP) continue;
      const c = r() < cool ? r.pick(pal.lit.slice(-2)) : r.pick(pal.lit.slice(0, -2));
      put(g, i, j, c);
      if (r() < 0.035 * k) out.flicker.push({ x: i, y: j, c, seed: (r() * 1e6) | 0 });
    }
  }
}

function antenna(g, x, top, len, out) {
  vline(g, x, top - len, len, '#5b607a');
  dot(g, x, top - len, '#9aa0b8');
  out.beacons.push({ x, y: top - len - 1, phase: (x * 0.37) % 1 });
}

const LANDMARKS = {
  // Willis (Sears) Tower: bundled tubes ending at different heights, twin antennas.
  willis(g, r, cx, base, s, pal, out) {
    const H = Math.round(150 * s), W = Math.round(30 * s);
    const body = darken(pal.near, 0.25);
    const x = Math.round(cx - W / 2);
    const steps = [[0, W, 0.45], [0, Math.round(W * 0.8), 0.62], [Math.round(W * 0.2), Math.round(W * 0.6), 0.83], [Math.round(W * 0.2), Math.round(W * 0.4), 1]];
    for (const [ox, w, f] of steps) {
      const h = Math.round(H * f);
      rect(g, x + ox, base - h, w, h, body);
      vline(g, x + ox, base - h, h, lighten(body, 0.08));
    }
    for (const [ox, w, f] of steps) windows(g, r, x + ox, base - Math.round(H * f), w, Math.round(H * f) - 2, pal, out, { p: 0.22, dy: 2 });
    const top = base - H;
    const tx = x + Math.round(W * 0.2);
    const tw = Math.round(W * 0.4);
    antenna(g, tx + 1, top, Math.round(22 * s), out);
    antenna(g, tx + tw - 2, top, Math.round(20 * s), out);
    return { x, top, w: W };
  },

  // John Hancock Center: tapered, X-braced, bright crown, twin antennas.
  hancock(g, r, cx, base, s, pal, out) {
    const H = Math.round(112 * s), W0 = Math.round(30 * s), W1 = Math.round(19 * s);
    const body = darken(pal.near, 0.2);
    const brace = lighten(body, 0.13);
    const edge = (j) => (W0 + (W1 - W0) * (j / H)) / 2;
    for (let j = 0; j < H; j++) {
      const hw = Math.round(edge(j));
      hline(g, cx - hw, base - j, hw * 2, body);
    }
    windows(g, r, Math.round(cx - W1 / 2), base - H + 4, W1, H - 6, pal, out, { p: 0.28 });
    const segs = 5, seg = H / segs;
    for (let k = 0; k < segs; k++) {
      const y0 = k * seg, y1 = (k + 1) * seg;
      for (let t = 0; t <= 1; t += 1 / (seg * 1.5)) {
        const j = y0 + (y1 - y0) * t;
        const hw = edge(j);
        dot(g, cx - hw + 2 * hw * t, base - j, brace);
        dot(g, cx + hw - 2 * hw * t, base - j, brace);
      }
      hline(g, Math.round(cx - edge(y1)), Math.round(base - y1), Math.round(edge(y1) * 2), brace);
    }
    const hwTop = Math.round(W1 / 2);
    rect(g, cx - hwTop, base - H - 2, hwTop * 2, 3, '#dfe8ff');
    rect(g, cx - hwTop + 1, base - H - 4, hwTop * 2 - 2, 2, body);
    antenna(g, cx - Math.round(hwTop * 0.5), base - H - 4, Math.round(30 * s), out);
    antenna(g, cx + Math.round(hwTop * 0.5) - 1, base - H - 4, Math.round(30 * s), out);
    out.crowns.push({ x: cx, y: base - H - 1, r: 14 * s, c: '#cfe0ff' });
    return { x: cx - W0 / 2, top: base - H, w: W0 };
  },

  // Trump Tower: glassy setbacks and a spire.
  trump(g, r, cx, base, s, pal, out) {
    const H = Math.round(118 * s);
    const body = mix(pal.near, '#6c83b0', 0.28);
    const tiers = [[22, 0.45], [18, 0.72], [14, 0.88], [10, 1]];
    for (const [w0, f] of tiers) {
      const w = Math.round(w0 * s), h = Math.round(H * f);
      rect(g, cx - Math.round(w / 2), base - h, w, h, body);
      vline(g, cx - Math.round(w / 2), base - h, h, lighten(body, 0.15));
    }
    for (const [w0, f] of tiers) {
      const w = Math.round(w0 * s);
      windows(g, r, cx - Math.round(w / 2), base - Math.round(H * f), w, Math.round(H * f), pal, out, { p: 0.4, cool: 0.6 });
    }
    const sp = Math.round(34 * s);
    vline(g, cx, base - H - sp, sp, '#8d9ab8');
    vline(g, cx - 1, base - H - Math.round(sp * 0.4), Math.round(sp * 0.4), '#6d7898');
    out.beacons.push({ x: cx, y: base - H - sp - 1, phase: 0.5 });
    return { x: cx - 11 * s, top: base - H, w: 22 * s };
  },

  // Aon Center: white fluted slab.
  aon(g, r, cx, base, s, pal, out) {
    const H = Math.round(114 * s), W = Math.round(20 * s);
    const body = mix(pal.near, '#9aa2bd', 0.3);
    const x = cx - Math.round(W / 2);
    rect(g, x, base - H, W, H, body);
    for (let i = x + 1; i < x + W; i += 2) vline(g, i, base - H + 1, H - 1, darken(body, 0.25));
    windows(g, r, x, base - H, W, H, pal, out, { p: 0.18, dx: 2, dy: 3 });
    hline(g, x, base - H, W, lighten(body, 0.3));
    return { x, top: base - H, w: W };
  },

  // Two Prudential Plaza: chevron crown and spire, lit from below.
  twopru(g, r, cx, base, s, pal, out) {
    const H = Math.round(96 * s), W = Math.round(16 * s);
    const body = mix(pal.near, '#566691', 0.3);
    const x = cx - Math.round(W / 2);
    rect(g, x, base - H, W, H, body);
    windows(g, r, x, base - H, W, H, pal, out, { p: 0.3 });
    const peak = Math.round(14 * s);
    for (let j = 0; j < peak; j++) {
      const hw = Math.round((W / 2) * (1 - j / peak));
      hline(g, cx - hw, base - H - j, hw * 2, j % 3 === 0 ? '#bcd0ff' : body);
    }
    const sp = Math.round(18 * s);
    vline(g, cx, base - H - peak - sp, sp, '#9aa6c8');
    out.beacons.push({ x: cx, y: base - H - peak - sp - 1, phase: 0.2 });
    out.crowns.push({ x: cx, y: base - H - peak / 2, r: 10 * s, c: '#9fb8ff' });
    return { x, top: base - H, w: W };
  },

  // 311 South Wacker: the glowing white cylinder crown.
  wacker(g, r, cx, base, s, pal, out) {
    const H = Math.round(92 * s), W = Math.round(18 * s);
    const body = mix(pal.near, '#a08a78', 0.22);
    const x = cx - Math.round(W / 2);
    rect(g, x, base - H, W, H, body);
    windows(g, r, x, base - H, W, H, pal, out, { p: 0.3 });
    const cw = Math.round(12 * s), ch = Math.round(10 * s);
    rect(g, cx - Math.round(cw / 2), base - H - ch, cw, ch, '#f0f4ff');
    for (let i = 1; i < cw; i += 2) vline(g, cx - Math.round(cw / 2) + i, base - H - ch + 1, ch - 1, '#c8d4f2');
    const rw = Math.round(cw / 2);
    hline(g, cx - rw + 1, base - H - ch - 1, cw - 2, '#ffffff');
    hline(g, cx - rw + 2, base - H - ch - 2, cw - 4, '#ffffff');
    out.crowns.push({ x: cx, y: base - H - ch / 2, r: 18 * s, c: '#e8eeff' });
    return { x, top: base - H, w: W };
  },

  // St. Regis: three stacked glass frustums, each tapering toward its top and
  // shifted slightly off the one below, with lit "blow-through" floors between.
  stregis(g, r, cx, base, s, pal, out) {
    const H = Math.round(120 * s), W = Math.round(18 * s);
    const body = mix(pal.near, '#4e7098', 0.35);
    const edge = lighten(body, 0.25);
    const gap = Math.max(1, Math.round(2 * s));
    const offs = [0, 0, 0]; // stacked in line (offsets read as lopsided at this size)
    const sh = Math.round(H / 3);
    offs.forEach((o, k) => {
      const y0 = base - sh * k;          // bottom of this section
      const h = sh - (k < 2 ? gap : 0);
      for (let j = 0; j < h; j++) {
        const taper = Math.round((j / h) * 3 * s);
        const x = cx - Math.round(W / 2) + o + taper;
        const w = W - taper * 2;
        hline(g, x, y0 - j, w, body);
        dot(g, x + w - 1, y0 - j, edge);
        if (j % 2 === 0) for (let i = x + 1; i < x + w - 1; i += 2) if (r() < 0.32) dot(g, i, y0 - j, r() < 0.7 ? r.pick(pal.lit.slice(-2)) : r.pick(pal.lit.slice(0, 3)));
      }
      if (k < 2) {
        const bx = cx - Math.round(W / 2) + o + Math.round(3 * s);
        hline(g, bx, y0 - sh + 1, W - Math.round(6 * s), '#9fc0ff');
        out.crowns.push({ x: cx + o, y: y0 - sh + 1, r: 8 * s, c: '#9fc0ff' });
      }
    });
    return { x: cx - W / 2, top: base - H, w: W };
  },

  // Crain Communications (150 N Michigan): a slim tower capped by the slanted,
  // split diamond that glows white at night.
  crain(g, r, cx, base, s, pal, out) {
    const W = Math.round(14 * s), H = Math.round(62 * s);
    const body = mix(pal.near, '#6a7090', 0.25);
    const x = cx - Math.round(W / 2);
    const top = base - H;
    rect(g, x, top, W, H, body);
    vline(g, x, top, H, lighten(body, 0.15));
    windows(g, r, x, top + Math.round(W / 2), W, H - Math.round(W / 2), pal, out, { p: 0.3 });
    // the diamond: a rhombus whose top half rises above the shaft
    const half = Math.round(W / 2);
    const lit = '#e6eeff', rib = '#9fb4e8';
    for (let j = -half; j <= half; j++) {
      const w = half - Math.abs(j);
      const y = top + j;
      hline(g, cx - w, y, w * 2 + 1, j % 2 ? lit : rib);
    }
    vline(g, cx, top - half, half * 2 + 1, '#7a8cc0'); // the split down the middle
    out.crowns.push({ x: cx, y: top, r: 14 * s, c: '#dfe8ff' });
    return { x, top: top - half, w: W };
  },

  // 900 North Michigan: limestone tower crowned by four lit lantern cupolas.
  ninehundred(g, r, cx, base, s, pal, out) {
    const H = Math.round(96 * s), W = Math.round(18 * s);
    const body = mix(pal.near, '#b8a890', 0.3);
    const x = cx - Math.round(W / 2), top = base - H;
    rect(g, x, top, W, H, body); vline(g, x, top, H, lighten(body, 0.15));
    windows(g, r, x, top + 3, W, H - 3, pal, out, { p: 0.35 });
    for (const lx of [x + 1, x + W - 4]) for (const off of [0, Math.round(W / 2) - 3]) {
      const ux = lx + (off && lx > x + 1 ? -off : off);
      rect(g, ux, top - 4, 3, 4, '#ffe0a0'); rect(g, ux, top - 5, 3, 1, body);
      out.crowns.push({ x: ux + 1.5, y: top - 2, r: 5 * s, c: '#ffd890' });
    }
    return { x, top, w: W };
  },

  // Palmolive Building: art deco setbacks and the beacon mast on top.
  palmolive(g, r, cx, base, s, pal, out) {
    const H = Math.round(70 * s);
    const body = mix(pal.near, '#c8b898', 0.25);
    for (const [w0, f] of [[18, 0.62], [14, 0.8], [10, 0.92], [6, 1]]) {
      const w = Math.round(w0 * s), h = Math.round(H * f), x = cx - Math.round(w / 2);
      rect(g, x, base - h, w, h, body); vline(g, x, base - h, h, lighten(body, 0.18));
      windows(g, r, x, base - h, w, h, pal, out, { p: 0.3, dy: 3 });
    }
    const sp = Math.round(14 * s);
    vline(g, cx, base - H - sp, sp, '#8a8e9a');
    out.beacons.push({ x: cx, y: base - H - sp - 1, phase: 0.8 });
    out.crowns.push({ x: cx, y: base - H - sp, r: 9 * s, c: '#fff0c0' });
    return { x: cx - 9 * s, top: base - H, w: 18 * s };
  },

  // The Drake Hotel: low and wide, its red sign glowing on the roof.
  drake(g, r, cx, base, s, pal, out) {
    const H = Math.round(30 * s), W = Math.round(34 * s);
    const body = mix(pal.near, '#9a8a7a', 0.25);
    const x = cx - Math.round(W / 2), top = base - H;
    rect(g, x, top, W, H, body); hline(g, x, top, W, lighten(body, 0.2));
    windows(g, r, x, top + 2, W, H - 2, pal, out, { p: 0.5 });
    rect(g, cx - Math.round(8 * s), top - 3, Math.round(16 * s), 2, '#ff4a4a');
    out.crowns.push({ x: cx, y: top - 2, r: 10 * s, c: '#ff5050' });
    return { x, top, w: W };
  },

  // Lake Point Tower: dark, curving glass by Navy Pier.
  lakepoint(g, r, cx, base, s, pal, out) {
    const H = Math.round(64 * s), W = Math.round(16 * s);
    const body = mix(pal.near, '#0a0c14', 0.4);
    const x = cx - Math.round(W / 2), top = base - H;
    for (let j = 0; j < H; j++) { const inset = j < 2 ? 1 : 0; hline(g, x + inset, top + j, W - inset * 2, body); }
    for (let i = x + 2; i < x + W - 1; i += 4) vline(g, i, top + 1, H - 1, lighten(body, 0.08));   // curving facets
    windows(g, r, x, top + 4, W, H - 4, pal, out, { p: 0.18 });
    rect(g, x, top, W, 3, '#141824');
    return { x, top, w: W };
  },

  // NEMA Chicago: a white tower of stacked, shifted boxes with dark vertical recesses.
  nema(g, r, cx, base, s, pal, out) {
    const H = Math.round(104 * s), W = Math.round(16 * s);
    const body = mix(pal.near, '#c8ccd6', 0.32), recess = darken(body, 0.35);
    const shifts = [0, 0, 0, 0]; // straight: the shifted blocks read as lopsided
    const sh = Math.round(H / 4);
    shifts.forEach((o, k) => {
      const y = base - sh * (k + 1), x = cx - Math.round(W / 2) + o, w = W;
      rect(g, x, y, w, sh, body);
      vline(g, x, y, sh, lighten(body, 0.2));
      for (const f of [0.33, 0.66]) vline(g, x + Math.round(w * f), y, sh, recess);
      windows(g, r, x, y, w, sh, pal, out, { p: 0.32, cool: 0.5 });
      hline(g, x, y, w, lighten(body, 0.25));
    });
    return { x: cx - W / 2, top: base - H, w: W };
  },

  // A plain high-rise (for filling out the skyline): lm.h / lm.w, optional setback crown.
  tower(g, r, cx, base, s, pal, out, lm = {}) {
    const H = Math.round((lm.h || 60) * s), W = Math.round((lm.w || 14) * s);
    const body = mix(pal.near, lm.tint || '#5a6080', 0.22);
    const x = cx - Math.round(W / 2), top = base - H;
    rect(g, x, top, W, H, body); vline(g, x, top, H, lighten(body, 0.14));
    if (lm.crown) { const cw = Math.round(W * 0.6); rect(g, cx - Math.round(cw / 2), top - Math.round(5 * s), cw, Math.round(5 * s), body); }
    windows(g, r, x, top, W, H, pal, out, { p: 0.34 });
    return { x, top, w: W };
  },

  // Marina City: the corn cobs.
  marina(g, r, cx, base, s, pal, out) {
    const H = Math.round(44 * s), W = Math.round(10 * s);
    const body = mix(pal.near, '#7a7f95', 0.3);
    for (const off of [-Math.round(7 * s), Math.round(7 * s)]) {
      const x = cx + off - Math.round(W / 2);
      for (let j = 0; j < H; j++) {
        const bulge = j < H * 0.35 ? 0 : (j % 2 ? 1 : 0);
        hline(g, x - bulge, base - j, W + bulge * 2, body);
        if (j > H * 0.35 && j % 2 && r() < 0.6)
          for (let i = x; i < x + W; i += 2) if (r() < 0.35) dot(g, i, base - j, r.pick(pal.lit.slice(0, 4)));
      }
      hline(g, x + 1, base - H - 1, W - 2, body);
    }
    return { x: cx - 12 * s, top: base - H, w: 24 * s };
  },
};

// Draw a skyline strip. Returns animated bits (beacons, flickering windows,
// glowing crowns) for the scene to render each frame.
export function drawSkyline(g, { x0 = 0, width = 480, baseY, scale = 1, seed = 7, pal = NIGHT, landmarks = [], far = true, fillHeight = 1 }) {
  const r = rng(seed);
  const out = { beacons: [], flicker: [], crowns: [], fine: isHi(g) };
  const s = scale;

  if (far) {
    for (let x = x0; x < x0 + width; ) {
      const w = Math.max(3, Math.round(r.range(6, 16) * s));
      const h = Math.round(r.range(8, 40) * s * fillHeight);
      rect(g, x, baseY - h, w, h, pal.far);
      const k = isHi(g) ? 0.5 : 1, put = k < 1 ? hdot : dot;
      for (let j = baseY - h + 2; j < baseY; j += 2 * k)
        for (let i = x + 1; i < x + w - 1; i += 2 * k) if (r() < 0.07) put(g, i, j, pal.farLit);
      x += w + (r() < 0.3 ? 1 : 0);
    }
  }

  // Mid layer: taller toward the middle of the strip so landmarks sit in a
  // believable downtown cluster.
  for (let x = x0 - 4; x < x0 + width; ) {
    const w = Math.max(4, Math.round(r.range(8, 20) * s));
    const u = (x - x0) / width;
    const bell = 0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, Math.max(0, u)));
    const h = Math.round(r.range(14, 70) * s * bell * fillHeight);
    const kind = r();
    rect(g, x, baseY - h, w, h, pal.mid);
    if (kind < 0.18) {
      const iw = Math.round(w * 0.6);
      rect(g, x + Math.round((w - iw) / 2), baseY - h - Math.round(6 * s), iw, Math.round(6 * s), pal.mid);
    } else if (kind < 0.3) {
      vline(g, x + (w >> 1), baseY - h - Math.round(10 * s), Math.round(10 * s), pal.mid);
    } else if (kind < 0.4) {
      for (let k = 0; k < w; k++) vline(g, x + k, baseY - h - Math.round((k / w) * 5 * s), Math.round((k / w) * 5 * s), pal.mid);
    }
    windows(g, r, x, baseY - h, w, h, pal, out, { p: 0.3 });
    x += w + (r() < 0.2 ? 1 : 0);
  }

  const boxes = {};
  for (const lm of landmarks) {
    boxes[lm.type] = LANDMARKS[lm.type](g, r, Math.round(lm.x), baseY, lm.scale ?? s, pal, out, lm);
  }
  out.boxes = boxes;
  return out;
}

// Per-frame skyline animation: blinking aviation beacons, flickering windows,
// breathing crown glows.
export function animateSkyline(g, sky, t, { glowScale = 1 } = {}) {
  for (const c of sky.crowns) glow(g, c.x, c.y, c.r * glowScale, c.c, 0.18 + 0.03 * Math.sin(t * 0.8 + c.x));
  for (const f of sky.flicker) {
    const bucket = Math.floor(t / 3 + (f.seed % 97) / 13);
    const off = ((f.seed * 31 + bucket * 17) % 11) < 3;
    (sky.fine ? hdot : dot)(g, f.x, f.y, off ? '#11132a' : f.c);
  }
  for (const b of sky.beacons) {
    const on = ((t * 0.7 + b.phase) % 1) < 0.45;
    if (on) {
      dot(g, b.x, b.y, '#ff4646');
      glow(g, b.x + 0.5, b.y + 0.5, 4, '#ff2020', 0.45);
    } else dot(g, b.x, b.y, '#5a1a22');
  }
}
