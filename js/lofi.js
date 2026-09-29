// ciehanski radio: six composed themes (one written for each scene), Animal Crossing style.
// Each theme is written out (key, tempo, chord changes, groove, arrangement)
// with a melody built from a two-bar motif that's sequenced over the changes,
// then played live with Web Audio synth instruments. Each plays through as a
// finished song, then the player moves on to the next. Nothing is sampled or recorded.
//
// A SongPlayer behaves enough like an <audio> element (play/pause/currentTime/
// duration/volume + 'playing'/'pause' events) to slot into the player.

// ------------------------------------------------------------------ the songs

// Chord qualities: intervals above the root.
const Q = {
  maj7: [0, 4, 7, 11], maj9: [0, 4, 7, 11, 14], '6': [0, 4, 7, 9], '69': [0, 4, 7, 9, 14], add9: [0, 4, 7, 14],
  m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14], m11: [0, 3, 7, 10, 17],
  '7': [0, 4, 7, 10], '9': [0, 4, 7, 10, 14], '13': [0, 4, 10, 14, 21], '7sus': [0, 5, 7, 10, 14], '7b9': [0, 4, 7, 10, 13],
};
// A progression is a list of [semitones above the key, quality, beats].
const ROYAL = [[5, 'maj9', 4], [7, '13', 4], [4, 'm7', 4], [9, 'm9', 4], [2, 'm9', 4], [7, '7sus', 4], [0, 'maj9', 4], [0, '9', 4]];

export const SONGS = {
  desk: {
    title: 'greenhouse morning', key: 1, bpm: 78, swing: 0.16,
    A: ROYAL,
    B: [[9, 'm9', 4], [4, 'm7', 4], [5, 'maj9', 4], [0, 'maj9', 4], [2, 'm9', 4], [4, 'm7', 4], [5, 'maj9', 4], [7, '13', 4]],
    drums: 'halftime', soft: true, bass: 'fingered', comp: 'ep', lead: 'saw', leadB: 'vibes', solo: 'wurli', pad: true,
    keys: 'wurli', bassTone: 'moog', kit: 'dusty', dark: true, vinyl: 0.7, gain: 0.85,
    motif: [[0, 2, 4], [6, 1, 2], [8, 0, 4], [12, -1, 4], [16, 0, 6], [24, -2, 2], [26, -1, 6]],
    motifB: [[2, 4, 2], [4, 3, 2], [6, 2, 6], [14, 1, 2], [16, 2, 4], [22, 4, 2], [24, 3, 8]],
  },
  lakefront: {
    title: 'olive park sundown', key: 4, bpm: 112, swing: 0, modulate: 2,
    A: [[0, 'maj9', 4], [4, 'm7', 4], [9, 'm9', 4], [5, 'maj9', 4], [2, 'm9', 4], [7, '7sus', 4], [4, 'm7', 2], [9, '7', 2], [2, 'm9', 2], [7, '13', 2]],
    B: [[5, 'maj9', 4], [7, '13', 4], [4, 'm7', 4], [9, 'm9', 4], [5, 'maj9', 4], [7, '13', 4], [0, 'maj9', 8]],
    drums: 'disco', tamb: true, bass: 'slap', comp: 'guitar', comp2: 'ep', lead: 'sax', bright: true, leadB: 'dx', solo: 'sax', pad: true,
    keys: 'dx', kit: '80s', chorus: true, vinyl: 0.15,
    motif: [[0, 4, 2], [2, 3, 2], [4, 2, 4], [10, 0, 2], [12, 2, 6], [20, 1, 2], [22, 2, 2], [24, 4, 8]],
    motifB: [[0, 0, 2], [3, 2, 2], [6, 4, 4], [12, 5, 2], [14, 4, 2], [16, 2, 6], [26, 1, 6]],
  },
  lincoln: {
    // a Sunday ride on the Brown Line: coffee-shop city pop, felt piano, a train-chug shaker
    title: 'brown line bounce', key: 5, bpm: 94, swing: 0.22,
    A: [[0, 'maj9', 4], [4, 'm7', 2], [9, '7', 2], [2, 'm9', 4], [7, 'm9', 2], [0, '13', 2], [5, 'maj9', 4], [5, 'm7', 2], [10, '9', 2], [4, 'm7', 2], [9, '7b9', 2], [2, 'm9', 2], [7, '13', 2]],
    B: [[10, 'maj9', 4], [9, 'm7', 4], [2, 'm9', 4], [0, 'maj9', 4], [10, 'maj9', 4], [9, 'm7', 2], [2, '7', 2], [7, 'm9', 4], [7, '7sus', 4]],
    drums: 'train', bass: 'fingered', comp: 'ep', comp2: 'guitar', lead: 'citylead', leadB: 'vibes', solo: 'ep', pad: true,
    keys: 'piano', bassTone: 'upright', kit: 'brush', vinyl: 0.4, gain: 1.35,
    motif: [[0, 4, 2], [2, 2, 2], [4, 1, 2], [6, 2, 6], [16, 4, 2], [18, 5, 2], [20, 4, 2], [22, 2, 8]],
    motifB: [[0, 2, 6], [6, 1, 2], [8, 0, 4], [16, 4, 2], [18, 2, 2], [20, 1, 4], [24, 2, 8]],
  },
  fullerton: {
    title: 'fullerton sun', key: 9, bpm: 96, swing: 0,
    A: [[0, 'maj9', 4], [5, 'maj9', 4], [2, 'm9', 4], [7, '9', 4], [4, 'm7', 4], [9, '7b9', 4], [2, 'm9', 4], [7, '13', 4]],
    B: [[5, 'maj9', 4], [4, 'm7', 4], [2, 'm9', 4], [0, 'maj9', 4], [5, 'maj9', 4], [4, 'm7', 4], [2, 'm9', 4], [7, '7sus', 4]],
    drums: 'bossa', bass: 'bossa', comp: 'nylon', lead: 'steelpan', leadB: 'kalimba', solo: 'steelpan', glock: true,
    keys: 'ep', bassTone: 'upright', kit: 'perc', vinyl: 0.25, gain: 1.35,
    motif: [[0, 4, 3], [3, 2, 3], [6, 0, 2], [8, 2, 6], [16, 1, 3], [19, 0, 3], [22, -1, 2], [24, 0, 8]],
    motifB: [[0, 2, 6], [6, 4, 2], [8, 5, 6], [16, 4, 3], [19, 2, 3], [22, 1, 2], [24, 2, 8]],
  },
  conservatory: {
    title: 'git push --force', key: 7, bpm: 84, swing: 0.2,
    A: [[0, 'maj7', 4], [5, 'maj7', 4], [4, 'm7', 4], [9, 'm7', 4], [2, 'm7', 4], [7, '7sus', 4], [0, '6', 4], [7, '7', 4]],
    B: [[5, 'maj9', 4], [7, '13', 4], [4, 'm7', 4], [9, 'm9', 4], [2, 'm9', 4], [7, '13', 4], [0, 'add9', 8]],
    drums: 'light', bass: 'fingered', soft: true, comp: 'arp', lead: 'flute', leadB: 'ocarina', solo: 'musicbox', pad: true,
    keys: 'harp', kit: 'perc', triangle: true, verbSize: 3, vinyl: 0.2,
    motif: [[0, 0, 2], [2, 1, 2], [4, 2, 2], [6, 4, 6], [16, 3, 2], [18, 2, 2], [20, 1, 4], [24, 2, 8]],
    motifB: [[0, 4, 8], [8, 5, 4], [12, 4, 4], [16, 2, 8], [24, 1, 4], [28, 0, 4]],
  },
  olive: {
    title: 'lake shore drive', key: 7, bpm: 88, swing: 0.24, minor: true,
    A: [[0, 'm9', 4], [5, 'm9', 4], [10, '13', 4], [3, 'maj9', 4], [8, 'maj9', 4], [2, 'm7', 2], [7, '7b9', 2], [0, 'm9', 4], [7, '7b9', 4]],
    B: [[8, 'maj9', 4], [7, 'm7', 4], [5, 'm9', 4], [10, '13', 4], [3, 'maj9', 4], [8, 'maj9', 4], [2, 'm7', 4], [7, '7b9', 4]],
    drums: 'boombap', bass: 'fingered', comp: 'ep', comp2: 'rhodes', lead: 'trumpet', leadB: 'vibes', solo: 'guitar',
    keys: 'organ', bassTone: 'moog', kit: 'dusty', vinyl: 0.55, gain: 0.85,
    motif: [[0, 2, 2], [2, 4, 2], [4, 5, 4], [8, 4, 2], [10, 2, 6], [18, 0, 2], [20, 1, 2], [22, 2, 10]],
    motifB: [[0, 7, 4], [4, 6, 2], [6, 4, 2], [8, 2, 8], [18, 4, 2], [20, 3, 2], [22, 2, 10]],
  },
};

