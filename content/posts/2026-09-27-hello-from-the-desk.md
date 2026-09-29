---
title: Hello from the desk
date: 2026-09-27
summary: A new site, drawn one pixel at a time, with Chicago out the window.
tags: [meta, pixel-art, chicago]
draft: true
---

This site used to be a little Animal Crossing village. It's now three Chicago scenes at night that fade into each other: my desk, Armitage on the Brown Line, and the skyline from the lakefront.

## Everything is drawn in code

There are no image files. Each scene is drawn onto a 480×270 canvas with plain JavaScript, rectangles and dithering, then scaled up with nearest-neighbour filtering so the pixels stay crisp. The skyline is a small generator: Willis (Sears), the Hancock, Trump, Aon, Two Pru, 311 South Wacker's glowing crown, and Marina City, surrounded by procedurally generated filler buildings.

```js
drawSkyline(g, {
  baseY: 170,
  landmarks: [{ type: 'willis', x: 314 }, { type: 'hancock', x: 418 }],
});
```

## Small things worth finding

- The weather is **live from Chicago**. If it's raining at home, it's raining on the site.
- The ambience (rain, the L, keyboard clacks) is synthesized in the browser. There are no audio files.
- Amber, the orange tabby, is asleep on the desk. She doesn't mind being clicked.
- The hot dog stand has opinions about ketchup.

> Tip: press **?** for keyboard shortcuts, or **W** to cycle the weather yourself.

More soon.
