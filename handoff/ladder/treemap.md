## N. treemap → stacked partitions

| artefact | path |
| --- | --- |
| page | `examples/d3_treemap.html` |
| screenshot | `examples/screenshots/d3_treemap.jpg` (400×250) |
| marks | `marks/d3_treemap.json` (0 nodes, 0 links, 252 cells, 27 labels) |
| layout note | `layouts/treemap.md` |
| reference render of the original notebook | `ref/treemap.png` (1154×1154) |

Source notebook: `d3-gallery/notebooks/hierarchies/treemap.v2`, data
`files/flare.json` (252 nodes, 220 leaves, height 4), tiling `d3.treemapBinary`
(the notebook's default input).

**d3 modules needed:** d3-hierarchy (`hierarchy`, `sum`, `sort`, `treemap`,
`treemapBinary`), d3-scale (`scaleOrdinal`), d3-scale-chromatic
(`schemeTableau10`). The DOM half of d3 is not used.

**3D layout:** stacked partitions. `d3.treemap().tile(treemapBinary)
.size([1154, 1154]).padding(1).round(true)` on the value-summed, value-sorted
hierarchy fixes `x0, y0, x1, y1` of every node (internal nodes too). Scale
`S = 20/1154`; notebook `x → x·S`, `y → y·S − 20` (top edge far from camera A).
Every node is a box over its own rect: thickness 0.7 at every depth except the
ten packages (depth 1) at 3.0, stacked so a slab sits on its parent's — slab
bottoms 0, 0.7, 3.7, 4.4, 5.1; top 5.8. Leaves' top faces are the notebook's
rects exactly (max error 3.6e-15 world units; 0 overlaps; leaf area 381.30 +
padding area 18.70 = 400). Result `19.32 × 5.10 × 19.02` (mark positions),
depth ratio 0.264. ~15 lines of layout on top of treemap's rects; full spec in
`layouts/treemap.md`.

**Marks:** one `Mesh(BoxGeometry)` per descendant, mark position at the centre of
the slab's top face. Leaves coloured by top-level package (`schemeTableau10`
mixed 40 % to white = the notebook's `fill-opacity 0.6`), internal slabs the same
hue mixed 10 % to white, root `#ddd`. A white closed `Line` around each leaf's
top rect (lifted 0.012) stands in for the notebook's 1 px gaps; not marks.
Internal cells carry `normal = [0, −1, 0]`: their top faces are covered by their
children by construction, so the picking gate samples leaves only (the
notebook's marks).

**Camera:** PerspectiveCamera fov 35, elevation 60°, azimuth 40°, fill 0.85 on
the stack's bounding box. At this camera every one of the 220 leaves is visible
from both gate cameras (checked by raycasting each top-face centre). Fixed; one
frame.

**Gates:** depth 0.264 · counts 0/0 nodes, 0/0 links, 252/252 cells · angle
0.377 / 0.369 · picking 20/20 from both cameras · labels 27/27 (page-supplied
`expected`).

**d33.js changes on this rung:** the counts gate also compares `cell` marks to
`expected.cells` (default 0); the angle and picking gates run on node + cell
marks (a cell-only page previously failed both with "no node marks"); the
labels gate compares to `labels.expected` when the page supplies it, else to the
node count as before.

**Labels (rung 3):** lib3 `sdf-text` via `src/labels.js`, Roboto Regular, `#222`
on a white halo 0.2. Leaves only, lying flat on the top face (+x baseline, +y =
far), the notebook's first text line (`name.split(/(?=[A-Z][a-z])|\s+/)[0]`),
anchored `start` at the far-left corner + 3 px pad; `fontSize = 0.771` world
units (6 px at the target distance at 400×250, 5.2 px after foreshortening;
21 px at 1600×1000). Only the 27 leaves whose rect is ≥ 1.2 em tall and wide
enough for the measured text (TTF advances + kerning via lib3 `VectorFont`) are
labelled; 0 flipped. `marks/d3_treemap.json` `labels[]` carries
`{ id, text, x, y, z, q, anchorX }`, `id` = the leaf's cell id.

**Gaps:** the notebook's remaining name lines and the formatted value line are
not drawn; 193 leaves are too small for a label at this size (the notebook draws
every label and clips it). `tools/ref.js` needed two small additions to render
this notebook (`REF_VALUES` for the `viewof tile` input, a `DOM.uid` stub).
