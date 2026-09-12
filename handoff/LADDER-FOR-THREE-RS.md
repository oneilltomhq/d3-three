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

## 6. sunburst, flat (planar by ruling)

| artefact | path |
| --- | --- |
| page | `examples/d3_sunburst.html` |
| screenshot | `examples/screenshots/d3_sunburst.jpg` (400×250) |
| marks | `marks/d3_sunburst.json` (0 nodes, 0 links, 251 cells, 93 labels, `planar: true`) |
| layout note | `layouts/sunburst.md` |
| reference render of the original notebook | `ref/sunburst.png` (928×938) |
| eyeball render | `handoff/ladder/sunburst-1600x1000.jpg` |

Source notebook: `d3-gallery/notebooks/hierarchies/sunburst.v2`, data
`files/flare-2.json` (252 nodes, 220 leaves, height 4, 10 top-level packages).

**d3 modules needed:** d3-hierarchy (`hierarchy`, `partition`), d3-scale
(`scaleOrdinal`), d3-interpolate (`quantize`, `interpolateRgb`),
d3-scale-chromatic (`interpolateRainbow`). `d3.arc` is not called; its padding rule
is reimplemented for the slab outline (below). The DOM half of d3 is not used.

**Class:** planar. A sphere lift was built first (angle → longitude, depth →
colatitude band, value → radial thickness) and retired by the director's ruling
after the user's eyeball: the third axis added nothing. The chart is the notebook's
disc, flat in the 3D world, orbitable and lit (`layouts/sunburst.md` keeps one
paragraph on the sphere; `src/shell.js` stays for history, unused).

**Layout:** `d3.partition().size([2π, 464])` on the value-summed, value-sorted
hierarchy, verbatim. The disc lies in the `xz` plane, `y` up, 20 units across (one
notebook px = `20/928` units); angle 0 is 12 o'clock, clockwise from above. Every
cell with depth > 0 (251; the notebook's `x1−x0 > 0.001 && y1 > y0` filter removes
none) is a thin slab: the notebook's arc outline — inner radius `y0`, outer `y1−1`,
pad angle `min((x1−x0)/2, 0.005)` at pad radius 232 applied as d3.arc applies it
(angular pad `asin(rp/r · sin(pa/2))` per radius, edge collapses to mid-angle when
the pad exceeds the span) — extruded 0.3 (1.5 % of the diameter) along `+y`.
Colour by top-level ancestor, the notebook's rainbow at fill-opacity 0.6 over white
baked into an opaque colour. Lighting: hemisphere + one directional.

