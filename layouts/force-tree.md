# force-directed tree → d3-force-3d

Source: `hierarchies/force-directed-tree` (flare-2.json: the flare package
hierarchy, 252 nodes, 251 links from `root.links()`). 2D: `forceSimulation` on
`d3.hierarchy(data).descendants()` with `forceLink(links).distance(0).strength(1)`,
`forceManyBody().strength(-50)`, `forceX()`, `forceY()`; circles r 3.5, internal
nodes fill `#fff` stroke `#000` 1.5 px, leaves fill `#000`; lines `#999` opacity
0.6 (default width 1.5 px). No text: names are `<title>` tooltips only.

Built as `examples/d3_force-tree.html`; this note is kept true to what runs.
Class: 3D lift (director ruling: the third axis obviously wins, as for force).

## The lift

The notebook's forces in three dimensions via `d3-force-3d`
(`forceSimulation(nodes, 3)`), plus `forceZ()` so the third axis is pulled to the
origin the way x and y are; the many-body repulsion has one more degree of
freedom, so sibling fans that overlap in the plane separate in depth.

What d3 decides: everything — positions come out of the simulation. What the page
controls so it is deterministic and finished before the first frame:
- `simulation.randomSource(d3.randomLcg(0.5))`, as d3_force (d3-force-3d's 3D
  initial placement is a deterministic spherical spiral; the seed makes it explicit).
- `simulation.stop()` then tick synchronously to convergence:
  `n = ceil(log(alphaMin) / log(1 − alphaDecay))` = **300** ticks with the defaults,
  exactly the number the simulation's own timer would run before `end`.
  No animation; the page renders the converged state.
- forces: `forceLink(links).id(d => d.id).distance(0).strength(1)`,
  `forceManyBody().strength(-50)`, `forceX()`, `forceY()`, `forceZ()` — the
  notebook's numbers, nothing changed. (`.id` is never consulted: `root.links()`
  already holds node objects.) The result is centred on its bounding box and
  scaled so the largest axis extent is 20 (scale 0.06675):
  `16.575 × 18.069 × 20.000`, depth ratio **0.829**.
- Node order is `root.descendants()` (pre-order), link order `root.links()`.

Proof that the layout itself is deterministic, not only the harness render:
`node tools/stable.js d3_force-tree` loads the page in two separate Chromium
processes with NO deterministic injection (real `Math.random`, real clocks,
free-running RAF), reads `window.d3three.report().marks` from each and compares every
position with `===`; it also compares against the harness's
`marks/d3_force-tree.json`. All three agree: 503/503 marks and 32/32 labels,
0 differ, max |Δ| 0.

## Marks

- node: sphere `Mesh` per descendant (252) from `hierarchyNodes` (src/nodes.js),
  radius **0.2** for both classes. Scaled as d3_force's 0.25 was for r 5, the
  notebook's r 3.5 would be 0.175; rounded up to 0.2 so a node is still 2 px at
  400×250 (closest pair 0.782, so no two spheres touch). Colour as the notebook:
  internal nodes white (`internalColor 0xffffff`), leaves black (a one-entry
  `palette ['#000000']`, so every leaf gets the same material). The notebook's
  `stroke #000` on the white circles is a view-dependent Fresnel darkening of the
  sphere's silhouette (`src/rim.js`, TSL `colorNode` on the shared internal
  material) — still one Mesh per datum, no ring or second sphere.
  `expected.nodes = 252`.
- link: fat line (`Line2`) per `root.links()` entry (251), straight, two points,
  `#999` opacity 0.6, linewidth 1.5 px (the notebook's default stroke-width). One
  shared `Line2NodeMaterial`. `a`, `b` = node ids. `expected.links = 251`.
- labels: **internal nodes only** — the 32 white hubs
  (`root.descendants().filter(d => d.children)`), `data.name`. The notebook
  draws no text (names are `<title>` tooltips), and a first pass with all 252
  names was a wall of text that buried the tree; the hubs name the fans and
  the leaves keep their name on `mesh.name`. Planar as d3_force: every label
  lies in the plane facing camera A's initial direction (its quaternion is
  camera A's, copied once at layout time, not a per-frame billboard), offset
  +x (camera right) by node radius + 0.1 (0.3), anchor start. `hierarchyLabels`
  is fed a shim `{ descendants: () => wrappers }` of childless `{ data }`
  wrappers over the internal nodes, as d3_force does over its graph, so no
  primitive changed. Font size `min(8 px at target distance, 0.6 · closest pair
  of internal nodes 1.163)` = **0.658** world units = 8.0 px at 400×250, 32 px
  at 1600×1000 — d3_force's rule. No label is mirror-flipped at layout time.
  `expected.labels = 32` (the labels gate reads it).

## Camera

fov 40, **elevation 15°, azimuth 35°**, fill 0.85 (d3_force's pair), refitted
(3 iterations) to the nodes plus the far ends of the labels so no name is clipped.
Angle areas 0.437 / 0.604. Picking 20/20 from both cameras at the first try
(visible 221 / 225 of 252 after the occlusion pre-pass).

Depth gate: 0.829 — the tree with `forceX/Y/Z` is nearly isotropic. If below 0.25
the simulation has collapsed to a plane — check `forceZ()` is present and the
init is 3D.

## Primitives for `src/`

`hierarchyNodes`, `fatLine`/`lineMaterial`, `frameCamera`, `attachOrbit`,
`hierarchyLabels` as they were. New: `src/rim.js` — `rimColor({ fill, stroke,
power, strength })`, a TSL colour node mixing `stroke` in at the silhouette
(`pow(1 − dot(normalView, viewDir), 2.5) · 0.9`), for a stroked-circle look on a
sphere without a second object.

## For three-rs

d3 modules: d3-hierarchy (hierarchy, descendants, links), d3-force-3d
(forceSimulation, forceLink, forceManyBody, forceX, forceY, forceZ), d3-random
(randomLcg). Layout: the seeded, synchronously converged simulation; three-rs
ports the force integrator (Barnes–Hut octree many-body with theta² 0.81 and
strength −50; link force with strength 1 and distance 0; forceX/Y/Z at strength
0.1 toward 0; velocity decay 0.6; alpha decay `1 − 0.001^(1/300)`; 3D spiral init
`r = 10·cbrt(i + 0.5)`, roll `i·π(3 − √5)`, yaw `i·20π/(9 + √221)`), or reads the
252 positions from `marks/d3_force-tree.json`. The rim is shading, not layout:
a Fresnel term on the fragment, `mix(white, black, (1 − n·v)^2.5 · 0.9)`.
