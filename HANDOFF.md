# d33 — handoff

Written 2026-09-12 from the d3-gallery session. Port a ladder of D3
gallery examples to Three.js (WebGPURenderer), each graded against a
headless render of the original notebook, and each leaving behind exactly
the three files the three-rs ladder (`~/src/projects/three-rs`) needs to
adopt it as a later rung. Sibling of three-rs: same rung/grader/director
shape, different source and grader.

## What "port d3 to Three.js" means here

D3 is two halves. The layout half (d3-hierarchy, d3-shape, d3-scale,
d3-force, d3-chord, d3-sankey, d3-geo, d3-interpolate, d3-color) is pure
math with no DOM and is kept as a JS dependency in stage 1. The DOM half
(d3-selection, d3-transition, d3-zoom, d3-drag, d3-axis, d3-brush) is what
the port replaces with Three.js objects, tweens, camera and raycasting.
Stage 2, owned by three-rs, ports the layout half to Rust; d3's own tape
test suites per module are the grader there and need no display.

## Sources

- `~/src/vendor/d3-gallery` (fetched 2026-08-31): `index.json`, and
  `notebooks/<section>/<slug>[.v2]/notebook.js` + `files/`. Prefer `.v2`.
  README there explains cell shape and the Observable-only affordances.
- `~/src/vendor/three.js` @ 3d010ef, WebGPURenderer, same commit three-rs
  ports. `test/e2e/` is the screenshot harness.
- `~/src/vendor/d3` for module docs and the tape tests (stage 2 grader).

## The grader

Two renders per rung, same size, same deterministic injection, then
Three's own `image.js` `compare()` on the pair.

- Reference: the notebook run unmodified under `@observablehq/runtime`
  in headless Chromium, with `width` pinned, `FileAttachment` mapped to
  `files/`, and only the `chart` cell observed. Screenshot the SVG at its
  own width×height, device scale 2, then `image.js` `scale()` ×½.
  Rung 0 builds this once as `ref/render.js <slug>`; every rung reuses it.
- Port: `examples/d3_<slug>.html`, a page in the shape of Three's
  `webgpu_*` examples, rendered by Three's puppeteer harness pointed at
  this repo's `examples/` (copy `puppeteer.js`/`deterministic-injection.js`
  and change paths; `image.js` is copied byte-for-byte, its `compare()`
  and tolerance untouched).
- Deterministic injection as three-rs: `performance.now`/`Date.now` = 0,
  seeded `Math.random`, RAF fires once, `window.TESTING = true`. Rung 0
  adds one thing on top: `window.__advance(ms)` that steps the fake clock
  and drains d3-timer and the port's tween loop, so transitions can be
  graded at t = 0 and t = end.
- Marks gate: both pages accept `?text=0`, which hides every label. Pass
  = `compare()` on the label-free pair at the tolerance rung 0 measured.
  Rung 0 measures it, does not guess it: rasterise the reference SVG with
  Chromium and with resvg, diff those two; the ladder tolerance is 2× that
  disagreement, written into `ref/TOLERANCE.md` with the two images.
  If that comes out above pixelmatch 0.1 / 1% of pixels, the director
  reads the diff image and decides whether the loosening is honest before
  any rung starts.
- Labels gate: both pages dump `marks/d3_<slug>.json`: every mark as
  `{kind, x, y, ...}` in SVG user units (labels include text, anchor,
  angle). The port's dump must equal the reference's after rounding to
  1e-6. In stage 1 this is nearly free because both call d3's layout; it
  exists so stage 2's Rust layout has a bit-level target and so a port
  that "looks right" but dropped labels cannot pass.
- Interactive rungs: screenshot at t=0; inject the scripted event named
  in the ladder (a click on node N by mark id, or N simulation ticks);
  `__advance(duration)`; screenshot again. Both screenshots must pass.
- A rung is done when both gates pass and the director has looked at
  actual/expected/diff for every screenshot in the rung.

## Rules that keep the green honest

- Rendering is Three.js only: no SVG, no canvas-2D overlay, no CSS2D/CSS3D
  renderer, no DOM text. The whole picture comes out of the WebGPU canvas.
- One pixel-space camera helper, `svgCamera(viewBox)`: orthographic,
  1 unit = 1 SVG user unit, y down. Every rung uses it unmodified.
