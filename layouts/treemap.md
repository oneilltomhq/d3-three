# treemap → the notebook's treemap, flat in the 3D world (planar by ruling)

**History.** The first build of this page (commit 8151421) was a *stacked
partitions* lift: every one of the 252 nodes a slab on top of its parent's,
package plinths 3.0 thick, leaf steps 0.7, camera 60°/40°, all gates green.
The director eyeballed it and ruled the 3D added nothing to a treemap — the
steps only hid rects and shifted labels — and issued the planar ruling
(`handoff/rung0/LOG.md`, "Director ruling: planar lifts"). That variant is
retired; this note describes what runs now.

Source: `hierarchies/treemap.v2` (flare.json: 252 nodes, 220 leaves, height 4).
2D: `d3.treemap().tile(d3.treemapBinary).size([1154, 1154]).padding(1).round(true)`
on the value-summed, value-sorted hierarchy; one rect per leaf coloured by
top-level ancestor (schemeTableau10); labels: name lines + formatted value.

Built as `examples/d3_treemap.html`; this note is kept true to what runs.

## The lift: none

The chart is the notebook's, lying in the world's ground plane (`y = 0`, up
`+y`). d3.treemap decides every rect (`x0, y0, x1, y1`), the tiling
(`treemapBinary`), padding 1, the sort — run exactly as the notebook. The datum
set drawn is `root.leaves()` (220), the same set the notebook draws; internal
nodes have rects but no mark, as in the notebook.

What the page adds to place it in 3D:
- mapping: notebook `x → x·S`, `y → z·S − 20` with `S = 20/1154`, so the square
  spans `[0, 20] × [−20, 0]` in `xz`. Camera A looks from `+x, +z`: the
  notebook's top edge is the far edge and its left edge the left edge, so the
  picture reads as in the notebook, not mirrored.
- thickness: every leaf is a box of uniform height `THICK = 0.015 · 20 = 0.3`
  (1.5 % of the width) from `y = 0` to `y = 0.3`, so each tile has a lit edge
  against its neighbours and against the white ground; this is the only
  "3D" and it is decoration, not encoding.
- the notebook's 1 px white gaps are 0.017 world units — sub-pixel at 400×250 —
  so each leaf's top rect is also outlined by a white closed `Line`, lifted
  0.012 above the face (`outlines` group; not marks, not pickable).
- colour: leaf by top-level ancestor (schemeTableau10, the notebook's
  `scaleOrdinal(data.children.map(d => d.name), schemeTableau10)`) mixed 40 %
  toward white (the notebook's `fill-opacity 0.6` on white).
  `MeshStandardNodeMaterial`, one per package; geometry shared (one unit
  `BoxGeometry` scaled per leaf). Hemisphere light 2.0 + directional 1.6.

Extents of mark positions (19.32, 0, 19.02); depth ratio 0.000 — the depth gate
passes with note `planar by ruling` (`register({ planar: true })`).

## Marks

- cell: one `Mesh(BoxGeometry)` per leaf (220). The mesh origin is the centre of
  the tile's **top face** (the unit box hangs below its origin, scaled to
  `(w·S, 0.3, h·S)`), so `getWorldPosition` is the leaf's own pixel — the point
  the picking gate raycasts. `normal = [0, 1, 0]` on every mark.
  `expected = { nodes: 0, links: 0, cells: 220, labels: 30 }`. No mark without
  an object.
- Verified in the page (raycast + matrix read-back, 400×250, the gate cameras):
  the world-space footprint of every leaf box equals its rect scaled
  (`max |Δ| = 3.6e-15`), top faces all at `y = 0.3`; no two leaf faces overlap;
  every leaf lies inside the root rect minus the 1 px padding; Σ leaf area =
  1,269,470 of 1,331,716 notebook px² (the rest is the padding at every depth);
  every one of the 220 top-face centres is hit by its own mesh from camera A
  and from camera B (0 misses each); camera B is not edge-on (all 220 eligible,
  20/20 hit).

## Labels

As the notebook: one multi-line `Text` per labelled leaf, the name split on
capitals and spaces (`name.split(/(?=[A-Z][a-z])|\s+/g)`) one word per line,
then the formatted value (`d3.format(",d")`), lying in the top plane: local +x
= world +x, local +y = world −z (`basisQuaternion((1,0,0), (0,0,−1))`, faces
up). Anchor `start` / `anchorY top` at the leaf's far-left corner + the
notebook's 3 px pad (`3·S`) in x and z; line pitch `lineHeight 0.9` em (the
notebook's `0.9em` dy); lifted 0.012 like the outlines. No per-frame flip:
`billboard: false`, orientation fixed; `hierarchyLabels`' one-time mirror
check flipped 0 of 30 at this camera.

- Size: `fontSize = 5 px / pxPerUnit` at the target distance at 400×250 →
  **0.498 world units** (10.03 px/unit), ~4 px tall on screen after the 55°
  foreshortening (16 px at 1600×1000).
- Which leaves: rect width ≥ widest line + 2 pads **and** rect height ≥ pad +
  lines × 0.9 em, lines measured from the TTF (advance widths + kerning via
  lib3's `VectorFont`), so no label overflows its cell (the notebook clips with
  a `clipPath` instead). **30** of 220 leaves qualify; the page registers
  `expected.labels = 30` and the labels gate compares to it.
- Built with `hierarchyLabels` on a proxy root whose `descendants()` are the 30
  leaves (each `{ data: { name: lines.join('\n') } }`), `leafOffset 0`, Roboto
  Regular, `#222`, halo 0.2; `anchorY`/`lineHeight` set on each `Text` after
  construction and the batch re-synced. `src/labels.js` needed a one-line fix:
  it sized the glyph batch by `text.length`, counting `\n` as a glyph, and
  threw on the first multi-line label.
- Not billboarded; not marks; not pickable. Dumped to `marks/d3_treemap.json`
  `labels[]` as `{ id, text, x, y, z, q, anchorX }`, `id` the leaf's cell id,
  `text` the joined lines.
- Gap: the notebook draws the value line at `fill-opacity 0.7` and with an
  extra `0.3em` gap; one `Text` has one colour and one pitch, so the value
  line is drawn like the name lines.

## Camera

PerspectiveCamera fov 35, **elevation 55°, azimuth 20°**, fill 0.85, fitted by
`frameCamera` to the corners of `[0, 20] × [0, 0.312] × [−20, 0]` (the tiles
plus the outline/label lift; labels lie inside their rects so the rectangle's
corners bound them). Distance 39.5. Camera B (rotated 90° about up) is at the
same elevation and sees the plane just as well (angle area 0.488 vs 0.458 for
A; all 220 marks eligible, 20/20 hit).

## Primitives for `src/`

Nothing new: `BoxGeometry`, `Line`, `frameCamera`, `attachOrbit`,
`hierarchyLabels`/`basisQuaternion`, lib3's `VectorFont` for measuring.
`tools/ref.js` gained `REF_EXPRS` (JSON of expressions for input cells:
`{"tile":"d3.treemapBinary"}`) and an Observable `DOM.uid` stub, both needed to
render this notebook's chart cell (`ref/treemap.png`, unchanged by the rework).

## For three-rs

d3 modules: d3-hierarchy (hierarchy, treemap, treemapBinary), d3-scale
(scaleOrdinal) + d3-scale-chromatic (schemeTableau10), d3-format. Layout: the
notebook's rects verbatim; every leaf box is `[x0·S, x1·S] × [0, 0.3] ×
[y0·S−20, y1·S−20]`. Labels: per-label anchor, quaternion, anchor side and the
multi-line string in `marks/d3_treemap.json` `labels[]`.
