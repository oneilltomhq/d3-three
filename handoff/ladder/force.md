## N. force-directed graph → d3-force-3d

| artefact | path |
| --- | --- |
| page | `examples/d3_force.html` |
| screenshot | `examples/screenshots/d3_force.jpg` (400×250) |
| marks | `marks/d3_force.json` (77 nodes, 254 links, 77 labels) |
| layout note | `layouts/force.md` |
| reference render of the original notebook | `ref/force.png` (928×600) |

Source notebook: `d3-gallery/notebooks/networks/force-directed-graph.v2`, data
`files/miserables.json` (`{ nodes: [{ id, group }] × 77, links: [{ source, target,
value }] × 254 }`), copied with `map(d => ({...d}))` as the notebook does; node and
link order as in the file.

**d3 modules needed:** d3-force-3d (`forceSimulation(nodes, 3)`, `forceLink`,
`forceManyBody`, `forceCenter(0, 0, 0)`, `simulation.randomSource`), d3-random
(`randomLcg(0.5)`), d3-scale (`scaleOrdinal`), d3-scale-chromatic
(`schemeCategory10`). The DOM half (selection, drag) is not used.

**3D layout:** the notebook's three forces, at d3's defaults, run in three
dimensions. The simulation is seeded (`randomSource(randomLcg(0.5))`), stopped, and
ticked synchronously `ceil(log(0.001) / log(1 − alphaDecay))` = 300 times — the
same ticks its own timer would run before `end` — so the page renders the converged
state and never animates. Positions are then centred on their bounding box and
scaled so the largest extent is 20 (scale 0.06154): `20.000 × 15.966 × 11.953`,
depth ratio 0.598. Twelve lines of layout in `examples/d3_force.html`; full spec in
`layouts/force.md`. Three-rs either ports the integrator (Barnes–Hut octree
many-body, theta² 0.81; link strength `1 / min(count(a), count(b))`, distance 30;
velocity decay 0.6; alpha decay `1 − 0.001^(1/300)`; 3D spiral init
`r = 10·cbrt(i + 0.5)`, roll `i·π(3 − √5)`, yaw `i·20π/(9 + √221)`) or reads the 77
positions from the marks JSON.

**Determinism, proven twice.** `e2e:twice` is 0 px (both raw PNGs sha256
`c0462175…4db2`). Separately, `node tools/stable.js d3_force` loads the page in two
independent Chromium processes with NO harness injection (real `Math.random`, real
clocks, free-running RAF), reads `window.d33.report()` from each and compares every
mark and label position with `===`, and compares against `marks/d3_force.json`:
331/331 marks and 77/77 labels identical in all three, max |Δ| 0.

**Marks:** one `Mesh(SphereGeometry(0.25))` per node, `schemeCategory10` by
`group`, `MeshStandardNodeMaterial` with the colour as a light emissive (0.18) in
place of the notebook's white outline; one straight two-point `Line2` per link,
`#999` opacity 0.6, linewidth `sqrt(value)` px (1–5.57, one shared material per
distinct width). Link `a`/`b` are the node ids; a link's gate position is their
midpoint.

**Camera:** PerspectiveCamera fov 40, elevation 15°, azimuth 35°, fitted at 0.85
fill to the projected nodes plus the far ends of the labels. Fixed; one frame. (The
note's draft 20°/30° put a sampled node exactly behind another from camera B; the
chosen pair is the middle of a 30–40° run that is 20/20 from both cameras.)

**Gates:** depth 0.598 · counts 77/77, 254/254 · angle 0.466 / 0.442 · picking
20/20 from both cameras (sampledA 20, sampledB 20) · labels 77/77.

**Labels (rung 3):** same primitive and dependency as the earlier entries (lib3
`sdf-text`, `src/labels.js`, Roboto Regular, `#333` on a white halo 0.25), one per
node showing `id`. Planar, not billboarded: each label's quaternion is camera A's,
baked once at layout time and recorded in `marks/d3_force.json` `labels[].q`;
offset along camera right by 0.35 (node radius + 0.1), anchor start.
`fontSize = min(8 px at target distance, 0.6 · closest pair 0.925) = 0.555` world
units (7.4 px at 400×250). `hierarchyLabels` is given a `{ descendants }` shim over
the flat node list, so no shared primitive changed.

**Shared-file changes on this branch:** none in `src/` or `test/e2e/`.
`tools/ref.js` gained an un-awaited `invalidation` stub and an optional
`REF_SETTLE_MS` wait (default 0; static notebooks render byte-identically) so the
self-animating notebook could be captured. `tools/stable.js` added.

**Gap:** the notebook's drag interaction (reheat on drag) is not lifted; the page
is a converged, orbitable still. Labels in the dense core overlap in projection, as
the notebook's `<title>` tooltips would not.
