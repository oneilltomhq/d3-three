# Rung 1 brief: cluster dendrogram → cone tree (director: Fable; worker: Opus)

Read HANDOFF.md, handoff/rung0/{BRIEF,LOG}.md (harness contract), src/d3-three.js, and
layouts/cluster.md — the layout note is the design; implement it, do not redesign it.
If a number in it (radii, dy, camera) has to move to pass a gate or to look right, move
it and update the note so it stays true.

## Deliverables (HANDOFF §D.19)
1. `examples/d3_cluster.html`, same shape as `examples/d3_blank.html`, data from
   `/gallery/hierarchies/cluster.v2/files/flare.json` (fetch, no inlining).
2. `examples/screenshots/d3_cluster.jpg` via `npm run e2e:make d3_cluster`; then
   `npm run e2e d3_cluster` passes ALL gates green; `npm run e2e:twice d3_cluster` = 0 px.
3. `marks/d3_cluster.json`, `gates/d3_cluster.json` as written by the harness. Node count
   252, link count 251 (verify against `root.descendants()`/`root.links()` on the page).
4. `layouts/cluster.md` kept true to what was built.
5. `ref/cluster.png`: the ORIGINAL notebook's SVG rendered to PNG. Build `tools/ref.js
   <section>/<slug>` : puppeteer page (same flags/env as e2e are fine, WebGL not needed)
   loading `/examples/jsm/vendor/d3.js`, evaluating the notebook's `_chart` cell body
   with `data` loaded from its FileAttachment, appending the returned SVG and
   screenshotting it at natural size. Generic enough for tree.v2 / radial-cluster.v2 next.
6. `handoff/LADDER-FOR-THREE-RS.md` created with its first entry (§D.20): the four
   artefacts, d3 modules used, the 3D layout summary, and the rasterizer ruling from
   handoff/rung0/LOG.md.
7. `src/d3-three.js`: add optional `pickables` to `register()` (see LOG ruling).

## Primitives (§E.23): create in `src/`, keep them small and reusable
- `src/link.js`: `linkCurve(a, b, axis, segments)` → points of a cubic bezier whose
  control points are offset along `axis`; `fatLine(points, {color, opacity, linewidth})`
  → Line2 from `three/addons/lines/webgpu/Line2.js`.
- `src/frame.js`: `frameCamera(camera, box, {elevation, azimuth, fill})` sets position and
  lookAt so the box's bounding sphere fills `fill` of the frame; returns the target.
- `src/orbit.js`: attach OrbitControls, damping off, target given.

## Rules
- One Object3D per datum, no instancing, no merged geometry, no sprites/canvas (§B.8, §C.11).
- Deterministic: no Math.random in the page beyond what d3 does, no time-based anything.
- Lighting: hemisphere + one directional, white background as in the notebook.
- No labels this rung; record as a gap in the layout note.
- Fan out at most 2 sub-workers and only if genuinely parallel (e.g. tools/ref.js vs the
  page); default to doing it yourself.
- Commit on `rung0` with `rung1:` prefix messages and the attribution trailer from your
  instructions. Never touch `main/`.

## Report (§E.24)
Gates passed with the numbers (depth ratio, angle areas, picking hits/sampled), the
layout variant as built with any numbers you changed and why, primitives added/changed,
gaps, and the paths of the four artefacts plus ref/cluster.png.
