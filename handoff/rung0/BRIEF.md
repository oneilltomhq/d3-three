# Rung 0 brief (director: Fable; worker: Opus)

Goal (HANDOFF.md §E.21): a copy of Three's e2e harness runs against this
repo, deterministic injection is proven, and a blank page fails the depth
gate honestly. Nothing about dendrograms yet, but every decision below is
made so example 1 (cluster dendrogram) drops in without touching the harness.

## Decisions (do not relitigate; report if one proves impossible)

### Repo layout (all inside the `rung0/` worktree)
    package.json            type=module; deps pinned: puppeteer ^25 (same as three.js so it
                            reuses ~/.cache/puppeteer), pngjs ^7, jpeg-js ^0.4.4, d3 ^7,
                            d3-force-3d ^3, esbuild (dev)
    examples/d3_<slug>.html one page per example, same shape as three's webgpu_*.html
    examples/d3_blank.html  rung 0 page: WebGPURenderer, empty scene, d3-three API with zero marks
    examples/jsm/vendor/d3.js  single ESM bundle built once by `npm run build:d3` from
                            `src/vendor/d3-entry.js` (`export * from 'd3'; export * as force3d
                            from 'd3-force-3d'`). Committed. No CDN, no runtime network.
    examples/screenshots/   reference jpgs produced by `--make` (harness writes here)
    src/                    shared primitives grow here later (camera, line, text, tween, orbit).
                            Rung 0 creates only `src/d3-three.js`: the page-side API (below).
    marks/                  `d3_<slug>.json` dumps written by the harness
    gates/                  `d3_<slug>.json` gate results written by the harness
    test/e2e/               image.js, deterministic-injection.js, clean-page.js copied BYTE FOR
                            BYTE from ~/src/vendor/three.js/test/e2e (record the sha256 of each
                            in the log). puppeteer.js adapted (below). server.js adapted from
                            ~/src/vendor/three.js/utils/server.js.
    handoff/rung0/LOG.md    the rung 0 log (below)

### Server (test/e2e/server.js), port 1234
- `/examples/*`, `/src/*`, `/marks/*` → this repo.
- `/build/*` → `~/src/vendor/three.js/build/*` (keep the exact path `/build/three.webgpu.js`
  so the harness's request interception, copied verbatim, still matches).
- `/jsm/*` → `~/src/vendor/three.js/examples/jsm/*` (addons: OrbitControls, Line2, etc.).
- `/gallery/*` → `~/src/vendor/d3-gallery/notebooks/*` (example data files).
- Vendor paths are read from env `THREE_DIR` / `GALLERY_DIR` with those defaults.
- Example importmap: `"three": "/build/three.webgpu.js"`, `"three/webgpu"` same,
  `"three/tsl": "/build/three.tsl.js"`, `"three/addons/": "/jsm/"`, `"d3": "/examples/jsm/vendor/d3.js"`,
  `"d3-three": "/src/d3-three.js"`.

### Harness (test/e2e/puppeteer.js)
- Start from three's file. Keep: flags (the real ones in the file, incl. `--use-angle=vulkan`),
  viewport 400x250 @ viewScale 2, `Image.scale(1/2)`, compare thresholds, page flow
  (goto → clean-page → network idle 2s → `_renderStarted` → `_renderFinished` → screenshot),
  build injection regexes, error capture, `-actual/-expected/-diff.jpg` on failure.
- Drop: exceptionList, CI sharding, `--webgpu` filter. Files = `examples/d3_*.html`.
- npm scripts set `VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json`
  (lavapipe; this is what makes screenshots reproducible). Scripts:
  `e2e` (compare), `e2e:make` (write references), `e2e:twice` (runs the screenshot step twice
  into two temp files and asserts `compare()` returns 0 differing pixels), `build:d3`.
- After the screenshot and before the diff, the harness calls
  `page.evaluate(() => window.d3three.report())` and writes `marks/<file>.json` and
  `gates/<file>.json`. Gate failure is a test failure, printed red, same as a diff failure.
  A page with no `window.d3three` is a failure ("no d3-three API").

### Page-side API (src/d3-three.js) — every example registers with it
    import { register } from 'd3-three';
    register({ renderer, scene, camera, marks, expected })
- `marks`: array of `{ id, kind: 'node' | 'link' | 'cell', object }`, one entry per datum,
  one Object3D per entry (§C.11). Position for gates = `object.getWorldPosition()` for nodes/
  cells; for links, the midpoint of its two endpoints (the mark records `a`, `b` ids).
- `expected`: `{ nodes, links }` counts computed from the d3 hierarchy on the page
  (`root.descendants().length`, `root.links().length`) so the harness compares them to the
  mark counts (§C.12–13).
- `report()` returns `{ marks: [{id, kind, x, y, z, a?, b?}], expected, gates }` where gates are
  computed IN PAGE, purely on the CPU, deterministic:
  - depth: `{ extents: [ex, ey, ez], ratio: min/max, pass: ratio >= 0.25 }` over node+cell mark
    positions. Zero marks → `ratio: 0, pass: false` (never NaN, never vacuous pass).
  - counts: `{ nodes, links, expectedNodes, expectedLinks, pass }`.
  - angle: project node positions with camera A (the page camera) and camera B (A rotated 90°
    about the scene's up axis around the same target, same distance). NDC bounding-box area
    per camera; pass if both areas ≥ 0.01 of the viewport (2% per side). Zero marks → fail.
  - picking: for up to 20 evenly-sampled node marks, raycast from that node's projected NDC
    point with camera A and with camera B; pass if the first hit's object (or its ancestor)
    is the mark's own object in both. Zero marks → fail. (A node hidden behind another from
    one angle is a real failure; the example's layout must avoid it or the example fails.)
  - `pass`: all four.
- The blank page must therefore fail depth, counts (expected 0 vs 0 is a pass — so blank
  passes counts; that's fine and honest), angle and picking. Log exactly which failed.

### Determinism proof (LOG.md must show all of these)
1. `Math.random()` first three values inside the page equal `frac(sin(π/4 + k)·1e4)`, k=0,1,2,
   computed in node, printed side by side.
2. `performance.now()` and `Date.now()` are 0 in page.
3. RAF fired exactly once after `_renderStarted` (count it in the page).
4. `three.webgpu.js` served to the page contains `Math._random() * 0xffffffff` and the
   `trackTimestamp` defineProperty (evaluate `fetch('/build/three.webgpu.js')` from inside the
   page under interception and grep the text).
5. `npm run e2e:twice d3_blank` → 0 differing pixels, and the sha256 of both PNGs.
6. `npm run e2e:make d3_blank` then `npm run e2e d3_blank` → diff 0.0%, but the run still
   FAILS because gates fail; paste the red lines.
7. The WebGPU adapter/device actually initialised (log `renderer.backend` name and
   `navigator.gpu` adapter info) — not a WebGL fallback. If lavapipe WebGPU does not come
   up, that is the first thing to report; do not silently accept the fallback.

### Out of scope for rung 0
No dendrogram, no primitives beyond `src/d3-three.js`, no OrbitControls wiring, no labels.

## Worker report format
Gates status for the blank page, determinism items 1–7 with evidence, files created,
anything in this brief that did not survive contact with reality and what you did instead.
Commit on branch `rung0` with a message starting `rung0:`; never touch `main/`.
