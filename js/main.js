import { W, H, S, canvas, canvasHi } from './px.js';
import desk from './scenes/desk.js';
import lincoln from './scenes/lincoln.js';
import lakefront from './scenes/lakefront.js';
import fullerton from './scenes/fullerton.js';
import olive from './scenes/olive.js';
// import conservatory from './scenes/conservatory.js'; // out of rotation for now
import msi from './scenes/msi.js';
import { chicagoWeather, isFrozen } from './weather.js';
import { skyState, phaseLabel, moonName } from './sky.js';
import { Ambience } from './audio.js';
import { hydrateIcons, setIcon } from './icons.js';
import { initMusic } from './music.js';
import { sceneThemes } from './lofi.js';
import { startPresence } from './presence.js';

// Tour order alternates city streets and the lakefront, so similar views never run back to back.
const SCENES = [desk, lakefront, lincoln, fullerton, msi, olive];
const SCENE_SECONDS = 60;
const FADE_SECONDS = 3;
const WEATHER_MODES = ['live', 'clear', 'rain', 'snow'];

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Per-visitor preferences. Storage can be unavailable (private mode etc.).
const store = {
  get(k, d) { try { const v = localStorage.getItem('px:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('px:' + k, JSON.stringify(v)); } catch { /* fine */ } },
};

// ?time=18:45 previews a Chicago local time; ?clouds=0..100 previews cloud cover.
function timeOffset() {
  const m = (params.get('time') || '').match(/^(\d{1,2}):?(\d{2})$/);
  if (!m) return 0;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const now = +parts.find((p) => p.type === 'hour').value * 60 + +parts.find((p) => p.type === 'minute').value;
  return ((+m[1] * 60 + +m[2]) - now) * 60000;
}
const TIME_OFFSET = timeOffset();
const chicagoNow = () => new Date(Date.now() + TIME_OFFSET);

const state = {
  t: +(params.get('t') || 0),
  idx: 0,
  next: null,
  fadeT: 0,
  focus: 0.5,
  pan: 0,
  // the slow side-to-side drift: on by default on phones and tablets, off elsewhere
  drift: store.get('drift', matchMedia('(pointer: coarse)').matches),
  panHome: false,
  sceneT: 0,
  tour: store.get('tour', !reducedMotion),
  weatherMode: params.get('weather') || 'live', // always start on real Chicago weather
  live: null,
  content: null,
};
// Every visit opens on My Desk (a ?scene= link can still deep-link); the tour moves on from there.
// A refresh picks up where you were instead: the same scene, just as far into it, and the same
// song at the same spot. That lives in sessionStorage, so it's per tab and a new visit starts fresh.
const session = {
  get() { try { return JSON.parse(sessionStorage.getItem('px:resume') || 'null'); } catch { return null; } },
  set(v) { try { sessionStorage.setItem('px:resume', JSON.stringify(v)); } catch { /* fine */ } },
};
const resume = params.get('scene') ? null : session.get();
const startScene = params.get('scene') || resume?.scene || 'desk';
state.idx = Math.max(0, SCENES.findIndex((s) => s.id === startScene));
if (resume?.scene === SCENES[state.idx].id) state.sceneT = Math.min(Math.max(0, +resume.sceneT || 0), SCENE_SECONDS);
function saveSession() {
  session.set({
    scene: SCENES[state.next ?? state.idx].id, sceneT: state.next != null ? 0 : state.sceneT,
    track: music?.state.track?.title ?? resume?.track, pos: music?.state.track ? music.state.position : resume?.pos,
  });
}
setInterval(saveSession, 1000);
addEventListener('pagehide', saveSession);

const amb = new Ambience();
let music;

// ------------------------------------------------------------------ stage

const view = $('scene');
view.width = W * S;
view.height = H * S;
const vg = view.getContext('2d');
vg.setTransform(S, 0, 0, S, 0, 0); // scenes draw in 480x270 units onto the 2x canvas
vg.imageSmoothingEnabled = false;
const bufA = canvasHi(), bufB = canvasHi();
let layout = { scale: 1, left: 0, top: 0 };

// `focus` is the horizontal point (0..1) of the scene kept centred when the
// screen is narrower than the scene; `state.pan` shifts it (drag, or the slow
// drift on phones).
//
// On a tall screen (a phone held upright) filling the height would zoom in on
// a quarter of the scene, so instead it shows a wide band across the middle
// (about 60% of the scene's width) over a soft, blurred copy of itself.
const PORTRAIT_SHOW = 0.6;
const backdrop = $('backdrop'), bg = backdrop.getContext('2d');
function fit(focus = state.focus) {
  state.focus = focus;
  const cover = Math.max(innerWidth / W, innerHeight / H);
  const tall = innerHeight > innerWidth * 1.15;
  const scale = tall ? Math.min(cover, innerWidth / (W * PORTRAIT_SHOW)) : cover;
  const w = W * scale, h = H * scale;
  const slack = Math.max(0, (w - innerWidth) / 2 / w);                             // how far the view can pan, in focus units
  state.pan = Math.max(-slack, Math.min(slack, state.pan));
  const left = Math.round(Math.min(0, Math.max(innerWidth - w, innerWidth / 2 - (focus + state.pan) * w)));
  const top = Math.round(h < innerHeight ? (innerHeight - h) * 0.46 : (innerHeight - h) / 2);
  if (left !== layout.left || top !== layout.top || scale !== layout.scale)
    Object.assign(view.style, { width: w + 'px', height: h + 'px', left: left + 'px', top: top + 'px' });
  layout = { scale, left, top, slack, w };
  document.body.classList.toggle('banded', h < innerHeight - 2);
  $('chip-drift').hidden = !slack;                                                 // nothing to pan when the whole width fits
}
addEventListener('resize', () => fit());

// When the scene is wider than the screen: drag sideways to look around, and
// (with Drift on) it pans slowly from side to side so the whole room gets seen.
// Turning Drift off eases the view back to the centre.
let drag = null, draggedAt = -1e9, suppressClick = false;
function panStep(dt) {
  if (!layout.slack) return;
  if (drag) return fit();
  if (state.panHome) {
    state.pan += (0 - state.pan) * Math.min(1, dt * 0.8);
    if (Math.abs(state.pan) < 0.0005) { state.pan = 0; state.panHome = false; }
  } else if (state.drift && !reducedMotion && performance.now() - draggedAt > 9000) {
    const target = layout.slack * 0.9 * Math.sin(state.t * (2 * Math.PI / 90));
    state.pan += (target - state.pan) * Math.min(1, dt * 0.35);
  }
  fit();
}

function sky() {
  const w = weather();
  const forced = params.get('clouds');
  const cover = forced != null ? +forced / 100
    : state.weatherMode === 'live' ? state.live?.cover ?? 0.2
    : state.weatherMode === 'clear' ? 0.08 : 0.9;
  const st = skyState(chicagoNow(), { cover, weather: w });
  if (params.get('month')) st.month = (+params.get('month') - 1 + 12) % 12; // preview a season
  return st;
}

function weather() {
  return state.weatherMode === 'live' ? state.live?.kind || 'clear' : state.weatherMode;
}

function sfx(name, o = {}) {
  if (name === 'train') amb.trainPass(o.sec, o.dir);
  else if (name === 'train-arrive') amb.trainArrive(o.sec, o.dir);
  else if (name === 'train-depart') amb.trainDepart(o.sec, o.dir);
  else if (name === 'doors') amb.doorsClosing();
  else if (name === 'bus') amb.busPass(o.sec, o.dir);
  else if (name === 'purr') amb.purr();
}

let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  step(now);
}
function step(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += elapsed;
  if (acc < 1 / 32) return; // ~30fps is plenty for pixel art
  const dt = acc;
  acc = 0;
  state.t += dt;
  state.sceneT += dt;

  if (state.tour && state.next == null && state.sceneT > SCENE_SECONDS) goTo((state.idx + 1) % SCENES.length);

  if (!state.sky || state.t - state.skyAt > 5) { state.sky = sky(); state.skyAt = state.t; }
  const cur = SCENES[state.idx];
  const env = { weather: weather(), sky: state.sky, sfx: (n, o) => state.next == null && !cur.silent && sfx(n, o) };
  if (state.next == null) {
    cur.draw(vg, state.t, dt, env);
  } else {
    state.fadeT += dt;
    const u = Math.min(1, state.fadeT / FADE_SECONDS);
    cur.draw(bufA.g, state.t, dt, env);
    SCENES[state.next].draw(bufB.g, state.t, dt, { ...env, sfx: () => {} });
    // A plain crossfade on a soft "smootherstep" curve: no motion, no stepping.
    const ease = u * u * u * (u * (u * 6 - 15) + 10);
    vg.globalAlpha = 1;
    vg.drawImage(bufA.c, 0, 0, W, H);
    vg.globalAlpha = ease;
    vg.drawImage(bufB.c, 0, 0, W, H);
    vg.globalAlpha = 1;
    if (u >= 1) {
      state.idx = state.next;
      state.next = null;
    }
  }
  drawHearts(dt);
  panStep(dt);
  if (document.body.classList.contains('banded') && (bgTick = (bgTick + 1) % 4) === 0) bg.drawImage(view, 0, 0, backdrop.width, backdrop.height);
  updateProgress();
}
let bgTick = 0;

function goTo(i) {
  // Ignore requests until the current transition has finished.
  if (state.next != null || i === state.idx) return;
  amb.fadeOutScene(FADE_SECONDS); // taper any train/bus/chime still playing
  SCENES[i].build();
  state.next = i;
  state.fadeT = 0;
  state.sceneT = 0;
  store.set('scene', SCENES[i].id);
  showSceneInfo(SCENES[i]);
  applyMix(SCENES[i]);
}

function showSceneInfo(s) {
  $('scene-name').textContent = s.name;
  $('scene-blurb').textContent = s.blurb;
  $('chip-scene-name').textContent = s.name;
}

function applyMix(s) {
  if (s.silent) return amb.setMix({});
  const a = s.ambience || {};
  const w = weather();
  const iced = isFrozen(sky().month);                                             // no lapping waves on a frozen lake
  amb.setMix({ city: a.city || 0, waves: iced ? 0 : a.waves || 0, keys: a.keys || 0, rain: w === 'rain' ? (a.rain ?? 1) : 0 });
}

// ------------------------------------------------------------------ hotspots

const tip = $('tip');
function hit(e) {
  const x = (e.clientX - layout.left) / layout.scale;
  const y = (e.clientY - layout.top) / layout.scale;
  if (state.next != null) return null;
  const s = SCENES[state.idx];
  return s.hotspots.find((h) => x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h) || null;
}

const stage = $('stage');
stage.addEventListener('pointermove', (e) => {
  const h = hit(e);
  stage.style.cursor = h ? 'pointer' : '';
  if (h && e.pointerType === 'mouse') {
    tip.hidden = false;
    tip.textContent = h.label;
    tip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 12}px)`;
  } else tip.hidden = true;
});
stage.addEventListener('pointerleave', () => { tip.hidden = true; });
stage.addEventListener('pointerdown', (e) => {
  if (!layout.slack) return;
  drag = { id: e.pointerId, x: e.clientX, pan: state.pan, moved: false };
});
stage.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x;
  if (!drag.moved && Math.abs(dx) < 8) return;                                   // a tap, not a drag (yet)
  drag.moved = true;
  state.pan = drag.pan - dx / layout.w;
  fit();
});
const endDrag = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  if (drag.moved) { draggedAt = performance.now(); suppressClick = true; setTimeout(() => { suppressClick = false; }, 50); }
  drag = null;
};
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('click', (e) => {
  if (suppressClick) return;                                                      // that was a drag
  document.querySelectorAll('.pop').forEach((p) => p.setAttribute('aria-hidden', 'true'));
  const h = hit(e);
  if (h) return SCENES[state.idx].click(h.id, api);
  // Clicking empty scenery starts the music if it's paused; it never stops it
  // (that's what the pause button is for).
  if (performance.now() - startedByGestureAt < 400) return;
  if (music && !music.empty && music.state.paused) music.play();
  // ...and pops a pixel heart that everyone on this scene sees (a few per second at most).
  const now = performance.now();
  if (now - lastHeartAt < HEART_COOLDOWN || state.next != null) return;
  lastHeartAt = now;
  const x = (e.clientX - layout.left) / layout.scale, y = (e.clientY - layout.top) / layout.scale;
  hearts.push(newHeart(x, y));
  live.sendHeart({ x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2, scene: SCENES[state.idx].id, from: ME });
});

// ------------------------------------------------------------------ shared hearts

// Minecraft-style heart: 9x8, dark outline, red body, a white-and-pink shine.
const HEART = [
  '.KK...KK.',
  'KRRK.KRRK',
  'KWRRKRRRK',
  'KRRRRRRRK',
  '.KRRRRRK.',
  '..KRRRK..',
  '...KRK...',
  '....K....',
];
const HEART_COL = { K: '#2a0a0e', R: '#e0283a', W: '#ffe0e4' };
const heartSprite = (() => {
  const c = document.createElement('canvas');
  c.width = 9; c.height = 8;
  const g = c.getContext('2d');
  HEART.forEach((row, y) => [...row].forEach((ch, x) => { if (HEART_COL[ch]) { g.fillStyle = HEART_COL[ch]; g.fillRect(x, y, 1, 1); } }));
  g.fillStyle = '#b01828'; for (const [x, y] of [[6, 3], [5, 4], [4, 5]]) g.fillRect(x, y, 1, 1); // shading
  return c;
})();
const hearts = [];
let live = { sendHeart() {} }, lastHeartAt = -1e9;
// Limits: one heart per visitor every 1.5s, the same enforced on what we receive
// (per sender), a cap on incoming hearts per second overall, and a cap on screen.
const HEART_COOLDOWN = 1500, MAX_ON_SCREEN = 24, MAX_INCOMING_PER_SEC = 6;
const ME = Math.random().toString(36).slice(2, 10);
const lastFrom = new Map();
let incoming = [];
function acceptHeart(h) {
  const now = performance.now();
  if (typeof h.from !== 'string' || h.from.length > 16 || h.from === ME) return;
  if (now - (lastFrom.get(h.from) ?? -1e9) < HEART_COOLDOWN * 0.9) return;   // that sender is going too fast
  incoming = incoming.filter((t) => now - t < 1000);
  if (incoming.length >= MAX_INCOMING_PER_SEC || hearts.length >= MAX_ON_SCREEN) return;
  lastFrom.set(h.from, now); incoming.push(now);
  if (lastFrom.size > 500) lastFrom.clear();
  hearts.push(newHeart(h.x, h.y));
}
const newHeart = (x, y) => ({ x, y, life: 1.6, drift: (Math.random() - 0.5) * 6 });

function drawHearts(dt) {
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    h.life -= dt;
    if (h.life <= 0) { hearts.splice(i, 1); continue; }
    const age = 1.6 - h.life;
    const pop = age < 0.12 ? 0.6 + (age / 0.12) * 0.6 : age < 0.22 ? 1.2 - ((age - 0.12) / 0.1) * 0.2 : 1; // little bounce
    const w = 9 * pop, h8 = 8 * pop;             // 9x8 sprite, 2 real pixels per heart pixel
    vg.globalAlpha = Math.min(1, h.life / 0.5);
    const hx = Math.round((h.x + h.drift * age - w / 2) * 2) / 2, hy = Math.round((h.y - age * 16 - h8) * 2) / 2;
    vg.drawImage(heartSprite, hx, hy, w, h8);
  }
  vg.globalAlpha = 1;
}

const api = {
  say,
  open: (route) => navigate('/' + route),
  music: () => togglePop('music', true),
  moonName: () => moonName(state.sky?.moon ?? 0.5),
  sfx,
};

// ------------------------------------------------------------------ dialogue

let sayTimer = null, typeTimer = null, typing = false;
function say(name, text) {
  document.querySelectorAll('.pop').forEach((p) => p.setAttribute('aria-hidden', 'true'));
  const box = $('say');
  box.hidden = false;
  $('say-name').textContent = name;
  $('say-name').hidden = !name;
  const p = $('say-text');
  p.textContent = '';
  clearInterval(typeTimer);
  clearTimeout(sayTimer);
  let i = 0;
  typing = true;
  typeTimer = setInterval(() => {
    const ch = text[i++];
    if (ch === undefined) { finish(); return; }
    p.textContent += ch;
    if (i % 2) amb.blip(ch);
  }, 28);
  const finish = () => {
    clearInterval(typeTimer);
    p.textContent = text;
    typing = false;
    sayTimer = setTimeout(hideSay, 4000 + text.length * 45);
  };
  box.onclick = () => (typing ? finish() : hideSay());
}
function hideSay() {
  clearInterval(typeTimer);
  clearTimeout(sayTimer);
  $('say').hidden = true;
}

// ------------------------------------------------------------------ HUD

const clockFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' });
function tick() {
  const s = clockFmt.format(chicagoNow()).toLowerCase();
  state.sky = sky();
  $('phase').textContent = phaseLabel(state.sky);
  $('clock').textContent = s;
  $('chip-clock').textContent = s;
}
setInterval(tick, 1000 * 15);

let weatherAt = 0;
async function refreshWeather() {
  try {
    state.live = await chicagoWeather();
    weatherAt = Date.now();
    $('weather-text').textContent = `${state.live.temp}°F · ${state.live.label} in Chicago`;
    $('weather-pill').hidden = false;
  } catch {
    // keep the last good reading; try again soon
    setTimeout(refreshWeather, 60 * 1000);
  }
  showWeather();
}

function showWeather() {
  const w = weather();
  const mode = state.weatherMode;
  $('weather-state').textContent = mode === 'live' ? (state.live ? `live · ${state.live.temp}°` : 'live') : mode;
  state.sky = sky();
  setIcon($('weather-icon'), w !== 'clear' ? w : state.sky.overcast > 0.5 ? 'cloud' : state.sky.daylight > 0.5 ? 'sun' : 'clear');
  applyMix(SCENES[state.next ?? state.idx]);
}

function showDrift() {
  $('drift-state').textContent = state.drift ? 'on' : 'off';
  $('chip-drift').classList.toggle('on', state.drift);
}
function toggleDrift() {
  state.drift = !state.drift;
  state.panHome = !state.drift;
  store.set('drift', state.drift);
  showDrift();
}

function showTour() {
  $('tour-state').textContent = state.tour ? 'on' : 'off';
  $('chip-tour').classList.toggle('on', state.tour);
}

// ------------------------------------------------------------------ popovers

function togglePop(name, force) {
  const el = $('pop-' + name);
  const open = force ?? el.getAttribute('aria-hidden') === 'true';
  for (const other of document.querySelectorAll('.pop')) if (other !== el) other.setAttribute('aria-hidden', 'true');
  el.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (open) hideSay();
  if (open && name === 'scenes') renderThumbs();
}
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => togglePop(b.dataset.close, false)));

let thumbsDone = false;
function renderThumbs() {
  const box = $('thumbs');
  if (!thumbsDone) {
    thumbsDone = true;
    SCENES.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'thumb';
      const c = canvas();
      s.build();
      s.draw(c.g, 6, 0, { weather: weather(), sky: state.sky || sky(), sfx: () => {} });
      b.append(c.c);
      const label = document.createElement('span');
      label.textContent = s.name;
      b.append(label);
      b.addEventListener('click', () => { goTo(i); togglePop('scenes', false); });
      box.append(b);
    });
  }
  [...box.children].forEach((b, i) => b.classList.toggle('active', i === (state.next ?? state.idx)));
}

// ------------------------------------------------------------------ music UI

function onMusic(s) {
  setIcon($('btn-play').querySelector('i'), s.paused ? 'play' : 'pause');
  $('btn-play').classList.toggle('playing', !s.paused);
  const t = s.track;
  const title = !s.tracks.length ? 'ciehanski radio' : t ? t.title : 'ciehanski radio';
  const sub = !s.tracks.length ? 'no tracks yet'
    : s.error ? s.error
    : s.blocked && s.paused ? 'click anywhere to play'
    : !t ? `${s.tracks.length} tracks · press play`
    : s.loading && !s.paused ? 'loading…'
    : (t.artist || 'unknown artist') + (s.paused ? ' · paused' : '');
  $('now-title').textContent = title;
  $('now-title').title = t ? `${t.title}${t.artist ? ' — ' + t.artist : ''}` : '';
  $('now-sub').textContent = sub;
  $('btn-shuffle').setAttribute('aria-pressed', String(s.shuffle));
  [...$('tracklist').querySelectorAll('li')].forEach((li, i) => li.classList.toggle('current', i === s.index));
  const credit = $('music-credits');
  credit.textContent = '';
  if (t?.credit) {
    const a = document.createElement(t.creditUrl ? 'a' : 'span');
    a.textContent = t.credit;
    if (t.creditUrl) { a.href = t.creditUrl; a.target = '_blank'; a.rel = 'noopener'; }
    credit.append(a);
  } else credit.textContent = state.content?.site?.musicNote || '';
}

function renderTracklist(tracks) {
  const list = $('tracklist');
  list.innerHTML = '';
  if (!tracks.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No tracks yet. Drop audio files into site/music/ and run node build.mjs.';
    list.append(li);
    return;
  }
  tracks.forEach((t, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    const n = document.createElement('span'); n.className = 'n'; n.textContent = i + 1;
    const title = document.createElement('span'); title.className = 't'; title.textContent = t.title;
    const artist = document.createElement('span'); artist.className = 'a'; artist.textContent = t.artist || '';
    b.append(n, title, artist);
    b.addEventListener('click', () => { gesture(); music.playIndex(i); });
    li.append(b);
    list.append(li);
  });
}

function updateProgress() {
  if (!music) return;
  const s = music.state;
  $('now-progress').style.width = s.duration ? Math.min(100, (s.position / s.duration) * 100) + '%' : '0';
}

// ------------------------------------------------------------------ windows / routing

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

async function loadContent() {
  if (state.content) return state.content;
  try {
    const res = await fetch('/data/content.json');
    state.content = await res.json();
  } catch {
    state.content = { site: {}, about: '<p>Content failed to load.</p>', projects: [], posts: [] };
  }
  return state.content;
}

// Live GitHub star counts: one request per owner per visit, falling back to
// the counts saved in projects.json if the API is unreachable or rate-limited.
async function liveStars(projects) {
  const owners = [...new Set(projects.filter((p) => p.repo).map((p) => p.repo.split('/')[0]))];
  for (const owner of owners) {
    let counts = null;
    try { counts = JSON.parse(sessionStorage.getItem('px:stars:' + owner)); } catch { /* no storage */ }
    if (!counts) {
      try {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(owner)}/repos?per_page=100`);
        if (!res.ok) continue;
        counts = Object.fromEntries((await res.json()).map((r) => [r.full_name.toLowerCase(), r.stargazers_count]));
        try { sessionStorage.setItem('px:stars:' + owner, JSON.stringify(counts)); } catch { /* fine */ }
      } catch { continue; }
    }
    document.querySelectorAll('.stars[data-repo]').forEach((el) => {
      const n = counts[el.dataset.repo.toLowerCase()];
      if (n != null) el.querySelector('b').textContent = n.toLocaleString();
    });
  }
}