**Marks:** one `Mesh` per cell (251), `kind: 'cell'`, geometry built in local
coordinates around the centre of the slab's top face at mid-angle and mid-radius
(the notebook's label point), so the mesh position is the mark; `normal: [0,1,0]`.
`expected = { nodes: 0, links: 0, cells: 251, labels: 93 }`; `pickables` = the slabs.

**Labels:** exactly the notebook's: cells with `(y0+y1)/2·(x1−x0) > 10` in notebook
units (93), via `src/labels.js` (lib3 sdf-text, Roboto). Each lies in the top plane
0.01 above its slab, centred on the mark point, baseline along the radius, em
`10·S = 0.216` units (the notebook's 10 px; 3.35 px in the 400×250 reference),
`anchorX: center`, `anchorY: middle`, fill #333, white outline 0.25. Direction: the
notebook's (outward on the right half, inward on the left), except that near 12 and 6
o'clock the baseline is turned about the face normal so it projects rightward from
camera A (10 of 93) — the same intent as the notebook's turn, seen obliquely; this
keeps `labels.js`'s up-axis mirror flip idle (it would show an up-facing label's
back). No per-frame flip. The marks dump carries `labels` with position, quaternion
and anchor.

**Camera:** PerspectiveCamera fov 40, elevation 50°, azimuth 25° (camera A on the
`+z` side, 12 o'clock at the top of the frame), fitted at 0.85 fill to every slab's
world bounding-box corners plus every label's corners. Camera B, at the same
elevation, sees the whole disc (eligible 251 / 251). Fixed; one frame.

**Gates:** depth ratio 0.000, PASS `planar by ruling` · counts 0/0, 0/0, cells
251/251 · angle 0.448 / 0.551 · picking 20/20 from both cameras (251 / 251 eligible)
· labels 93/93. `e2e:twice` 0 px.

**Harness changes carried by this rung:** `src/d33.js` — the counts gate compares
`cell` marks against `expected.cells` (default 0); angle and picking run on nodes
and cells, picking reports `eligibleA/B`; the labels gate honours `expected.labels`;
`register({ planar: true })` makes the depth gate pass with `note: 'planar by
ruling'` (ratio still reported) and `planar` is written into the report.
`test/e2e/puppeteer.js` — `E2E_PORT`, and `planar` copied into `marks/` and
`gates/` JSON (two lines). `tools/ref.js` — an svg sized only by `viewBox` gets
`width: 928px` (accepted).

**Gap:** the labels are the notebook's proportion, so in the 400×250 reference they
are ~3 px and only legible in the eyeball render. `expected.cells: 0` and
`planar: false` will appear in other examples' JSON when regenerated under this
harness.

## 7. treemap → flat, planar by ruling

| artefact | path |
| --- | --- |
| page | `examples/d3_treemap.html` |
| screenshot | `examples/screenshots/d3_treemap.jpg` (400×250) |
| marks | `marks/d3_treemap.json` (0 nodes, 0 links, 220 cells, 30 labels) |
| layout note | `layouts/treemap.md` |
| reference render of the original notebook | `ref/treemap.png` (1154×1154) |

Source notebook: `d3-gallery/notebooks/hierarchies/treemap.v2`, data
`files/flare.json` (252 nodes, 220 leaves, height 4), tiling `d3.treemapBinary`
(the notebook's default input).

**History:** first built as stacked partitions (every node a slab on its
parent's, 252 cells, depth ratio 0.264; commit 8151421). Retired by the
director's planar ruling (`handoff/rung0/LOG.md`): the steps added nothing a
treemap needs. Rebuilt flat.

**d3 modules needed:** d3-hierarchy (`hierarchy`, `sum`, `sort`, `treemap`,
`treemapBinary`), d3-scale (`scaleOrdinal`), d3-scale-chromatic
(`schemeTableau10`), d3-format (`format(",d")`). The DOM half of d3 is not used.

**3D layout:** none — the notebook's treemap in the ground plane.
`d3.treemap().tile(treemapBinary).size([1154, 1154]).padding(1).round(true)` on
the value-summed, value-sorted hierarchy; scale `S = 20/1154`; notebook
`x → x·S`, `y → y·S − 20` (top edge far from camera A, so the picture is not
mirrored). Drawn datum set: `root.leaves()` (220), as the notebook. Each leaf a
box over its rect, uniform thickness 0.3 (1.5 % of the width) for a lit edge.
Leaf top faces are the notebook's rects exactly (max error 3.6e-15; 0 overlaps;
all inside the root minus padding). Extents `19.32 × 0 × 19.02`; depth ratio
0.000, passed as `planar by ruling`. Full spec in `layouts/treemap.md`.

**Marks:** one `Mesh(BoxGeometry)` per leaf, mark position at the centre of the
top face, `normal = [0, 1, 0]`. Coloured by top-level package (`schemeTableau10`
mixed 40 % to white = the notebook's `fill-opacity 0.6`). A white closed `Line`
around each leaf's top rect (lifted 0.012) stands in for the notebook's 1 px
gaps; not marks.

**Camera:** PerspectiveCamera fov 35, elevation 55°, azimuth 20°, fill 0.85 on
the square's bounding box. All 220 top-face centres visible from both gate
cameras (raycast in the page: 0 misses each); camera B not edge-on (220
eligible). Fixed; one frame.

**Gates:** depth 0.000 (planar by ruling) · counts 0/0 nodes, 0/0 links,
220/220 cells · angle 0.458 / 0.488 · picking 20/20 from both cameras · labels
30/30 (page-supplied `expected.labels`) · twice 0 px.

**d33.js changes on this rung:** the counts gate also compares `cell` marks to
`expected.cells` (default 0); the angle and picking gates run on node + cell
marks; the labels gate compares to `expected.labels` when the page supplies it,
else to the node count; `register({ planar: true })` → `state.planar`, the depth
gate still reports the ratio but passes with note `planar by ruling`, `planar`
and `expected.labels` are written to the report JSON top level.
`src/labels.js`: one-line fix so a multi-line label (`\n`) does not count the
newline as a glyph.

**Labels (rung 3):** lib3 `sdf-text` via `src/labels.js`, Roboto Regular, `#222`
on a white halo 0.2. As the notebook: the leaf name split on capitals/spaces one
word per line plus the formatted value, one multi-line `Text` per leaf lying in
the top plane (+x baseline, +y = far), anchored `start` / `top` at the far-left
corner + 3 px pad, line pitch 0.9 em; `fontSize = 0.498` world units (5 px at
the target distance at 400×250, ~4 px after foreshortening; 16 px at
1600×1000). Only the 30 leaves whose rect holds the whole block (widest line +
2 pads wide, pad + lines × 0.9 em tall; TTF advances + kerning via lib3
`VectorFont`) are labelled; 0 flipped; no per-frame flip.
`marks/d3_treemap.json` `labels[]` carries `{ id, text, x, y, z, q, anchorX }`,
`id` = the leaf's cell id.

**Gaps:** 190 leaves are too small for their label at this size (the notebook
draws every label and clips it); the value line's `fill-opacity 0.7` and extra
`0.3em` gap are not reproduced (one `Text`, one colour, one pitch).
`tools/ref.js` needed two small additions to render this notebook (`REF_EXPRS`
for the `viewof tile` input, a `DOM.uid` stub). The harness's `writeReport`
picks fields, so `planar` is in `window.d33.report()` but in neither
`marks/*.json` nor `gates/*.json` — only the depth gate's note shows it (a
one-line harness change, not made here; the depth gate's `note` is enough for
the grader).

## 8. tree of life → cylinder (angle × cluster depth × branch length)

| artefact | path |
| --- | --- |
| page | `examples/d3_tree-of-life.html` |
| screenshot | `examples/screenshots/d3_tree-of-life.jpg` (400×250) |
| marks | `marks/d3_tree-of-life.json` (381 nodes, 380 links, 191 extensions, 191 labels) |
| layout note | `layouts/tree-of-life.md` |
| reference render of the original notebook | `ref/tree-of-life.png` (954×954, constant radius); `ref/tree-of-life-length.png` (branch length) |
| eyeball render | `handoff/ladder/tree-of-life-1600x1000.png` |

Source notebook: `d3-gallery/notebooks/hierarchies/tree-of-life`, data
`files/life.txt` (Newick, vendored byte for byte at `examples/data/life.txt`).
The notebook's `parseNewick`, `maxLength`, `setRadius`, `setColor` and `color`
cells are used verbatim: 381 nodes (191 leaves, 190 internal — a binary tree,
height 20), 380 links; `maxLength(root)` = 2.65671. Three nodes in the file are
unnamed (the root, the clade above Eukaryota/Archaea, one at depth 12).

**d3 modules needed:** d3-hierarchy (`hierarchy(data, d => d.branchset)`,
`sum`, `sort`, `cluster().size([360, R]).separation(() => 1)`, `links`,
`leaves`), d3-array (`ascending`, `max`), d3-scale (`scaleOrdinal`),
d3-scale-chromatic (`schemeCategory10`). The DOM half (selection, transition,
the checkbox) is not used.

**3D layout:** the notebook has to choose one radius (cluster depth or branch
length, its checkbox); the cylinder shows both. Axis +y. Angle around the axis
= `(x − 90)°` as in the notebook's `linkStep` (its screen x → world +x, its
screen y → world +z, so the view down the axis with +z at the bottom is the
notebook's picture). Radius from the axis = cluster depth `y` in `0..R`,
`R = 10` (root on the axis, every leaf on the rim). Height = cumulative branch
length from `setRadius(root, 0, H / maxLength(root))`, `H = 8`. Node box
`19.999 × 8.000 × 19.999`, depth ratio 0.400. Full spec in
`layouts/tree-of-life.md`; the mapping is five lines (`src/step.js`
`cylinderPoint`).

**Marks:** one `Mesh(SphereGeometry(0.12))` per node, coloured by `setColor`
(null → black; 4 materials). One `Line2` per link: the 3D `linkStep`
(`src/step.js` `stepCurve`) — an arc at the source's (radius, height) from the
source angle to the target angle, sampled every 2°, then one straight segment to
the target's (radius, height); colour = the target's `setColor` colour, opaque,
2 px (the notebook's 1 px after the harness's 2× render and box filter). One
`Line2` per leaf of a new mark kind **`extension`** (`a` = the leaf id): from the
leaf's point straight up the rim to height `H`, black at opacity 0.25, 2 px —
the notebook's `linkExtension`, which restores the clean ring; its dumped
position is the extension's midpoint. `expected = { nodes: 381, links: 380,
extensions: 191 }`; `src/d33.js`'s counts gate learned `extension` /
`expected.extensions` (defaults to 0, other pages unchanged).

**Labels:** leaves only (191), as the notebook; same primitive and dependency as
the earlier entries (lib3 `sdf-text`, `src/labels.js`, Roboto Regular, `#333` on
a white halo 0.25), text `name.replace(/_/g, " ")`. Each label lies flat in the
horizontal plane at height `H` (the plane of the top rim ring), anchored at the
top of the leaf's extension pushed outward by 0.4, baseline along the leaf's
radius, facing +y — the notebook's layout seen from above, lifted to the top of
the cylinder, so nothing is edge-on from any elevation. The notebook's flip rule
is kept: `x < 180` reads outward (anchor start), `x ≥ 180` (96 leaves) is
rotated 180° in the plane (anchor end), text outward of the rim either way.
`fontSize = min(8 px at target distance, leaf pitch 2πR/191 = 0.329) = 0.329`
world units (3.13 px at 400×250, 12.5 px at 1600×1000). `hierarchyLabels` is
unchanged: the leaves are passed as `{ data, x, children }` shims (empty
`children` for the flipped half, which is the primitive's anchor-end case).
Static mirror check from camera A flips 26 of 191; the labels seen from behind
are the director's per-frame flip. Every label's anchor position, quaternion,
anchor and string is in `marks/d3_tree-of-life.json` `labels[]`.
`expected.labels = 191`; the labels gate in `src/d33.js` now takes a
page-supplied `expected.labels` (defaults to the node count).

**Camera:** PerspectiveCamera fov 40, elevation 35°, azimuth 25°, fitted at 0.85
fill to the projected nodes plus the far ends of the leaf labels (three refit
iterations). Fixed; one frame. (Azimuth 30–40° hides one sampled rim leaf behind
its 0.36-away neighbour from camera A; 20–28° is a clean 20/20 run.)

**Gates:** depth 0.400 · counts 381/381, 380/380, extensions 191/191 · angle
0.2606 / 0.2522 · picking 20/20 from both cameras (sampledA 20, sampledB 20) ·
labels 191/191. `e2e:twice` 0 px (both raw PNGs sha256 `b607532b…e99db`).

**Shared-file changes on this branch:** `src/d33.js` counts gate, +3 lines and
two doc lines (mark kind `extension`, `expected.extensions`); labels gate, +2
lines (`expected.labels`, defaulting to the node count). `tools/ref.js`
gained three additive env knobs — `REF_VALUES` (JSON merged over the presets:
this notebook's `width` cell is 954, and presets shadow cells), `REF_SVG_SIZE`
(size given to a returned SVG that has only a viewBox), `REF_THEN` (cells to
evaluate after `chart`: `update` with `showLength: true` for the branch-length
reference). Existing references render byte-identically without them
(`ref/cluster.png` checked). `src/step.js` added.

**Gap:** labels on the half of the rim facing away from the camera are seen from
behind (mirrored in the flat plane) until the director's per-frame flip lands;
the static mirror check only corrects left-right. The notebook's hover
(highlight the ancestry) is not lifted.

## 9. force-directed tree → d3-force-3d

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

## 10. disjoint force-directed graph → d3-force-3d

| artefact | path |
| --- | --- |
| page | `examples/d3_disjoint.html` |
| screenshot | `examples/screenshots/d3_disjoint.jpg` (400×250) |
| marks | `marks/d3_disjoint.json` (336 nodes, 275 links, no labels) |
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
`106c744c…380c`). `node tools/stable.js d3_disjoint` (two independent Chromium
processes, no harness injection) agrees with itself and with
`marks/d3_disjoint.json`: 611/611 marks identical, max |Δ| 0.

**Marks:** one `Mesh(SphereGeometry(0.18))` per node (the notebook's r 5 is 0.15
of its disc at 20 units; d3_force's 0.25 was too large for this density), `schemeCategory10` by
`group`, `MeshStandardNodeMaterial` with the colour as a light emissive (0.18) in
place of the notebook's white outline; one straight two-point `Line2` per link,
`#999` opacity 0.6, linewidth `sqrt(value)` = 1.414 px (every value is 2; one
shared material). Link `a`/`b` are the node ids; a link's gate position is their
midpoint.

**Camera:** PerspectiveCamera fov 40, elevation 15°, azimuth 35°, fitted at 0.85
fill to the projected nodes. Fixed; one frame.

**Gates:** depth 0.979 · counts 336/336, 275/275 · angle 0.444 / 0.449 · picking
20/20 from both cameras (sampledA 20, sampledB 20, 0 misses) · labels 0/0
(`expected.labels = 0`, none registered).

**Labels:** none, by director ruling. The notebook draws no text (ids are
`<title>` tooltips: 236 patent serial numbers and 100 paper titles up to 250
characters); a first build labelled all 336 as d3_force does and the text buried
the marks at any legible size. `expected.labels = 0`, no labels object
registered, ids kept on `mesh.name`. Three-rs has nothing to label here.

**Shared-file changes on this branch:** none in `src/`, `test/e2e/` or `tools/`.

**Gap:** the notebook's drag interaction (reheat on drag) and its `<title>`
tooltips are not lifted; the page is a converged, orbitable still with no way to
read a node's id short of `mesh.name`. The notebook's white node outline is not
drawn.
