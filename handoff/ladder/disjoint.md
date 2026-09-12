## N. disjoint force-directed graph → d3-force-3d

| artefact | path |
| --- | --- |
| page | `examples/d3_disjoint.html` |
| screenshot | `examples/screenshots/d3_disjoint.jpg` (400×250) |
| marks | `marks/d3_disjoint.json` (336 nodes, 275 links, 336 labels) |
| layout note | `layouts/disjoint.md` |
| reference render of the original notebook | `ref/disjoint.png` (928×680) |
| eyeball render | `handoff/ladder/disjoint-1600x1000.png` |

Source notebook: `d3-gallery/notebooks/networks/disjoint-force-directed-graph.v2`,
data `files/graph.json` (`{ nodes: [{ id, group, radius, citing_patents_count }]
× 336, links: [{ source, target, value }] × 275 }`; 83 disconnected components,
two groups: Cited Works 100, Citing Patents 236), copied with
`map(d => ({...d}))` as the notebook does; node and link order as in the file.

**d3 modules needed:** d3-force-3d (`forceSimulation(nodes, 3)`, `forceLink`,
`forceManyBody`, `forceX`, `forceY`, `forceZ`, `simulation.randomSource`),
d3-random (`randomLcg(0.5)`), d3-scale (`scaleOrdinal`), d3-scale-chromatic
(`schemeCategory10`). The DOM half (selection, drag, `<title>`) is not used.

**3D layout:** the notebook's forces at d3's defaults, run in three dimensions,
with `forceZ()` added as the third positioning force (the notebook uses
positioning forces instead of `forceCenter` so detached components cannot drift
away; in 3D they hold the 83 components in a ball around the origin instead of a
disc). Seeded (`randomSource(randomLcg(0.5))`), stopped, ticked synchronously
`ceil(log(0.001) / log(1 − alphaDecay))` = 300 times, then centred on the
bounding box and scaled so the largest extent is 20 (scale 0.05134):
`20.000 × 19.660 × 19.576`, depth ratio 0.979. Full spec in `layouts/disjoint.md`.
Three-rs either ports the integrator exactly as for force (Barnes–Hut octree,
theta² 0.81; link strength `1 / min(count(a), count(b))`, distance 30; velocity
decay 0.6; alpha decay `1 − 0.001^(1/300)`; 3D spiral init) plus the positioning
forces (`v += (0 − p) · 0.1 · alpha` on each axis), or reads the 336 positions
from the marks JSON.

**Determinism, proven twice.** `e2e:twice` is 0 px (both raw PNGs sha256
`ac960671…6710`). `node tools/stable.js d3_disjoint` (two independent Chromium
processes, no harness injection) agrees with itself and with
`marks/d3_disjoint.json`: 611/611 marks and 336/336 labels identical, max |Δ| 0.

**Marks:** one `Mesh(SphereGeometry(0.25))` per node, `schemeCategory10` by
`group`, `MeshStandardNodeMaterial` with the colour as a light emissive (0.18) in
place of the notebook's white outline; one straight two-point `Line2` per link,
`#999` opacity 0.6, linewidth `sqrt(value)` = 1.414 px (every value is 2; one
shared material). Link `a`/`b` are the node ids; a link's gate position is their
midpoint.

**Camera:** PerspectiveCamera fov 40, elevation 15°, azimuth 35°, fitted at 0.85
fill to the projected nodes plus the far ends of the labels. Fixed; one frame.

**Gates:** depth 0.979 · counts 336/336, 275/275 · angle 0.441 / 0.374 · picking
20/20 from both cameras (sampledA 20, sampledB 20, 0 misses) · labels 336/336.

**Labels:** same primitive and dependency as force (lib3 `sdf-text`,
`src/labels.js`, Roboto Regular, `#333` on a white halo 0.25), one per node,
planar in camera A's plane (quaternion baked once, recorded in
`marks/d3_disjoint.json` `labels[].q`), offset 0.35 along camera right, anchor
start. Two numbers differ from force, both for legibility at 336 labels: the text
is the id cut at 32 characters with `…` (patent ids, 19 characters, are whole;
the 100 cited-work titles run to 250 characters and the notebook only shows them
as tooltips), and `fontSize = min(3.5 px at target distance, 0.6 · closest pair
0.996) = 0.337` world units (3.5 px at 400×250, 14 px at 1600×1000; at force's
8 px the labels hide the marks). `hierarchyLabels` is given a `{ descendants }`
shim over `{ data: { label } }` wrappers; no shared primitive changed.

**Shared-file changes on this branch:** none in `src/`, `test/e2e/` or `tools/`.

**Gap:** the notebook's drag interaction (reheat on drag) is not lifted; the page
is a converged, orbitable still. Labels in the core of the ball overlap in
projection, as 336 tooltips shown at once would. The notebook's white node
outline is not drawn.
