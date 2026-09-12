# tree (tidy) → radial fan of tidy planes

Source: `hierarchies/tree.v2` (flare.json again: 252 nodes, 220 leaves, height 4,
10 top-level packages). 2D: `d3.tree().nodeSize([dx, dy])`, Reingold–Tilford tidy
layout, breadth on x, depth on y, `linkHorizontal` links.

Built as `examples/d3_tree.html`; this note is kept true to what runs.

## The lift

The tidy algorithm is compositional: a subtree's layout does not depend on its
siblings, only on where it is shifted. So the tidy tree is kept exactly as d3
computes it and each top-level subtree becomes its own vertical plane ("blade"),
the ten blades fanned around the root like pages around a spine. Depth runs
radially outward from the root; breadth runs vertically within a blade.

What d3.tree still decides (run on the whole root, as the notebook does):
- `node.x` (breadth) and `node.y` (depth) of every node, verbatim.
- sibling order: `root.sort(ascending name)`.

What the fan adds:
- top-level child `c_i` (rank i of k = 10, in sibling order) gets azimuth
  `θ_i = 2π i / k`.
- every node `n` in the subtree of `c_i` (and `c_i` itself) is placed at
  `( n.y · cos θ_i,  n.x − c_i.x,  n.y · sin θ_i )`.
  Subtracting `c_i.x` centres each blade on the root's height, since tidy puts a
  parent at the midpoint of its children. Root at the origin.
- `nodeSize([1, dy])` with `dy = B / 5`, where `B` is the largest breadth extent
  (max − min of `n.x`) over the ten subtrees. The page runs the layout twice:
  once with `nodeSize([1, 1])` to measure `B` (breadth does not depend on the
  depth spacing, so the measurement is exact), then with `nodeSize([1, dy])`.

Measured on flare: `B = 74` (the `vis` blade; the ten blade extents are
0–74), `dy = 14.8`, depth reach `4·dy = 59.2`. Layout
`83.81 × 74.00 × 84.45`, **depth ratio 0.876** (gate needs ≥ 0.25).

*Changed from the draft of this note:* the draft predicted extents
`(1.6B, B, 1.6B) = (118, 74, 118)` and ratio ≈ 0.6. The x/z extents are smaller
than that, 83.8 and 84.5, because only some of the ten blades reach depth 4 and
no two of the deep ones are diametrically opposite; the ratio is correspondingly
better, not worse. Nothing in the layout was changed to get it.

## Marks

- node: `Mesh(SphereGeometry)`, one per `root.descendants()` (252); radii and
  colours exactly as in `layouts/cluster.md` — 0.6 internal `#555`, 0.45 leaf
  coloured by top-level ancestor from `d3.schemeTableau10`. Leaves inside a
  blade are 1 apart (`dx = 1`), so 0.45 is just clear of touching; the closest
  pair of node positions in the whole layout is 1.000. Shared with the cluster
  page as `src/nodes.js` (`hierarchyNodes`).
- link: one fat line per `root.links()` (251) using `linkCurve(a, b, axis, 16)`
  with `axis` = the blade's radial unit vector `(cos θ_i, 0, sin θ_i)`; the ten
  root→child links use their own child's radial vector. Same shared
  `Line2NodeMaterial` as rung 1: `#555`, opacity 0.4, 1.5 px.
- no labels (**gap**, as rung 1).

## Camera

Blades sit at multiples of 36°, and camera B is camera A rotated 90°, so an
azimuth of `9° (mod 36°)` keeps both cameras 9° off any edge-on blade.
PerspectiveCamera fov 40, elevation 30°, azimuth 9°, fill 0.85 via
`frameCamera` on the projected node positions. No tuning was needed: picking is
20/20 from both cameras and the NDC areas are 0.426 / 0.435.

## Primitives for `src/`

Reuses `link.js`, `frame.js`, `orbit.js`, `d33.js` unchanged. The node/colour
code from rung 1 was lifted into **`src/nodes.js`** (`hierarchyNodes(root,
position, options)` → `{ group, marks, ids, colour }`) and `d3_cluster.html`
now uses it too, still at Diff 0.0%.

## For three-rs

d3 modules: d3-hierarchy (hierarchy, tree), d3-array (ascending),
d3-scale (scaleOrdinal), d3-scale-chromatic (schemeTableau10). Layout: ~30 lines
on top of d3.tree's x/y — a rotation of each top-level subtree about the
vertical axis, plus the two-pass measurement of `B`.
