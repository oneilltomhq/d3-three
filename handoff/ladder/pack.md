## N. circle packing → sphere packing

| artefact | path |
| --- | --- |
| page | `examples/d3_pack.html` |
| screenshot | `examples/screenshots/d3_pack.jpg` (400×250) |
| marks | `marks/d3_pack.json` (252 nodes, 0 links) |
| layout note | `layouts/pack.md` |
| packer + test | `src/pack3.js`, `test/pack3.test.mjs` (`npm test`) |
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
In a solid packing most leaf centres are hidden behind other leaves (37 of 220 are
unoccluded from both gate cameras), so the gate distinguishes "occluded by a nearer
pickable" from a miss (nothing, a non-pickable, or a hit behind the claimed
centre). Shipped result: 20 sampled, hit 5 / 3, occluded 15 / 17, misses 0.

**Camera:** PerspectiveCamera fov 40, elevation 20°, azimuth 40°, fitted to 288
points on the root sphere's surface at 0.85 fill. Fixed; one frame.

**Gates:** depth 0.676 · counts 252/252, 0/0 · angle 0.174 / 0.182 · picking
20 sampled, 0 misses (5 / 3 hit, 15 / 17 occluded by a nearer leaf) from the two
cameras. `e2e:twice` = 0 differing pixels.

**Gap:** no labels — rung 3 (lib3 sdf-text) had not landed when this was built.
`layouts/pack.md` specifies them (leaves above a radius threshold matching the
notebook's 147 labelled leaves, quaternion baked from camera A once, white halo).
The three-rs side also needs a translucent, `depthWrite`-off material with explicit
draw order to reproduce the shells.