- One line primitive, one arc/area primitive, one text primitive, chosen
  at rung 1 and reused. Text is SDF/MSDF through a Three material (troika
  or lib3's SDF text); the director records the choice in `DECISIONS.md`
  because three-rs inherits it. Canvas-texture sprites are not allowed.
- Nothing derived from a reference image may appear in the tree.
- Layout comes from the d3 layout modules at their gallery versions; the
  port must not reimplement `d3.tree`, `d3.cluster`, `d3.arc` etc. in
  stage 1 (that is stage 2's job, with d3's tests as the gate).
- Curves are the same curve: `d3.linkHorizontal`, `curveBundle` etc. are
  sampled to polylines via d3-shape into a custom path context, not
  re-derived. Sample density is one number in `DECISIONS.md`.
- Failures on this stack are silent wrong output
  (`~/src/projects/3os/glass/docs/FINDINGS.md`). Trust the diff image.

## Rung 0 — calibrate

1. `npm ci` here (three, d3, @observablehq/runtime, puppeteer, resvg).
2. `ref/render.js hierarchies/cluster.v2` produces `ref/cluster.png`.
3. Chromium-vs-resvg diff of that SVG → `ref/TOLERANCE.md`.
4. Harness copy runs against an empty `examples/d3_smoke.html` (a blank
   WebGPU canvas) and fails honestly against `ref/cluster.png`.
5. `__advance` proven on the reference side with `animation/collapsible-tree`:
   t=0 and t=end screenshots differ.
Keep the run log in `handoff/rung0/`.

## The ladder

| # | example (gallery dir) | forces into the port | scripted event |
|---|---|---|---|
| 1 | hierarchies/cluster.v2 (Cluster dendrogram) | svgCamera, linkHorizontal→polyline, line primitive, circle marks, SDF text with anchor + paint-order halo | — |
| 2 | hierarchies/tree.v2 (Tidy tree) | d3.tree; proves rung 1 primitives are reusable with no new API | — |
| 3 | hierarchies/radial-cluster.v2 + radial-tree.v2 (Radial dendrogram / tidy tree) | linkRadial, rotated + flipped labels, polar layout | — |
| 4 | hierarchies/tree-of-life (Phylogenetic tree) | branch lengths, arcs (d3.arc→polyline), per-branch colour, thousands of marks | — |
| 5 | networks/hierarchical-edge-bundling.v2 | curveBundle, many long curves, per-line colour, hover state via raycast | hover node N |
| 6 | animation/collapsible-tree | d3-transition replaced by the port's tween; click to collapse/expand | click node N, advance 250 ms |
| 7 | animation/zoomable-sunburst | d3.partition, arc primitive with interpolated angles, arcVisible clipping | click arc N, advance 750 ms |
| 8 | animation/zoomable-circle-packing | d3.pack, zoom by camera tween not by scaling marks | click circle N, advance 750 ms |
| 9 | hierarchies/treemap.v2 → animation/zoomable-treemap | rects, label clipping, tiling; director picks one | click cell N, advance 750 ms |
| 10 | networks/force-directed-graph.v2 | d3-force ticked by `__advance`, drag via raycast + pointer | 300 ticks |
| 11 | hierarchies/nitaku__tangled-tree-visualization-ii (Tangled tree) | non-d3-hierarchy layout, bundled links, stacked levels | — |
| 12 | networks/chord-diagram.v2 + sankey.v2 | d3-chord ribbons, d3-sankey links (area primitive) | — |
| 13 | animation/world-tour | d3-geo + versor; the one rung that may go 3D: a real sphere with a PerspectiveCamera, graded at t=0 only | advance 1250 ms, graded on marks JSON not pixels |

Rungs 1–4 are the dendrogram core and are the minimum acceptable
deliverable. Order is a default, not a contract; the director reorders
when a gap list says so. Stretch after 13: fun/voronoi-stippling,
analysis/contours, analysis/hexbin.

## Handoff to three-rs

Each finished rung leaves `examples/d3_<slug>.html`,
`screenshots/d3_<slug>.jpg` (the port's own screenshot, produced by the
harness), and `marks/d3_<slug>.json`. Those three are what a three-rs
rung consumes: the HTML is the scene to port, the JPG is the reference,
the JSON is the layout target for the Rust d3 modules. Append each to
`handoff/LADDER-FOR-THREE-RS.md` with the d3 modules it needs, so the
three-rs director can schedule Rust ports of d3-hierarchy, d3-shape,
d3-force in the order this ladder demands.

## Orchestration

- Director: the session model, holding this file and the judgement
  calls (is the tolerance honest, is the green real, what is the next
  rung, which text primitive).
- Workers: Opus, one per rung. A worker gets: the notebook.js and files,
  the current `examples/` and shared primitives, the harness, and "make
  this rung pass both gates". It reports: pass/fail with diff %, marks
  JSON equality, primitives it added or changed, and gaps found.
- Sequential rungs; fan out only inside a rung on independent gaps,
  2–3 workers, never more than 6 (machine limit in ~/.claude/CLAUDE.md).

## Layout (suggested, walk it if it fights you)

Plain git repo at `~/src/projects/d33` (bare-worktree layout as
three-rs if the director wants parity). `examples/`, `src/` (svgCamera,
primitives, tween, path context), `ref/`, `test/e2e/`, `marks/`,
`screenshots/`, `handoff/`, `DECISIONS.md`.

## Out of scope

Anything in d3's DOM half beyond what a rung's scripted event needs (no
brush, no axes as a library); Observable Plot; the Rust side. The
question "does it look good in 3D" is not graded; rung 13 is the only
place 3D is even allowed to differ from the SVG.
