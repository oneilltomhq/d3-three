# ridgeline plot → series along z

Source: `areas/ridgeline-plot` (traffic.csv: 5471 rows, 38 locations × 144 hourly
counts, 2016-01-04 00:00 – 2016-01-09 23:00). 2D: one `<g>` per series translated
to `y(name) + 1` down the page; `d3.area().curve(d3.curveBasis)` filled `#ddd`
from the baseline up to `z(value)`, its top line (`area.lineY1()`) stroked black
1 px; `overlap = 8` (a series' peak may rise 8 rows), `d3.axisBottom(x)` with
`ticks(width / 80)` at the bottom, `d3.axisLeft(y)` names with `tickSize(0)
.tickPadding(4)`. 928 × 646 (38 × 17), margins 40 / 20 / 30 / 120.

Built as `examples/d3_ridgeline.html`; this note is kept true to what runs.

## The lift

A ridgeline plot is a 3D chart drawn in 2D: the series are a third axis the page
fakes by stacking them with overlap. Lifted, the page's y (series) becomes world
z, the value becomes world y, and each series is one slab standing in its own xy
plane — the notebook's own curve, sampled densely and extruded a little in z, so
the sheets stand side by side with gaps like a mountain range seen from the
front-left.

What d3 decides: the series (`d3.groups` in file order), the time scale, the
nice value domain, the B-spline. What the page controls, all in the notebook's
own pixel proportions (`S = 20 / 788` world units per px, so the 788 px plot
width is the 20-unit x axis):

- **x** = the notebook's `scaleTime`, range `[0, 20]`.
- **z pitch** = the notebook's `y.step()` = `(646 − 30 − 40) / 37` = 15.568 px
  → **PITCH = 0.3951**. Series i sits at `z = −(37 − i) · PITCH`: the notebook
  paints each series over the one above it, so its LAST series (Neustadt) is
  the front slab at z = 0 and its first (Von der Heydt) the farthest at
  z = −14.619. Total depth 14.62 units.
- **y** = the notebook's `z` scale (domain `[0, max].nice()` = `[0, 10000]`),
  range `[0, HEIGHT]` with **HEIGHT = OVERLAP · PITCH**. **OVERLAP = 12, not the
  notebook's 8** — the one number moved. Reason: the depth gate measures the
  extents of the mark positions; the marks (summits, below) span x 14.73 and
  z 14.62, and their y span is 0.84 · HEIGHT. With the notebook's 8 that is
  2.66 → ratio 0.18, fail; the minimum passing overlap is 11 for any pitch
  (the ratio is `0.84 · OVERLAP / 37` once z ≥ x), so 12: HEIGHT = 4.741,
  y span 3.949, ratio **0.268**.
- **thickness** = 0.4 · PITCH = **0.158** along z, centred on the series' z, so
  the gap between slabs is 0.6 of the pitch.
- **the curve**: the notebook's generator (`d3.line().curve(d3.curveBasis)
  .defined(d => !isNaN(d))`, i.e. `area.lineY1()`) is run against a recording
  path context (`sampleCurve`, src/ridge.js) and each cubic bezier is
  flattened into 6 samples — 861 points per series for 144 data points, ≥ 4
  per data interval, so the drawn top edge is d3's B-spline and not a polyline
  through the data. Closed to the baseline (`y = 0`) and extruded
  (`ridgeGeometry`): a `THREE.Shape` → `ExtrudeGeometry`, `bevelEnabled: false`.
  No value in the file is below 20, so no shape touches its baseline.

Proof that the layout itself is deterministic, not only the harness render:
`node tools/stable.js d3_ridgeline` — two separate Chromium processes with NO
injection, every mark and label position `===` in both and against
`marks/d3_ridgeline.json`: 38/38 marks and 50/50 labels, max |Δ| 0.

## Marks

- cell: one `Mesh(ExtrudeGeometry)` per series (38), `MeshStandardNodeMaterial`
  `#f0f0f0` roughness 0.85 (lands near the notebook's `#ddd` on the lit front
  faces; the top lip a shade darker, the x-end caps darkest — hemisphere 1.6 +
  directional 1.7 from (−0.35, 0.6, 1.0)). `expected.cells = 38`.
  **Mark position = the summit of the drawn edge** — the sample of greatest y
  — `MARK_INSET = 0.03` below it, on the front face (`z_i + 0.079`), `normal =
  [0, 0, 1]`. The brief said the centroid of the top edge: every series'
  centroid has x ≈ 10 (the curve spans the whole axis), which makes the marks'
  x extent ≈ 0 and fails the depth gate for any pitch, and it lies well under
  the edge where the slab in front hides it from every elevation below ~60°.
  The summit is on the visible edge, is the point a ridge is named by, and
  spreads with the data (x 1.10 … 15.83 = the hour of each location's peak,
  y 0.49 … 4.43). The inset keeps the raycast pixel inside the face: a point on
  the boundary itself may or may not intersect.
