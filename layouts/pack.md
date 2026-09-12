# circle packing → sphere packing

Source: `hierarchies/pack.v2` (flare-2.json: 252 nodes, 220 leaves, height 4). 2D:
`d3.pack()` on the value-summed, value-sorted hierarchy; leaf area ∝ value; nested
circles with padding 3; leaves labelled when they fit (`r > 10`: 147 of 220).

Built as `examples/d3_pack.html` with `src/pack3.js`; this note is kept true to what
runs. Numbers that moved from the first draft are marked **changed**, with why.

## The lift

d3 has no 3D packer, so this rung writes one. Volume, not area, is proportional to
value, and every node is a translucent sphere containing its children's spheres.

What d3 still decides: the hierarchy, `.sum(d => d.value)`, and
`.sort((a, b) => b.value − a.value)` — the packing order.

The packer (`src/pack3.js`, bottom-up, deterministic, no randomness; unit-tested in
`test/pack3.test.mjs`, `npm test`):
- leaf radius `r = cbrt(value)` (scaled at the end so the root has radius `R = 10`).
- for an internal node with children sorted by descending radius: place child 0 at
  the origin; child 1 touching it along +x; child 2 touching both in the xy-plane;
  each further child is placed at the candidate position (touching three already
  placed spheres, enumerate all triples among the nearest **32** placed) with the
  smallest distance from the current **centre of mass** that overlaps nothing. If no
  triple candidate is valid, fall back to touching two (in the plane through them
  and the centre of mass), then one, then a last-resort position outside everything
  (never needed on flare: all 160 placements beyond the third child touch three).
  - **changed** nearest 12 → nearest 32: with 12, once a node has more than ~12
    children the nearest placed spheres are all interior, every triple position is
    occupied, and placement falls through to the fallbacks. Measured on flare's
    `methods` (32 children, near-equal radii): density 0.24 with 12, 0.40 with 24 or
    more. 32 covers every node in flare (largest fan-out 32).
  - **changed** centroid of centres → centre of mass (centres weighted by `r³`):
    root radius 272.8 → 258.0 unscaled and the deepest level's median density
    0.319 → 0.346, because big spheres stay central and small ones fill the gaps.
- then translate so the **minimal enclosing sphere** of the children is centred at
  the origin; enclosing radius = `max(|c_i| + r_i)` about that centre, + padding.
  - **changed** from "centroid of the child centres is the origin": with unequal
    radii the centroid is far from the enclosing centre (two children r 3 and r 1
    touching: centroid-centred R = 5, minimal R = 4). On flare the root radius was
    622 centred on the centroid vs 273 on the minimal enclosing centre — the
    centroid version was 2.3× too loose. The centre is found by 400 Bădoiu–Clarkson
    steps from the centre of mass followed by a monotone descent polish (step
    toward the farthest surface point, halve on no improvement), so the enclosing
    sphere is tight to machine precision (some child always touches it; the test
    asserts slack < 1e-9·R).
- padding: `0.0065·R₀` where `R₀` is the unpadded root radius (the packer runs
  twice: once to learn `R₀`, once padded), i.e. ≈ 0.062 after scaling to `R = 10`.
  - **changed** from `0.015R`: the notebook's padding 3 sits against a root radius
    of 463 px, which is 0.0065·R, not 0.015·R. Padding is absolute at every level
    (as in d3.pack), so it costs the small deep nodes most: deepest-level median
    density 0.346 unpadded, 0.298 at 0.0065, 0.247 at 0.015.
