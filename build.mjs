#!/usr/bin/env node
// Zero-dependency site builder.
//
//   node build.mjs          build content/ into site/
//   node build.mjs --serve  build, then serve site/ on http://localhost:8080 (rebuilds on content changes)
//
// Reads:  content/site.json, content/about.md, content/projects.json, content/posts/*.md
// Also scans site/music/ (+ optional content/music.json) for the player.
// Writes: site/data/content.json, site/data/posts/<slug>.html, site/blog/<slug>/index.html,
//         site/feed.xml, site/sitemap.xml, site/404.html

import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync, statSync, watch } from 'node:fs';
import { join, dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const ROOT = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(ROOT, 'content');
const SITE = join(ROOT, 'site');

// ------------------------------------------------------------------ markdown

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escapeAttr = (s) => escapeHtml(s).replace(/'/g, '&#39;');
const safeUrl = (u) => (/^\s*(javascript|vbscript|data):/i.test(u) && !/^\s*data:image\//i.test(u) ? '#' : u);

function inline(src) {
  const stash = [];
  const keep = (html) => `\u0000${stash.push(html) - 1}\u0000`;
  let s = src
    .replace(/`([^`]+)`/g, (_, c) => keep(`<code>${escapeHtml(c)}</code>`))
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, url, title) =>
      keep(`<img src="${escapeAttr(safeUrl(url))}" alt="${escapeAttr(alt)}"${title ? ` title="${escapeAttr(title)}"` : ''} loading="lazy">`))
    .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, text, url, title) => {
      const ext = /^https?:/.test(url) ? ' target="_blank" rel="noopener"' : '';
      return keep(`<a href="${escapeAttr(safeUrl(url))}"${title ? ` title="${escapeAttr(title)}"` : ''}${ext}>`) + text + keep('</a>');
    })
    .replace(/<(https?:\/\/[^>\s]+)>/g, (_, url) => keep(`<a href="${escapeAttr(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>`));
  s = escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_(?!\s)(.+?)_(?!\w)/g, '$1<em>$2</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/ {2,}\n/g, '<br>\n');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[+i]);
}

function markdown(src) {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const isBlank = (l) => !l || !l.trim();
  const listRe = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) { i++; continue; }

    const fence = line.match(/^(```|~~~)\s*([\w-]*)/);
    if (fence) {
      const body = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(fence[1])) body.push(lines[i++]);
      i++;
      out.push(`<pre><code${fence[2] ? ` class="language-${fence[2]}"` : ''}>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*?)\s*#*$/);
    if (h) {
      const id = h[2].toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
      out.push(`<h${h[1].length} id="${id}">${inline(h[2])}</h${h[1].length}>`);
      i++;
      continue;
    }

    if (/^(\s*[-*_]){3,}\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    if (/^\s*>/.test(line)) {
      const body = [];
      while (i < lines.length && !isBlank(lines[i])) body.push(lines[i++].replace(/^\s*> ?/, ''));
      out.push(`<blockquote>${markdown(body.join('\n'))}</blockquote>`);
      continue;
    }

    if (/^<(\w+)[\s>]/.test(line) && !/^<https?:/.test(line)) {
      const body = [];
      while (i < lines.length && !isBlank(lines[i])) body.push(lines[i++]);
      out.push(body.join('\n'));
      continue;
    }

    const li = line.match(listRe);
    if (li) {
      const ordered = /\d/.test(li[2]);
      const indent = li[1].length;
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(listRe);
        if (!m || m[1].length !== indent || /\d/.test(m[2]) !== ordered) break;
        const body = [m[3]];
        i++;
        while (i < lines.length) {
          const l = lines[i];
          if (isBlank(l)) {
            const nxt = lines[i + 1];
            if (nxt && /^\s{2,}\S/.test(nxt) && !(nxt.match(listRe)?.[1].length === indent)) { body.push(''); i++; continue; }
            break;
          }
          const m2 = l.match(listRe);
          if (m2 && m2[1].length <= indent) break;
          body.push(l.slice(Math.min(indent + 2, l.search(/\S/))));
          i++;
        }
        const inner = markdown(body.join('\n'));
        items.push(inner.startsWith('<p>') && inner.indexOf('<p>', 1) === -1 ? inner.replace(/^<p>|<\/p>$/g, '') : inner);
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((x) => `<li>${x}</li>`).join('')}</${tag}>`);
      continue;
    }

    const para = [];
    while (i < lines.length && !isBlank(lines[i]) && !/^(#{1,6}\s|```|~~~|\s*>|(\s*[-*_]){3,}\s*$)/.test(lines[i]) && !(para.length && listRe.test(lines[i]))) para.push(lines[i++]);
    out.push(`<p>${inline(para.join('\n'))}</p>`);
  }
  return out.join('\n');
}

