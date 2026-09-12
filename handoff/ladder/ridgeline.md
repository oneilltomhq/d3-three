## N. ridgeline plot → series along z

| artefact | path |
| --- | --- |
| page | `examples/d3_ridgeline.html` |
| screenshot | `examples/screenshots/d3_ridgeline.jpg` (400×250) |
| eyeball render | `handoff/ladder/ridgeline-1600x1000.png` |
| marks | `marks/d3_ridgeline.json` (0 nodes, 0 links, 38 cells, 50 labels) |
| layout note | `layouts/ridgeline.md` |
| reference render of the original notebook | `ref/ridgeline.png` (928×646) |

Source notebook: `d3-gallery/notebooks/areas/ridgeline-plot`, data
`files/traffic.csv` (`name, date, value`; 38 locations × 144 hourly counts,
2016-01-04 – 2016-01-09), read with `csv({typed: true})` = `csvParse` +
`autoType`; series in `d3.groups` (file) order.

**d3 modules needed:** d3-dsv (`csvParse`), d3-array (`autoType`, `group`,
`groups`, `extent`, `max`, `ascending`), d3-scale (`scaleTime`, `scaleLinear`
with `nice`), d3-shape (`line`, `curveBasis`), d3-time + d3-time-format
(`x.ticks(928 / 80)`, `x.tickFormat`). The DOM half of d3 (`d3.axis*`,
selection) is replaced by one `LineSegments` and 12 labels.

**3D layout:** the page's y (series) becomes world z, the value world y. Every
notebook px is `S = 20 / 788` world units, so the plot width is the 20-unit x
axis (`scaleTime`, range `[0, 20]`), the z pitch is the notebook's `y.step()`
= 15.568 px → **0.3951**, series i at `z = −(37 − i) · 0.3951` (the notebook's
last series, painted on top, is the front slab at z = 0; the first is at
z = −14.619). Value scale: domain `[0, 10000]` (nice), range `[0, 12 · pitch]`
= `[0, 4.741]` — **overlap 12 instead of the notebook's 8**, the one number
moved: with 8 the summits' y span is 2.66 against x 14.73 / z 14.62 and the
depth ratio 0.18; the minimum passing overlap is 11 (ratio = 0.84 · overlap /
37). Each series is the notebook's `curveBasis` top edge, sampled through a
recording path context at 6 points per bezier (861 points for 144 data),
closed to the baseline and extruded 0.4 · pitch = **0.158** in z, centred on
its z. Depth ratio **0.268**. Full spec in `layouts/ridgeline.md`.

**Marks:** one `Mesh(ExtrudeGeometry)` per series, `MeshStandardNodeMaterial`
`#f0f0f0` (the notebook's `#ddd` on the lit front faces). Mark position = the
**summit** of the drawn edge, 0.03 under it on the front face, `normal =
[0, 0, 1]` — not the brief's centroid, which puts every mark at x ≈ 10 (x
extent ≈ 0, depth gate unpassable) and under the visible edge. The notebook's
black 1 px stroke is a `Line2` child of its slab (linewidth 2 device px =
1 px on the 2×-rendered screenshot) on the front-top corner, lifted 0.004; the
x axis (domain line at the front foot + 6 px ticks toward the viewer) is one
`LineSegments`. Neither is a mark; `pickables` = the 38 meshes.

**Camera:** PerspectiveCamera fov 28 (35 made the back rows' labels ~8 px at
1600×1000), elevation 25°, azimuth −35° (front-left, ridges receding), fill
0.85 on the slabs' box corners plus every label's far end. Fixed; one frame.

**Gates:** depth 0.268 (extents 14.73 × 3.95 × 14.62) · counts 0/0 nodes, 0/0
links, 38/38 cells · angle 0.224 / 0.177 · picking 19/19 from camera A (19 of
38 summits visible past the slabs in front; the rest excused by the occlusion
pre-pass), 20/20 from camera B (30 visible) · labels 50/50 · twice 0 px (both
raw PNGs sha256 `d873aab2…`) · `tools/stable.js`: 38/38 marks and 50/50 labels
identical across two uninjected loads and the marks JSON, max |Δ| 0.

**Labels (rung 3):** lib3 `sdf-text` via `src/labels.js`, Roboto Regular,
black on a white halo 0.2, all flat in the ground plane (baseline +x, up −z,
the notebook's up seen from the front), one batch over a `{ descendants }`
shim. 38 series names at each ridge's left foot, anchor `end`, 4 px pad (the
notebook's `tickPadding(4)`), ids = the cell ids; 12 tick labels (`Mon 04`,
`12 PM`, …, ids `x0 … x11`) centred under their ticks along the front.
`expected.labels = 50` (the brief counted the names only, 38; the tick
labels are text objects the notebook draws and three-rs must place, so they
are registered and dumped too). `fontSize = 12 px · S = 0.305` world units
(the notebook's 10 px; 12 is the most the pitch allows without rows touching):
3.7 px at 400×250, ≈ 11 px at the front row in the eyeball render. 0 flipped.

**Shared-file changes on this branch:** none in `src/` (new file
`src/ridge.js`: `sampleCurve`, `ridgeGeometry`, `summit`) or `test/e2e/`.
`tools/ref.js`: additive — `<meta name="color-scheme" content="light">` and
`color: #000` on the reference page; the served origin's listing declares
`light dark` and this headless Chromium then rendered `currentColor` (every
d3 axis) white on white. Earlier notebooks have no axes; their refs are
unchanged.

**Gaps:** the notebook's series-name axis has no tick lines and sits at
`y(name)` while the series is at `y(name) + 1`; the 1 px is not reproduced.
The rows' overlap is now real occlusion: from camera A only 19 summits are
visible, exactly the ridgeline trade-off the notebook describes, but a user
must orbit to read the back rows. Names on the back rows are ~7 px in the
1600×1000 render.
