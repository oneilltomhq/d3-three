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
free-running RAF), reads `window.d3three.report()` from each and compares every
position with `===`; it also compares against the harness's
`marks/d3_disjoint.json`. All three agree: 611/611 marks, 0 differ, max |Δ| 0.

## Marks

- node: sphere `Mesh` per node (336), radius **0.18** (the notebook's r 5 is
  0.15 of its 680 px disc scaled to 20 units; d3_force's 0.25 read too large for
  336 nodes at pitch ~1, so the director moved it to 0.18 — 2.3 px at 400×250,
  picking still 20/20 from both cameras). Colour `schemeCategory10` by group
  (Cited Works blue, Citing Patents orange); the notebook's white 1.5 px outline
  is not reproduced (two objects per datum); `MeshStandardNodeMaterial` with
  `emissive` = the colour at intensity 0.18 instead. `expected.nodes = 336`.
- link: fat line (`Line2`) per link (275), straight, two points, `#999` opacity
  0.6, linewidth `sqrt(value)` = 1.414 px for every link (one shared
  `Line2NodeMaterial`). `a`, `b` = node ids. `expected.links = 275`.
- labels: **none**. The notebook draws no text — ids are `<title>` tooltips
  only, 236 patent serial numbers and 100 paper titles up to 250 characters. A
  first build drew all 336 as planar labels (as d3_force) and they buried the
  marks at any legible size; the director's ruling was to drop them. The page
  registers `expected.labels = 0` and no labels object; the labels gate reports
  `count 0 / 0, note 'no labels registered'` and passes. The id stays on
  `mesh.name` (nodes) and `'<source> - <target>'` (links).

## Camera

fov 40, **elevation 15°, azimuth 35°**, fill 0.85 — d3_force's pair, unchanged —
fitted once to the projected nodes (no labels to refit for). Angle areas
0.444 / 0.449. Picking 20/20 from both cameras (21 distinct nodes sampled).

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
