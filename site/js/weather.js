// Rain and snow particles clipped to a scene region, plus live Chicago
// weather from Open-Meteo (free, no API key).

import { rng, dot, hdot, hrect, mix, canvas, canvasHi, hash, isHi } from './px.js';

export class Precip {
  // area: { x, y, w, h, ground?: y where rain splashes, density?: 0..1 }
  constructor(area, seed = 1) {
    this.a = area;
    const r = rng(seed);
    const n = Math.round((area.w * area.h) / 520 * (area.density ?? 1));
    this.drops = Array.from({ length: n }, () => ({
      x: r() * area.w, y: r() * area.h, v: r.range(0.75, 1.25), len: r.int(3, 6), ph: r() * 6.28,
      stop: area.ground != null ? r.range(area.ground, area.y + area.h) - area.y : area.h,
    }));
    this.splash = [];
    this.amount = 0; // eased 0..1 so weather changes fade in/out
  }

  draw(g, dt, kind, t) {
    const target = kind === 'rain' || kind === 'snow' ? 1 : 0;
    this.amount += (target - this.amount) * Math.min(1, dt * 0.8);
    if (kind !== 'rain' && kind !== 'snow') this.last = this.last || 'rain';
    else this.last = kind;
    if (this.amount < 0.01) return;
    const { x, y, w, h } = this.a;
    const count = Math.floor(this.drops.length * this.amount);
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    const fine = isHi(g);
    if (this.last === 'rain') {
      g.fillStyle = fine ? 'rgba(175,198,245,0.7)' : 'rgba(160,185,235,0.55)';
      for (let i = 0; i < count; i++) {
        const d = this.drops[i];
        d.y += dt * 190 * d.v;
        d.x -= dt * 95 * d.v; // wind: rain comes in at an angle
        if (d.y > d.stop) {
          if (this.a.ground != null && this.splash.length < 60) this.splash.push({ x: x + ((d.x % w) + w) % w, y: y + d.stop, life: 0.18 });
          d.y = (d.y % (d.stop + 8)) - 8; // wrap back to the top, even after a long frame
          d.x = Math.random() * w;
        }
        const px = x + ((d.x % w) + w) % w, py = y + d.y;
        if (fine) for (let k = 0; k < d.len * 2; k++) g.fillRect(Math.round((px + k * 0.25) * 2) / 2, Math.round((py - k * 0.5) * 2) / 2, 0.5, 0.5); // thin 1px streak
        else for (let k = 0; k < d.len; k++) g.fillRect(Math.round(px + k * 0.5), Math.round(py - k), 1, 1);
      }
      g.fillStyle = 'rgba(190,210,255,0.6)';
      this.splash = this.splash.filter((s) => {
        s.life -= dt;
        const spread = s.life > 0.09 ? 1 : 2;
        g.fillRect(s.x - spread, s.y - 1, 1, 1);
        g.fillRect(s.x + spread, s.y - 1, 1, 1);
        return s.life > 0;
      });
    } else {
      for (let i = 0; i < count; i++) {
        const d = this.drops[i];
        d.y += dt * 16 * d.v;
        d.x += Math.sin(t * 0.9 + d.ph) * dt * 7 - dt * 3;
        if (d.y > d.stop) { d.y = -2; d.x = Math.random() * w; }
        const px = x + ((d.x % w) + w) % w, py = y + d.y;
        g.fillStyle = d.len > 4 ? 'rgba(240,244,255,0.95)' : 'rgba(220,228,255,0.6)';
        g.fillRect(Math.round(px), Math.round(py), d.len > 5 ? 2 : 1, d.len > 5 ? 2 : 1);
      }
    }
    g.restore();
  }
}

// WMO weather code → our three looks.
function classify(code) {
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
  return 'clear';
}

