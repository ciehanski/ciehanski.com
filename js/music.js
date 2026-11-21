// Self-hosted music player: a playlist of audio files played through a
// single <audio> element. Shuffle, next/prev, volume, seeking, and OS media
// controls (lock screen, media keys) via the Media Session API.

export function initMusic({ tracks, onState, volume = 0.6, shuffle = true, resume = null }) {
  const audio = new Audio();
  audio.preload = 'auto';
  audio.volume = volume;
  const el = audio;
  let vol = volume;
  // iPhones and iPads ignore <audio>.volume, so there the audio goes through a
  // Web Audio gain node instead. (Detected by device: newer iOS reads the set
  // value back even though it has no effect.)
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // Web Audio on iOS is silenced by the mute switch unless the page asks for media playback.
  if (isIOS && 'audioSession' in navigator) { try { navigator.audioSession.type = 'playback'; } catch { /* older iOS */ } }
  let ctx = null, gain = null;
  function ensureGain() {
    if (!isIOS) return;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      gain = ctx.createGain();
      gain.gain.value = vol;
      ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination);
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
  }
  // iOS only lets audio start inside a tap, and suspends it when the page is
  // backgrounded; resume on the next tap so the music is never silently "playing".
  if (isIOS) for (const ev of ['touchend', 'pointerup', 'keydown']) {
    addEventListener(ev, () => { if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); }, { passive: true });
  }

  const state = {
    tracks, index: -1, paused: true, shuffle, loading: false, error: null,
    get track() { return tracks[this.index] || null; },
    get position() { return el.currentTime || 0; },
    get duration() { return Number.isFinite(el.duration) ? el.duration : 0; },
  };
  let order = [];
  let failures = 0;

  const emit = () => onState(state);

  function makeOrder(startAt) {
    order = tracks.map((_, i) => i);
    if (state.shuffle) {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    }
    if (startAt == null) return;
    if (state.shuffle) order = [startAt, ...order.filter((i) => i !== startAt)];
    else order = [...order.slice(startAt), ...order.slice(0, startAt)];      // in order, just starting from there
  }
  if (resume && !(resume.index >= 0 && resume.index < tracks.length)) resume = null;
  makeOrder(resume ? resume.index : tracks.length ? (shuffle ? Math.floor(Math.random() * tracks.length) : 0) : null);
  // Start buffering the first song (or the one a refresh resumes) as soon as the
  // page loads, so pressing play doesn't wait on the download.
  // A fresh visit starts the first song a few seconds in (a refresh still picks
  // up exactly where it was).
  const FIRST_SONG_START = 5;                                                     // seconds
  if (!resume && tracks.length) resume = { index: order[0], position: FIRST_SONG_START };
  let preloaded = null;
  if (tracks.length) {
    preloaded = tracks[order[0]].src;
    audio.src = preloaded;
    const at = resume?.position || 0;
    if (at > 0) audio.addEventListener('loadedmetadata', () => { if (preloaded) audio.currentTime = at; }, { once: true });   // buffer from there
  }

  function load(i, autoplay) {
    if (!tracks.length) return;
    state.index = i;
    state.error = null;
    if (tracks[i].src !== preloaded) audio.src = tracks[i].src;                  // already buffering? keep it
    preloaded = null;
    if (resume?.index === i && resume.position > 0) {
      const at = resume.position;
      if (audio.readyState >= 1) audio.currentTime = at;                         // metadata already loaded by the preload
      else audio.addEventListener('loadedmetadata', () => { audio.currentTime = at; }, { once: true });
    }
    resume = null;
    if (autoplay) play();
    mediaSession();
    emit();
  }

  function play() {
    if (!tracks.length) return;
    if (state.index < 0) { load(order[0], false); }
    ensureGain();
    state.loading = true;
    emit();
    const p = el.play();
    if (p) p.catch((err) => {
      state.loading = false;
      // NotAllowedError = autoplay blocked until the visitor interacts; anything else is a bad file.
      if (err.name === 'NotAllowedError') state.blocked = true;
      else if (err.name !== 'AbortError') state.error = err.message;
      emit();
    });
  }

  const handlers = {
    playing: () => { state.paused = false; state.loading = false; state.blocked = false; failures = 0; emit(); },
    pause: () => { state.paused = true; emit(); },
    ended: () => { state.paused = false; next(true); },
  };
  for (const [ev, fn] of Object.entries(handlers)) audio.addEventListener(ev, fn);
  audio.addEventListener('waiting', () => { state.loading = true; emit(); });
  audio.addEventListener('canplay', () => { state.loading = false; emit(); });
  audio.addEventListener('loadedmetadata', emit);
  audio.addEventListener('error', () => {
    if (state.index < 0) { preloaded = null; return; }                          // the early preload failed: just load it again on play
    state.error = 'Could not load ' + (state.track?.title || 'track');
    state.loading = false;
    emit();
    // skip broken files, but don't spin forever if everything is broken
    if (++failures < tracks.length) setTimeout(() => next(true), 800);
  });

  function next(autoplay = !state.paused) {
    if (!tracks.length) return;
    const pos = order.indexOf(state.index);
    let n = pos + 1;
    if (n >= order.length) { makeOrder(); n = 0; }
    load(order[n], autoplay);
  }

  function prev() {
    if (audio.currentTime > 4) { audio.currentTime = 0; return; }
    const pos = order.indexOf(state.index);
    load(order[(pos - 1 + order.length) % order.length], !state.paused);
  }

  function mediaSession() {
    if (!('mediaSession' in navigator) || !state.track) return;
    const t = state.track;
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist || '', album: 'ciehanski.com' });
  }
  if ('mediaSession' in navigator) {
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', play);
    ms.setActionHandler('pause', () => el.pause());
    ms.setActionHandler('nexttrack', () => next());
    ms.setActionHandler('previoustrack', prev);
  }

  return {
    state,
    get empty() { return !tracks.length; },
    play,
    pause: () => el.pause(),
    toggle() { if (el.paused) play(); else el.pause(); },
    next: () => next(),
    prev,
    playIndex(i) { makeOrder(i); load(i, true); },
    seek(frac) { if (state.duration) audio.currentTime = frac * state.duration; },
    setVolume(v) { vol = v; audio.volume = v; if (gain) gain.gain.value = v; },
    setShuffle(on) { state.shuffle = on; makeOrder(state.index >= 0 ? state.index : null); emit(); },
  };
}
