# circle packing → sphere packing

Source: `hierarchies/pack.v2` (flare-2.json: 252 nodes, 220 leaves). 2D: `d3.pack()`
on the value-summed, value-sorted hierarchy; leaf area ∝ value; nested circles with
padding 3; leaves labelled when they fit.

## The lift

d3 has no 3D packer, so this rung writes one. Volume, not area, is proportional to
value, and every node is a translucent sphere containing its children's spheres.

What d3 still decides: the hierarchy, `.sum(d => d.value)`, and
`.sort((a, b) => b.value − a.value)` — the packing order.

The packer (`src/pack3.js`, bottom-up, deterministic, no randomness):
- leaf radius `r = cbrt(value)` (scaled at the end so the root has radius `R = 10`).
- for an internal node with children sorted by descending radius: place child 0 at
  the origin; child 1 touching it along +x; child 2 touching both in the xy-plane;
  each further child is placed at the candidate position (touching three already
  placed spheres, enumerate all triples among the nearest 12 placed) with the
  smallest distance from the current centroid that overlaps nothing. If no triple
  candidate is valid, fall back to touching two (in the plane through them and the
  centroid), then one. Then translate so the centroid of the child centres is the
  origin; enclosing radius = `max(|c_i| + r_i) + padding`, padding = 3 in the
  notebook's units → `0.015R` here.
- optional single pass of "shrink toward centre": move each child toward the origin
  by binary search until it touches another; keeps the packing tight. Do it if the
  root's enclosing radius drops by more than 5 %.
- positions compose top-down: `world(n) = world(parent) + local(n)`.

## Marks

- node: one `Mesh(SphereGeometry(r, 24, 16))` per `root.descendants()` (252). Leaves
  opaque, colour by depth as the notebook (`d3.scaleLinear` domain [0, 5] range
  ["hsl(152,80%,80%)", "hsl(228,30%,40%)"] interpolateHcl — copy the notebook's
  `color` cell). Internal nodes: same colour ramp, `opacity 0.25`, transparent,
  `depthWrite false`, `side: BackSide` not needed — front side only, and rendered
  after leaves (renderOrder) so leaves show through cleanly.
- Object3D nesting mirrors the hierarchy: each node mesh is a child of its parent's
  mesh, positioned in the parent's local frame. `getWorldPosition` still gives the
  gate its world centre.
- pickables = leaf meshes only. Internal spheres are containers and the notebook's
  interactive targets are the leaves; a ray to a leaf's centre must hit that leaf
  first among leaves. (Ruling recorded in handoff/rung4/BRIEF.md.)
- `expected = { nodes: 252, links: 0 }`.
- labels: leaves whose radius is above a threshold chosen so the count matches the
  notebook's labelled set as closely as practical; label lies in the plane facing
  camera A's *initial* direction (a fixed, not per-frame, orientation: the label's
  quaternion is set once from the camera at layout time — this is NOT billboarding,
  it is baked, and the note records the quaternion used). Text `d.data.name`, white
  halo.

## Camera

fov 40, elevation 20°, azimuth 40°, fill 0.85. Depth ratio ≈ 1.

## Primitives for `src/`

`src/pack3.js`: `pack3(root, { padding })` sets `node.r` and `node.x/y/z` (local to
the parent) on every node. Unit-test it in `test/pack3.test.mjs` (node --test): no
two siblings overlap, every child inside its parent, root radius stable across two
runs.

## For three-rs

d3 modules: d3-hierarchy (hierarchy, sum, sort), d3-scale + d3-interpolate (colour).
Layout: the packer above, ~80 lines, its own test.