const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

// One playlist entry per scene theme, in the scene order given.
export function sceneThemes(order) {
  return order.filter((id) => SONGS[id]).map((id) => ({
    title: SONGS[id].title, artist: `${NAMES[SONGS[id].key]} ${SONGS[id].minor ? 'minor' : 'major'} · ${SONGS[id].bpm} bpm`, scene: id, gen: { song: id },
  }));
}

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const SCALE = [0, 2, 4, 5, 7, 9, 11], DORIAN = [0, 2, 3, 5, 7, 9, 10];

// ------------------------------------------------------------------ the player

export class SongPlayer extends EventTarget {
  constructor(gen, volume = 0.6, { ctx } = {}) {
    super();
    this.s = SONGS[gen.song];
    this.injected = ctx || null;
    this.vol = volume;
    this.ctx = null;
    this.started = false;
    this.paused = true;
    this.bar = (60 / this.s.bpm) * 4;
    // form: a short intro once, then on loop: A, A' (more layers), B (new motif), a solo,
    // a breakdown with the drums out, a last A (up a key in some themes), a turnaround
    this.intro = 4;
    this.form = [['A', 8], ['A2', 8], ['B', 8], ['solo', 8], ['break', 4], ['A3', 8], ['turn', 2]];
    this.loopBars = this.form.reduce((a, f) => a + f[1], 0);
    this.endBars = 2;                                          // a final chord that rings out
    this.duration = (this.intro + this.loopBars + this.endBars) * this.bar;   // the whole song, once through
    this.seed = [...gen.song].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 2147483646 + 1; // repeatable per theme
  }

  rand() { this.seed = (this.seed * 16807) % 2147483647; return (this.seed - 1) / 2147483646; }

  get currentTime() {
    if (!this.ctx || !this.started) return 0;
    return Math.max(0, Math.min(this.duration, this.ctx.currentTime - this.t0));
  }
  set currentTime(_) { /* no seeking */ }
  get volume() { return this.vol; }
  set volume(v) { this.vol = v; if (this.out && !this.injected) this.out.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }

