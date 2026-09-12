# treemap → stacked partitions

Source: `hierarchies/treemap.v2` (flare.json: 252 nodes, 220 leaves, height 4).
2D: `d3.treemap().tile(d3.treemapBinary).size([1154, 1154]).padding(1).round(true)`
on the value-summed, value-sorted hierarchy; one rect per leaf coloured by
top-level ancestor (schemeTableau10); labels: name lines + formatted value.

Built as `examples/d3_treemap.html`; this note is kept true to what runs.

## The lift

A treemap hides the hierarchy that produced it: only leaves are drawn. Stacking
makes it visible. Every node is a slab; a node's slab sits on top of its parent's,
covering the parent's footprint for that node, so the whole thing is a stepped
block whose steps are the levels of flare and whose top faces are the notebook's
treemap exactly.

What d3.treemap still decides: `x0, y0, x1, y1` of every node (leaves AND internal
nodes — treemap sets them for all), the tiling (`treemapBinary`), padding 1, the
sort. Run exactly as the notebook.

What the stack adds:
- footprint: `[x0, x1] × [y0, y1]` mapped to the ground plane, `x → x`,
  `y → z` shifted so the footprint spans `z ∈ [−20, 0]` (`z = y·S − 20`,
  `S = 20/1154`). Camera A looks from `+x, +z`, so the notebook's top edge is the
  far edge and its left edge the left edge: the treemap appears as in the
  notebook, not mirrored. (The draft said `y → −z`; that puts the notebook's top
  row nearest the camera and flips the picture top-to-bottom.)
- slab thickness by depth: `STEP = 0.7` for every level except the ten packages
  (depth 1), which are `PLINTH = 3.0`. Slab bottoms: root 0, packages 0.7,
  depth 2 at 3.7, depth 3 at 4.4, depth 4 at 5.1; top of the stack 5.8 = 0.29 of
  the footprint. **Changed from the draft's uniform `t = 20·0.3/(H+1)` per level,
  and why:** with uniform slabs the step between a depth-2 leaf and a depth-4
  neighbour is `2t`, and from any camera below ~72° elevation that step shadows
  the low leaf's centre (measured with the real framing: at `t = 1.4`, elevation
  40°/azimuth 25°, 129 of 220 leaf centres and 11 of 220 top-face centres are
  occluded from camera A, 143/23 from camera B; the first elevation with no
  occluded leaf from both gate cameras is 72° on the diagonal, 75° at azimuth
  25° — a plan view in which the 3D no longer reads). Putting the stack's height
  into the package layer keeps the depth gate (mark positions span 5.1 in y,
  ratio 0.264) while the leaf steps stay 0.7, and at 60° elevation every one of
  the 220 leaves is visible from both gate cameras (checked by raycasting each
  leaf's top-face centre in the page: 0 misses A, 0 misses B).
- no slab inset. The draft shrank every slab by 0.05 a side so step edges read;
  instead each leaf's top face is exactly its rect (the verification below needs
  that) and the notebook's 1 px white gaps — 0.017 world units, sub-pixel — are
  drawn as a white closed `Line` around each leaf's top rect, lifted 0.012 above
  the face (`outlines` group, not marks, not pickable).
