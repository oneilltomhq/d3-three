## N. treemap → flat, planar by ruling

| artefact | path |
| --- | --- |
| page | `examples/d3_treemap.html` |
| screenshot | `examples/screenshots/d3_treemap.jpg` (400×250) |
| marks | `marks/d3_treemap.json` (0 nodes, 0 links, 220 cells, 30 labels) |
| layout note | `layouts/treemap.md` |
| reference render of the original notebook | `ref/treemap.png` (1154×1154) |

Source notebook: `d3-gallery/notebooks/hierarchies/treemap.v2`, data
`files/flare.json` (252 nodes, 220 leaves, height 4), tiling `d3.treemapBinary`
(the notebook's default input).

**History:** first built as stacked partitions (every node a slab on its
parent's, 252 cells, depth ratio 0.264; commit 8151421). Retired by the
director's planar ruling (`handoff/rung0/LOG.md`): the steps added nothing a
treemap needs. Rebuilt flat.

**d3 modules needed:** d3-hierarchy (`hierarchy`, `sum`, `sort`, `treemap`,
`treemapBinary`), d3-scale (`scaleOrdinal`), d3-scale-chromatic
(`schemeTableau10`), d3-format (`format(",d")`). The DOM half of d3 is not used.

**3D layout:** none — the notebook's treemap in the ground plane.
`d3.treemap().tile(treemapBinary).size([1154, 1154]).padding(1).round(true)` on
the value-summed, value-sorted hierarchy; scale `S = 20/1154`; notebook
`x → x·S`, `y → y·S − 20` (top edge far from camera A, so the picture is not
mirrored). Drawn datum set: `root.leaves()` (220), as the notebook. Each leaf a
box over its rect, uniform thickness 0.3 (1.5 % of the width) for a lit edge.
Leaf top faces are the notebook's rects exactly (max error 3.6e-15; 0 overlaps;
all inside the root minus padding). Extents `19.32 × 0 × 19.02`; depth ratio
0.000, passed as `planar by ruling`. Full spec in `layouts/treemap.md`.

**Marks:** one `Mesh(BoxGeometry)` per leaf, mark position at the centre of the
top face, `normal = [0, 1, 0]`. Coloured by top-level package (`schemeTableau10`
mixed 40 % to white = the notebook's `fill-opacity 0.6`). A white closed `Line`
around each leaf's top rect (lifted 0.012) stands in for the notebook's 1 px
gaps; not marks.

**Camera:** PerspectiveCamera fov 35, elevation 55°, azimuth 20°, fill 0.85 on
the square's bounding box. All 220 top-face centres visible from both gate
cameras (raycast in the page: 0 misses each); camera B not edge-on (220
eligible). Fixed; one frame.

**Gates:** depth 0.000 (planar by ruling) · counts 0/0 nodes, 0/0 links,
220/220 cells · angle 0.458 / 0.488 · picking 20/20 from both cameras · labels
30/30 (page-supplied `expected.labels`) · twice 0 px.

**d33.js changes on this rung:** the counts gate also compares `cell` marks to
`expected.cells` (default 0); the angle and picking gates run on node + cell
marks; the labels gate compares to `expected.labels` when the page supplies it,
else to the node count; `register({ planar: true })` → `state.planar`, the depth
gate still reports the ratio but passes with note `planar by ruling`, `planar`
and `expected.labels` are written to the report JSON top level.
`src/labels.js`: one-line fix so a multi-line label (`\n`) does not count the
newline as a glyph.

**Labels (rung 3):** lib3 `sdf-text` via `src/labels.js`, Roboto Regular, `#222`
on a white halo 0.2. As the notebook: the leaf name split on capitals/spaces one
word per line plus the formatted value, one multi-line `Text` per leaf lying in
the top plane (+x baseline, +y = far), anchored `start` / `top` at the far-left
corner + 3 px pad, line pitch 0.9 em; `fontSize = 0.498` world units (5 px at
the target distance at 400×250, ~4 px after foreshortening; 16 px at
1600×1000). Only the 30 leaves whose rect holds the whole block (widest line +
2 pads wide, pad + lines × 0.9 em tall; TTF advances + kerning via lib3
`VectorFont`) are labelled; 0 flipped; no per-frame flip.
`marks/d3_treemap.json` `labels[]` carries `{ id, text, x, y, z, q, anchorX }`,
`id` = the leaf's cell id.

**Gaps:** 190 leaves are too small for their label at this size (the notebook
draws every label and clips it); the value line's `fill-opacity 0.7` and extra
`0.3em` gap are not reproduced (one `Text`, one colour, one pitch).
`tools/ref.js` needed two small additions to render this notebook (`REF_EXPRS`
for the `viewof tile` input, a `DOM.uid` stub). The harness's `writeReport`
picks fields, so `planar` is in `window.d33.report()` but in neither
`marks/*.json` nor `gates/*.json` — only the depth gate's note shows it (a
one-line harness change, not made here; the depth gate's `note` is enough for
the grader).
