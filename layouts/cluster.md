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

## Labels (rung 3)

One `Text` per `root.descendants()` (252), all in one `BatchedText` from lib3's
`sdf-text` (`src/labels.js`, `hierarchyLabels`). Content `d.data.name`,
Roboto Regular from `examples/fonts/Roboto-Regular.ttf` (vector path: real font
metrics and kerning), fill `#333`, white halo `outlineWidth 0.25` (the 3D
counterpart of the notebook's `paint-order: stroke`).

- **Size.** `fontSize = min( 8 px at the target distance, 0.6 · leaf pitch )`
  with leaf pitch `2·m·r0 = 2.24` (the chord between neighbouring leaves on a
  cone). On flare that is **1.344 world units = 4.05 px** at 400×250
  (16 px at 1600×1000); the 8 px cap would be 2.654. Full pitch (2.24, 6.75 px)
  was tried: legible, but from 30° up the near and far sides of one ring
  overlap in projection; 0.6 reads as a dendrogram.
- **Orientation (not billboarded).** Each label lies in the vertical plane
  through the node and its parent cone's axis: local +x = the horizontal unit
  vector from the parent's (x, z) to the node's, local +y = world up
  (`basisQuaternion(out, UP)`); root: +x = (1, 0, 0). Leaves are anchored
  `start` and offset `+0.80` along +x (0.45 radius + 0.35 gap), outward;
  internal nodes anchored `end`, offset `−0.95` (0.6 + 0.35), inward.
  `anchorY: middle`.
- **Mirror rule.** If local +x projects to the left of local −x from the fixed
  camera, the label is turned 180° about its own up axis and the anchor swapped
  (`start ↔ end`), so the text block stays on the same side of the node and
  reads left-to-right — the notebook's `text-anchor: x < π ? start : end`.
  **140 of 252** labels are flipped on this page at azimuth 35°.
- **Per frame:** orientation plane fixed; reading direction flips per frame to
  face the camera. `labels.update(camera)` runs before every render and makes
  a two-axis test against the live camera on the orient() frame: does local
  +x project right of −x (reads left-to-right, the mirror test above) and does
  local +y project above −y (upright)? Each label has four precomputed poses —
  as laid out, turned 180° about its up axis, about its baseline, or in-plane
  about its normal — and takes the one for which both hold; a turn never
  re-lays out: the Text's origin moves to the block's other end
  (`(x0+x1)·X` and/or `(y0+y1)·Y` from `blockBounds`) instead of swapping the
  anchor, so the text block stays where it was. Near edge-on (either projected
  axis under 1e-3 NDC) the label keeps its pose, so nothing flickers. Here and
  on every vertical-plane page the upright test always holds and under
  camera A the mirror verdict equals the layout-time one, so the reference
  frame is untouched; on the flat-lying tree of life it turns 26 labels about
  their baseline at camera A.
- `billboard: true` is implemented in `hierarchyLabels` (camera quaternion
  copied into every label each frame) and **off** here.
- Labels are not marks and are not pickable; the batch renders after nodes and
  links (`renderOrder 1`, `depthWrite false`, depth-tested, so a label behind a
  sphere is hidden by it).
- Dumped to `marks/d3_cluster.json` as `labels[]`:
  `{ id, text, x, y, z, q: [x, y, z, w], anchorX }` — the anchor point in
  world space (not the node), the label's world quaternion (+x baseline,
  +y up, faces +z), and the SVG-style anchor after the mirror rule.

## Camera

PerspectiveCamera fov 40, elevation 30° above the leaf plane, azimuth 35°,
`fill` 0.85. `frameCamera` fits the *projected* node positions rather than the
bounding sphere and nudges the target until the projection is centred: the cone
tree is wide and flat, and a sphere fit left about half the frame empty.
Fixed. OrbitControls attached without damping for interactive use; the e2e
render is one frame.

## Primitives for `src/`

`src/link.js` (`linkCurve`, `fatLine`, `lineMaterial`), `src/frame.js`
(`frameCamera`), `src/orbit.js` (`attachOrbit`), `src/d3-three.js` registration with
`pickables` and, since rung 3, `labels`; `src/labels.js` (`hierarchyLabels`,
`basisQuaternion`) on lib3 `sdf-text`.

## For three-rs

d3 modules: d3-hierarchy (hierarchy, cluster), d3-array (ascending),
d3-scale (scaleOrdinal), d3-scale-chromatic (schemeTableau10). Layout: cone
tree above, ~70 lines, depends only on the hierarchy's `descendants`,
`children`, `height` and sibling order. Labels need an SDF-text equivalent
(Roboto Regular TTF, fill/halo as above); every per-label position, quaternion,
anchor and string is in `marks/d3_cluster.json` `labels[]`, so a port can place
them without re-deriving the orientation or mirror rule.
