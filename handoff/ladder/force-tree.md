## N. force-directed tree → d3-force-3d

| artefact | path |
| --- | --- |
| page | `examples/d3_force-tree.html` |
| screenshot | `examples/screenshots/d3_force-tree.jpg` (400×250) |
| eyeball render | `handoff/ladder/force-tree-1600x1000.png` |
| marks | `marks/d3_force-tree.json` (252 nodes, 251 links, 32 labels) |
| gates | `gates/d3_force-tree.json` |
| layout note | `layouts/force-tree.md` |
| reference render of the original notebook | `ref/force-tree.png` (928×600, `REF_SETTLE_MS=8000`) |

Source notebook: `d3-gallery/notebooks/hierarchies/force-directed-tree`, data
`files/flare-2.json` (the flare package hierarchy: `{ name, children }`, 252
nodes, 220 leaves). `d3.hierarchy(data)`; nodes are `root.descendants()`
(pre-order), links `root.links()`.

**d3 modules needed:** d3-hierarchy (`hierarchy`, `descendants`, `links`),
d3-force-3d (`forceSimulation(nodes, 3)`, `forceLink`, `forceManyBody`, `forceX`,
`forceY`, `forceZ`, `simulation.randomSource`), d3-random (`randomLcg(0.5)`). The
DOM half (selection, drag) is not used.

**3D layout:** the notebook's forces, at the notebook's numbers, run in three
dimensions: `forceLink(links).distance(0).strength(1)`,
`forceManyBody().strength(-50)`, `forceX()`, `forceY()` and — the lift — `forceZ()`.
The simulation is seeded (`randomSource(randomLcg(0.5))`), stopped, and ticked
synchronously `ceil(log(0.001) / log(1 − alphaDecay))` = 300 times — the same
ticks its own timer would run before `end` — so the page renders the converged
state and never animates. Positions are then centred on their bounding box and
scaled so the largest extent is 20 (scale 0.06675): `16.575 × 18.069 × 20.000`,
depth ratio 0.829. Full spec in `layouts/force-tree.md`. Three-rs either ports
the integrator (Barnes–Hut octree many-body, theta² 0.81, strength −50; link
strength 1, distance 0; x/y/z positioning forces at strength 0.1 toward 0;
velocity decay 0.6; alpha decay `1 − 0.001^(1/300)`; 3D spiral init
`r = 10·cbrt(i + 0.5)`, roll `i·π(3 − √5)`, yaw `i·20π/(9 + √221)`) or reads the
252 positions from the marks JSON.

**Determinism, proven twice.** `e2e:twice` is 0 px (both raw PNGs sha256
`eb550fa1…e53a`). Separately, `node tools/stable.js d3_force-tree` loads the page
in two independent Chromium processes with NO harness injection (real
`Math.random`, real clocks, free-running RAF), reads `window.d33.report()` from
each and compares every mark and label position with `===`, and compares against
`marks/d3_force-tree.json`: 503/503 marks and 32/32 labels identical in all
three, max |Δ| 0.

**Marks:** one `Mesh(SphereGeometry(0.2))` per node via `hierarchyNodes`
(src/nodes.js): internal nodes white, leaves black (one-entry palette), as the
notebook's `fill #fff` / `fill #000`. The notebook's `stroke #000` on the white
circles is a Fresnel darkening of the white spheres' silhouette (`src/rim.js`, a
TSL `colorNode` on the shared internal material), so a node stays one object.
One straight two-point `Line2` per link, `#999` opacity 0.6, 1.5 px, one shared
material. Link `a`/`b` are the node ids; a link's gate position is their midpoint.

**Camera:** PerspectiveCamera fov 40, elevation 15°, azimuth 35°, fitted at 0.85
fill to the projected nodes plus the far ends of the labels. Fixed; one frame.

**Gates:** depth 0.829 · counts 252/252, 251/251 · angle 0.437 / 0.604 · picking
20/20 from both cameras (sampledA 20, sampledB 20, misses none) · labels 32/32.

**Labels (rung 3):** same primitive and dependency as the earlier entries (lib3
`sdf-text`, `src/labels.js`, Roboto Regular, `#333` on a white halo 0.25), but
only on the 32 internal nodes (`root.descendants().filter(d => d.children)`,
the white hubs), showing `data.name`; `expected.labels = 32`. The notebook
draws no text (tooltips only) and a first pass labelling all 252 nodes buried
the tree; leaves keep their name on `mesh.name`. Planar, not billboarded: each
label's quaternion is camera A's, baked once at layout time and recorded in
`marks/d3_force-tree.json` `labels[].q`; offset along camera right by 0.3 (node
radius + 0.1), anchor start. `fontSize = min(8 px at target distance, 0.6 ·
closest pair of internal nodes 1.163) = 0.658` world units (8.0 px at 400×250,
32 px at 1600×1000), d3_force's rule. `hierarchyLabels` is given a
`{ descendants }` shim over the internal-node list, so no shared primitive changed.

**Shared-file changes on this branch:** none in `src/` (existing files),
`test/e2e/` or `tools/`. Added `src/rim.js`.

**Gap:** the notebook's drag interaction (reheat on drag) and its `<title>`
tooltips are not lifted; the page is a converged, orbitable still; leaf names are on the
meshes but not drawn. Hub labels around `vis` (`util`, `axis`, `scale`, `math`)
overlap in projection.
