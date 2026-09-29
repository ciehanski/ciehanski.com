// Self-hosted music player: a playlist of audio files played through a
// single <audio> element. Shuffle, next/prev, volume, seeking, and OS media
// controls (lock screen, media keys) via the Media Session API.

import { SongPlayer } from './lofi.js';

export function initMusic({ tracks, onState, volume = 0.6, shuffle = true, resume = null }) {
  const audio = new Audio();
  audio.preload = 'none';
  audio.volume = volume;
  let vol = volume;
  let el = audio;          // what's playing now: the <audio> element, or a generative JazzhopTrack
  let gen = null;

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

  function load(i, autoplay) {
    if (!tracks.length) return;
    state.index = i;
    state.error = null;
    const crossfade = !!gen && !!autoplay;
    if (gen) { gen.fadeOut(crossfade ? 5 : 1.5); gen = null; }       // the last song fades out as the next comes in
    if (tracks[i].gen) {
      audio.pause();
      gen = new SongPlayer(tracks[i].gen, vol);
      if (crossfade) gen.fadeIn = 4;
      if (resume?.index === i) gen.startAt = resume.position;                  // back where we were before the refresh
      for (const [ev, fn] of Object.entries(handlers)) gen.addEventListener(ev, fn);
      el = gen;
    } else {
      el = audio;
      audio.src = tracks[i].src;
      if (resume?.index === i && resume.position > 0) { const at = resume.position; audio.addEventListener('loadedmetadata', () => { audio.currentTime = at; }, { once: true }); }
    }
    resume = null;
    if (autoplay) play();
    mediaSession();
    emit();
  }

  function play() {
    if (!tracks.length) return;
    if (state.index < 0) { load(order[0], false); }
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
    nearend: () => { state.paused = false; next(true); },          // crossfade into the next song
  };
  for (const [ev, fn] of Object.entries(handlers)) audio.addEventListener(ev, fn);
  audio.addEventListener('waiting', () => { state.loading = true; emit(); });
  audio.addEventListener('canplay', () => { state.loading = false; emit(); });
  audio.addEventListener('loadedmetadata', emit);
  audio.addEventListener('error', () => {
    if (el !== audio) return;
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
    if (el === audio && audio.currentTime > 4) { audio.currentTime = 0; return; }
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
    // switch to a track by its scene (theme music follows the scene), keeping play/pause state
    playScene(id) {
      const i = tracks.findIndex((t) => t.scene === id);
      if (i < 0 || i === state.index) return;
      makeOrder(i); load(i, !state.paused);
    },
    seek(frac) { if (state.duration && el === audio) audio.currentTime = frac * state.duration; },
    setVolume(v) { vol = v; audio.volume = v; if (gen) gen.volume = v; },
    setShuffle(on) { state.shuffle = on; makeOrder(state.index >= 0 ? state.index : null); emit(); },
  };
}
