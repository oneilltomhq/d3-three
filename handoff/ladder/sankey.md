## N. sankey → flat, planar by ruling

| artefact | path |
| --- | --- |
| page | `examples/d3_sankey.html` |
| screenshot | `examples/screenshots/d3_sankey.jpg` (400×250) |
| eyeball render | `handoff/ladder/sankey-1600x1000.png` |
| marks | `marks/d3_sankey.json` (0 nodes, 0 links, 116 cells = 48 node rects + 68 link ribbons, 48 labels) |
| layout note | `layouts/sankey.md` |
| reference render of the original notebook | `ref/sankey.png` (928×600) |
| vendored dependency | `src/vendor/d3-sankey/` (d3-sankey 0.12.3 src, ISC) → `examples/jsm/vendor/d3-sankey.js` (ESM bundle) |

Source notebook: `d3-gallery/notebooks/networks/sankey.v2`, data
`files/energy.csv` (68 links; 48 nodes derived from the endpoints). Inputs at
the notebook's defaults: `nodeAlign = sankeyJustify`, `linkColor =
source-target`.

**d3 modules needed:** d3-sankey 0.12 (`sankey`, `sankeyJustify`;
`sankeyLinkHorizontal` re-derived as a cubic Bézier), d3-dsv (`csvParse`,
`autoType`), d3-scale (`scaleOrdinal`), d3-scale-chromatic
(`schemeCategory10`). The DOM half of d3 is not used.

**3D layout:** none — the notebook's sankey in the ground plane.
`d3.sankey().nodeId(d => d.name).nodeAlign(sankeyJustify).nodeWidth(15)
.nodePadding(10).extent([[1, 5], [927, 595]])` on copies of the nodes and
links, as the notebook; scale `S = 20/928`; notebook `x → x·S`,
`y → y·S − 600·S` (top edge far from camera A, so the picture is not
mirrored). Each node a box over its rect, thickness 0.3; each link a ribbon:
the notebook's Bézier `(source.x1, y0) → (target.x0, y1)` (control points at
mid x), sampled at 33 points, offset ±max(1, width)/2 along the notebook's
vertical, extruded 0.15, lifted `i·0.001` in file order so crossings never
z-fight and the later link is on top. Extents `19.63 × 0.15 × 11.42`; depth
ratio 0.008, passed as `planar by ruling`. Full spec in `layouts/sankey.md`.

**Marks:** all cells (a `link` mark in this project is a line). 48
`Mesh(BoxGeometry)` node cells (`n<i>`), mark position at the centre of the
top face (y = 0.3), colour `schemeCategory10` by category (consumed in the
notebook's order), `normal = [0, 1, 0]`; 68 `Mesh(ExtrudeGeometry)` link cells
(`l<i>`, `a`/`b` = source/target node ids), mark position at the ribbon's
top-face centre at the Bézier's t = 0.5, colour = the **source** category
colour mixed 50 % to white (the notebook's stroke-opacity 0.5 over white;
its default source→target gradient is baked to the source end). A black
closed `Line` around each node's top rect (lifted 0.012) stands in for the
notebook's 1 px stroke; not marks. `expected = { nodes: 0, links: 0,
cells: 116, labels: 48 }`.

**Camera:** PerspectiveCamera fov 35, elevation 55°, azimuth 15°, fill 0.85
on the chart's bounding box plus the label block corners; distance ≈ 27.3.
All 116 marks eligible from both gate cameras (normals up); 106 / 107 visible
(the rest have their mid-point under a middle-column node or a later ribbon),
20/20 hit from both. Fixed; one frame.

**Gates:** depth 0.008 (planar by ruling) · counts 0/0 nodes, 0/0 links,
116/116 cells · angle 0.580 / 0.669 · picking 20/20 from both cameras,
eligibleB 116 · labels 48/48 (page-supplied `expected.labels`) · twice 0 px.

**Labels (rung 3):** lib3 `sdf-text` via `src/labels.js`, Roboto Regular,
`#111` on a white halo 0.2. As the notebook: the node name, 10 px = `10·S =
0.2155` world units, lying in the top plane (+x baseline, +y = far) at
y 0.312; left-half nodes (`x0 < 464`) anchored `start` at `x1 + 6 px`,
right-half nodes anchored `end` at `x0 − 6 px`, `anchorY middle` (the
notebook's `dy 0.35em`). Built on a shim `{ descendants: () => wrappers }`
where a right-half wrapper carries `children: []` so `hierarchyLabels`
treats it as internal (end-anchored). 3.1 px em at 400×250, ~12.5 px at
1600×1000. 0 flipped; per-frame `labels.update(camera)`.
`marks/d3_sankey.json` `labels[]` carries `{ id, text, x, y, z, q, anchorX }`,
`id` = the node's cell id.

**Shared-file changes on this rung:** none in `src/`, `test/e2e/` or
`package.json`. `tools/ref.js` gained one additive knob, `REF_MERGE`
(comma-separated served ESM modules merged onto `window.d3`, what
Observable's `require("d3@7", "d3-sankey@0.12")` does). New files:
`src/vendor/d3-sankey/` (npm src verbatim + LICENSE),
`src/vendor/d3-sankey-entry.js` (the esbuild entry, build command in its
header), `examples/jsm/vendor/d3-sankey.js`.

**Gaps:** the notebook's default link colour is a per-link source→target
gradient; here every ribbon is the source colour end to end. The notebook's
`mix-blend-mode: multiply` over translucent bands is replaced by opaque
ribbons in paint order. The ribbon is offset vertically (band height = flow
everywhere) where the SVG stroke is perpendicular to the path, so steep
sections read thinner here than in `ref/sankey.png`. The brief named
`sankeyLeft` as the notebook's default alignment; the notebook's is
`sankeyJustify`, which is what runs (and what the reference render shows).
