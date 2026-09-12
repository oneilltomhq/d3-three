# d33 ladder, for the three-rs director

What d33 leaves behind for each finished example (HANDOFF §D.19–20): the HTML
page, the harness screenshot, the marks JSON, and the layout note — plus the d3
modules the layout needs and a summary of the 3D lift.

## Contract between the two projects

**Screenshots are visual anchors, never pixel graders.** d33 renders WebGPU on
Dawn's SwiftShader (headless Chromium); three-rs renders wgpu on lavapipe. The
rasterizers differ, so a pixel comparison between the two is meaningless.

**The pixel-exact contract is `marks/d3_<slug>.json`**: one entry per datum with
its id, kind (`node` / `link` / `cell`), world position, and for links the ids of
its two endpoints. A three-rs rung matches those numbers; it uses the screenshot
only to check it is looking at the same thing.

Ruling recorded by the d33 director after rung 0; see
`handoff/rung0/LOG.md` §1 for the measurements behind it.

The gates every example passes are in `gates/d3_<slug>.json`: depth (smallest
axis extent ≥ ¼ of the largest), counts (marks == `root.descendants()` /
`root.links()`), angle (non-degenerate from two orthogonal cameras), picking
(raycasting a node's own pixel hits that node from both cameras).

---

## 1. cluster dendrogram → cone tree

| artefact | path |
| --- | --- |
| page | `examples/d3_cluster.html` |
| screenshot | `examples/screenshots/d3_cluster.jpg` (400×250) |
| marks | `marks/d3_cluster.json` (252 nodes, 251 links) |
| layout note | `layouts/cluster.md` |
| reference render of the original notebook | `ref/cluster.png` (928×2500) |

Source notebook: `d3-gallery/notebooks/hierarchies/cluster.v2`, data
`files/flare.json` (252 nodes, 220 leaves, height 4, 10 top-level packages).

**d3 modules needed:** d3-hierarchy (`hierarchy`, `cluster`), d3-array
(`ascending`), d3-scale (`scaleOrdinal`), d3-scale-chromatic (`schemeTableau10`).
The DOM half of d3 is not used at all.

**3D layout:** a cone tree. `d3.cluster().nodeSize([1,1])` still fixes the depth
coordinate (`root.height - node.height`, every leaf deepest — the dendrogram
property) and the sibling order. Breadth, which d3 spreads along a line, is
wrapped into a circle under each parent: each node gets a cone radius `R(n)`,
the smallest circle on which its children's subtree discs fit side by side
(bisection on `Σ 2·asin(g_i/R) ≤ 2π`), and each child sits on that circle at the
running angle. Depth is rescaled so the tree is as deep as the root cone is wide
(`dy = R(root)/root.height`). Result `87.7 × 38.6 × 105.0`, depth ratio 0.368.
About 70 lines, inside `examples/d3_cluster.html`; full spec in
`layouts/cluster.md`.

**Marks:** one `Mesh(SphereGeometry)` per descendant (r 0.45 leaf / 0.6
internal, internal `#555`, leaves coloured by top-level package from
schemeTableau10), one `Line2` per link (cubic bezier with control points offset
along the depth axis — the 3D `linkHorizontal` — 16 segments, `#555`, opacity
0.4, 1.5 px).

**Camera:** PerspectiveCamera fov 40, elevation 30°, azimuth 35°, fitted to the
projected node positions at 0.85 fill. Fixed; one frame.

**Gates:** depth 0.368 · counts 252/252, 251/251 · angle 0.637 / 1.032 ·
picking 20/20 from both cameras · labels 252/252.

**Labels (rung 3):** one SDF-text label per node (252) via lib3's `sdf-text`
(`BatchedText` + `Text`, vector font path, served at `/lib3/` from
`~/src/projects/lib3/dist`, lib3 commit `b20b053f`), `src/labels.js`
`hierarchyLabels`. Roboto Regular (`examples/fonts/Roboto-Regular.ttf`), fill
`#333`, white halo `outlineWidth 0.25`, `fontSize = min(8 px at target
distance, 0.6 · leaf pitch) = 1.344` world units. Not billboarded: each label
lies in the vertical plane through the node and its parent cone's axis
(baseline = horizontal parent→node direction), leaves anchored `start` offset
+0.80 outward, internal nodes anchored `end` offset −0.95 inward; a label whose
+x projects camera-left is turned 180° about its up axis and its anchor swapped
(140/252 here). **A three-rs port needs an SDF-text equivalent** (glyph quads
sampling a distance-field atlas, with an outline term). It does not need the
orientation or mirror logic: `marks/d3_cluster.json` now carries a `labels`
array, one entry per node, `{ id, text, x, y, z, q: [x, y, z, w], anchorX }` —
the anchor point in world space, the world quaternion of the label frame
(+x baseline, +y up, faces +z) and `anchorX` as `start` | `end` after the flip.
The `marks` array is byte-identical to rung 1/2; labels are not marks and are
not pickable.

---

## 2. tidy tree → radial fan of tidy planes

| artefact | path |
| --- | --- |
| page | `examples/d3_tree.html` |
| screenshot | `examples/screenshots/d3_tree.jpg` (400×250) |
| marks | `marks/d3_tree.json` (252 nodes, 251 links) |
| layout note | `layouts/tree.md` |
| reference render of the original notebook | `ref/tree.png` (928×1945) |

Source notebook: `d3-gallery/notebooks/hierarchies/tree.v2`, data
`files/flare.json` (252 nodes, 220 leaves, height 4, 10 top-level packages).

**d3 modules needed:** d3-hierarchy (`hierarchy`, `tree`), d3-array
(`ascending`), d3-scale (`scaleOrdinal`), d3-scale-chromatic (`schemeTableau10`).
The DOM half of d3 is not used at all.

**3D layout:** a radial fan of tidy planes. Reingold–Tilford is compositional, so
d3's tidy layout is kept verbatim and each of the ten top-level subtrees becomes
its own vertical plane ("blade"), fanned around the root like pages around a
spine: top-level child `c_i` gets azimuth `θ_i = 2π i / 10`, and every node `n`
of its subtree goes to `(n.y·cos θ_i, n.x − c_i.x, n.y·sin θ_i)`. Depth runs
radially outward, breadth vertically inside a blade, root at the origin.
`nodeSize([1, dy])` with `dy = B/5`, `B = 74` the largest blade breadth (measured
by running the layout once at `nodeSize([1,1])`). Result `83.81 × 74.00 × 84.45`,
depth ratio 0.876. About 30 lines on top of d3.tree, inside
`examples/d3_tree.html`; full spec in `layouts/tree.md`.

**Marks:** one `Mesh(SphereGeometry)` per descendant (r 0.45 leaf / 0.6 internal,
internal `#555`, leaves coloured by top-level package from schemeTableau10 —
shared with rung 1 as `src/nodes.js`), one `Line2` per link (cubic bezier with
control points offset along that blade's radial axis — the 3D `linkHorizontal` —
16 segments, `#555`, opacity 0.4, 1.5 px).

**Camera:** PerspectiveCamera fov 40, elevation 30°, azimuth 9°, fitted to the
projected node positions at 0.85 fill. Azimuth 9° is 9° off every edge-on blade
for both the gate's orthogonal cameras (blades at multiples of 36°). Fixed; one
frame.

**Gates:** depth 0.876 · counts 252/252, 251/251 · angle 0.426 / 0.435 ·
picking 20/20 from both cameras · labels 252/252.

**Labels (rung 3):** same primitive and dependency as entry 1 (lib3 `sdf-text`,
`src/labels.js`, Roboto Regular, `#333` on a white halo 0.25).
`fontSize = min(8 px at target distance, leaf pitch dx = 1) = 1.0` world unit
(2.5 px in the 400×250 reference, 10 px at 1600×1000 — the notebook's own 10 px
on a 10 px `nodeSize`). Each label lies in its blade's plane, baseline along the
blade's radial: leaves anchored `start` +0.80 outward, internal nodes anchored
`end` −0.95 toward the spine; mirror flip as in entry 1 (89/252).
`marks/d3_tree.json` carries the same `labels` array
(`{ id, text, x, y, z, q, anchorX }`); a port places text from it and needs no
label logic of its own beyond SDF text rendering. `marks` unchanged.
## 3. hierarchical edge bundling → sphere

| artefact | path |
| --- | --- |
| page | `examples/d3_bundling.html` |
| screenshot | `examples/screenshots/d3_bundling.jpg` (400×250) |
| marks | `marks/d3_bundling.json` (252 nodes, 764 links, 252 labels) |
| layout note | `layouts/bundling.md` |
| reference render of the original notebook | `ref/bundling.png` (954×954) |

Source notebook: `d3-gallery/notebooks/networks/hierarchical-edge-bundling.v2`,
data `files/flare.json` as a flat list of `{ name, size, imports }` (220 classes,
764 imports; the notebook's own `hierarchy` cell builds the 252-node tree from the
dotted names, `bilink` resolves the imports — both used verbatim, as are `id` and
`color`).

**d3 modules needed:** d3-hierarchy (`hierarchy`, `cluster`, `node.path`,
`leaves`), d3-array (`ascending`), d3-scale-chromatic (`interpolateRdBu`), d3-ease
(`easeQuad`). d3-shape's `curveBundle`/`curveBasis` are NOT called: they are
re-implemented in 3D in `src/bundle.js` (checked against d3's own path output).
The DOM half of d3 is not used at all.

**3D layout:** leaves on a sphere, bundles through its interior. `d3.cluster()
.size([2π, 954/2 − 100])` with the notebook's sort still fixes every leaf's
longitude `x` and the sibling order. Sphere `R = 10`; the `k` leaf children of a
parent fan symmetrically about the equator by rank `i`:
`lat = ((i + 0.5)/k − 0.5) · 90° · min(1, k/10)`, leaf at
`R·(cos lat cos x, sin lat, cos lat sin x)`. Internal node at depth `d` (H = 4):
radius `R·d/H` in the normalised mean direction of its leaves; root at the origin.
Each import s → t is `d3.curveBundle(β = 0.85)` + `d3.curveBasis` applied in 3D to
the positions of `s.path(t)` (3–8 control points), sampled 8 per piece, so the
curve starts exactly on its source leaf and ends exactly on its target
(max endpoint error 1.8e-15). Result `19.90 × 13.79 × 19.92`, depth ratio 0.692.
About 40 lines of layout in `examples/d3_bundling.html` plus ~60 of curve code in
`src/bundle.js`; full spec in `layouts/bundling.md`.

**Marks:** one `Mesh(SphereGeometry)` per descendant (leaves r 0.12 `#333`,
internal r 0.09 `#9a9a9a`), one `Line2` per import with a colour per vertex
(`LineGeometry.setColors`, `Line2NodeMaterial({ vertexColors: true })`): the
notebook's `color(easeQuad(j/(N−1)))` ramp, red at the source, blue at the
target. Opacity 0.8, 2 px (1 px after the harness's 2× downscale). Link `a`/`b`
are the source/target leaf ids; a link's gate position is their midpoint.

**Camera:** PerspectiveCamera fov 40, elevation 25°, azimuth 30°, fitted at 0.85
fill to the projected nodes plus the far ends of the leaf labels (the notebook's
label margin). Fixed; one frame.

**Gates:** depth 0.692 · counts 252/252, 764/764 · angle 0.332 / 0.342 ·
picking 20/20 from both cameras (sampledA 20, sampledB 20, 38 distinct marks) ·
labels 252/252.

**Picking on a closed surface (d33.js change on this rung):** leaf marks carry
`normal` (their unit vector). The gate samples, per camera, only marks whose
normal is absent or faces that camera (`dot(normal, camera − mark) > 0`), so a
leaf on the far side of the sphere is not raycast through the near side. Marks
without a normal behave exactly as before; `gates/*.json` gains `sampledA` /
`sampledB`.

**Labels (rung 3):** same primitive and dependency as entries 1–2 (lib3
`sdf-text`, `src/labels.js`, Roboto Regular, `#333` on a white halo 0.25), one
per descendant (252; the notebook labels leaves only, but the labels gate is
`count === nodes` and the internal waypoints are drawn here anyway).
`fontSize = min(8 px at target distance, 0.6 · leaf pitch 0.525) = 0.315` world
units (2.96 px at 400×250, 11.8 px at 1600×1000). Radial, as the notebook's:
baseline along the node's own radius, up = local north on the sphere; leaves
anchored `start` +0.27 outward, internal nodes anchored `end` −0.24 inward;
mirror flip as in entry 1 (125/252). `marks/d3_bundling.json` carries the same
`labels` array (`{ id, text, x, y, z, q, anchorX }`).

**Gap:** none beyond the ladder-wide ones. The notebook's `mix-blend-mode:
darken` has no 3D counterpart; alpha blending at 0.8 is used instead.
## 4. force-directed graph → d3-force-3d

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

## 5. circle packing → sphere packing

| artefact | path |
| --- | --- |
| page | `examples/d3_pack.html` |
| screenshot | `examples/screenshots/d3_pack.jpg` (400×250) |
| marks | `marks/d3_pack.json` (252 nodes, 0 links) |
| layout note | `layouts/pack.md` |
| packer + test | `src/pack3.js`, `test/pack3.test.mjs` (`npm test`) |
| labels | 252 members (147 leaves with text, the rest empty), via `src/labels.js` |
| reference render of the original notebook | `ref/pack.png` (928×928) |

Source notebook: `d3-gallery/notebooks/hierarchies/pack.v2`, data
`files/flare-2.json` (252 nodes, 220 leaves, height 4, largest fan-out 32).

**d3 modules needed:** d3-hierarchy (`hierarchy`, `sum`, `sort`), d3-scale
(`scaleLinear`), d3-interpolate (`interpolateHcl`). `d3.pack` itself is NOT used —
d3 has no 3D packer — and the DOM half of d3 is not used at all.

**3D layout:** nested sphere packing, `src/pack3.js`. Leaf radius `cbrt(value)`;
each internal node packs its children (sorted by descending radius) greedily —
child 0 at the origin, 1 touching it on +x, 2 touching both in the xy-plane, every
further child at the position touching three already-placed spheres (all triples
among the 32 nearest the current centre of mass) that overlaps nothing and is
nearest the centre of mass, with two-touch / one-touch / outside fallbacks that
flare never needs. The parent is the minimal enclosing sphere of its children
(Bădoiu–Clarkson + descent polish, tight to 1e-9) plus padding `0.0065·R₀` (the
notebook's 3 px against a 463 px root); the whole thing is scaled so the root has
radius 10. Positions are local to the parent; the page nests Object3Ds so
`world(n) = world(parent) + local(n)`. Result: node-centre extents
`17.02 × 11.50 × 12.21`, depth ratio 0.676; packing density root 0.419, deepest
level median 0.298 (0.427 / 0.346 unpadded); 252 nodes pack in ≈ 20 ms.
Full spec, including every number moved from the draft note and why, in
`layouts/pack.md`.

**Marks:** one `Mesh(SphereGeometry(r, 24, 16))` per descendant with the radius
baked into the geometry (children are nested, so a scale would inherit). Colour by
depth, `scaleLinear([0,5]) → hsl(152,80%,80%) … hsl(228,30%,40%)` in HCL. Leaves
opaque; internal nodes translucent shells (`opacity 0.25`, `depthWrite false`,
`FrontSide`) with `renderOrder = −depth` so shells composite back to front, root
last. No links. Note for a port: the marks dump carries world centres only, no
radii — reproduce the shells by porting the packer and check its centres against
`marks/`.

**Picking:** `pickables` = the 220 leaf meshes only; the shells are containers.
In a solid packing most leaf centres are hidden behind other leaves (76 / 83 of
220 are unoccluded from cameras A / B), so the gate runs a visibility pre-pass —
a candidate whose centre is intercepted by a nearer pickable is not sampled — and
then requires every sampled mark to hit. Shipped result: 20 / 20 hit from both
cameras, 34 distinct, 0 misses.

**Camera:** PerspectiveCamera fov 40, elevation 20°, azimuth 40°, fitted to 288
points on the root sphere's surface at 0.85 fill. Fixed; one frame.

**Labels:** rung 3 `hierarchyLabels`, one Text per node. Text only on the 147
largest leaves (`r ≥ 0.426`, the notebook's 147 labelled leaves), `d.data.name`,
Roboto, `#333` with a white halo, fontSize 0.426 (4.33 px in the 250 px frame).
Orientation baked once from camera A, quaternion `(−0.1632, 0.3368, 0.0594, 0.9254)`,
not billboarded; each label centred on its leaf and pushed `1.02·r` toward the
viewer, so leaves in front hide it like the notebook's clip-path. 0 flipped.

**Gates:** depth 0.676 · counts 252/252, 0/0 · angle 0.174 / 0.182 · picking
20 / 20 hit from each camera (visible 76 / 83 of 220 candidates, 34 distinct
sampled, 0 misses) · labels 252/252. `e2e:twice` = 0 differing pixels. Harness
time 3.2–5.2 s, like every other example.

**Gap:** the packing density is greedy-grade (root 0.42, deepest median 0.30; the
best-known equal-sphere packings reach ~0.6), and 4.33 px labels are only legible
in the small frame for the biggest leaves — both are choices the note records, not
defects. The three-rs side needs a translucent, `depthWrite`-off material with
explicit draw order to reproduce the shells, and SDF text at a fixed quaternion.