// ------------------------------------------------------------------ content

function frontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    else if (v === 'true' || v === 'false') v = v === 'true';
    else v = v.replace(/^["']|["']$/g, '');
    meta[kv[1]] = v;
  }
  return { meta, body: src.slice(m[0].length) };
}

const readJson = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : d);

// Music: every audio file in site/music/ becomes a track. "Artist - Title.mp3"
// (optionally with a leading track number) fills in the names. content/music.json
// can override titles/artists, add credits, set the order, or point at files
// hosted elsewhere with "url".
const AUDIO = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac)$/i;
function musicTracks() {
  const dir = join(SITE, 'music');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => AUDIO.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) : [];
  const meta = readJson(join(CONTENT, 'music.json'), []);
  const fromName = (f) => {
    const base = f.replace(AUDIO, '').replace(/^\d+[\s._-]+/, '').replace(/_/g, ' ').trim();
    const parts = base.split(/\s+-\s+/);
    return parts.length >= 2 ? { artist: parts[0], title: parts.slice(1).join(' - ') } : { artist: '', title: base };
  };
  const track = (m, f) => {
    const guess = f ? fromName(f) : { artist: '', title: 'untitled' };
    const t = { src: m.url || '/music/' + encodeURIComponent(f), title: m.title || guess.title, artist: m.artist ?? guess.artist };
    if (m.credit) t.credit = m.credit;
    if (m.creditUrl) t.creditUrl = m.creditUrl;
    return t;
  };
  const out = [];
  const used = new Set();
  for (const m of meta) {
    if (m.url) { out.push(track(m)); continue; }
    if (!files.includes(m.file)) { console.warn(`music.json: ${m.file} not found in site/music/, skipping`); continue; }
    used.add(m.file);
    out.push(track(m, m.file));
  }
  for (const f of files) if (!used.has(f)) out.push(track({}, f));
  return out;
}

function build() {
  const t0 = Date.now();
  const site = readJson(join(CONTENT, 'site.json'), {});
  const projects = readJson(join(CONTENT, 'projects.json'), []);
  const about = existsSync(join(CONTENT, 'about.md')) ? markdown(frontmatter(readFileSync(join(CONTENT, 'about.md'), 'utf8')).body) : '';

  const postDir = join(CONTENT, 'posts');
  const posts = (existsSync(postDir) ? readdirSync(postDir) : [])
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const { meta, body } = frontmatter(readFileSync(join(postDir, f), 'utf8'));
      const dated = f.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
      const slug = meta.slug || (dated ? dated[2] : f.replace(/\.md$/, ''));
      const date = String(meta.date || (dated ? dated[1] : new Date().toISOString().slice(0, 10)));
      const tags = Array.isArray(meta.tags) ? meta.tags : meta.tags ? String(meta.tags).split(',').map((s) => s.trim()) : [];
      return { slug, title: meta.title || slug, date, summary: meta.summary || '', tags, draft: meta.draft === true, html: markdown(body) };
    })
    .filter((p) => !p.draft)
    .sort((a, b) => b.date.localeCompare(a.date));

  const slugs = new Set();
  for (const p of posts) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(p.slug)) throw new Error(`Bad slug "${p.slug}": use lowercase letters, numbers and dashes`);
    if (slugs.has(p.slug)) throw new Error(`Duplicate slug "${p.slug}"`);
    slugs.add(p.slug);
  }

  // Clean only what we generate.
  rmSync(join(SITE, 'data', 'posts'), { recursive: true, force: true });
  rmSync(join(SITE, 'blog'), { recursive: true, force: true });
  mkdirSync(join(SITE, 'data', 'posts'), { recursive: true });
  mkdirSync(join(SITE, 'blog'), { recursive: true });

  const music = musicTracks();
  // Optional recordings that replace synthesized train sounds.
  const sfxDir = join(SITE, 'sfx');
  const sfx = {};
  if (existsSync(sfxDir))
    for (const f of readdirSync(sfxDir)) {
      const m = f.match(/^(train-pass|train-arrive|train-depart|doors-closing)\.(mp3|m4a|ogg|opus|wav)$/i);
      if (m) sfx[m[1].toLowerCase()] = '/sfx/' + encodeURIComponent(f);
    }
  writeFileSync(join(SITE, 'data', 'content.json'), JSON.stringify({
    site, about, projects, music, sfx,
    posts: posts.map(({ html, draft, ...meta }) => meta),
  }, null, 2));

  const template = readFileSync(join(SITE, 'index.html'), 'utf8');
  const base = (site.url || '').replace(/\/$/, '');
  for (const p of posts) {
    writeFileSync(join(SITE, 'data', 'posts', p.slug + '.html'), p.html);
    const url = `${base}/blog/${p.slug}/`;
    const desc = p.summary || site.description || '';
    const page = template
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(p.title)} · ${escapeHtml(site.title || '')}</title>`)
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeAttr(desc)}">`)
      .replace('<!--PAGE_META-->', [
        `<link rel="canonical" href="${escapeAttr(url)}">`,
        `<meta property="og:type" content="article">`,
        `<meta property="og:title" content="${escapeAttr(p.title)}">`,
        `<meta property="og:description" content="${escapeAttr(desc)}">`,
        `<meta property="og:url" content="${escapeAttr(url)}">`,
        `<script>window.__ROUTE__ = ${JSON.stringify('/blog/' + p.slug)};</script>`,
      ].join('\n  '))
      .replace('<!--PAGE_BODY-->', `<article id="prerendered" data-slug="${escapeAttr(p.slug)}"><h1>${escapeHtml(p.title)}</h1>\n<div class="pr-body">${p.html}</div></article>`);
    mkdirSync(join(SITE, 'blog', p.slug), { recursive: true });
    writeFileSync(join(SITE, 'blog', p.slug, 'index.html'), page);
  }

  const rfc822 = (d) => new Date(d + 'T12:00:00Z').toUTCString();
  writeFileSync(join(SITE, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeHtml(site.title || '')}</title>
  <link>${escapeHtml(base)}/</link>
  <description>${escapeHtml(site.description || '')}</description>
  <atom:link href="${escapeHtml(base)}/feed.xml" rel="self" type="application/rss+xml"/>
${posts.map((p) => `  <item>
    <title>${escapeHtml(p.title)}</title>
    <link>${escapeHtml(base)}/blog/${p.slug}/</link>
    <guid>${escapeHtml(base)}/blog/${p.slug}/</guid>
    <pubDate>${rfc822(p.date)}</pubDate>
    <description>${escapeHtml(p.html)}</description>
  </item>`).join('\n')}
</channel>
</rss>
`);

  const urls = ['/', ...posts.map((p) => `/blog/${p.slug}/`)];
  writeFileSync(join(SITE, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${escapeHtml(base + u)}</loc></url>`).join('\n')}