const LABELS = {
  0: 'clear', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'fog', 48: 'fog',
  51: 'drizzle', 53: 'drizzle', 55: 'drizzle', 61: 'light rain', 63: 'rain', 65: 'heavy rain',
  66: 'freezing rain', 67: 'freezing rain', 71: 'light snow', 73: 'snow', 75: 'heavy snow',
  77: 'snow grains', 80: 'showers', 81: 'showers', 82: 'downpour', 85: 'snow showers',
  86: 'snow showers', 95: 'thunderstorm', 96: 'thunderstorm', 99: 'thunderstorm',
};

export async function chicagoWeather() {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=41.8781&longitude=-87.6298&current=temperature_2m,weather_code,cloud_cover&temperature_unit=fahrenheit&timezone=America%2FChicago';
  const res = await fetch(url);
  if (!res.ok) throw new Error('weather ' + res.status);
  const { current } = await res.json();
  return {
    kind: classify(current.weather_code),
    label: LABELS[current.weather_code] || 'weather',
    temp: Math.round(current.temperature_2m),
    cover: (current.cloud_cover ?? 20) / 100,
  };
}

// Rain on a window pane: little beads of water that catch the light, and now
// and then a drip that runs down the glass leaving a thin trail.
export function paneDrops(g, area, t, amount, seed = 3) {
  if (amount < 0.05) return;
  const put = isHi(g) ? hdot : dot, step = isHi(g) ? 0.5 : 1;
  const r = rng(seed);
  const beads = Math.round((area.w * area.h) / 90 * amount);
  for (let i = 0; i < beads; i++) {
    const x = area.x + r() * area.w, y = area.y + r() * area.h;
    put(g, x, y, 'rgba(200,218,255,0.4)');
    if (r() < 0.35) put(g, x - step, y - step, 'rgba(255,255,255,0.45)'); // glint
  }
  const drips = Math.round((area.w / 14) * amount);
  for (let k = 0; k < drips; k++) {
    const x0 = area.x + r() * area.w, period = r.range(5, 13), phase = r() * period, speed = r.range(9, 20);
    const y0 = area.y + r() * area.h * 0.5;
    const u = (t + phase) % period;
    const y = y0 + u * speed * (0.6 + 0.4 * Math.min(1, u)); // starts slow, then runs
    if (y > area.y + area.h - 1) continue;
    const x = x0 + Math.sin(y * 0.4 + k) * 0.5;
    put(g, x, y, 'rgba(230,240,255,0.85)');
    put(g, x + step, y, 'rgba(200,220,255,0.55)');
    put(g, x, y + step, 'rgba(160,190,240,0.5)');
    for (let j = 1; j < 10 && y - j * step > y0; j++) put(g, x + Math.sin((y - j) * 0.4 + k) * 0.5, y - j * step, `rgba(200,220,255,${0.4 * (1 - j / 10)})`);
  }
}

// Snow accumulation for a drawn layer: every surface with open sky above it
// (rooftops, ledges, car roofs, tree tops...) gets a thin, uneven cap. Returns
// { night, day } canvases to blend with the daylight.
export function snowCaps(src, { seed = 1, coverage = 0.85, exclude = [], minY = 1, maxY = src.height, extra } = {}) {
  const w = src.width, h = src.height;
  const d = src.getContext('2d').getImageData(0, 0, w, h).data;
  const solid = (x, y) => y >= 0 && y < h && d[(y * w + x) * 4 + 3] > 200;
  const skip = (x, y) => exclude.some((e) => x >= e.x && x < e.x + e.w && y >= e.y && y < e.y + e.h);
  const make = (top, edge) => {
    const r = rng(seed);
    const hi = !!src.hi;
    const { c, g } = hi ? canvasHi(w / 2, h / 2) : canvas(w, h);
    g.save();
    if (hi) g.setTransform(1, 0, 0, 1, 0, 0); // scan and paint in real pixels
    for (let x = 0; x < w; x++)
      for (let y = Math.max(1, minY); y < Math.min(h, maxY); y++) {
        if (!solid(x, y) || solid(x, y - 1) || skip(x, y) || r() > coverage) continue;
        dot(g, x, y, edge);                                   // the frosted top pixel
        dot(g, x, y - 1, top);                                // snow sitting on it
        if (hash(x >> 2, y) < 0.35 && !solid(x, y - 2)) dot(g, x, y - 2, top); // drifts a pixel higher here and there
        if (hi && !solid(x, y - 2)) dot(g, x, y - 2, top); // a bit thicker at 2x so it still reads
      }
    g.restore();
    if (extra) extra(g, top, edge, rng(seed + 1)); // extras are drawn in scene units
    return c;
  };
  return { night: make('#b4bcd6', '#8a93b2'), day: make('#f6f8fc', '#d6deec') };
}

