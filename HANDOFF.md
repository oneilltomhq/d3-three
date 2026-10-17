# d3-three — handoff

Written 2026-09-12 from the d3-gallery session. Lift a ladder of D3
gallery examples into real 3D in Three.js (WebGPURenderer), so that the
data structures themselves become three-dimensional, and leave behind
for each one exactly what the three-rs ladder (`~/src/projects/three-rs`)
needs to adopt it as a later rung. Sibling of three-rs; opposite grader:
three-rs matches references that already exist, d3-three creates them.

## A. What done means

1. A ladder of gallery examples, each a Three.js WebGPU page shaped like
   Three's `webgpu_*` examples (`examples/d3_<slug>.html`).
2. Dendrograms first: cluster dendrogram, tidy tree, radial dendrogram,
   phylogenetic tree; then force-directed graph, zoomable sunburst,
   circle packing, treemap.
3. Eight passing examples is done; the four dendrograms are the minimum.
4. Each page becomes a three-rs rung later, so d3-three creates the references
   three-rs will match.
5. The user eyeballs every finished example and says it earns its place;
   no number replaces this. Director stops after each example and asks.

## B. Truly 3D

6. Layouts are lifted, not just rendered: cone trees, nodes on a sphere,
   d3-force-3d, stacked partitions, and so on. Design each per example.
7. Depth gate: the smallest axis extent of mark positions is at least a
   quarter of the largest.
8. No sprites, textures, canvas-2D or CSS renderers for marks or links;
   labels are the only allowed billboards.
9. Angle gate: rendered from two orthogonal cameras, neither screenshot
   is degenerate (marks bounding box has non-trivial area in both).
10. Picking gate: raycasting the pixel of node N hits the same node from
    both cameras.

## C. Faithful to the data

11. One scene object per datum (nodes, links, cells).
12. Node and link counts equal the d3 hierarchy's descendants and links.
13. Both dumped to `marks/d3_<slug>.json` and compared, so nothing is
    collapsed or baked.
14. The 3D layout variant is written down per example in
    `layouts/<slug>.md` so stage 2 ports it instead of d3's 2D one.
15. A reference render of the original notebook is kept beside each
    example (`ref/<slug>.png`) as the visual anchor, not as a grader.

## D. Reproducible for three-rs

16. Each example runs under a copy of Three's e2e harness with its
    deterministic injection (facts below).
17. Fixed camera per example; the screenshot is produced by the harness.
18. Two consecutive runs produce identical screenshots.
19. Each finished example leaves HTML, screenshot, marks JSON, and its
    layout note.
20. Those four are appended to `handoff/LADDER-FOR-THREE-RS.md` with the
    d3 modules and 3D layout it needs, for the three-rs director.

## E. Process

21. Rung 0: harness copy runs, deterministic injection proven, a blank
    page fails the depth gate honestly. Log in `handoff/rung0/`.
22. Director = session model; one Opus worker per example; fan out only
    inside an example, 2–3 workers, never more than 6.
23. Sequential examples, so the shared primitives (camera, line, text,
    tween, orbit) grow once in `src/`.
24. Worker reports: gates passed, layout variant chosen, primitives
    changed, gaps.
25. Work in the existing `rung0/` worktree; never commit in `main/`.

## Sources

- `~/src/vendor/d3-gallery`: `index.json`; `notebooks/<section>/<slug>[.v2]/notebook.js`
  + `files/`. Prefer `.v2`. README there explains cell shape and the
  Observable-only affordances. The four dendrograms are
  `hierarchies/cluster.v2`, `hierarchies/tree.v2`,
  `hierarchies/radial-cluster.v2`, `hierarchies/tree-of-life`.
- `~/src/vendor/three.js` @ 3d010ef (same commit three-rs ports).
- d3's layout modules (d3-hierarchy, d3-shape, d3-scale, d3-force,
  d3-force-3d) stay JS dependencies; the DOM half (selection,
  transition, zoom, drag) is replaced by Three objects, tweens, orbit
  camera and raycasting.

## Facts about Three's harness (`~/src/vendor/three.js/test/e2e/`)

- puppeteer launches Chromium from `~/.cache/puppeteer` (already
  present; three.js `node_modules` installed; node v24). Flags:
  `--hide-scrollbars --enable-unsafe-webgpu --enable-features=Vulkan
  --disable-vulkan-surface --ignore-gpu-blocklist
  --disable-gpu-driver-bug-workarounds --disable-gpu-watchdog --no-sandbox`.
- `VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json`: e2e
  runs on lavapipe (software Vulkan), which is what makes screenshots
  reproducible. Keep it. The file exists on this machine.
- Viewport 400×250 at viewScale 2, screenshot then `image.js`
  `scale(1/2)` (box filter). `compare()` = squared RGB distance > 0.1²
  counts a pixel; pass < 0.1% of pixels. Copy `image.js` byte for byte
  (deps pngjs, jpeg-js); rung 18 uses it to prove two runs identical.
- `deterministic-injection.js`: `Math.random` = `sin(seed++)*10000`
  frac, seed π/4; `performance.now`/`Date.now` = 0; RAF fires once after
  `window._renderStarted`; `window.TESTING = true`. Injected via
  `evaluateOnNewDocument`. Requests for `build/three.webgpu.js` are
  answered with a patched copy (`Math.random() * 0xffffffff` →
  `Math._random()`, `trackTimestamp` forced false).
- Page flow: goto → `clean-page.js` (hides `#info`, lil-gui) → network
  idle 2 s → `_renderStarted = true` → wait `_renderFinished` (5 s
  timeout) → screenshot. Failures write `-actual/-expected/-diff.jpg`.
- Static server `utils/server.js` port 1234; point a copy at this repo
  and route `/three/build/*` to the vendored build and `/gallery/*` to
  `~/src/vendor/d3-gallery/notebooks`.

## State

`~/src/projects/d3-three` bare-worktree layout (see CLAUDE.md). `main` has
the bootstrap commit only. Worktree `rung0/` on branch `rung0`. Nothing
else written: no package.json, no harness copy, no `src/`.
