# hierarchical edge bundling → sphere

Source: `networks/hierarchical-edge-bundling.v2` (flare.json as a flat list: 220
classes, 764 imports). 2D: `d3.cluster().size([2π, radius − 100])` on the hierarchy
built from dotted names, leaves on a circle; each import drawn with `d3.lineRadial`
+ `d3.curveBundle` through `source.path(target)`, i.e. up the hierarchy and down
again; colour gradient source → target in 2^6 segments.

Built as `examples/d3_bundling.html`; this note is kept true to what runs.

## The lift

Leaves live on a sphere instead of a circle, and the internal nodes the bundles pass
through are real points inside it, so the bundles become curves in 3D that dive
toward the centre exactly as deep as the hierarchy makes them.

What d3.cluster still decides (run as the notebook does: the notebook's `hierarchy`,
`bilink`, `id` and `color` cells verbatim, its sort, its `size([2π, 954/2 − 100])`):
- `leaf.x`: longitude of every leaf, verbatim.
- sibling order (`ascending(height) || ascending(name)`): the latitude rank below.
- `node.y` is not used; depth is `node.depth` (root 0, height H = 4).

What the sphere adds (`sphereLayout`, ~40 lines in the page):
- `R = 10`. Leaf latitude: the leaf children of one parent fan symmetrically about
  the equator by rank `i` of `k` (rank among the *leaf* siblings only, in sibling
  order): `lat = ((i + 0.5)/k − 0.5) · 90° · min(1, k/10)`. Leaf position
  `R · (cos lat cos x, sin lat, cos lat sin x)` with `x` its longitude; that unit
  vector is the leaf's `normal`.
- internal node at depth d: radius `R · d/H`, direction = normalised mean of its
  leaves' unit vectors; the root sits at the origin.
- bundle curve for import s → t: control points = positions of `s.path(t)`
  (3 to 8 of them on flare); `d3.curveBundle` straightening with β = 0.85 applied
  in 3D (`p_i' = β p_i + (1−β)(p_0 + (i/(n−1))(p_{n−1} − p_0))`), then
  `d3.curveBasis` in 3D — the same pieces d3-shape emits (`M p0`,
  `L (5p0+p1)/6`, one cubic per interior point, the `lineEnd` cubic, `L p_{n−1}`),
  each sampled at 8 points — so the first and last sample are exactly the source
  and target leaf (measured: max endpoint error 1.8e-15 over all 764 curves;
  `src/bundle.js`, checked against d3's own path output to 6e-4, which is
  d3-path's 3-digit rounding).
- colour: the notebook's `color` cell (`t => d3.interpolateRdBu(1 − t)`) at
  `d3.easeQuad(j / (N − 1))` for vertex `j` of `N`, per vertex
  (`LineGeometry.setColors` + `Line2NodeMaterial({ vertexColors: true })`,
  which works under WebGPU on this build), so one Line2 per import rather than
  64 split paths.

Extents `19.90 × 13.79 × 19.92`, depth ratio **0.692** (the draft said ≈ 0.9; the
latitude fan is capped at ±45°, so the sphere's y extent is `2R·sin 45°`, not `2R`).
Closest two leaves are 0.525 apart (`query.methods.where` / `.xor`: the 32-way
sibling fan).

## Marks

- node: one sphere `Mesh` per `root.descendants()` (252). Leaves radius **0.12**,
  `#333` (the notebook's classes, on the sphere); internal nodes radius **0.09**,
  `#9a9a9a` — in 3D they are the bundle waypoints and worth seeing. Two shared
  geometries, two `MeshStandardNodeMaterial`s, every datum its own Mesh.
  Leaf marks carry `normal` = their unit vector (see Camera).
- link: one Line2 per import (764), `a` = source id, `b` = target id, colour per
  vertex as above. **Opacity 0.8, linewidth 2 px** — the draft said 0.6 / 1 px;
  the harness renders at 2× and box-filters down, so 1 px lands at half
  intensity and 0.6 read as washed-out pink beside the notebook's saturated
  strokes. 2 px is the notebook's 1 px stroke after the downscale.
  `expected = { nodes: 252, links: 764 }` (the page counts `leaf.outgoing`).

## Labels (rung 3)

One `Text` per `root.descendants()` (**252, not leaves-only as first drafted**:
the rung 3 labels gate is `count === nodes` and `hierarchyLabels` labels every
node; the internal nodes are drawn here anyway, so their labels name the
waypoints). Same batch, font, fill `#333`, halo `outlineWidth 0.25` as cluster.

- **Orientation (not billboarded).** Radial, as the notebook's: local +x = the
  node's radial unit vector (outward), local +y = local north on the sphere
  (`∂position/∂lat`; for internal nodes world-up made orthogonal to the radial;
  root: +x = (1, 0, 0)). Leaves anchored `start`, offset `+0.27` along +x
  (0.12 radius + 0.15 gap), so the label sticks out of the sphere along its own
  radius; internal nodes anchored `end`, offset `−0.24` (0.09 + 0.15), inward
  along theirs. `anchorY: middle`.
- **Size.** `fontSize = min( 8 px at the target distance, 0.6 · leaf pitch )`
  with leaf pitch 0.525 → **0.315 world units = 2.96 px** at 400×250 (11.8 px
  at 1600×1000). Full pitch (0.525, 6 px) was tried: neighbouring labels overlap
  in projection, as on the cone tree.
- **Camera refit.** After the em is known, the camera is refitted to the node
  positions plus every leaf label's far end (`leafOffset + 0.5 em · name.length`
  along the radial) — the notebook's 100 px label margin. Fitting nodes alone
  clipped the top and bottom labels.
- **Mirror rule** as cluster: **125 of 252** labels are flipped from camera A.
- `billboard: true` implemented in `hierarchyLabels`, **off** here.
- Dumped to `marks/d3_bundling.json` as `labels[]` (same shape as cluster).

## Camera

Sphere axis = up. fov 40, elevation 25°, azimuth 30°, fill 0.85, fitted to the
projected nodes + label tips (three refit iterations; the em is at its pitch cap
so it does not move). Fixed; one frame.

**Picking (the d3-three.js change).** A mark may carry `normal`. For each camera the
gate samples up to 20 marks from those whose `normal` is absent or faces the
camera (`dot(normal, camera − mark) > 0`); leaves on the far side of the sphere
would otherwise be raycast at their own pixel and hit the near side. Internal
nodes carry no normal and are always eligible. `gates/d3_bundling.json` reports
`sampledA = 20, sampledB = 20` (38 distinct marks), 20/20 hits from each.

## Primitives for `src/`

`src/bundle.js` (new, add-only): `straighten(points, beta)`, `basisCurve(points,
samplesPerSpan)`, `bundleCurve(points, beta, samplesPerSpan)` → Vector3[];
`fatLineColored(points, colors, material)` → Line2 with `setColors`;
`coloredLineMaterial({ opacity, linewidth })` → white `Line2NodeMaterial` with
`vertexColors: true` (the material colour multiplies the vertex colour).
`link.js` untouched.

## For three-rs

d3 modules: d3-hierarchy (hierarchy, cluster, `node.path`, `leaves`), d3-array
(ascending), d3-scale-chromatic (interpolateRdBu), d3-ease (easeQuad). Layout:
latitude fan + inward internal nodes + 3D curveBundle/curveBasis, ~40 + ~60
lines; a per-vertex-coloured wide line is the one primitive the port needs beyond
rungs 1–3.