// Winter on the water: from December through February the lakes and lagoons
// are drawn frozen over, with snow drifted across the ice and piled up along
// the near shore. Built once per area; returns night and day layers.
export const isFrozen = (month) => month === 11 || month <= 1;
const ICE = new Map();
export function iceSheet(y0, y1, { seed = 9, x0 = 0, x1 = 480 } = {}) {
  const key = [y0, y1, seed, x0, x1].join(':');
  if (ICE.has(key)) return ICE.get(key);
  const make = (night) => {
    const r = rng(seed), { c, g } = canvasHi(), h = y1 - y0, w = x1 - x0;
    const P = night
      ? { far: '#2a3456', near: '#3c4872', ridge: '#5a6894', ridgeSh: '#1c2240', snow: '#7682ae', snowSh: '#4e5a86', speck: '#46527c' }
      : { far: '#9cb0c6', near: '#cad8e4', ridge: '#eef4f8', ridgeSh: '#8a9cb2', snow: '#f4f8fb', snowSh: '#c2cedc', speck: '#b4c4d4' };
    for (let y = y0; y < y1; y += 0.5) hrect(g, x0, y, w, 0.5, mix(P.far, P.near, (y - y0) / h));
    for (let k = 0; k < w * h * 0.25; k++) hdot(g, x0 + r() * w, y0 + r() * h, r() < 0.5 ? P.speck : mix(P.near, P.ridge, 0.4));
    // pressure ridges: jagged seams where the ice buckled
    for (let k = 0; k < 7; k++) {
      let y = y0 + h * (0.15 + 0.8 * r()), x = x0 + r() * w;
      const len = 30 + r() * 110 * (0.4 + (y - y0) / h);
      for (let d = 0; d < len; d += 0.5) {
        if (r() < 0.12) y += r() < 0.5 ? -0.5 : 0.5;
        hdot(g, x + d, y, P.ridge); hdot(g, x + d, y + 0.5, P.ridgeSh);
      }
    }
    // snow drifts: long flat ovals, bigger and denser toward us
    for (let k = 0; k < 90; k++) {
      const u = Math.pow(r(), 0.6), y = y0 + 1 + u * (h - 2), rx = (4 + r() * 22) * (0.4 + u), ry = Math.max(0.5, rx * 0.1);
      const cx = x0 + r() * w;
      for (let j = -ry; j <= ry; j += 0.5) {
        const hw = rx * Math.sqrt(Math.max(0, 1 - (j / ry) ** 2));
        hrect(g, cx - hw, y + j, hw * 2, 0.5, j >= ry - 0.5 && ry > 0.5 ? P.snowSh : P.snow);
      }
    }
    // snow piled along the near edge, with a bumpy top
    for (let x = x0; x < x1; x += 0.5) {
      const top = y1 - 2.5 - (Math.sin(x * 0.07 + seed) + Math.sin(x * 0.23)) * 0.9 - r() * 0.5;
      hrect(g, x, top, 0.5, y1 - top, P.snow);
      hdot(g, x, y1 - 0.5, P.snowSh);
    }
    return c;
  };
  const out = { night: make(true), day: make(false) };
  ICE.set(key, out);
  return out;
}
