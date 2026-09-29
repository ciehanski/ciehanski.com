# ciehanski.com — pixel Chicago

Six Chicago scenes that crossfade every minute: the desk (with Amber), the lakefront, Armitage on the Brown Line, Fullerton beach, the Lincoln Park Conservatory, and Olive Park. The sky follows the real sun over Chicago (night, dawn, day, golden hour, dusk), the moon shows its real phase, and clouds, rain and snow come from live Chicago weather. Everything is drawn in code on a 480×270 canvas. It's fully static: plain HTML, CSS and ES modules, with nothing to compile.

```
ciehanski.com/
  build.mjs          zero-dependency build: markdown → HTML, feed, sitemap, post pages
  content/           ← you edit these
    site.json        name, URL, GitHub, links, music autoplay
    music.json       optional: track titles, credits, order, externally hosted tracks
    about.md         the About window
    projects.json    the Projects window
    posts/*.md       blog posts
  (everything else)  ← the website itself; GitHub Pages serves the repo root
    index.html, not_found.html (404), robots.txt, favicon.svg
    css/style.css
    js/main.js       engine: scene rotation, HUD, dock, windows, routing
    js/px.js         pixel toolkit (dithered gradients, sprites, 3x5 font, 2x helpers)
    js/sky.js        real sun position, sky gradients, clouds, day/night variants of each layer
    js/skyline.js    Chicago skyline generator (Willis, Hancock, Trump, Aon, Two Pru, Crain diamond, 311 S Wacker, St. Regis, Marina City)
    js/scenes/       desk.js, lakefront.js, lincoln.js, fullerton.js, conservatory.js, olive.js
    js/weather.js    rain/snow + live Chicago weather and cloud cover (Open-Meteo, no key)
    js/audio.js      synthesized ambience (rain, the L, CTA door chime, keyboard, waves, purr, blips)
    js/music.js      the music player
    music/           ← drop your audio files here
    sfx/             ← optional real recordings for the train (see below)
```

## Resolution

Scenes are authored on a 480×270 grid but rendered at 2× (960×540). Existing art draws exactly as before (each unit is 2×2 real pixels), and fine detail is added at half-units with `hrect` / `hdot`, on hi-res layers made with `canvasHi()`, or as 2× sprites drawn with `blitHi()`. Use `blit()` to draw any layer at its logical size.

## Writing

```sh
cd pixel
node build.mjs --serve     # builds, serves http://localhost:8080, rebuilds when content/ changes
```

New post: `content/posts/2026-10-01-my-post.md`

```md
---
title: My post
date: 2026-10-01
summary: One line for the list and the feed.
tags: [chicago, code]
draft: false
---

Markdown here: headings, **bold**, _italic_, `code`, fenced code, lists, > quotes, links, images.
```

The slug comes from the filename (minus the date). Each post gets a real URL at `/blog/<slug>/` that opens the scene with the post already showing, plus an RSS entry in `/feed.xml`.

Run `node build.mjs` before every upload. The generated files (`data/`, `blog/`, `feed.xml`, `sitemap.xml`, `404.html`) are meant to be uploaded.

## Music

