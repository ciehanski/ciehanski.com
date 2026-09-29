// Boats for the lake scenes.

import { W, hrect, hdot, mix } from './px.js';

// Daytime boats on the lake. A fleet is a list of
// [start x, lane y, speed (+ right), kind ('sail' | 'motor'), colour, scale];
// `count` of them are out (the scene decides by season), and they all head
// in as dusk comes on.
export function drawBoats(g, t, fleet, count, day) {
  const n = Math.min(count, fleet.length);
  const a = Math.min(1, Math.max(0, (day - 0.25) / 0.35));                         // they head in at dusk
  if (!n || a <= 0) return;
  g.globalAlpha = a;
  for (let i = 0; i < n; i++) {
    const [x0, y, v, kind, col, s = 1] = fleet[i], span = W + 60;
    const x = (((x0 + t * v) % span) + span) % span - 30, dir = Math.sign(v);
    hrect(g, x - 5 * s, y + 1, 10 * s, 0.5, 'rgba(40,90,110,0.5)');                   // shadow on the water
    if (kind === 'sail') {
      hrect(g, x - 4 * s, y - 1, 8 * s, 1, '#f2f2f0'); hrect(g, x - 3.5 * s, y, 7 * s, 0.5, '#6a7a8a');   // hull
      hrect(g, x, y - 11 * s, 0.5, 10 * s, '#c8c8c8');                                                    // mast
      for (let k = 0; k < 9 * s; k += 0.5) {
        const wMain = (k / (9 * s)) * 4.5 * s, wJib = (k / (9 * s)) * 2.5 * s;
        hrect(g, dir > 0 ? x - wMain : x + 0.5, y - 10.5 * s + k, wMain, 0.5, k > 7 * s ? mix(col, '#9aa0a8', 0.3) : col);
        if (k > 2) hrect(g, dir > 0 ? x + 0.5 : x - wJib, y - 10.5 * s + k, wJib, 0.5, mix(col, '#c8ccd4', 0.35));
      }
    } else {
      const bow = dir > 0 ? x + 4 * s : x - 4 * s;
      hrect(g, x - 4 * s, y - 1.5, 8 * s, 1.5, col); hrect(g, x - 4 * s, y - 0.5, 8 * s, 0.5, '#2a5a9a'); // hull + stripe
      hrect(g, x - 1.5 * s, y - 3, 3 * s, 1.5, '#e0e4ea'); hrect(g, x - 1 * s, y - 2.5, 2 * s, 0.5, '#3a4a5a'); // cabin, windscreen
      hdot(g, bow, y - 1, col);
      for (let k = 1; k < 5; k++) hrect(g, x - dir * (4 * s + k * 2.5), y + (k % 2) * 0.5, 2, 0.5, `rgba(255,255,255,${0.5 - k * 0.1})`); // wake
    }
  }
  g.globalAlpha = 1;
}