- colour: leaves by top-level ancestor (schemeTableau10) mixed 40 % toward white
  (the notebook's `fill-opacity 0.6` on white); internal slabs the same hue mixed
  10 % toward white, so package plinths and the walls under a step read as the
  darker "parent"; root slab `#ddd`. `MeshStandardNodeMaterial`, one per colour,
  geometry shared (one unit `BoxGeometry` scaled per node).

Extents of mark positions (19.32, 5.10, 19.02), depth ratio 0.264.

## Marks

- cell: one `Mesh(BoxGeometry)` per `root.descendants()` (252). The mesh origin is
  the centre of the slab's **top face** (the unit box hangs below its origin), so
  `getWorldPosition` is the cell's own pixel — the point the picking gate
  raycasts. (The draft said box centre; a slab's centre is inside it and its ray
  from an oblique camera is shadowed by neighbouring steps far more often than
  its top face is.) `expected = { nodes: 0, links: 0, cells: 252 }`.
- Internal cells (32) carry `normal = [0, −1, 0]`. Their top faces are covered by
  their children by construction — that is what a stack is — so no elevated
  camera can see their centre; with a downward normal the picking gate never
  samples them from an elevated camera and samples the 220 leaves, the notebook's
  own marks, from both cameras (20 per camera, 20/20 hit). The draft said
  "leave `normal` unset so picking samples all cells": that cannot pass for
  internal slabs at any elevation.
- The world-space footprint of every leaf box equals its rect scaled
  (`max |Δ| = 3.6e-15`); no two leaf faces overlap; every cell lies inside its
  parent; Σ leaf area 381.30 + Σ padding area 18.70 (each internal node's rect
  minus its children's) = 400.00 = the root's footprint.

## Labels

Leaves only, lying flat on the leaf's top face: local +x = world +x, local +y =
world −z (`basisQuaternion((1,0,0), (0,0,−1))`, faces up). Text is the
**first line** of the notebook's multi-line label (`name.split(/(?=[A-Z][a-z])|\s+/)[0]`;
the remaining name lines and the formatted value are a gap). Anchor `start`,
`anchorY middle`, at the leaf's far-left corner + the notebook's 3 px pad
(`3·S`) in x and pad + ½ em in z; lifted 0.012 like the outlines.

- Size: `fontSize = 6 px / pxPerUnit` at the target distance at 400×250 →
  **0.771 world units** (7.78 px/unit), 5.2 px on screen after the 60°
  foreshortening (21 px at 1600×1000).
- Which leaves: rect height ≥ 1.2 em **and** rect width ≥ measured text width +
  2 pads (advance widths + kerning from the TTF via lib3's `VectorFont`, so the
  label never overflows its cell — the notebook clips with a `clipPath`). **27**
  of 220 leaves qualify; registered as `labels: { count: 27, expected: 27 }` and
  the labels gate compares to the page's `expected` (d33.js change, exception b).
- Built with `hierarchyLabels` on a proxy root whose `descendants()` are the 27
  leaves (each a `{ data: { name: line } }` proxy so the batch shows the first
  line), `leafOffset 0`, Roboto Regular, `#222`, halo 0.2. Mirror check: 0 of 27
  flipped at azimuth 40°.
- Not billboarded; not marks; not pickable. Dumped to `marks/d3_treemap.json`
  `labels[]` as `{ id, text, x, y, z, q, anchorX }` with `id` the leaf's cell id.

## Camera

PerspectiveCamera fov 35, **elevation 60°, azimuth 40°**, fill 0.85, fitted to
the corners of the stack's bounding box `[0, 20] × [0, 5.8] × [−20, 0]`
(`frameCamera`); distance 50.9. Changed from the draft's 40°/25° for the
occlusion reason above: 60°/40° is the middle of the band (elevation ≥ 57.5° on
the diagonal, azimuth 35–50° at 60°) in which no leaf is hidden from either gate
camera. Camera B (rotated 90° about up, azimuth 130°) sees the other two walls.

## Primitives for `src/`

Nothing new: `BoxGeometry`, `Line`, `frameCamera`, `attachOrbit`,
`hierarchyLabels`/`basisQuaternion`, lib3's `VectorFont` for measuring.
`tools/ref.js` gained `REF_VALUES` (JSON of expressions for input cells:
`{"tile":"d3.treemapBinary"}`) and an Observable `DOM.uid` stub, both needed to
render this notebook's chart cell.

## For three-rs

d3 modules: d3-hierarchy (hierarchy, treemap, treemapBinary), d3-scale
(scaleOrdinal) + d3-scale-chromatic (schemeTableau10). Layout: slab thickness by
depth over treemap's rects, ~15 lines; every box is `[x0·S, x1·S] × [base(d),
base(d)+thick(d)] × [y0·S−20, y1·S−20]`. Labels: per-label anchor, quaternion,
anchor side and string in `marks/d3_treemap.json` `labels[]`.