**ciehanski radio** plays six composed themes, one written for each scene, Animal Crossing style. They play through in order as finished songs (intro, A, A', B, a solo, a breakdown, a last A that lifts up a key in some themes, and an ending), then move on to the next. The music doesn't change with the scene. The themes live in `SONGS` in `js/lofi.js`: each has a key, tempo, swing, chord changes, a groove, its own instruments (keys, lead, bass, drum kit) and mix, and melody motifs that get stated and answered. Everything is synthesized live in the browser (no audio files).

| Theme | Feel | Instruments |
|---|---|---|
| git push --force | half-time jazzhop, dark and dusty | Wurlitzer, analog saw lead, synth bass |
| lake shore drive | 80s city pop, four on the floor | DX electric piano + guitar cuts, sax, slap bass, gated snare |
| brown line bounce | swung Animal Crossing town walk | honky-tonk piano, whistle + accordion, upright, brushes |
| fullerton sun | bossa nova | nylon guitar, steel pan + kalimba, bongos and woodblock |
| greenhouse morning | gentle and airy | harp arpeggios, flute + ocarina, music box, triangle |
| olive park sundown | minor-key boom-bap | drawbar organ + Rhodes, muted trumpet, vibes |

### Your own tracks

Drop audio files (mp3, m4a, ogg, opus, wav, flac) into `music/` and run `node build.mjs`. Names come from the filename, so `03 - Some Artist - Rainy Night.mp3` becomes "Rainy Night" by Some Artist. The player shuffles by default, and there's a tracklist in the playlist panel (P).

To add credits (required for CC-BY music), fix names, set the order, or use tracks hosted elsewhere, list them in `content/music.json`:

```json
[
  { "file": "rainy-night.mp3", "title": "Rainy Night", "artist": "Some Artist",
    "credit": "Rainy Night by Some Artist (CC BY 4.0)", "creditUrl": "https://..." },
  { "url": "https://cdn.example.com/track.mp3", "title": "Hosted elsewhere", "artist": "Someone" }
]
```

Royalty-free lofi sources: Pixabay Music (no attribution needed) and Free Music Archive (check each track's license).

## Train sounds

The L is synthesized: rumble, wheel clacks, brake squeal, motor whine, the two-tone door chime, and a spoken "Doors closing." using the browser's voice. To use real recordings you have rights to (Freesound.org has CC-licensed CTA recordings), add any of these to `sfx/` and rebuild. Each one replaces its synthesized version:

`train-pass.mp3` · `train-arrive.mp3` · `train-depart.mp3` · `doors-closing.mp3`

## "Here now" counter and shared hearts

The pill next to the weather shows how many people are on the site right now, and clicking empty scenery pops a pixel heart that everyone viewing the same scene sees live (without the keys below you still see your own hearts). It uses Supabase Realtime presence (free tier, no tables, no server code) and stays hidden until it's configured:

1. Create a free project at supabase.com.
2. In **Project Settings → API**, copy the project URL and the `anon` public key. The anon key is meant to be public.
3. Put them in `content/site.json`:
   ```json
   "presence": { "supabaseUrl": "https://xxxx.supabase.co", "supabaseAnonKey": "eyJ..." }
   ```
4. Run `node build.mjs`.

## Projects

`content/projects.json` lists the cards. Give each one a `repo` (`owner/name`) and its star count shows up, updated live from the GitHub API. The `stars` value in the file is the fallback if GitHub is unreachable or rate-limited.

## Deploying

**Neocities:** upload the *contents* of `` to your site root, either by drag-and-drop in the dashboard or with the CLI (`gem install neocities`, then `neocities push .` from the repo root). Neocities serves `not_found.html` as the 404 page automatically. A custom domain (ciehanski.com) needs the Supporter plan, and as far as I know the free plan also blocks audio uploads (check their allowed file types). If you stay on the free plan, host the music elsewhere and list it by `url` in `music.json`.

**GitHub Pages:** Settings → Pages → Deploy from a branch → `main` → `/ (root)`. The built files are committed, so run `node build.mjs` before each commit. `.nojekyll` stops GitHub running Jekyll (which would drop `.well-known/`), `CNAME` holds the custom domain, and the build also writes `404.html` for Pages.

## Tweaking

- **Scene timing:** `SCENE_SECONDS` and `FADE_SECONDS` at the top of `js/main.js`.
- **Amber's lines, easter eggs:** the `click()` function at the bottom of each scene file. Clickable regions are the `hotspots` arrays, in 480×270 scene pixels.
- **Deep links / previews:** `/?scene=lincoln&weather=rain&time=18:45&clouds=80`
  - `scene`: `desk`, `lakefront`, `lincoln`, `fullerton`, `msi`, `olive`
  - `weather`: `live` (default, every visit), `clear`, `rain`, `snow`
  - `time`: any Chicago local time (HH:MM), to preview sunrise, noon or sunset
  - `clouds`: 0–100 cloud cover
  - `month`: 1–12, to preview the tree outside the desk window in another season
- **Music autoplay:** the player tries to start as soon as the page loads. Browsers only allow sound before any interaction on sites the visitor already engages with; otherwise the dock says "click anywhere to play" and the first click or keypress starts it. After that, clicking empty scenery starts the music if it is paused (it never stops it); the pause button and Space pause and resume. Set `autoplay` to `false` in `content/site.json` to turn this off.
- **Muting a scene:** `silent: true` in a scene file turns off its ambience and sound effects. Armitage is currently silent; delete that line in `js/scenes/lincoln.js` to bring the L and the bus back.
- **Trains:** `CYCLE`, `ARRIVE`, `DWELL`, `DEPART` at the top of `js/scenes/lincoln.js`. About 60% of trains stop at Armitage.
- **Adding a scene:** copy a scene file, give it `id/name/blurb/hotspots/build/draw/click`, and add it to `SCENES` in `js/main.js`.
