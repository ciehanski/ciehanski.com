// Ambient soundscape, fully synthesized with WebAudio (no audio files).
// Layers fade in/out per scene + weather; one-shots for the L, Amber, and
// dialogue blips.

function noiseBuffer(ctx, kind, seconds = 4) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    else if (kind === 'pink') { b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
    else d[i] = w;
  }
  return buf;
}

export class Ambience {
  constructor() {
    this.ctx = null;
    this.volume = 0;
    this.mix = { rain: 0, city: 0, waves: 0, keys: 0 };
  }

  // Must be called from a user gesture.
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.volume ** 1.5;
    this.master.connect(ctx.destination);
    this.buffers = { white: noiseBuffer(ctx, 'white'), brown: noiseBuffer(ctx, 'brown'), pink: noiseBuffer(ctx, 'pink') };

    const loop = (buf, ...nodes) => {
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const gain = ctx.createGain(); gain.gain.value = 0;
      let n = src;
      for (const node of nodes) { n.connect(node); n = node; }
      n.connect(gain); gain.connect(this.master);
      src.start(0, Math.random() * 3);
      return gain;
    };
    const filt = (type, freq, q = 0.7) => { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f; };

    this.layers = {
      rain: loop(this.buffers.white, filt('highpass', 500), filt('lowpass', 5200)),
      city: loop(this.buffers.brown, filt('lowpass', 650)),
      waves: loop(this.buffers.pink, filt('lowpass', 700)),
    };
    // waves swell slowly
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
    const depth = ctx.createGain(); depth.gain.value = 0.35;
    this.waveSwell = ctx.createGain(); this.waveSwell.gain.value = 0.65;
    lfo.connect(depth); depth.connect(this.waveSwell.gain); lfo.start();
    this.layers.waves.disconnect(); this.layers.waves.connect(this.waveSwell); this.waveSwell.connect(this.master);

    // keyboard clacks: typing bursts on a timer
    this.keyTimer = setInterval(() => this.#typing(), 70);
    this.apply();
    this.loadSamples();
  }

  // Optional recordings: any of site/sfx/{train-pass,train-arrive,train-depart,doors-closing}.*
  // listed by the build replace the synthesized versions.
  async loadSamples() {
    this.samples = {};
    for (const [name, url] of Object.entries(this.sampleUrls || {})) {
      try {
        const buf = await (await fetch(url)).arrayBuffer();
        this.samples[name] = await this.ctx.decodeAudioData(buf);
      } catch { /* fall back to synthesis */ }
    }
  }

