# tree (tidy) → radial fan of tidy planes

Source: `hierarchies/tree.v2` (flare.json again: 252 nodes, 220 leaves, height 4,
10 top-level packages). 2D: `d3.tree().nodeSize([dx, dy])`, Reingold–Tilford tidy
layout, breadth on x, depth on y, `linkHorizontal` links.

## The lift

The tidy algorithm is compositional: a subtree's layout does not depend on its
siblings, only on where it is shifted. So the tidy tree is kept exactly as d3
computes it and each top-level subtree becomes its own vertical plane ("blade"),
the ten blades fanned around the root like pages around a spine. Depth runs
radially outward from the root; breadth runs vertically within a blade.

What d3.tree still decides (run once on the whole root, as the notebook does):
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
  (max − min of `n.x`) over the ten subtrees. Extents ≈ (2·4·dy, B, 2·4·dy)
  = (1.6B, B, 1.6B); depth ratio ≈ 0.6.

## Marks

- node: `Mesh(SphereGeometry)`, one per `root.descendants()` (252); radii and
  colours as in `layouts/cluster.md` (internal `#555`, leaves by top-level
  ancestor via `d3.schemeTableau10`).
- link: one fat line per `root.links()` (251) using `linkCurve(a, b, axis)` with
  `axis` = the blade's radial unit vector `(cos θ_i, 0, sin θ_i)`; the ten
  root→child links use their own child's radial vector. Same material as rung 1.
- no labels (gap, as rung 1).

## Camera

Blades sit at multiples of 36°, and camera B is camera A rotated 90°, so an
azimuth of `9° (mod 36°)` keeps both cameras 9° off any edge-on blade. Start with
fov 40, elevation 30°, azimuth 9°, fill 0.85 via `frameCamera`. Tune azimuth /
elevation (not the layout) if picking fails on an edge-on blade.

## Primitives for `src/`

Reuses `link.js`, `frame.js`, `orbit.js`, `d33.js`. Expect nothing new; if the
node/colour code from rung 1 is copied a second time, lift it into
`src/nodes.js` (sphere mark per hierarchy node with the colour rule).

## For three-rs

d3 modules: d3-hierarchy (hierarchy, tree), d3-array (ascending),
d3-scale-chromatic (schemeTableau10). Layout: ~15 lines on top of d3.tree's
x/y — a rotation of each top-level subtree about the vertical axis.
