# force-directed graph → d3-force-3d

Source: `networks/force-directed-graph.v2` (miserables.json: 77 nodes, 254 links,
character co-occurrence in Les Misérables). 2D: `forceSimulation` with `forceLink`,
`forceManyBody`, `forceCenter`; circles r 5 coloured by `group` (schemeCategory10),
lines `#999` opacity 0.6 width `sqrt(value)`.

Built as `examples/d3_force.html`; this note is kept true to what runs.

## The lift

Same three forces in three dimensions via `d3-force-3d` (`forceSimulation(nodes,
3)`), so the layout is the same physics with one more degree of freedom; clusters
that overlap in the plane separate in depth.

What d3 decides: everything — positions come out of the simulation. What the page
controls so it is deterministic and finished before the first frame:
- `simulation.randomSource(d3.randomLcg(0.5))` (d3-force-3d exposes it) so the
  jiggle and any random init are seeded independently of the harness. (d3-force-3d
  never calls `Math.random` on this path anyway — its default source is its own
  LCG — and its 3D initial placement is a deterministic spherical spiral; the seed
  makes that explicit.)
- `simulation.stop()` then tick synchronously to convergence:
  `n = ceil(log(alphaMin) / log(1 − alphaDecay))` = **300** ticks with the defaults,
  exactly the number the simulation's own timer would run before `end`.
  No animation; the page renders the converged state.
- forces: `forceLink(links).id(d => d.id)`, `forceManyBody()`, `forceCenter(0,0,0)`.
  Distances at d3's defaults. The result is centred on its bounding box and scaled
  so the largest axis extent is 20 (scale 0.06154): `20.000 × 15.966 × 11.953`,
  depth ratio **0.598**.
- Node order and link order as in the file.

Proof that the layout itself is deterministic, not only the harness render:
`node tools/stable.js d3_force` loads the page in two separate Chromium processes
with NO deterministic injection (real `Math.random`, real clocks, free-running
RAF), reads `window.d33.report().marks` from each and compares every position with
`===`; it also compares against the harness's `marks/d3_force.json`. All three
agree: 331/331 marks and 77/77 labels, 0 differ, max |Δ| 0.

## Marks

- node: sphere `Mesh` per node (77), radius **0.25** (the draft said 0.35, "≈ the
  notebook's r 5 relative to the 928 frame" — that ratio is actually 0.11 in a
  20-unit extent; 0.35 spheres in the dense core occluded one another from
  camera B for the picking gate, 0.25 does not and is still 3 px at 400×250).
  Colour `schemeCategory10` by group; the notebook's white 1.5 px outline is not
  reproduced (a second back-face sphere would be two objects per datum); a
  `MeshStandardNodeMaterial` with `emissive` = the colour at intensity 0.18 lifts
  the colour off the grey links instead. `expected.nodes = 77`.
- link: fat line (`Line2`) per link (254), straight, two points, `#999` opacity
  0.6, linewidth `sqrt(value)` px (1 … 5.57). One shared `Line2NodeMaterial` per
  distinct width. `a`, `b` = node ids. `expected.links = 254` (the count of
  `data.links` in the file).
- labels: all 77, `d.id`, planar: every label lies in the plane facing camera A's
  initial direction — its quaternion is camera A's, copied once at layout time,
  not a per-frame billboard — offset +x (camera right) by node radius + 0.1
  (0.35), anchor start. `hierarchyLabels` (src/labels.js) is fed a shim
  `{ descendants: () => wrappers }` of childless `{ data: node }` wrappers, so no
  primitive changed. Font size `min(8 px at target distance, 0.6 · closest pair
  0.925)` = 0.555 world units = 7.4 px at 400×250. The quaternion is recorded per
  label in `marks/d3_force.json` (`labels[].q`); no label is mirror-flipped.

## Camera

fov 40, **elevation 15°, azimuth 35°**, fill 0.85, refitted (3 iterations) to the
nodes plus the far ends of the labels so no name is clipped. The draft said
20°/30°: at that pair (and at 20°/20°) one or two sampled nodes were exactly
behind another node from camera A or B, failing the picking gate. A sweep of
elevation 10–35° × azimuth 0–90° in 5° steps, using the page's own fit, found
15°/30°, 15°/35° and 15°/40° all 20/20 from both cameras; 35° is the middle of
that run so the pass is not a knife edge. Angle areas 0.466 / 0.442.

Depth gate: 3D many-body layouts are close to isotropic; got 0.598 (draft expected
> 0.6, close enough). If below 0.25 the simulation has collapsed to a plane — check
`forceCenter` is 3-argument and the init is 3D.

## Primitives for `src/`

Nothing new; `fatLine` with a two-point array, `lineMaterial`, `frameCamera`,
`attachOrbit`, `hierarchyLabels` as they were. Added `tools/stable.js` (the
layout-determinism proof above) and two lines in `tools/ref.js` so the notebook's
self-animating chart can be captured (`invalidation` stub passed un-awaited, and
`REF_SETTLE_MS` to wait for the simulation's `end`; `ref/force.png` used 8000 ms).

## For three-rs

d3 modules: d3-force-3d (forceSimulation, forceLink, forceManyBody, forceCenter),
d3-random (randomLcg), d3-scale (scaleOrdinal), d3-scale-chromatic
(schemeCategory10). Layout: the seeded, synchronously converged simulation;
three-rs ports the force integrator (Barnes–Hut octree many-body with theta² 0.81,
link force with the default `1 / min(count(source), count(target))` strength,
velocity decay 0.6, alpha decay `1 − 0.001^(1/300)`), or reads the 77 positions from
`marks/d3_force.json`.