  #sample(name, pan = 0) {
    const buf = this.samples?.[name];
    if (!buf) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.#panner(pan, pan, 0));
    src.start();
    return true;
  }

  // Scene sound effects (trains, bus, chime, purr) all go through a per-scene
  // bus, so a scene change can fade out whatever is still playing.
  #sceneBus() {
    if (!this.sfxBus) { this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master); }
    return this.sfxBus;
  }

  // Fade out every scene sound currently playing, over `sec` seconds; sounds
  // started afterwards go to a fresh bus at full volume.
  fadeOutScene(sec = 3) {
    clearTimeout(this.speechTimer);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (!this.ctx || !this.sfxBus) return;
    const bus = this.sfxBus, t = this.ctx.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(bus.gain.value, t);
    bus.gain.linearRampToValueAtTime(0, t + sec);
    setTimeout(() => bus.disconnect(), sec * 1000 + 100);
    this.sfxBus = null;
  }

  #panner(from, to, sec) {
    const ctx = this.ctx, t = ctx.currentTime;
    // vehicles get a +7dB boost so they cut through on laptop speakers
    const boost = ctx.createGain(); boost.gain.value = 2.2; boost.connect(this.#sceneBus());
    if (!ctx.createStereoPanner) return boost; // very old Safari: mono
    const p = ctx.createStereoPanner();
    p.pan.setValueAtTime(from, t);
    if (sec) p.pan.linearRampToValueAtTime(to, t + sec);
    p.connect(boost);
    return p;
  }

  // A looping noise source through a filter into `dest`, with a gain envelope
  // given as [[time, level], ...] relative to now.
  #noise(kind, type, freq, q, dest, env, sec) {
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.buffers[kind]; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (const [at, v] of env) g.gain.exponentialRampToValueAtTime(Math.max(0.0001, v), t + at);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * 3); src.stop(t + sec + 0.2);
    return { f, g };
  }

  #ready() { return this.ctx && this.volume > 0.01; }

  #typing() {
    if (!this.ctx || this.mix.keys < 0.05 || this.volume < 0.01) return;
    const now = performance.now();
    if (!this.burstUntil || now > this.burstUntil + this.pause) {
      this.burstUntil = now + 800 + Math.random() * 2600;
      this.pause = 900 + Math.random() * 3500;
    }
    if (now > this.burstUntil || Math.random() < 0.3) return;
    this.#click(0.08 * this.mix.keys, 1800 + Math.random() * 2200, 0.018);
  }

  #click(level, freq, len, when = 0, dest = this.master) {
    const ctx = this.ctx, t = ctx.currentTime + when;
    const src = ctx.createBufferSource(); src.buffer = this.buffers.white;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * 3, len + 0.02);
  }

  setVolume(v) {
    this.volume = v;
    if (this.ctx) this.master.gain.setTargetAtTime(v ** 1.5, this.ctx.currentTime, 0.2);
  }

  setMix(mix) {
    this.mix = { rain: 0, city: 0, waves: 0, keys: 0, ...mix };
    this.apply();
  }

  apply() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const level = { rain: 0.32, city: 1.2, waves: 0.35 };
    for (const k of Object.keys(this.layers)) this.layers[k].gain.setTargetAtTime((this.mix[k] || 0) * level[k], t, 1.2);
  }

  // The L. Wheel "clack-clack" pairs over rail joints, a steel roar, a
  // rumble you feel more than hear, and the odd screech.
  #clacks(dest, sec, interval, level, from = 0) {
    for (let k = from; k < sec; ) {
      const iv = typeof interval === 'function' ? interval(k / sec) : interval;
      const env = typeof level === 'function' ? level(k / sec) : level;
      this.#click(0.5 * env, 1400 + Math.random() * 500, 0.035, k, dest);
      this.#click(0.4 * env, 1100 + Math.random() * 400, 0.035, k + 0.11, dest);
      this.#click(0.25 * env, 500, 0.06, k, dest);
      k += iv;
    }
  }

  trainPass(sec = 8, dir = 1) {
    if (!this.#ready()) return;
    if (this.#sample('train-pass', 0)) return;
    const out = this.#panner(-0.8 * dir, 0.8 * dir, sec);
    this.#noise('brown', 'lowpass', 900, 0.7, out, [[sec * 0.35, 1.6], [sec * 0.65, 1.6], [sec, 0.0001]], sec);
    this.#noise('pink', 'bandpass', 750, 0.6, out, [[sec * 0.4, 0.9], [sec * 0.6, 0.9], [sec, 0.0001]], sec);
    this.#clacks(out, sec - 0.5, 0.36, (u) => Math.sin(Math.PI * u) ** 1.5);
    if (Math.random() < 0.6) this.#screech(out, sec * 0.35, 1.6);
  }

  trainArrive(sec = 5, dir = 1) {
    if (!this.#ready()) return;
    if (this.#sample('train-arrive', 0)) return;
    const out = this.#panner(-0.8 * dir, 0, sec);
    this.#noise('brown', 'lowpass', 900, 0.7, out, [[sec * 0.3, 1.5], [sec * 0.8, 0.8], [sec + 0.6, 0.0001]], sec + 0.6);
    this.#noise('pink', 'bandpass', 700, 0.6, out, [[sec * 0.3, 0.7], [sec, 0.0001]], sec);
    this.#clacks(out, sec - 0.4, (u) => 0.28 + u * 0.55, (u) => 1 - u * 0.6);
    this.#screech(out, sec - 1.9, 1.7, 0.9);
    this.#noise('white', 'highpass', 3000, 0.7, out, [[sec + 0.05, 0.0001], [sec + 0.1, 0.35], [sec + 0.9, 0.0001]], sec + 1);
  }

  trainDepart(sec = 6, dir = 1) {
    if (!this.#ready()) return;
    if (this.#sample('train-depart', 0)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const out = this.#panner(0, 0.8 * dir, sec);
    this.#noise('brown', 'lowpass', 900, 0.7, out, [[sec * 0.6, 1.4], [sec, 0.0001]], sec);
    this.#noise('pink', 'bandpass', 750, 0.6, out, [[sec * 0.7, 0.8], [sec, 0.0001]], sec);
    // traction motor whine: rising, slightly stepped, a fifth above itself
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.6);
    g.gain.setValueAtTime(0.06, t + sec * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + sec);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    lp.connect(g); g.connect(out);
    for (const mult of [1, 1.5, 2]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(130 * mult, t);
      for (let k = 1; k <= 6; k++) o.frequency.linearRampToValueAtTime((130 + (k / 6) ** 1.3 * 780) * mult, t + (sec * 0.75 * k) / 6);
      const og = ctx.createGain(); og.gain.value = mult === 1 ? 1 : 0.35;
      o.connect(og); og.connect(lp);
      o.start(t); o.stop(t + sec + 0.1);
    }
    this.#clacks(out, sec, (u) => 0.8 - u * 0.5, (u) => 0.4 + u * 0.6, 0.5);
  }

  // A city bus rolling past: low engine drone that swells and fades, road
  // noise, and a tire whoosh, panned across.
  busPass(sec = 7.5, dir = -1) {
    if (!this.#ready()) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const out = this.#panner(-0.8 * dir, 0.8 * dir, sec);
    this.#noise('brown', 'lowpass', 500, 0.7, out, [[sec * 0.45, 1.1], [sec * 0.55, 1.1], [sec, 0.0001]], sec);
    this.#noise('pink', 'bandpass', 1400, 0.5, out, [[sec * 0.47, 0.35], [sec * 0.53, 0.35], [sec, 0.0001]], sec);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + sec * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + sec);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
    lp.connect(g); g.connect(out);
    for (const f of [52, 104, 157]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f * 1.04, t); o.frequency.linearRampToValueAtTime(f * 0.96, t + sec); // doppler-ish
      o.connect(lp); o.start(t); o.stop(t + sec + 0.1);
    }
  }

  #screech(dest, when, len, level = 0.6) {
    const ctx = this.ctx, t = ctx.currentTime + when;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.035 * level, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const trem = ctx.createOscillator(); trem.frequency.value = 7;
    const tg = ctx.createGain(); tg.gain.value = 0.015 * level;
    trem.connect(tg); tg.connect(g.gain);
    g.connect(dest);
    for (const f of [2750, 4120]) {
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 0.97, t + len);
      o.connect(g); o.start(t); o.stop(t + len + 0.05);
    }
    trem.start(t); trem.stop(t + len + 0.05);
  }

  // The two-tone CTA door chime, then "Doors closing."
  doorsClosing() {
    if (!this.#ready()) return;
    if (this.#sample('doors-closing', 0)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const bell = (freq, at, dur) => {
      for (const [ratio, amp] of [[1, 0.5], [2, 0.14], [2.76, 0.09], [5.4, 0.035]]) {
        const o = ctx.createOscillator(); o.frequency.value = freq * ratio;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t + at);
        g.gain.exponentialRampToValueAtTime(amp, t + at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur / ratio ** 0.3);
        o.connect(g); g.connect(bus);
        o.start(t + at); o.stop(t + at + dur + 0.05);
      }
    };
    const bus = this.#sceneBus();
    bell(659.25, 0, 1.3);
    bell(523.25, 0.48, 1.8);
    if ('speechSynthesis' in window) {
      clearTimeout(this.speechTimer);
      this.speechTimer = setTimeout(() => {
        const u = new SpeechSynthesisUtterance('Doors closing.');
        const voices = speechSynthesis.getVoices().filter((v) => /^en[-_]US/i.test(v.lang));
        u.voice = voices.find((v) => /male|david|guy|fred|alex|daniel/i.test(v.name) && !/female/i.test(v.name)) || voices[0] || null;
        u.rate = 0.95; u.pitch = 0.85;
        u.volume = Math.min(1, this.volume * 1.4);
        speechSynthesis.speak(u);
      }, 1400);
    }
  }

  purr() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.buffers.brown; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
    const am = ctx.createGain(); am.gain.value = 0;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 24;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.9;
    lfo.connect(lfoGain); lfoGain.connect(am.gain);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(1.6, t + 0.3);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    src.connect(lp); lp.connect(am); am.connect(env); env.connect(this.#sceneBus());
    src.start(t); lfo.start(t); src.stop(t + 2.3); lfo.stop(t + 2.3);
  }

  // Animal Crossing-style "animalese" blip per character.
  blip(ch) {
    if (!this.ctx || this.volume < 0.01 || !/[a-z0-9]/i.test(ch)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'square';
    const code = ch.toLowerCase().charCodeAt(0);
    o.frequency.value = 380 + ((code * 37) % 9) * 38;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.07);
  }
}