</urlset>
`);

  // Neocities serves not_found.html for 404s; GitHub Pages wants 404.html.
  if (existsSync(join(SITE, 'not_found.html'))) writeFileSync(join(SITE, '404.html'), readFileSync(join(SITE, 'not_found.html')));

  console.log(`built ${posts.length} post${posts.length === 1 ? '' : 's'}, ${music.length} track${music.length === 1 ? '' : 's'} in ${Date.now() - t0}ms`);
}

// ------------------------------------------------------------------ dev server

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.oga': 'audio/ogg',
  '.opus': 'audio/ogg', '.wav': 'audio/wav', '.flac': 'audio/flac',
};

function serve(port = +(process.env.PORT || 8080)) {
  createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    // Resolve, then make sure we're still inside site/ (a file named "I.G.Y..mp3" is fine; "../" is not).
    let file = resolve(SITE, '.' + path);
    if (file !== SITE && !file.startsWith(SITE + sep)) { res.writeHead(400).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      res.writeHead(404, { 'content-type': MIME['.html'] });
      res.end(readFileSync(join(SITE, 'not_found.html')));
      return;
    }
    const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
    const body = readFileSync(file);
    // Byte ranges, so audio can seek like it will on a real host.
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range) {
      const start = range[1] ? +range[1] : body.length - +range[2];
      const end = range[1] && range[2] ? Math.min(+range[2], body.length - 1) : body.length - 1;
      if (start >= body.length || start > end) { res.writeHead(416, { 'content-range': `bytes */${body.length}` }).end(); return; }
      res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${body.length}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1, 'cache-control': 'no-store' });
      res.end(body.subarray(start, end + 1));
      return;
    }
    res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': body.length, 'cache-control': 'no-store' });
    res.end(body);
  }).listen(port, () => console.log(`serving site/ on http://localhost:${port}`));

  let timer;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { try { build(); } catch (e) { console.error(e.message); } }, 100);
  };
  watch(CONTENT, { recursive: true }, rebuild);
  mkdirSync(join(SITE, 'music'), { recursive: true });
  watch(join(SITE, 'music'), rebuild);
}

build();
if (process.argv.includes('--serve')) serve();