- the top line: the notebook's black stroke as a `Line2` (`fatLine`) through
  the same 861 samples, linewidth 2 device px (the harness renders at 2×, so
  1 px on the screenshot, the notebook's width), a **child of the slab** on its
  front-top corner, lifted `LIFT = 0.004` off both faces. Not a mark; the
  picking gate's `pickables` are the 38 meshes and a hit on the line walks up to
  its slab.
- the x axis: one `LineSegments` (black, 1 px): the domain line from x 0 to 20
  at the front slab's foot (`z = 0.079 + LIFT`, the notebook's axis is at the
  last baseline) and one 6 px tick toward the viewer (+z, the notebook's down)
  per `x.ticks(928 / 80)` — 12 ticks, `Mon 04 | 12 PM | Tue 05 | …`. Not a mark.
- labels (50 = `expected.labels`): all in the ground plane (`y = 0`), baseline
  +x, up −z — the notebook's up seen from the front — `basisQuaternion((1,0,0),
  (0,0,−1))`, one `hierarchyLabels` batch over a `{ descendants }` shim:
  - 38 series names (`ids = the cell ids`), wrappers with `children: []` so they
    are anchored `end` and offset −x by `internalOffset = 4 px · S = 0.102` (the
    notebook's `tickPadding(4)`), centred on the series' z.
  - 12 tick labels (`x0 … x11`), leaves with `leafOffset 0`, pre-shifted by half
    their measured width (lib3 `VectorFont` advances + kerning) = anchor middle,
    centre line at tick end + 3 px + 0.5 em (d3's `y = 9, dy = 0.71em`).
  - `fontSize = 12 px · S = 0.305` world units. The notebook's axis font is
    10 px; 12 is the most the row pitch allows (ascender to descender 1.17 em =
    0.357 < PITCH 0.395; labels in one plane never overlap on screen if they
    don't overlap in the plane). 3.7 px at the target distance at 400×250;
    ≈ 11 px at the front row and ≈ 7 px at the back row in the 1600×1000 render
    after foreshortening (perspective at fov 28, below). 0 flipped.

## Camera

fov **28** (the other pages use 35–40: at 35 the far rows are about twice as
distant as the near ones and their labels shrank to ~8 px at 1600×1000; 28 evens
that out without flattening the range), **elevation 25°, azimuth −35°** — the
front-left, looking along +x / −z so the ridges recede — fill 0.85, fitted with
`frameCamera` to the ridges' bounding box corners plus the far ends of every
label (name left ends at `−0.102 − width`, tick labels' far z). Target
(8.668, 0.258, −7.115). Angle areas 0.224 / 0.177.

Picking: from camera A 38 eligible (all face +z), 19 visible after the
occlusion pre-pass (the slab in front hides the other summits, as a ridgeline
plot hides its rows), 19/19 hit; from camera B (azimuth +55°, more from the
side) 30 visible, 20/20 hit. The brief's 25° held; no elevation change needed.

## Primitives for `src/`

New `src/ridge.js`: `sampleCurve(generator, data, samplesPerSegment)` — runs any
d3 line/area generator against a recording path context and flattens its
beziers; `ridgeGeometry(top, { thickness, baseline, origin })` — the slab under a
sampled edge, front face at local z = 0 with `origin` at the local origin;
`summit(top)`. `fatLine`/`lineMaterial`, `frameCamera`, `attachOrbit`,
`hierarchyLabels`/`basisQuaternion` unchanged. `tools/ref.js`: one additive fix,
`<meta name="color-scheme" content="light">` and `color: #000` on the ref page,
because the served origin's listing page declares `light dark` and under this
headless Chromium `currentColor` (every d3 axis) rendered white on white — the
earlier refs have no axes, so they are byte-identical.

## For three-rs

d3 modules: d3-dsv (`csvParse`) + d3-array (`autoType`, `group`, `groups`,
`extent`, `max`, `ascending`), d3-scale (`scaleTime`, `scaleLinear.nice`),
d3-shape (`line`, `curveBasis` — the uniform cubic B-spline: control points
`(2p0+p1)/3, (p0+2p1)/3, (p0+4p1+p2)/6` with the `(5p0+p1)/6` lead-in and
`lineTo(last)` lead-out), d3-time / d3-time-format for `x.ticks(11.6)` and
`x.tickFormat` (12 ticks at 12-hour steps, `%a %d` / `%I %p`). Layout: this
note's scales; the 38 summits and 50 label anchors are in `marks/d3_ridgeline.json`.
