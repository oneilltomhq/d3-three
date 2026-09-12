# cluster → cone tree

Source: `hierarchies/cluster.v2` (flare.json: 252 nodes, 220 leaves, height 4,
10 top-level packages). 2D: `d3.cluster().nodeSize([dx, dy])`, breadth on x,
depth on y, leaves at equal depth, `linkHorizontal` links.

## The lift

A cone tree (Robertson, Mackinlay & Card 1991). Depth stays an axis; breadth,
which d3 spreads along one line, is wrapped into a circle under each parent.

What d3.cluster still decides:
- `node.y`: the depth coordinate. Cluster puts every leaf at the deepest level
  and internal nodes at `(root.height - node.height)`; that is what makes it a
  dendrogram and it is kept verbatim as the vertical axis (`y = -node.y`).
- sibling order: `root.sort(ascending name)` then the order of `node.x` among
  siblings gives each child's angular rank.

What the cone adds (computed on the d3 hierarchy, bottom-up then top-down):
- leaf disc radius `r0 = 1`.
- node cone radius `R(n) = max(r0, Σ_children 2·disc(c) / 2π)`; node disc
  `disc(n) = R(n) + max_children disc(c)`. (Children packed around the
  circumference by their disc diameters.)
- child `c_i` of `n`, rank i of k: angle `θ_i = 2π (i + 0.5) / k`, position
  `(x_n + R(n) cos θ_i, -y_c, z_n + R(n) sin θ_i)`. Root at origin.
- depth spacing: rescale `node.y` so the total depth extent equals `R(root)`
  (`dy = R(root) / root.height`). Depth gate then holds by construction:
  extents ≈ (2R, R, 2R), ratio 0.5.

Every subtree is therefore a cone whose base is the circle of its children, and
leaves form the outermost ring of each bottom cone, all on one plane.

## Marks

- node: `Mesh(SphereGeometry(r))`, one per `root.descendants()` (252). `r` is
  0.35·r0 for leaves, 0.5·r0 internal. Colour: internal `#555` as in the
  notebook; leaves by top-level ancestor, `d3.schemeTableau10`, so the ten
  cones read apart in 3D.
- link: one fat line (`three/addons/lines/webgpu/Line2`) per `root.links()`
  (251), a cubic bezier from parent to child whose control points are offset
  along the depth axis (the 3D analogue of `linkHorizontal`), 16 segments,
  `#555`, opacity 0.4, linewidth 1.5 px.
- no labels on this rung (gap; text primitive comes later).

## Camera

PerspectiveCamera fov 40, target = bbox centre, positioned at elevation 30°
above the leaf plane, azimuth 35°, distance such that the bbox sphere fills
~85 % of the frame. Fixed. OrbitControls attached without damping for
interactive use; the e2e render is one frame.

## Primitives for `src/`

`src/link.js` (bezier fat line from two points and an axis), `src/frame.js`
(fit camera to a bbox with elevation/azimuth), `src/d33.js` registration.

## For three-rs

d3 modules: d3-hierarchy (hierarchy, cluster), d3-array (ascending),
d3-scale-chromatic (schemeTableau10). Layout: cone tree above, ~40 lines,
depends only on the hierarchy's `descendants`, `children`, `x`, `y`, `height`.
