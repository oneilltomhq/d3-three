## N. hierarchical edge bundling → sphere

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
