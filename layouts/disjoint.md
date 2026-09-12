# disjoint force-directed graph → d3-force-3d

Source: `networks/disjoint-force-directed-graph.v2` (graph.json: 336 nodes, 275
links; citing patents and the works they cite, 83 disconnected components). 2D:
`forceSimulation` with `forceLink().id(d => d.id)`, `forceManyBody`, and the
positioning forces `forceX()`, `forceY()` in place of `forceCenter` so detached
components cannot escape the viewport; circles r 5 coloured by `group`
(schemeCategory10: Cited Works, Citing Patents), lines `#999` opacity 0.6 width
`sqrt(value)` (every value is 2). Node ids are shown only as `<title>` tooltips.

Built as `examples/d3_disjoint.html`; this note is kept true to what runs.

## The lift

The notebook's forces in three dimensions via `d3-force-3d`
(`forceSimulation(nodes, 3)`), with `forceZ()` added as the third axis's
positioning force. In 2D the components pack into a disc against the origin; in
3D the same forces pack them into a ball, so components that would be crowded
into one plane spread through depth.

What d3 decides: everything — positions come out of the simulation. What the page
controls so it is deterministic and finished before the first frame:
- `simulation.randomSource(d3.randomLcg(0.5))` (d3-force-3d exposes it) so the
  jiggle and any random init are seeded independently of the harness. (As for
  force: d3-force-3d's default source is its own LCG and its 3D initial placement
  is a deterministic spherical spiral; the seed makes that explicit.)
- `simulation.stop()` then tick synchronously to convergence:
  `n = ceil(log(alphaMin) / log(1 − alphaDecay))` = **300** ticks with the defaults,
  exactly the number the simulation's own timer would run before `end`.
  No animation; the page renders the converged state.
- forces: `forceLink(links).id(d => d.id)`, `forceManyBody()`, `forceX()`,
  `forceY()`, `forceZ()` — all at d3's defaults (positioning strength 0.1 towards
  0, link distance 30, charge −30). The result is centred on its bounding box and
  scaled so the largest axis extent is 20 (scale 0.05134):
  `20.000 × 19.660 × 19.576`, depth ratio **0.979** — a ball, as the 2D is a disc.
- Node order and link order as in the file.

Proof that the layout itself is deterministic, not only the harness render:
`node tools/stable.js d3_disjoint` loads the page in two separate Chromium
processes with NO deterministic injection (real `Math.random`, real clocks,
free-running RAF), reads `window.d33.report()` from each and compares every
position with `===`; it also compares against the harness's
`marks/d3_disjoint.json`. All three agree: 611/611 marks and 336/336 labels,
0 differ, max |Δ| 0.

## Marks

- node: sphere `Mesh` per node (336), radius **0.25** as d3_force (the notebook's
  r 5 is 0.15 of a 20-unit disc; 0.25 keeps the spheres 3 px at 400×250 and is the
  radius the picking gate was tuned at). Colour `schemeCategory10` by group
  (Cited Works blue, Citing Patents orange); the notebook's white 1.5 px outline
  is not reproduced (two objects per datum); `MeshStandardNodeMaterial` with
  `emissive` = the colour at intensity 0.18 instead. `expected.nodes = 336`.
- link: fat line (`Line2`) per link (275), straight, two points, `#999` opacity
  0.6, linewidth `sqrt(value)` = 1.414 px for every link (one shared
  `Line2NodeMaterial`). `a`, `b` = node ids. `expected.links = 275`.
- labels: all 336, planar in camera A's plane exactly as d3_force (quaternion
  copied once at layout time, offset +x along camera right by node radius + 0.1
  = 0.35, anchor start; `hierarchyLabels` fed a `{ descendants }` shim over
  `{ data: { label } }` wrappers). Two numbers moved from d3_force, both
  recorded in the page:
  - **text**: the id, cut at 32 characters with `…` (`slice(0, 31).trimEnd() +
    '…'`). Patent ids are 19 characters and untouched; the 100 cited works are
    paper titles of 19–250 characters that the notebook never draws (tooltip
    only). Drawn in full a 250-character title is ~60 world units against a
    20-unit cloud, and the camera refit to label tips shrinks the graph to a
    third of the frame. The full id stays on `mesh.name` and, via `id`, in
    `marks/d3_disjoint.json`; the dumped label `text` is the drawn string.
  - **size**: `LABEL_PX = 3.5` (d3_force: 8). Font size `min(3.5 px at target
    distance, 0.6 · closest pair 0.996)` = **0.337** world units = 3.5 px at
    400×250, 14 px in the 1600×1000 eyeball render. At 8 px (6.2 px after the
    pitch cap) 336 labels blanket the 336 marks and neither reads; at 3.5 px the
    spheres, links and the small peripheral components show through and the
    labels are legible at 1600×1000. Quaternion per label in
    `marks/d3_disjoint.json` (`labels[].q`); no label is mirror-flipped.
  `expected.labels = 336`.

## Camera

fov 40, **elevation 15°, azimuth 35°**, fill 0.85 — d3_force's pair, unchanged —
refitted (3 iterations) to the nodes plus the far ends of the labels so no name
is clipped. Angle areas 0.441 / 0.374. Picking 20/20 from both cameras on the
first run (301 of 336 nodes unoccluded from each camera; the pre-pass skips the
35 whose centre pixel belongs to a nearer sphere).

Depth gate: 0.979. The positioning forces are isotropic so the cloud is nearly
a ball; if the ratio drops towards 0 the `forceZ` is missing.

## Primitives for `src/`

Nothing new; `fatLine`, `lineMaterial`, `frameCamera`, `attachOrbit`,
`hierarchyLabels` as they were. `tools/ref.js` unchanged (`REF_SETTLE_MS=8000`,
as force, for the self-animating chart; `ref/disjoint.png` 928×680).

## For three-rs

d3 modules: d3-force-3d (forceSimulation, forceLink, forceManyBody, forceX,
forceY, forceZ), d3-random (randomLcg), d3-scale (scaleOrdinal),
d3-scale-chromatic (schemeCategory10). Layout: the seeded, synchronously
converged simulation; three-rs ports the force integrator as for force
(Barnes–Hut octree many-body with theta² 0.81, link force with the default
`1 / min(count(source), count(target))` strength, velocity decay 0.6, alpha decay
`1 − 0.001^(1/300)`) plus the three positioning forces (`v += (0 − p) · 0.1 ·
alpha` per axis), or reads the 336 positions from `marks/d3_disjoint.json`.
