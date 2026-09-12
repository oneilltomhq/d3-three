# cluster → cone tree

Source: `hierarchies/cluster.v2` (flare.json: 252 nodes, 220 leaves, height 4,
10 top-level packages). 2D: `d3.cluster().nodeSize([dx, dy])`, breadth on x,
depth on y, leaves at equal depth, `linkHorizontal` links.

Built as `examples/d3_cluster.html`; this note is kept true to what runs.

## The lift

A cone tree (Robertson, Mackinlay & Card 1991). Depth stays an axis; breadth,
which d3 spreads along one line, is wrapped into a circle under each parent.

What d3.cluster still decides:
- `node.y`: the depth coordinate. Cluster puts every leaf at the deepest level
  and internal nodes at `(root.height - node.height)`; that is what makes it a
  dendrogram and it is kept verbatim as the vertical axis (`y = -node.y`).
  The page calls `d3.cluster().nodeSize([1, 1])` and uses `node.height`.
- sibling order: `root.sort(ascending name)` then the order of `node.x` among
  siblings gives each child's angular rank.

What the cone adds (computed on the d3 hierarchy, bottom-up then top-down):
- leaf disc radius `r0 = 1`, packing margin `m = 1.12`.
- node cone radius `R(n)`: the smallest circle on which the children's discs
  fit side by side. Each adjacent pair `(i, i+1)` needs the centre angle
  `2·asin( g_i / R )` with `g_i = m·(disc_i + disc_{i+1}) / 2`; `R(n)` is the
  smallest `R` with `Σ 2·asin(g_i/R) ≤ 2π`, found by bisection, and at least
  `r0` and `m·max_i disc_i` (so the parent's own centre stays clear of every
  child disc). One child: `R = r0`.
- node disc `disc(n) = R(n) + max_children disc(c)`, bounding the whole subtree
  in the horizontal plane.
- child `c_i` of `n`: `θ_i` is the running sum of those pair angles, scaled to
  close the circle exactly; position
  `(x_n + R(n) cos θ_i, -y_c, z_n + R(n) sin θ_i)`. Root at origin.
- depth spacing: rescale `node.y` so the total depth extent equals `R(root)`
  (`dy = R(root) / root.height`).

Every subtree is therefore a cone whose base is the circle of its children, and
leaves form the outermost ring of each bottom cone, all on one plane.

**Changed from the first draft of this note, and why.** The draft placed
children at equal angles `θ_i = 2π(i + 0.5)/k` while sizing `R(n)` from the sum
of their disc *diameters*. Those two disagree when siblings have very different
subtree sizes: a large disc and a small disc get the same angular slot, and
cousins collide. Measured on flare, the closest two nodes were **0.008** apart
(`flare/util/Dates` and `flare/vis/events/VisualizationEvent`) — coincident for
picking purposes. Sizing the circle by the exact angle each neighbouring pair
needs, and spacing the children by those same angles, is what the note's own
words ("packed around the circumference by their disc diameters") describe; it
takes the closest pair to **2.24** and no sibling subtrees overlap by
construction. `R(root)` goes from 27.2 to 38.6 and the layout is
`87.7 × 38.6 × 105.0`, depth ratio `0.368` (gate needs ≥ 0.25).

## Marks

- node: `Mesh(SphereGeometry(r))`, one per `root.descendants()` (252).
  `r = 0.45·r0` for leaves, `0.6·r0` internal — raised from the draft's
  0.35/0.5, which was under two pixels in the 400×250 screenshot. Colour:
  internal `#555` as in the notebook; leaves by top-level ancestor,
  `d3.schemeTableau10`, so the ten cones read apart in 3D.
  `MeshStandardNodeMaterial`, one material per colour, geometry shared.
- link: one fat line (`three/addons/lines/webgpu/Line2`) per `root.links()`
  (251), a cubic bezier from parent to child whose control points are offset
  along the depth axis (the 3D analogue of `linkHorizontal`), 16 segments,
  `#555`, opacity 0.4, linewidth 1.5 px. One shared `Line2NodeMaterial`.
- no labels on this rung (**gap**; the notebook labels every node, the 3D page
  labels nothing — a billboard text primitive is the next thing `src/` needs).

## Camera

PerspectiveCamera fov 40, elevation 30° above the leaf plane, azimuth 35°,
`fill` 0.85. `frameCamera` fits the *projected* node positions rather than the
bounding sphere and nudges the target until the projection is centred: the cone
tree is wide and flat, and a sphere fit left about half the frame empty.
Fixed. OrbitControls attached without damping for interactive use; the e2e
render is one frame.

## Primitives for `src/`

`src/link.js` (`linkCurve`, `fatLine`, `lineMaterial`), `src/frame.js`
(`frameCamera`), `src/orbit.js` (`attachOrbit`), `src/d33.js` registration with
`pickables`.

## For three-rs

d3 modules: d3-hierarchy (hierarchy, cluster), d3-array (ascending),
d3-scale (scaleOrdinal), d3-scale-chromatic (schemeTableau10). Layout: cone
tree above, ~70 lines, depends only on the hierarchy's `descendants`,
`children`, `height` and sibling order.