  #setup() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = (this.ctx = this.injected || new AC({ latencyHint: 'playback' }));
    // a touch of overall lift (+~3 dB), with a brickwall-ish limiter so loud spots never clip
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -2; limit.knee.value = 0; limit.ratio.value = 20; limit.attack.value = 0.003; limit.release.value = 0.12;
    limit.connect(ctx.destination);
    this.trim = ctx.createGain(); this.trim.gain.value = (this.s.gain ?? 1) * 1.4; this.trim.connect(limit);
    this.out = ctx.createGain(); this.out.gain.value = this.vol; this.out.connect(this.trim);
    // master: low cut (no mud) -> gentle warmth lowpass -> glue compressor
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 2.5; comp.attack.value = 0.015; comp.release.value = 0.25;
    comp.connect(this.out);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = this.#toneHz(); lp.Q.value = 0.3;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 38;
    hp.connect(lp); lp.connect(comp);
    this.lofi = lp;
    // light tape wobble
    const wob = ctx.createDelay(0.05); wob.delayTime.value = 0.01;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.3;
    const depth = ctx.createGain(); depth.gain.value = 0.0004;
    lfo.connect(depth); depth.connect(wob.delayTime); lfo.start();
    wob.connect(hp);
    this.bus = ctx.createGain(); this.bus.gain.value = 0.62; this.bus.connect(wob);
    this.drums = ctx.createGain(); this.drums.gain.value = this.s.soft ? 0.55 : 0.7; this.drums.connect(this.bus);
    // room reverb
    const len = Math.floor(ctx.sampleRate * (this.s.verbSize || 1.6)), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; }
    this.verb = ctx.createConvolver(); this.verb.buffer = ir;
    const vg = ctx.createGain(); vg.gain.value = 0.26; this.verb.connect(vg); vg.connect(this.bus);
    const nlen = ctx.sampleRate; this.noise = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = this.noise.getChannelData(0); for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;
    this.plucks = new Map();
    this.kbus = null;
    // a whisper of vinyl
    const vl = ctx.sampleRate * 3, vb = ctx.createBuffer(1, vl, ctx.sampleRate), vd = vb.getChannelData(0);
    for (let i = 0; i < vl; i++) { vd[i] = (Math.random() * 2 - 1) * 0.006; if (Math.random() < 0.0001) vd[i] += (Math.random() - 0.5) * 0.4; }
    const vs = ctx.createBufferSource(); vs.buffer = vb; vs.loop = true;
    const vh = ctx.createBiquadFilter(); vh.type = 'highpass'; vh.frequency.value = 1500;
    const vgain = ctx.createGain(); vgain.gain.value = this.s.vinyl ?? 0.35;
    vs.connect(vh); vh.connect(vgain); vgain.connect(this.out); vs.start();
  }

  #toneHz() { return this.s.bright ? 9000 : this.s.dark ? 4800 : 7000; }

  // the keys go through their own bus (with a gentle chorus for the 80s themes)
  #keysBus() {
    if (this.kbus) return this.kbus;
    const ctx = this.ctx, g = ctx.createGain(); g.connect(this.bus); g.connect(this.verb);
    if (this.s.chorus) {
      const d = ctx.createDelay(0.05), lfo = ctx.createOscillator(), dep = ctx.createGain(), wet = ctx.createGain();
      d.delayTime.value = 0.018; lfo.frequency.value = 0.8; dep.gain.value = 0.004; wet.gain.value = 0.6;
      lfo.connect(dep); dep.connect(d.delayTime); lfo.start();
      g.connect(d); d.connect(wet); wet.connect(this.bus);
    }
    return (this.kbus = g);
  }

  // ---------------------------------------------------------------- instruments

  #env(g, t, peak, a, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  #osc(type, f, t, end, dest) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.connect(dest); o.start(t); o.stop(end); return o; }
  #panTo(v, sendVerb = true) {
    const p = this.ctx.createStereoPanner(); p.pan.value = v; p.connect(this.bus); if (sendVerb) p.connect(this.verb); return p;
  }

  // electric piano: FM tine + body, bright for city pop
  #ep(m, t, dur, vel, pan = -0.1) {
    const ctx = this.ctx, f = mtof(m), out = ctx.createGain(), lp = ctx.createBiquadFilter(), mg = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = this.s.bright ? 4200 : 3000;
    const end = t + dur + 1.2;
    const car = this.#osc('sine', f, t, end, lp), mod = ctx.createOscillator();
    mod.frequency.value = f; mg.gain.setValueAtTime(f * 1.1 * vel, t); mg.gain.exponentialRampToValueAtTime(f * 0.04, t + 0.3);
    mod.connect(mg); mg.connect(car.frequency); mod.start(t); mod.stop(end);
    this.#osc('sine', f * 1.003, t, end, lp);
    this.#env(out, t, 0.07 * vel, 0.006, dur + 1);
    lp.connect(out); out.connect(this.#panTo(pan));
  }
  // felt piano
  #piano(m, t, dur, vel, det = 1, bright = 2200) {
    const ctx = this.ctx, f = mtof(m) * det, lp = ctx.createBiquadFilter(), out = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = bright; out.gain.value = 0.055 * vel;
    for (const [r, a, d] of [[1, 1, 2], [2, 0.3, 1], [3, 0.1, 0.5]]) {
      const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(a, t + 0.008); og.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(d, dur + 0.8));
      this.#osc('sine', f * r, t, t + dur + 1, og); og.connect(lp);
    }
    lp.connect(out); out.connect(this.#panTo(0.1));
  }
  // marimba / kalimba: woody plucks
  #mallet(m, t, vel, kind) {
    const ctx = this.ctx, f = mtof(m), g = ctx.createGain();
    const parts = kind === 'kalimba' ? [[1, 1], [5.4, 0.15], [2.01, 0.1]] : [[1, 1], [4, 0.2], [9.9, 0.04]];
    const dec = kind === 'kalimba' ? 1.0 : 0.5;
    this.#env(g, t, 0.13 * vel, 0.003, dec);
    for (const [r, a] of parts) { const og = ctx.createGain(); og.gain.setValueAtTime(a, t); og.gain.exponentialRampToValueAtTime(0.001, t + dec / r ** 0.5); this.#osc('sine', f * r, t, t + dec + 0.05, og); og.connect(g); }
    g.connect(this.#panTo(((m % 5) - 2) * 0.12));
  }
  #vibes(m, t, vel) {
    const ctx = this.ctx, g = ctx.createGain(), tg = ctx.createGain(), trem = ctx.createOscillator();
    trem.frequency.value = 5; tg.gain.value = 0.02 * vel; trem.connect(tg); tg.connect(g.gain); trem.start(t); trem.stop(t + 1.6);
    this.#env(g, t, 0.07 * vel, 0.006, 1.4); this.#osc('sine', mtof(m), t, t + 1.5, g);
    g.connect(this.#panTo(0.2));
  }
  #glock(m, t, vel) {
    const g = this.ctx.createGain(); this.#env(g, t, 0.035 * vel, 0.002, 0.8);
    this.#osc('sine', mtof(m), t, t + 0.9, g); this.#osc('sine', mtof(m) * 2.76, t, t + 0.5, g); g.connect(this.#panTo(0.3));
  }
  // whistle: a pure tone that scoops up into the note, with delayed vibrato (very AC)
  #whistle(m, t, dur, vel) {
    const ctx = this.ctx, f = mtof(m), g = ctx.createGain(), o = ctx.createOscillator();
    o.frequency.setValueAtTime(f * 0.97, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.6;
    vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.007, t + 0.25);
    vib.connect(vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06 * vel, t + 0.03);
    g.gain.setValueAtTime(0.06 * vel, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    o.connect(g); g.connect(this.#panTo(0));
    for (const x of [o, vib]) { x.start(t); x.stop(t + dur + 0.1); }
  }
  // flute: a sine with breath and vibrato
  #flute(m, t, dur, vel) {
    const ctx = this.ctx, f = mtof(m), g = ctx.createGain(), o = ctx.createOscillator();
    o.frequency.value = f;
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5; vg.gain.value = f * 0.005;
    vib.connect(vg); vg.connect(o.frequency);
    const n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
    n.buffer = this.noise; n.loop = true; bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 3; ng.gain.value = 0.25;
    n.connect(bp); bp.connect(ng); ng.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * vel, t + 0.06);
    g.gain.setValueAtTime(0.05 * vel, t + dur * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    o.connect(g); g.connect(this.#panTo(-0.15));
    for (const x of [o, vib, n]) { x.start(t); x.stop(t + dur + 0.15); }
  }
  // city pop lead: two soft detuned squares through a lowpass, vibrato
  #citylead(m, t, dur, vel) {
    const ctx = this.ctx, f = mtof(m), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = this.s.bright ? 2600 : 1700; lp.Q.value = 1;
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.2;
    vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.006, t + 0.3); vib.connect(vg);
    for (const det of [0.997, 1.003]) { const o = this.#osc('square', f * det, t, t + dur + 0.15, lp); vg.connect(o.frequency); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03 * vel, t + 0.02);
    g.gain.setValueAtTime(0.03 * vel, t + dur * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
    lp.connect(g); g.connect(this.#panTo(0.05));
    vib.start(t); vib.stop(t + dur + 0.15);
  }
  // Wurlitzer: a reedy triangle with an odd-harmonic bark on the attack
  #wurli(m, t, dur, vel) {
    const ctx = this.ctx, f = mtof(m), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200 * vel + 800, t); lp.frequency.exponentialRampToValueAtTime(1200, t + 0.25);
    this.#osc('triangle', f, t, t + dur + 0.6, lp);
    const bark = ctx.createGain(); bark.gain.setValueAtTime(0.5 * vel, t); bark.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    this.#osc('square', f, t, t + 0.15, bark); bark.connect(lp);
    const trem = ctx.createOscillator(), tg = ctx.createGain(); trem.frequency.value = 5.8; tg.gain.value = 0.03 * vel; trem.connect(tg); tg.connect(g.gain); trem.start(t); trem.stop(t + dur + 0.6);
    this.#env(g, t, 0.07 * vel, 0.005, dur + 0.4);
    lp.connect(g); g.connect(this.#keysBus());
  }
  // 80s FM electric piano: a glassy high tine over the body (the city pop DX sound)
  #dx(m, t, dur, vel) {
    const ctx = this.ctx, f = mtof(m), g = ctx.createGain(), end = t + dur + 1;
    const car = this.#osc('sine', f, t, end, g), mod = ctx.createOscillator(), mg = ctx.createGain();
    mod.frequency.value = f * 14; mg.gain.setValueAtTime(f * 3 * vel, t); mg.gain.exponentialRampToValueAtTime(f * 0.01, t + 0.18);
    mod.connect(mg); mg.connect(car.frequency); mod.start(t); mod.stop(end);
    const bell = ctx.createGain(); bell.gain.setValueAtTime(0.25 * vel, t); bell.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    this.#osc('sine', f * 2, t, t + 0.6, bell); bell.connect(g);
    this.#env(g, t, 0.065 * vel, 0.003, dur + 0.8);
    g.connect(this.#keysBus());
  }
  // drawbar organ with a Leslie-ish wobble
  #organ(m, t, dur, vel) {
    const ctx = this.ctx, f = mtof(m), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 3000;
    for (const [r, a] of [[0.5, 0.5], [1, 1], [2, 0.6], [3, 0.3], [4, 0.15]]) { const og = ctx.createGain(); og.gain.value = a; this.#osc('sine', f * r, t, t + dur + 0.1, og); og.connect(lp); }
    const les = ctx.createOscillator(), lg = ctx.createGain(); les.frequency.value = 6.5; lg.gain.value = 0.012; les.connect(lg); lg.connect(g.gain); les.start(t); les.stop(t + dur + 0.1);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03 * vel, t + 0.01);
    g.gain.setValueAtTime(0.03 * vel, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.06);
    lp.connect(g); g.connect(this.#keysBus());
  }
  // honky-tonk piano: two slightly detuned bright pianos
  #honky(m, t, dur, vel) { this.#piano(m, t, dur, vel * 0.8, 1.004, 3200); this.#piano(m, t + 0.004, dur, vel * 0.6, 0.996, 3200); }
  // harp / music box: short bright plucks with a long ring
  #harp(m, t, vel) {
    const g = this.ctx.createGain(); this.#env(g, t, 0.07 * vel, 0.002, 1.6);
    this.#osc('triangle', mtof(m), t, t + 1.7, g); this.#osc('sine', mtof(m) * 2, t, t + 0.6, g); g.connect(this.#keysBus());
  }
  #musicbox(m, t, vel) {
    const g = this.ctx.createGain(); this.#env(g, t, 0.05 * vel, 0.001, 1.1);
    for (const r of [1, 3.01, 5.2]) this.#osc('sine', mtof(m + 12) * r, t, t + 1.2, g); g.connect(this.#panTo(0.2));
  }
  // analog saw lead (soft, for night coding): detuned saws, lowpassed, a little glide
  #saw(m, t, dur, vel) {
    const ctx = this.ctx, f = mtof(m), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.linearRampToValueAtTime(1600, t + 0.2); lp.Q.value = 2;
    for (const det of [0.995, 1.005]) { const o = this.#osc('sawtooth', f * 0.985, t, t + dur + 0.15, lp); o.frequency.exponentialRampToValueAtTime(f * det, t + 0.06); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.022 * vel, t + 0.04);
    g.gain.setValueAtTime(0.022 * vel, t + dur * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    lp.connect(g); g.connect(this.#panTo(0));
  }
  // saxophone-ish: a saw through two vowel formants, breathy, with vibrato
  #sax(m, t, dur, vel) {
    const ctx = this.ctx, f = mtof(m), g = ctx.createGain(), mix = ctx.createGain();
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.98, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.008, t + 0.3); vib.connect(vg); vg.connect(o.frequency);
    for (const [fr, q, a] of [[700, 5, 1], [1300, 6, 0.7], [2600, 8, 0.25]]) { const bp = ctx.createBiquadFilter(), bg = ctx.createGain(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = q; bg.gain.value = a; o.connect(bp); bp.connect(bg); bg.connect(mix); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09 * vel, t + 0.05);
    g.gain.setValueAtTime(0.09 * vel, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
    mix.connect(g); g.connect(this.#panTo(-0.1));
    for (const x of [o, vib]) { x.start(t); x.stop(t + dur + 0.15); }
  }
  // muted trumpet: a bright, nasal saw squeezed through a narrow band
  #trumpet(m, t, dur, vel) {
    const ctx = this.ctx, f = mtof(m), g = ctx.createGain(), bp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 1.6; hp.type = 'highpass'; hp.frequency.value = 500;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.97, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.5; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.006, t + 0.35); vib.connect(vg); vg.connect(o.frequency);
    o.connect(hp); hp.connect(bp);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07 * vel, t + 0.03);
    g.gain.setValueAtTime(0.07 * vel, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    bp.connect(g); g.connect(this.#panTo(0.1));
    for (const x of [o, vib]) { x.start(t); x.stop(t + dur + 0.1); }
  }
  // ocarina: a hollow pure tone with breath (Animal Crossing's favourite)
  #ocarina(m, t, dur, vel) {
    const ctx = this.ctx, f = mtof(m), g = ctx.createGain();
    this.#osc('sine', f, t, t + dur + 0.1, g); const h = ctx.createGain(); h.gain.value = 0.12; this.#osc('triangle', f * 2, t, t + dur + 0.1, h); h.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.055 * vel, t + 0.05);
    g.gain.setValueAtTime(0.055 * vel, t + dur * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    g.connect(this.#panTo(-0.05));
  }
  // accordion: two reeds a hair apart, with bellows swell
  #accordion(m, t, dur, vel) {
    const ctx = this.ctx, f = mtof(m), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2400;
    for (const [type, det] of [['square', 1], ['sawtooth', 1.006]]) this.#osc(type, f * det, t, t + dur + 0.1, lp);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.016 * vel, t + 0.05);
    g.gain.linearRampToValueAtTime(0.02 * vel, t + dur * 0.6); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.06);
    lp.connect(g); g.connect(this.#panTo(0.15));
  }
  // steel pan: bright, bell-ish, quick bloom
  #steelpan(m, t, vel) {
    const ctx = this.ctx, f = mtof(m), g = ctx.createGain(); this.#env(g, t, 0.08 * vel, 0.004, 0.9);
    for (const [r, a] of [[1, 1], [2, 0.5], [3.02, 0.2], [4.1, 0.12]]) { const og = ctx.createGain(); og.gain.setValueAtTime(a, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.9 / r); this.#osc('sine', f * r, t, t + 1, og); og.connect(g); }
    g.connect(this.#panTo(-0.15));
  }

  // clean guitar (Karplus-Strong), for chord cuts and nylon bossa
  #guitar(m, t, dur, vel, nylon = false) {
    const ctx = this.ctx, key = (nylon ? 'n' : 'g') + m;
    if (!this.plucks.has(key)) {
      const sr = ctx.sampleRate, N = Math.max(2, Math.floor(sr / mtof(m) - 0.5)), len = Math.floor(sr * 1.6);
      const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
      let prev = 0; for (let i = 0; i < N; i++) { prev += ((Math.random() * 2 - 1) - prev) * (nylon ? 0.35 : 0.7); d[i] = prev; }
      for (let i = N; i < len; i++) d[i] = 0.996 * 0.5 * (d[i - N] + d[Math.max(0, i - N - 1)]);
      this.plucks.set(key, { buf, rate: (mtof(m) * (N + 0.5)) / sr });  // tuning correction
    }
    const src = ctx.createBufferSource(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    const pl = this.plucks.get(key);
    src.buffer = pl.buf; src.playbackRate.value = pl.rate; lp.type = 'lowpass'; lp.frequency.value = nylon ? 2400 : 3800;
    g.gain.setValueAtTime(0.28 * vel, t); g.gain.setTargetAtTime(0.0001, t + dur, 0.04);
    src.connect(lp); lp.connect(g); g.connect(this.#panTo(nylon ? -0.2 : 0.35));
    src.start(t); src.stop(t + dur + 0.3);
  }
  // pad: soft detuned saws, slow swell
  #pad(m, t, dur) {
    const ctx = this.ctx, g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1100;
    for (const det of [0.996, 1.004]) this.#osc('sawtooth', mtof(m) * det, t, t + dur + 0.8, lp);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.012, t + 0.5);
    g.gain.setValueAtTime(0.012, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.7);
    lp.connect(g); g.connect(this.#panTo(0));
  }
  // bass: a clean fingered synth bass; slap adds a bright pop on octaves
  #bass(m, t, dur, vel, slap = false) {
    if (this.s.bassTone === 'upright') return this.#upright(m, t, dur, vel);
    if (this.s.bassTone === 'moog') return this.#moog(m, t, dur, vel);
    this.#fingered(m, t, dur, vel, slap);
  }
  // upright: round sine body with a finger thump and a little pitch settle
  #upright(m, t, dur, vel) {
    const ctx = this.ctx, f = mtof(m), g = ctx.createGain(), o = ctx.createOscillator(), lp = ctx.createBiquadFilter();
    o.frequency.setValueAtTime(f * 1.02, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
    lp.type = 'lowpass'; lp.frequency.value = 600; o.connect(lp); this.#osc('triangle', f * 2, t, t + 0.08, lp);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4 * vel, t + 0.01); g.gain.exponentialRampToValueAtTime(0.18 * vel, t + 0.18);
    g.gain.setTargetAtTime(0.0001, t + dur, 0.05);
    lp.connect(g); g.connect(this.bus); o.start(t); o.stop(t + dur + 0.3);
  }
  // analog synth bass: a filtered saw with a quick filter blip
  #moog(m, t, dur, vel) {
    const ctx = this.ctx, f = mtof(m), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 4; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(220, t + 0.2);
    this.#osc('sawtooth', f, t, t + dur + 0.1, lp); this.#osc('sine', f, t, t + dur + 0.1, lp);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * vel, t + 0.006); g.gain.setTargetAtTime(0.0001, t + dur, 0.03);
    lp.connect(g); g.connect(this.bus);
  }
  #fingered(m, t, dur, vel, slap = false) {
    const ctx = this.ctx, f = mtof(m), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(slap ? 2600 : 1300, t); lp.frequency.exponentialRampToValueAtTime(420, t + 0.18);
    this.#osc('triangle', f, t, t + dur + 0.1, lp); this.#osc('sine', f, t, t + dur + 0.1, lp);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3 * vel, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.16 * vel, t + 0.15); g.gain.setTargetAtTime(0.0001, t + dur, 0.03);
    lp.connect(g); g.connect(this.bus);
  }
  #kick(t, vel) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.07);
    this.#env(g, t, 0.55 * vel, 0.003, 0.2); o.connect(g); g.connect(this.drums); o.start(t); o.stop(t + 0.25);
  }
  #noiseHit(t, vel, type, freq, q, dec, dest = this.drums) {
    const n = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    n.buffer = this.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    this.#env(g, t, vel, 0.002, dec); n.connect(f); f.connect(g); g.connect(dest); n.start(t, Math.random() * 0.5, dec + 0.05);
  }
  // kit flavours
  #backbeat(t, vel) {
    const kit = this.s.kit;
    if (kit === '80s') { this.#noiseHit(t, 0.3 * vel, 'bandpass', 1800, 0.7, 0.28); this.#clap(t, vel * 0.9); }     // big gated snare + clap
    else if (kit === 'brush') this.#brush(t, vel * 1.3);
    else if (kit === 'perc') this.#woodblock(t, vel);
    else this.#snare(t, vel);
  }
  #bongo(t, vel, hi = true) { const o = this.ctx.createOscillator(), g = this.ctx.createGain(); const f = hi ? 330 : 240; o.frequency.setValueAtTime(f * 1.3, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.03); this.#env(g, t, 0.16 * vel, 0.002, 0.12); o.connect(g); g.connect(this.drums); o.start(t); o.stop(t + 0.15); }
  #woodblock(t, vel) { const g = this.ctx.createGain(); this.#env(g, t, 0.1 * vel, 0.001, 0.05); this.#osc('sine', 1100, t, t + 0.07, g); this.#osc('sine', 2400, t, t + 0.03, g); g.connect(this.drums); }
  #triangle(t, vel) { const g = this.ctx.createGain(); this.#env(g, t, 0.012 * vel, 0.002, 1.8); this.#osc('sine', 5200, t, t + 2, g); this.#osc('sine', 7400, t, t + 1.2, g); g.connect(this.#panTo(0.4)); }
  #snare(t, vel) { this.#noiseHit(t, 0.22 * vel, 'bandpass', 2000, 0.8, 0.14); this.#noiseHit(t, 0.08 * vel, 'lowpass', 900, 0.5, 0.06); }
  #brush(t, vel) { this.#noiseHit(t, 0.08 * vel, 'bandpass', 3200, 0.6, 0.18); }
  #rim(t, vel) { const g = this.ctx.createGain(); this.#env(g, t, 0.12 * vel, 0.001, 0.035); this.#osc('square', 1650, t, t + 0.05, g); g.connect(this.drums); }
  #hat(t, vel, open = false) { this.#noiseHit(t, 0.05 * vel, 'highpass', 8000, 0.5, open ? 0.22 : 0.035); }
  #shaker(t, vel) { this.#noiseHit(t, 0.035 * vel, 'bandpass', 6000, 1.2, 0.05); }
  #tamb(t, vel) { this.#noiseHit(t, 0.04 * vel, 'bandpass', 9000, 2, 0.09); }
  #ride(t, vel) { this.#noiseHit(t, 0.03 * vel, 'bandpass', 7000, 3, 0.3); const g = this.ctx.createGain(); this.#env(g, t, 0.01 * vel, 0.002, 0.4); this.#osc('sine', 3500, t, t + 0.45, g); g.connect(this.drums); }
  #crash(t, vel) { this.#noiseHit(t, 0.06 * vel, 'highpass', 5000, 0.5, 1.6); }
  #clap(t, vel) { for (const dt of [0, 0.012, 0.024]) this.#noiseHit(t + dt, 0.07 * vel, 'bandpass', 1400, 1.2, 0.08); }

  // ---------------------------------------------------------------- composing

  // Where are we? [section name, chord list, bar within the section, is-first-pass]
  // ================================================================ composing
  //
  // Each scene theme is fixed (key, tempo, changes, motif, instruments), but inside a
  // theme the arrangement keeps moving: sections add and drop layers, the keys pick a
  // comping rhythm per bar, the bass locks to the kick, the drums vary by section and
  // fill at 4- and 8-bar marks, and the melody states its motif and answers it.

  // Where are we? [section, progression, bar in section, section length]
  #where(b) {
    if (b < this.intro) return ['intro', this.s.A, b, this.intro];
    let lb = (b - this.intro) % this.loopBars;
    for (const [name, len] of this.form) {
      if (lb < len) {
        const prog = name === 'B' || name === 'break' ? this.s.B : name === 'turn' ? this.s.A.slice(-2) : this.s.A;
        return [name, prog, lb, len];
      }
      lb -= len;
    }
    return ['A', this.s.A, 0, 8];
  }

  // chords sounding in this bar: [[degree, quality, startBeat, beats], ...]
  #chordsIn(prog, barIdx) {
    const total = prog.reduce((x, c) => x + c[2], 0) / 4;
    barIdx %= total;
    let beat = 0; const out = [];
    const start = barIdx * 4, end = start + 4;
    for (const [deg, q, len] of prog) {
      const a = beat, z = beat + len;
      if (z > start && a < end) out.push([deg, q, Math.max(a, start) - start, Math.min(z, end) - Math.max(a, start)]);
      beat = z;
    }
    return out;
  }

  // Four-note voicings: drop the 5th on extended chords, add the 9th to triads-plus,
  // try close and drop-2 shapes in a warm register, avoid tight intervals down low
  // (they turn to mud on an electric piano), and voice-lead smoothly from the last chord.
  #voice(rootPc, q) {
    let iv = Q[q].filter((i) => i % 12 !== 0);
    if (iv.length > 4 && iv.includes(7)) iv = iv.filter((i) => i !== 7);
    iv = iv.slice(0, 4);
    if (iv.length < 4 && !iv.some((i) => i % 12 === 2)) iv.push(14);
    const pcs = [...new Set(iv.map((i) => i % 12))].sort((a, b) => a - b);
    const shapes = [];
    for (let k = 0; k < pcs.length; k++) {
      const close = [];
      for (let j = 0; j < pcs.length; j++) { let v = pcs[(k + j) % pcs.length]; while (close.length && v <= close[close.length - 1]) v += 12; close.push(v); }
      shapes.push(close);
      if (close.length >= 3) { const d2 = close.slice(); d2[d2.length - 2] -= 12; shapes.push(d2.sort((a, b) => a - b)); }
    }
    const prev = this.prevVoice;
    let best = null, bestCost = Infinity;
    for (const sh of shapes) for (let o = 2; o <= 6; o++) {
      const v = sh.map((i) => rootPc + i + 12 * o);
      if (v[0] < 50 || v[0] > 62 || v[v.length - 1] > 77) continue;
      if (v.some((n, i) => i && n - v[i - 1] < 3 && v[i - 1] < 55)) continue;
      const avg = v.reduce((a, x) => a + x, 0) / v.length;
      let cost = 0.5 * Math.abs(avg - 63);
      if (prev) { for (let i = 0; i < Math.min(v.length, prev.length); i++) cost += Math.abs(v[i] - prev[i]); cost += 2 * Math.max(0, Math.abs(v[v.length - 1] - prev[prev.length - 1]) - 4); }
      if (cost < bestCost) { bestCost = cost; best = v; }
    }
    this.prevVoice = best || pcs.map((i) => 60 + ((rootPc + i) % 12)).sort((a, b) => a - b);
    return this.prevVoice;
  }

  // Bass: the octave of this pitch class closest to the last bass note (A1..B2) — no leaping around.
  #bassNote(pc) {
    const prev = this.prevBass ?? 40;
    let best = 33 + ((((pc - 33) % 12) + 12) % 12), bd = Infinity, pick = best;
    for (let n = best; n <= 47; n += 12) { const d = Math.abs(n - prev); if (d < bd) { bd = d; pick = n; } }
    this.prevBass = pick;
    return pick;
  }

  // Pentatonic lead notes in G4..C6 for the current key.
  #leadScale() {
    const k = this.s.key + (this.kOff || 0), pent = this.s.minor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
    const out = [];
    for (let m = 60; m <= 88; m++) if (pent.includes((((m - k) % 12) + 12) % 12)) out.push(m);
    return out;
  }

  // One phrase (4 bars) of melody: the motif, then an answer. Returns [{bar, st, m, len, v}].
  #phrase(motif, chordPcsAt, variant) {
    const sc = this.#leadScale(), r = () => this.rand();
    const clamp = (i) => Math.max(0, Math.min(sc.length - 1, i));
    const toIdx = (m) => sc.reduce((bi, x, i) => (Math.abs(x - m) < Math.abs(sc[bi] - m) ? i : bi), 0);
    const toChordTone = (i, bar, st) => {
      const pcs = chordPcsAt(bar, st);
      for (const d of [0, 1, -1, 2, -2]) { const j = clamp(i + d); if (pcs.includes(sc[j] % 12)) return j; }
      return i;
    };
    const anchor = toIdx(this.lastLead ?? 74) + Math.round(r() * 2 - 1);
    const notes = [];
    // statement: the theme's motif (scale steps from the anchor), sometimes inverted or shifted
    for (const [st0, deg, len] of motif) {
      const step = variant.inv ? -deg : deg;
      let i = clamp(anchor + step + (variant.shift || 0));
      const bar = Math.floor(st0 / 16), st = st0 % 16;
      if (st % 8 === 0) i = toChordTone(i, bar, st);
      notes.push({ bar, st, i, len, v: st0 === motif[0][0] ? 0.9 : 0.72 + 0.1 * r() });
    }
    // answer: a short new cell in bars 3-4, stepwise with the odd leap, landing on a chord tone
    const cells = [[0, 4, 8], [2, 6, 10], [0, 3, 6, 10], [0, 6, 12], [2, 4, 8, 12], [0, 8]];
    const cell = cells[Math.floor(r() * cells.length)];
    let cur = notes.length ? notes[notes.length - 1].i : anchor, dir = r() < 0.5 ? 1 : -1;
    cell.forEach((c, k) => {
      const mv = r() < 0.75 ? dir * (1 + Math.floor(r() * 2)) : -dir * 3;
      cur = clamp(cur + mv);
      if (Math.abs(cur - anchor) > 4) dir = -dir;
      const bar = 2 + Math.floor(c / 16), st = c % 16, last = k === cell.length - 1;
      if (last || st % 8 === 0) cur = toChordTone(cur, bar, st);
      const len = last ? 6 + Math.floor(r() * 5) : Math.min(6, (cell[k + 1] ?? 16) - c);
      notes.push({ bar, st, i: cur, len, v: 0.66 + 0.12 * r() });
    });
    if (variant.home) { const last = notes[notes.length - 1]; last.i = toIdx(72 + this.s.key + (this.kOff || 0)); last.len = 12; }
    this.lastLead = sc[notes[notes.length - 1].i];
    return notes.map((n) => ({ ...n, m: sc[n.i] }));
  }

  // A solo phrase: running 8ths over the pentatonic, shaped by a contour, resting at phrase ends.
  #soloPhrase(chordPcsAt) {
    const sc = this.#leadScale(), r = () => this.rand(), notes = [];
    let i = Math.floor(sc.length / 2), dir = 1;
    for (let bar = 0; bar < 4; bar++) {
      const run = bar === 3 ? 3 : r() < 0.6 ? 4 : 6;
      for (let k = 0; k < run; k++) {
        const st = k * 2;
        if (r() < 0.28) continue;
        i = Math.max(0, Math.min(sc.length - 1, i + dir * (r() < 0.8 ? 1 : 2)));
        if (i > sc.length - 3 || i < 3 || r() < 0.2) dir = -dir;
        let m = sc[i];
        if (st % 8 === 0) { const pcs = chordPcsAt(bar, st); for (const d of [0, 1, -1]) { const j = Math.max(0, Math.min(sc.length - 1, i + d)); if (pcs.includes(sc[j] % 12)) { m = sc[j]; break; } } }
        notes.push({ bar, st, m, len: k === run - 1 ? 6 : 2, v: 0.6 + (st % 4 === 0 ? 0.15 : 0) + 0.1 * r() });
      }
    }
    return notes;
  }

  #keysNote(kind, m, t, dur, vel) {
    if (kind === 'wurli') this.#wurli(m, t, dur, vel);
    else if (kind === 'dx') this.#dx(m, t, dur, vel);
    else if (kind === 'organ') this.#organ(m, t, dur, vel);
    else if (kind === 'honky') this.#honky(m, t, dur, vel);
    else if (kind === 'harp') this.#harp(m, t, vel);
    else if (kind === 'musicbox') this.#musicbox(m, t, vel);
    else if (kind === 'piano') this.#piano(m, t, dur, vel);
    else this.#ep(m, t, dur, vel);
  }

  #playLead(kind, m, t, dur, v) {
    v *= 0.68;                                                                        // background music: the melody sits back
    if (kind === 'saw') return this.#saw(m, t, dur, v);
    if (kind === 'sax') return this.#sax(m - 12 < 58 ? m : m - 12, t, dur, v);
    if (kind === 'trumpet') return this.#trumpet(m, t, dur, v);
    if (kind === 'ocarina') return this.#ocarina(m, t, dur, v);
    if (kind === 'accordion') return this.#accordion(m, t, dur, v);
    if (kind === 'steelpan') return this.#steelpan(m, t, v);
    if (kind === 'musicbox') return this.#musicbox(m, t, v);
    if (['wurli', 'dx', 'organ', 'honky'].includes(kind)) return this.#keysNote(kind, m, t, dur, v);
    if (kind === 'whistle') this.#whistle(m, t, dur, v);
    else if (kind === 'citylead') this.#citylead(m, t, dur, v);
    else if (kind === 'flute') this.#flute(m, t, dur, v);
    else if (kind === 'ep') this.#ep(m + (m < 70 ? 12 : 0), t, dur, v, 0.15);
    else if (kind === 'guitar') this.#guitar(m, t, dur, v * 1.2);
    else if (kind === 'vibes') this.#vibes(m, t, v);
    else this.#mallet(m, t, v, kind);
  }

  // Drum grids (16 steps): x hit, g ghost, o open hat, b brush/rim, . rest
  static GRIDS = {
    halftime: { K: 'x.....x.........', S: '........x.......', H: 'x.x.x.x.x.x.x.x.' },
    disco:    { K: 'x...x...x...x...', S: '....x.......x...', H: 'xxoxxxoxxxoxxxox' },
    swing:    { K: 'x.......x.......', S: '....b.......b...', H: 'x...x.x.x...x.x.', ride: true },
    bossa:    { K: 'x.....x.x.....x.', S: 'x..x..x...x..x..', H: 'xxxxxxxxxxxxxxxx', rim: true, shaker: true },
    light:    { K: 'x.........x.....', S: '....b.......b...', H: 'x.x.x.x.x.x.x.x.', rim: true, shaker: true },
    train:    { K: 'x.....x.x.......', S: '....b.......b..g', H: 'x.xxx.xxx.xxx.xx', shaker: true },
    boombap:  { K: 'x......x..x.....', S: '....x..g....x..g', H: 'x.x.x.x.x.x.x.x.' },
  };

  #drumBar(sec, bi, len, at) {
    const s = this.s, grid = SongPlayer.GRIDS[s.drums], r = () => this.rand();
    if (sec === 'intro' && bi < this.intro - 2) return;                           // keys alone first
    const hatsOnly = sec === 'intro' || (sec === 'B' && bi === 0 && this.hatsFirst);
    const lane = (str) => [...str].map((c, st) => [c, st]).filter(([c]) => c !== '.');
    const last = bi === len - 1, fillAt = (bi + 1) % 8 === 0 ? 0.55 : (bi + 1) % 4 === 0 ? 0.25 : 0;
    const fill = !hatsOnly && fillAt && r() < fillAt ? ['roll', 'stop', 'kicks', 'open'][Math.floor(r() * 4)] : null;
    const stopAt = fill === 'stop' ? 12 : (last && sec === 'turn') ? 14 : 99;
    const dropKick = !hatsOnly && bi > 0 && r() < 0.07;
    const lvl = sec === 'A' ? 0.85 : sec === 'break' ? 0.6 : 1;
    if (sec === 'break') {                                                          // just a shaker ticking through the breakdown
      if (grid.shaker || r() < 0.5) for (let st = 0; st < 16; st += 2) this.#shaker(at(st), 0.7);
      return;
    }
    // hats / ride / shaker
    for (const [c, st] of lane(grid.H)) {
      if (st >= stopAt) break;
      const open = c === 'o' || (fill === 'open' && st === 14) || (sec === 'B' && bi % 2 === 1 && st === 14);
      const acc = [1, 0.55, 0.75, 0.55][st % 4];
      if (grid.shaker) this.#shaker(at(st), acc);
      else if (grid.ride && sec !== 'A') this.#ride(at(st), acc);
      else this.#hat(at(st), acc * lvl, open);
    }
    if (hatsOnly) return;
    if (s.tamb && (sec === 'A2' || sec === 'B' || sec === 'A3' || sec === 'solo')) for (let st = 2; st < 16; st += 4) if (st < stopAt) this.#tamb(at(st), 0.9);
    if (bi === 0 && (sec === 'B' || sec === 'A3' || sec === 'solo')) this.#crash(at(0), 0.8);
    // kick (and the bass locks to it: remembered for this bar)
    this.kickSteps = [];
    if (!dropKick) for (const [, st] of lane(grid.K)) if (st < stopAt) { this.#kick(at(st), (st ? 0.85 : 1) * lvl); this.kickSteps.push(st); }
    if (fill === 'kicks') for (const st of [13, 15]) { this.#kick(at(st), 0.7); this.kickSteps.push(st); }
    // snare / rim / brush
    for (const [c, st] of lane(grid.S)) {
      if (st >= stopAt || (fill === 'roll' && st >= 12)) continue;
      const v = c === 'g' ? 0.28 + 0.1 * r() : lvl;
      if (c === 'g') (grid.rim ? this.#rim : this.#snare).call(this, at(st), v);
      else if (grid.rim && s.kit !== 'perc') this.#rim(at(st), v); else this.#backbeat(at(st), v);
    }
    if (sec === 'B' || sec === 'solo') for (const st of [7, 15]) if (st < stopAt && r() < 0.3) (grid.rim ? this.#rim : this.#snare).call(this, at(st), 0.26);
    if (s.kit === 'perc' && sec !== 'A') for (const [st, hi] of [[3, true], [7, false], [11, true], [14, false], [15, true]]) if (st < stopAt && r() < 0.7) this.#bongo(at(st), 0.8, hi);
    if (s.triangle && bi % 2 === 0) this.#triangle(at(0), 1);
    if (fill === 'roll') for (const [st, v] of [[12, 0.4], [13, 0.5], [14, 0.65], [15, 0.8]]) (c => c === 'b' ? this.#brush : this.#snare)(grid.S[4]).call(this, at(st), v);
  }

  #scheduleBar(b, t) {
    const s = this.s, s16 = this.bar / 16, r = () => this.rand();
    if (b >= this.intro + this.loopBars) {                                           // the ending: home chord, bass, a last bell
      if (b > this.intro + this.loopBars) return;
      this.kOff = 0;
      const v = this.#voice(s.key % 12, s.minor ? 'm9' : 'maj9');
      v.forEach((m, i) => this.#keysNote(s.keys || 'ep', m, t + i * 0.03, this.bar * 1.8, 0.75));
      this.#bass(this.#bassNote(s.key % 12), t, this.bar * 1.6, 0.9);
      this.#glock(84 + (s.key % 12) - (s.key % 12 > 7 ? 12 : 0), t + this.bar * 0.5, 0.6);
      this.#crash(t, 0.4);
      this.lofi.frequency.setTargetAtTime(2400, t + this.bar, 0.8);
      return;
    }
    const [sec, prog, bi, len] = this.#where(b);
    // the last A lifts up a key in some themes; everything else is home
    this.kOff = sec === 'A3' || (sec === 'turn' && s.modulate) ? (s.modulate || 0) : 0;
    const at = (st) => t + st * s16 + (st % 4 === 2 ? s16 * s.swing : 0) + (r() - 0.5) * 0.008;
    const chords = this.#chordsIn(prog, bi);
    const pcsAt = (barOff, st) => {                                                 // chord pitch classes at a point in the phrase
      const [deg, q] = this.#chordsIn(prog, bi - (bi % 4) + barOff).find(([, , sb, bt]) => st / 4 >= sb && st / 4 < sb + bt) || this.#chordsIn(prog, bi - (bi % 4) + barOff)[0];
      return Q[q].map((iv) => (s.key + this.kOff + deg + iv) % 12);
    };
    if (bi === 0) this.hatsFirst = r() < 0.5;

    // tone: the lowpass opens through the intro, dips for the breakdown
    this.lofi.frequency.setTargetAtTime(sec === 'intro' ? 1800 + bi * 1400 : sec === 'break' ? 2400 : s.bright ? 9000 : 7000, t, 0.5);

    // ---- drums first (the bass follows the kick)
    this.kickSteps = null;
    this.#drumBar(sec, bi, len, at);

    for (const [deg, q, startBeat, beats] of chords) {
      const rootPc = (s.key + this.kOff + deg) % 12, st0 = startBeat * 4, stN = st0 + beats * 4;
      const inRange = (st) => st >= st0 && st < stN;
      const voice = this.#voice(rootPc, q);

      // ---- keys: a comping rhythm per bar
      const hit = (st, n16, vel, kind = s.comp) => { if (!inRange(st)) return; voice.forEach((m, i) => {
        if (kind === 'guitar') this.#guitar(m + (m < 60 ? 12 : 0), at(st) + i * 0.012, n16 * s16, vel);
        else this.#keysNote(kind === 'rhodes' ? 'ep' : kind === 'ep' || kind === 'piano' ? (s.keys || kind) : kind, m, at(st) + i * 0.006, n16 * s16, vel);
      }); };
      if (sec === 'intro' || sec === 'break') hit(st0, beats * 4, 0.7, s.comp === 'guitar' || s.comp === 'bounce' ? 'ep' : s.comp === 'nylon' ? 'ep' : s.comp === 'arp' ? 'piano' : s.comp);
      else if (s.comp === 'nylon') {
        const low = voice[0] - 12;
        for (const [st, w] of [[0, 'b'], [3, 'c'], [6, 'c'], [8, 'b'], [11, 'c'], [14, 'c']]) if (inRange(st)) {
          if (w === 'b') this.#guitar(low, at(st), 3 * s16, 0.8, true); else voice.forEach((m, i) => this.#guitar(m, at(st) + i * 0.008, 2 * s16, 0.55, true));
        }
      } else if (s.comp === 'arp') {
        const v = [...voice, voice[1] + 12], pat = r() < 0.5 ? [0, 1, 2, 3, 4, 3, 2, 1] : [0, 2, 1, 3, 2, 4, 3, 1];
        for (let k = 0; k < 8; k++) { const st = k * 2; if (inRange(st)) this.#keysNote(s.keys || 'piano', v[pat[k] % v.length], at(st), 3 * s16, 0.65 + (k % 4 === 0 ? 0.15 : 0)); }
      } else {
        const style = r();
        const kind = s.comp === 'bounce' ? 'piano' : s.comp;
        if (s.comp === 'guitar' || s.comp === 'bounce') for (const st of [2, 6, 10, 14]) hit(st, s.comp === 'bounce' ? 1.5 : 1, st % 8 === 6 ? 0.85 : 0.6, kind);
        else if (style < 0.35) hit(st0, Math.min(8, beats * 4), 0.8, kind);                                   // hold
        else if (style < 0.65) { hit(0, 3, 0.85, kind); hit(6, 6, 0.7, kind); hit(8, 3, 0.8, kind); hit(14, 2, 0.7, kind); } // charleston
        else { for (const st of [0, 4, 8, 12]) hit(st, 2, st % 8 ? 0.6 : 0.8, kind); }                        // pulse
        if (s.comp2 && sec !== 'A') for (const st of [0, 10]) hit(st, 5, 0.6, s.comp2);
      }
      if (s.pad && (sec === 'B' || sec === 'A3' || sec === 'solo')) voice.forEach((m) => this.#pad(m, at(st0), beats * 4 * s16));

      // ---- bass: locked to the kick, root on chord changes, passing tones in busier feels
      if (sec === 'intro' && bi < this.intro - 1) continue;
      const root = this.#bassNote(rootPc);
      if (sec === 'break' || sec === 'intro') { if (st0 === 0 || inRange(0)) this.#bass(root, at(st0), beats * 4 * s16 * 0.95, 0.85); continue; }
      const legato = s.bass === 'fingered' || s.bass === 'walk';
      const fifth = root + 7 > 47 ? root - 5 : root + 7, oct = root + 12;
      let line;
      if (s.bass === 'walk') line = [[0, root], [4, root + Q[q][1]], [8, fifth], [12, root + (r() < 0.5 ? 10 : 9)]];
      else if (s.bass === 'bossa') line = [[0, root], [6, fifth], [8, fifth], [14, root]];
      else {
        const steps = (this.kickSteps && this.kickSteps.length ? this.kickSteps : [0, 10]).filter(inRange);
        if (!steps.includes(st0)) steps.unshift(st0);
        line = steps.map((st, i) => [st, s.bass === 'slap' && i % 2 === 1 ? oct : i && r() < 0.3 ? fifth : root]);
        if (s.bass === 'slap') line.push([14, oct]);
      }
      line = line.filter(([st]) => inRange(st)).sort((a, b) => a[0] - b[0]);
      line.forEach(([st, m], i) => {
        const next = line[i + 1]?.[0] ?? stN, n16 = Math.max(1, (next - st) * (legato ? 0.92 : 0.55));
        this.#bass(m, at(st), n16 * s16, i ? 0.85 : 1, s.bass === 'slap' && m === oct);
      });
    }

    // ---- melody: 4-bar phrases in A2/B/A3 (motif + answer), improvised runs in the solo
    if (bi % 4 === 0) {
      const phraseNo = Math.floor(bi / 4);
      if (sec === 'A2' || sec === 'A3') this.phraseNotes = this.#phrase(s.motif, pcsAt, { inv: phraseNo === 1 && r() < 0.5, shift: phraseNo === 1 ? 1 : 0, home: sec === 'A3' && phraseNo === 1 });
      else if (sec === 'B') this.phraseNotes = this.#phrase(s.motifB || s.motif, pcsAt, { shift: phraseNo });
      else if (sec === 'solo') this.phraseNotes = this.#soloPhrase(pcsAt);
      else if (sec === 'A' && phraseNo === 1) this.phraseNotes = this.#phrase(s.motif, pcsAt, {});    // a first taste of the theme
      else this.phraseNotes = [];
    }
    const lead = sec === 'B' ? s.leadB : sec === 'solo' ? (s.solo || s.leadB) : s.lead;
    for (const n of (this.phraseNotes || []).filter((x) => x.bar === bi % 4)) this.#playLead(lead, n.m, at(n.st), n.len * s16, n.v);
    // countermelody bells on the last A: guide tones, one per chord
    if (sec === 'A3' && s.glock !== false) for (const [deg, q, sb] of chords) {
      const tone = (s.key + this.kOff + deg + Q[q][1]) % 12; let m = 84 + tone; if (m > 91) m -= 12;
      this.#glock(m, at(sb * 4), 0.5);
    }
  }

  #tick() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ahead = document.hidden ? 2.5 : 0.4, last = this.intro + this.loopBars + this.endBars;
    while (this.nextBar < last && this.nextBarTime < this.ctx.currentTime + ahead) {
      this.#scheduleBar(this.nextBar, this.nextBarTime);
      this.nextBar++; this.nextBarTime += this.bar;
    }
    if (!this.warned && this.ctx.currentTime - this.t0 >= this.duration - 5) {       // nearly done: let the next song fade in
      this.warned = true;
      this.dispatchEvent(new Event('nearend'));
      if (!this.ctx) return;
    }
    if (this.ctx.currentTime - this.t0 >= this.duration) {                           // song's over: on to the next
      this.stop();
      this.dispatchEvent(new Event('ended'));
    }
  }

  // Render `seconds` of the song into an AudioBuffer (needs an injected OfflineAudioContext).
  async renderOffline(seconds) {
    this.#setup();
    this.started = true; this.t0 = 0.05; this.nextBar = 0; this.nextBarTime = this.t0;
    while (this.nextBar < this.intro + this.loopBars + this.endBars && this.nextBarTime < seconds) { this.#scheduleBar(this.nextBar, this.nextBarTime); this.nextBar++; this.nextBarTime += this.bar; }
    return this.ctx.startRendering();
  }

  async play() {
    if (!this.ctx) this.#setup();
    if (!this.started) {
      this.started = true;
      // startAt (seconds) picks the song up partway through, from the start of that bar
      const skip = Math.max(0, Math.min(Math.floor((this.startAt || 0) / this.bar), this.intro + this.loopBars - 1));
      this.t0 = this.ctx.currentTime + 0.1 - skip * this.bar;
      const fade = this.fadeIn || (skip ? 2 : 0);
      if (fade) { this.out.gain.setValueAtTime(0.0001, this.ctx.currentTime); this.out.gain.linearRampToValueAtTime(this.vol, this.ctx.currentTime + fade); }
      this.nextBar = skip; this.nextBarTime = this.t0 + skip * this.bar;
      this.timer = setInterval(() => this.#tick(), 100);
    }
    await this.ctx.resume();
    if (this.ctx.state !== 'running') { const e = new Error('blocked'); e.name = 'NotAllowedError'; throw e; }
    this.paused = false;
    this.#tick();
    this.dispatchEvent(new Event('playing'));
  }

  pause() {
    if (!this.ctx || this.paused) return;
    this.ctx.suspend();
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }

  // Fade out over `sec` seconds, then shut down (for crossfades between scenes).
  fadeOut(sec = 2.5) {
    clearInterval(this.timer);
    if (!this.ctx) return;
    const ctx = this.ctx;
    this.out.gain.cancelScheduledValues(ctx.currentTime);
    this.out.gain.setValueAtTime(this.out.gain.value, ctx.currentTime);
    this.out.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + sec);
    setTimeout(() => { if (!this.injected) ctx.close().catch(() => {}); }, sec * 1000 + 200);
    this.ctx = null;
  }

  stop() {
    clearInterval(this.timer);
    if (this.ctx && !this.injected) this.ctx.close().catch(() => {});
    this.ctx = null;
    this.paused = true;
  }
}