- optional single pass of "shrink toward centre" (`shrink: true`): move each child
  toward the centre of mass by bisection until it touches another. **Off**: with
  triple contacts every child already touches three others and the pass changes
  the root radius by 0 % on flare (the rule was "keep it if the root's enclosing
  radius drops by more than 5 %").
- positions compose top-down: `world(n) = world(parent) + local(n)` — done by
  Object3D nesting in the page, not by the packer.

Packing density (sum of child volumes / own volume), flare, padded as shipped:
root **0.419** (0.427 unpadded); deepest level (the 23 nodes whose children are all
leaves) median **0.298**, min 0.255, max 0.778 (median 0.346 unpadded). For scale,
d3.pack's 2D area density on the same data is 0.786 root / 0.643 deepest-median, and
this greedy packer puts ~30 near-equal spheres at about 0.40 where the best-known
packings of that many equal spheres in a sphere reach roughly 0.6. Time: `paddedPack3` (two `pack3` passes) on 252 nodes ≈ 20 ms in node.

## Marks

- node: one `Mesh(SphereGeometry(r, 24, 16))` per `root.descendants()` (252),
  geometry per node (the radius is baked into the geometry, never a scale, because
  children are nested and would inherit it). Colour by depth via
  `d3.scaleLinear().domain([0, 5]).range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
  .interpolate(d3.interpolateHcl)` — the zoomable circle packing's ramp; pack.v2
  itself draws `#fff`/`#ddd`, which has no depth to it in 3D. Leaves opaque
  `MeshStandardNodeMaterial` (roughness 0.6). Internal nodes: same ramp,
  `transparent`, `opacity 0.25`, `depthWrite false`, `FrontSide`, roughness 0.35.
  One material per (depth, leaf/internal).
- `renderOrder = −depth` on every mesh: translucent shells blend back to front,
  the deepest shells first and the root's shell last, so an outer shell's front
  face is composited over everything it contains (the opaque leaves render in the
  opaque pass before any shell). Both orders were rendered at 800×500; outer-last
  is slightly softer and cleaner (inner shell rims stay behind the outer haze),
  outer-first puts inner rims sharper on top. Outer-last kept.
- Object3D nesting mirrors the hierarchy: each node mesh is a child of its parent's
  mesh, positioned in the parent's local frame (`pack3`'s `x/y/z`).
  `getWorldPosition` gives the gate its world centre.
- pickables = leaf meshes only. Internal spheres are containers and the notebook's
  interactive targets are the leaves. Measured: 76 of 220 leaf centres are
  unoccluded by *other leaves* from camera A, 83 from camera B, 37 from both — the
  rest are inside the ball, which is what a 3D packing is. The gate therefore
  distinguishes "occluded by a nearer pickable" (fine: that pixel belongs to the
  front leaf) from a miss (nothing, a non-pickable, or a hit behind the claimed
  centre). Result: 20 sampled, hit 5 / 3, occluded 15 / 17, misses 0 — no sampled
  leaf is ever blocked by a container.
- `expected = { nodes: 252, links: 0 }`.
- labels (**gap**, rung 3 had not landed when this was built): leaves whose radius
  is above a threshold chosen so the count matches the notebook's labelled set
  (147) as closely as practical; label lies in the plane facing camera A's
  *initial* direction (a fixed, not per-frame, orientation: the label's quaternion
  is set once from the camera at layout time — NOT billboarding, baked; record the
  quaternion here when added). Text `d.data.name`, white halo.

## Camera

fov 40, elevation 20°, azimuth 40°, fill 0.85, fitted to 288 points on the root
sphere's surface (12 latitudes × 24 longitudes) so the disc, not its bounding
cube, fills the frame. Depth gate: extents `17.02 × 11.50 × 12.21` of the node
centres, ratio 0.676. Angle gate areas 0.174 / 0.182.

## Primitives for `src/`

`src/pack3.js`: `pack3(root, { padding, radius, shrink, center })` sets `node.r`
and `node.x/y/z` (local to the parent) on every node; `paddedPack3(root,
{ paddingFraction, radius })` runs it twice for padding as a fraction of the root
radius; `density(node)`. Unit-tested in `test/pack3.test.mjs` (`node --test`): no
two siblings overlap (distance ≥ r_i + r_j − 1e-9), every child inside its parent
(|c| + r ≤ R + 1e-9), two runs identical, root radius exactly 10, unpadded
enclosing sphere tight, 252 nodes well under a second, plus synthetic hierarchies
(12², a 100-way fan-out past the nearest-32 cap, 3⁴) and edge cases.

`src/d33.js` (gate change for this rung): picking samples are drawn from the
pickable node marks, and a sample whose ray is intercepted by a *nearer pickable*
counts as occluded, not missed; the gate passes when there are no misses and each
camera hits at least one sample. `gates/*.json` records `sampleSet`, `candidates`,
`occludedA/B`.

## For three-rs

d3 modules: d3-hierarchy (hierarchy, sum, sort), d3-scale + d3-interpolate (colour).
Layout: the packer above, ~480 lines in three's spaced style (about 200 of code,
including the enclosing-sphere solver), its own test. Per-node output in `marks/d3_pack.json` is the world centre only;
radii are not dumped (leaf `r = cbrt(value) · 10 / R_padded`, shells from the
packer), so a port needs the packer, not just the marks, to reproduce the shells
and to check its own against `marks/`.