function currentRoute() {
  const h = location.hash.replace(/^#/, '');
  if (h && h !== '/') return h;
  if (window.__ROUTE__ && location.pathname.startsWith('/blog/')) return window.__ROUTE__;
  return '/';
}

function navigate(path) {
  if (path === '/') {
    history.pushState(null, '', '/');
  } else {
    history.pushState(null, '', '/#' + path);
  }
  render();
}
addEventListener('popstate', render);
addEventListener('hashchange', render);

const WIN = {
  about: { title: 'About', icon: 'user', cls: 'tab-about' },
  projects: { title: 'Projects', icon: 'code', cls: 'tab-projects' },
  blog: { title: 'Blog', icon: 'book', cls: 'tab-blog' },
  help: { title: 'Controls', icon: 'help', cls: 'tab-help' },
};

async function render() {
  const route = currentRoute();
  const wrap = $('win-wrap');
  document.querySelectorAll('.nav a[data-route]').forEach((a) => a.classList.toggle('active', route.startsWith(a.dataset.route)));
  if (route === '/') { wrap.hidden = true; return; }
  const [, section, slug] = route.split('/');
  const meta = WIN[section];
  if (!meta) { wrap.hidden = true; return; }
  const c = await loadContent();
  const win = $('win');
  win.className = 'win ' + meta.cls;
  $('win-title').textContent = slug ? 'Blog' : meta.title;
  setIcon($('win-icon'), meta.icon);
  $('win-back').hidden = !slug;
  const body = $('win-body');
  body.innerHTML = '';
  wrap.hidden = false;

  if (section === 'about') {
    const s = c.site || {};
    body.innerHTML = `<div class="prose">${c.about}</div>
      <div class="links">${(s.links || []).map((l) => `<a class="link-btn" href="${esc(l.url)}"${/^https?:/.test(l.url) ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)}</a>`).join('')}
      <a class="link-btn" href="/feed.xml">RSS</a></div>`;
  } else if (section === 'projects') {
    body.innerHTML = `<div class="cards">${c.projects.map((p) => `
      <a class="card" ${p.url ? `href="${esc(p.url)}" target="_blank" rel="noopener"` : ''}>
        <div class="card-top"><h3>${esc(p.name)}</h3>${p.status ? `<span class="badge">${esc(p.status)}</span>` : ''}
          ${p.repo ? `<span class="stars" data-repo="${esc(p.repo)}" title="GitHub stars">★ <b>${esc(p.stars ?? '–')}</b></span>` : ''}</div>
        <p>${esc(p.description)}</p>
        <div class="tags">${(p.tags || []).map((t) => `<span>${esc(t)}</span>`).join('')}</div>
      </a>`).join('')}</div>`;
    liveStars(c.projects);
  } else if (section === 'blog' && !slug) {
    body.innerHTML = c.posts.length ? `<ul class="posts">${c.posts.map((p) => `
      <li><a href="#/blog/${esc(p.slug)}">
        <time datetime="${esc(p.date)}">${esc(fmtDate(p.date))}</time>
        <strong>${esc(p.title)}</strong>
        ${p.summary ? `<span>${esc(p.summary)}</span>` : ''}
      </a></li>`).join('')}</ul>` : '<p class="prose">Coming soon.</p>';
  } else if (section === 'blog') {
    const post = c.posts.find((p) => p.slug === slug);
    if (!post) { body.innerHTML = '<p class="prose">That post wandered off.</p>'; return; }
    const pre = document.getElementById('prerendered');
    let html = pre?.dataset.slug === slug ? pre.querySelector('.pr-body')?.innerHTML : null;
    if (!html) {
      try { html = await (await fetch(`/data/posts/${encodeURIComponent(slug)}.html`)).text(); } catch { html = '<p>Could not load this post.</p>'; }
    }
    body.innerHTML = `<header class="post-head"><h1>${esc(post.title)}</h1>
      <p><time datetime="${esc(post.date)}">${esc(fmtDate(post.date))}</time>${(post.tags || []).map((t) => ` · <span>#${esc(t)}</span>`).join('')}
      · <a href="/blog/${esc(post.slug)}/">permalink</a></p></header>
      <div class="prose">${html}</div>`;
    document.title = `${post.title} · ciehanski.com`;
  } else if (section === 'help') {
    const touch = matchMedia('(pointer: coarse)').matches;
    const gestures = [
      ['Tap', 'the scenery to start the music (and send a heart)'], ['Drag', 'sideways to look around the scene'],
      ['Scene chip', 'pick a scene'], ['Tour', 'rotate scenes by themselves'], ['Drift', 'slowly pan across the scene'], ['Weather', 'live → clear → rain → snow'],
    ];
    const keys = touch ? gestures : [
      ['Space', 'play / pause music'], ['N / B', 'next / previous track'], ['← →', 'previous / next scene'], ['S', 'scene picker'], ['T', 'tour (auto-rotate)'], ['D', 'drift (slow pan, when the scene is wider than the window)'],
      ['W', 'weather: live → clear → rain → snow'], ['M', 'mute ambience'], ['P', 'playlist'], ['F', 'fullscreen'],
      ['1 2 3', 'about, projects, blog'], ['Esc', 'close'],
    ];
    body.innerHTML = `<div class="prose"><p>Everything in the scene is drawn in code, one pixel at a time. <strong>${touch ? 'Tap' : 'Click'} around</strong>, some things have something to say.</p></div>
      <table class="keys">${keys.map(([k, v]) => `<tr><td><kbd>${k}</kbd></td><td>${v}</td></tr>`).join('')}</table>
      <p class="prose small">The weather is live from Chicago. The ambience is synthesized in your browser, no audio files.</p>`;
  }
  if (!slug) document.title = `${meta.title} · ciehanski.com`;
  body.scrollTop = 0;
  win.focus?.();
}

function closeWin() {
  document.title = 'ciehanski.com';
  navigate('/');
}
$('win-close').addEventListener('click', closeWin);
$('win-back').addEventListener('click', () => navigate('/blog'));
$('win-wrap').addEventListener('click', (e) => { if (e.target === $('win-wrap')) closeWin(); });
$('win-body').addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#/"]');
  if (a) { e.preventDefault(); navigate(a.getAttribute('href').slice(1)); }
});
document.querySelectorAll('.nav a[data-route]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); navigate(a.dataset.route); }));
document.querySelector('.brand').addEventListener('click', (e) => { e.preventDefault(); closeWin(); });

// ------------------------------------------------------------------ controls

let firstGesture = true;
let startedByGestureAt = -1e9;
function gesture(e) {
  if (!firstGesture) return;
  firstGesture = false;
  amb.start();
  amb.setVolume(+$('amb').value / 100);
  applyMix(SCENES[state.idx]);
  // If the browser blocked autoplay, the first interaction starts the music,
  // unless that interaction is itself a music control (Space, the play button...),
  // which will do the right thing on its own.
  const onPlayer = e?.target?.closest?.('#btn-play, #btn-next, #pop-music, #now-bar, .vol-music') || (e?.type === 'keydown' && e.key === ' ');
  if (!onPlayer && state.content?.site?.autoplay !== false && music && music.state.paused && !music.empty) {
    music.play();
    startedByGestureAt = performance.now();
  }
}
addEventListener('pointerdown', gesture, { capture: true });
addEventListener('keydown', gesture, { capture: true });

$('btn-play').addEventListener('click', () => {
  if (!music) return;
  if (music.empty) return togglePop('music', true);
  music.toggle();
});
$('btn-next').addEventListener('click', () => { music?.next(); });
$('now-bar').addEventListener('click', (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  music?.seek(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
});
$('btn-shuffle').addEventListener('click', () => {
  if (!music) return;
  music.setShuffle(!music.state.shuffle);
  store.set('shuffle', music.state.shuffle);
});
const musicInput = $('vol-music');
musicInput.value = store.get('musicVolume', 60);
function setMusicVol(v) {
  musicInput.value = v;
  music?.setVolume((v / 100) ** 2);
  store.set('musicVolume', +v);
  musicInput.style.setProperty('--fill', v + '%');
}
musicInput.addEventListener('input', () => setMusicVol(+musicInput.value));
$('btn-list').addEventListener('click', () => togglePop('music'));
$('btn-scenes').addEventListener('click', () => togglePop('scenes'));
$('chip-scene').addEventListener('click', () => togglePop('scenes'));
$('chip-drift').addEventListener('click', toggleDrift);
$('chip-tour').addEventListener('click', () => { state.tour = !state.tour; state.sceneT = 0; store.set('tour', state.tour); showTour(); });
$('chip-weather').addEventListener('click', cycleWeather);
$('btn-full').addEventListener('click', toggleFull);

// Mini-player: float the live scene in a picture-in-picture window.
const pipVideo = document.createElement('video');
pipVideo.muted = true; pipVideo.playsInline = true;
let pipTimer = null;
if (!document.fullscreenEnabled) $('btn-full').hidden = true;                 // e.g. iPhone Safari: no element fullscreen
const canPip = document.pictureInPictureEnabled && typeof view.captureStream === 'function';
if (!canPip) $('btn-pip').hidden = true;
$('btn-pip').addEventListener('click', async () => {
  try {
    if (document.pictureInPictureElement) return document.exitPictureInPicture();
    pipVideo.srcObject ||= view.captureStream(30);
    await pipVideo.play();
    await pipVideo.requestPictureInPicture();
  } catch (err) { console.warn('picture-in-picture unavailable:', err); }
});
pipVideo.addEventListener('enterpictureinpicture', () => {
  // browsers pause requestAnimationFrame in hidden tabs; keep the floating scene alive with a timer
  pipTimer = setInterval(() => { if (document.hidden) step(performance.now()); }, 1000 / 20);
});
pipVideo.addEventListener('leavepictureinpicture', () => { clearInterval(pipTimer); pipTimer = null; });
$('btn-help').addEventListener('click', () => navigate('/help'));

function cycleWeather() {
  const i = WEATHER_MODES.indexOf(state.weatherMode);
  state.weatherMode = WEATHER_MODES[(i + 1) % WEATHER_MODES.length];
  showWeather();
}

function toggleFull() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}

const ambInput = $('amb');
// Ambience (rain, city hum, trains, keyboard) starts low so the music leads; the slider or M changes it.
// (A fresh storage key, so visitors who had the old default of 35 get the new, quieter one too.)
ambInput.value = store.get('ambience2', 12);
let lastVol = +ambInput.value || 12;
function setAmb(v) {
  ambInput.value = v;
  amb.start();
  amb.setVolume(v / 100);
  applyMix(SCENES[state.next ?? state.idx]);
  store.set('ambience2', +v);
  setIcon($('amb-icon'), +v ? 'rain' : 'mute');
  ambInput.style.setProperty('--fill', v + '%');
}
ambInput.addEventListener('input', () => setAmb(+ambInput.value));

addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea') && e.key !== 'Escape') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === ' ') { e.preventDefault(); $('btn-play').click(); }
  else if (k === 'arrowright') goTo((state.idx + 1) % SCENES.length);
  else if (k === 'arrowleft') goTo((state.idx + SCENES.length - 1) % SCENES.length);
  else if (k === 'n') music?.next();
  else if (k === 'b') music?.prev();
  else if (k === 't') $('chip-tour').click();
  else if (k === 'd' && layout.slack) toggleDrift();
  else if (k === 'w') cycleWeather();
  else if (k === 's') togglePop('scenes');
  else if (k === 'p') togglePop('music');
  else if (k === 'f') toggleFull();
  else if (k === 'm') { const v = +ambInput.value; if (v) { lastVol = v; setAmb(0); } else setAmb(lastVol || 12); }
  else if (k === '1') navigate('/about');
  else if (k === '2') navigate('/projects');
  else if (k === '3') navigate('/blog');
  else if (k === '?' || k === 'h') navigate('/help');
  else if (k === 'escape') {
    if (!$('say').hidden) hideSay();
    else if (!$('win-wrap').hidden) closeWin();
    else document.querySelectorAll('.pop').forEach((p) => p.setAttribute('aria-hidden', 'true'));
  }
});

// ------------------------------------------------------------------ tooltips

// Pixel tooltips for the UI instead of the browser's native title bubbles.
// Each title moves to data-tip on first hover (keeping an accessible name).
const uiTip = document.createElement('div');
uiTip.className = 'tip ui-tip';
uiTip.hidden = true;
document.body.append(uiTip);
let uiTipTimer;
const hideUiTip = () => { clearTimeout(uiTipTimer); uiTip.hidden = true; };
document.addEventListener('pointerover', (e) => {
  const el = e.target.closest?.('[title], [data-tip]');
  if (!el || e.pointerType === 'touch') return;
  if (el.hasAttribute('title')) {
    el.dataset.tip = el.title;
    if (!el.getAttribute('aria-label') && !el.textContent.trim()) el.setAttribute('aria-label', el.title);
    el.removeAttribute('title');
  }
  clearTimeout(uiTipTimer);
  uiTipTimer = setTimeout(() => {
    if (document.body.classList.contains('idle') || !el.isConnected) return;
    uiTip.textContent = el.dataset.tip;
    uiTip.hidden = false;
    const r = el.getBoundingClientRect(), t = uiTip.getBoundingClientRect();
    const above = !!el.closest('.bottom');
    const x = Math.min(innerWidth - t.width - 8, Math.max(8, r.left + r.width / 2 - t.width / 2));
    const y = above ? r.top - t.height - 10 : r.bottom + 8;
    uiTip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }, 350);
});
document.addEventListener('pointerout', (e) => {
  const el = e.target.closest?.('[data-tip]');
  if (el && !el.contains(e.relatedTarget)) hideUiTip();
});
addEventListener('pointerdown', hideUiTip, true);
addEventListener('keydown', hideUiTip, true);

// ------------------------------------------------------------------ idle

// Tuck the dock and HUD away after a few seconds without mouse/keyboard/touch
// activity (never while a panel or window is open, or while hovering it).
const IDLE_MS = 5000;
let idleTimer;
function wake() {
  document.body.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    const busy = document.querySelector('.pop[aria-hidden="false"]') || !$('win-wrap').hidden
      || document.querySelector('.bottom:hover, .nav:hover, .hud:hover') || document.activeElement?.closest?.('.bottom, .nav, .hud');
    if (busy) wake();
    else { document.body.classList.add('idle'); tip.hidden = true; hideUiTip(); }
  }, IDLE_MS);
}
for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(ev, wake, { passive: true });
wake();

// ------------------------------------------------------------------ boot

hydrateIcons();
SCENES[state.idx].build();
showSceneInfo(SCENES[state.idx]);
showTour();
showDrift();
showWeather();
setAmb(+ambInput.value);
tick();
fit(SCENES[state.idx].focus ?? 0.5);
requestAnimationFrame(frame);
// Always open on the scene. A reload of /#/about (etc.) shouldn't pop a window;
// only links straight to a blog post open one on load.
if (/^#\/(about|projects|blog|help)\/?$/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
render();
refreshWeather();
setInterval(refreshWeather, 15 * 60 * 1000);
// Background tabs throttle timers; catch up the moment the site is visible again.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  tick(); // clock, sun and sky right now
  if (Date.now() - weatherAt > 5 * 60 * 1000) refreshWeather();
});

loadContent().then((c) => {
  const s = c.site || {};
  if (s.github) $('gh-link').href = s.github;
  startPresence(s.presence, {
    onCount(n) {
      $('presence-text').textContent = `${n} here now`;
      $('presence-pill').hidden = false;
    },
    onHeart(h) { if (h.scene === SCENES[state.next ?? state.idx].id) acceptHeart(h); },
  }).then((p) => { live = p; });
  amb.sampleUrls = c.sfx || {};
  if (amb.ctx) amb.loadSamples();
  // the six scene themes play through in order (independent of the scene), then any songs of your own
  const tracks = [...sceneThemes(['conservatory', 'olive', 'lincoln', 'fullerton', 'lakefront']), ...(c.music || [])];
  renderTracklist(tracks);
  const was = tracks.findIndex((tr) => tr.title === resume?.track);
  music = initMusic({ tracks, onState: onMusic, volume: (+musicInput.value / 100) ** 2, shuffle: false, resume: was >= 0 ? { index: was, position: +resume.pos || 0 } : null });
  setMusicVol(+musicInput.value);
  onMusic(music.state);
  // Try to start right away. Browsers only allow sound before any interaction
  // for sites the visitor already engages with; otherwise the first click does it.
  if (s.autoplay !== false && tracks.length) music.play();
});

// warm the other scenes in idle time so crossfades don't hitch
(window.requestIdleCallback || setTimeout)(() => SCENES.forEach((s) => s.build()));

if (!store.get('hinted', false)) {
  setTimeout(() => {
    if ($('win-wrap').hidden && $('say').hidden) say('', 'Psst. Try clicking things in the scene.');
    store.set('hinted', true);
  }, 6000);
}

// handy for debugging from the console
window.__px = { state, goTo, SCENES, amb };
