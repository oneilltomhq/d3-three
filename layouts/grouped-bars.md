# grouped bar chart → bar matrix (state × age × population)

Source: `bars/grouped-bar-chart.v2` (us-population-state-age.csv: 52 rows × 9
age columns; the notebook's `data` cell keeps the 6 most populous states and
flattens them to 54 `{ state, age, population }` rows, age-major). 2D: an outer
band `fx` per state (`rangeRound([40, 918]).paddingInner(0.1)`), an inner band
`x` per age inside it (`rangeRound([0, fx.bandwidth()]).padding(0.05)`), a
linear `y` (`[0, max].nice()` → `rangeRound([580, 10])`), one rect per row
coloured by age with `schemeSpectral[9]`; `axisBottom(fx)` and
`axisLeft(y).ticks(null, "s")`, both with the domain line removed.

Built as `examples/d3_grouped-bars.html`; this note is kept true to what runs.

## The lift: the inner band becomes the depth axis

The class is "3D lift, obvious win": the grouped chart is a two-key table
(state, age) drawn one-dimensionally. In 3D each key gets its own axis and the
54 bars form a matrix.

- **x = state.** The notebook's `fx` verbatim: domain in the notebook's order
  (CA, TX, FL, NY, IL, PA — its `d3.sort` by total, top 6), `rangeRound([40,
  918])`, `paddingInner(0.1)`; bandwidth 133 px, step 148 px. World `x = px ·
  S`, `S = 20/928 = 0.02155`, so the notebook's 928 px width is 20 world units
  and the plot area runs `x ∈ [0.86, 19.78]`. Bars 2.866 wide, 3.190 apart.
- **z = age.** A `scaleBand` with the inner band's domain (the notebook's
  column order `<10 … ≥80`) and padding (0.05), but with a range chosen so
  its bandwidth equals `fx.bandwidth()` — `range = 133 / 0.95 · 9.05 = 1267
  px` — so every bar is **square in plan** (2.866 × 2.866) and the notebook's
  gap proportions hold in both directions (10 % between states, 5 % between
  ages). World `z = px · S − DEPTH`, `DEPTH = 27.306`: the first age (`<10`)
  is the far row at `z ≈ −25.7`, the last (`≥80`) the near row at `z ≈ −1.6`.
  Old ages are small, so the rows ascend away from the camera and no row
  hides the one behind it. Row step 3.017.
- **y = population.** The notebook's `y` verbatim (domain `[0, 6 000 000]`
  after `nice()`, `rangeRound([580, 10])`); bar height `(y(0) − y(pop)) · S`,
  so 6.0M is 12.284 world units and the CA 20-29 bar (5 809 455) is 11.89.
- Colour per age as the notebook (`scaleOrdinal(ages, schemeSpectral[9])`),
  opaque `MeshStandardNodeMaterial` (roughness 0.8), one material per age.
  Hemisphere light 2.0 + directional 1.6 from (1.2, 2, 1).

Nothing else is added: no ground plane, no grid, no domain line (the notebook
removes both `.domain`s).

Extents of the mark positions (bar-top centres): **15.948 × 10.905 × 24.138**,
depth ratio **0.452**.

## Marks

- cell: one `Mesh(BoxGeometry)` per data row (54). One shared unit box
  translated to hang below its origin, scaled to `(2.866, height, 2.866)` and
  placed at the **top-face centre**, so `getWorldPosition` is the bar's own
  top — the point the picking gate raycasts. `normal = [0, 1, 0]` on every
  mark. Mark ids `c0 … c53` in the notebook's data order (age-major: all six
  states for `<10`, then `10-19`, …). `expected = { nodes: 0, links: 0,
  cells: 54, labels: 28 }`.
- Verified in the page (`window.__grouped`, world boxes read back from the
  meshes): every bar's footprint is `[fx(state), fx(state)+133] · S` ×
  `[z(age), z(age)+133] · S − DEPTH`, bottoms at `y = 0`; the top-face centre
  of every bar is raycast from camera A and camera B (own-mesh-first test):
  A sees 52/54, B sees 52/54. The two A misses are `CA 10-19` and `NY 10-19`
  — the second-tallest bar of a column directly behind its tallest
  (`20-29`), whose exact centre point is clipped by the front bar's top edge
  by < 0.2 world units; the faces themselves are visible in the render. The
  gate's visibility pre-pass excludes those two from the sample; 20/20 hit
  from each camera.

## Axes and labels

Three label sets, all through one `hierarchyLabels` call on a
`{ descendants }` shim (one `{ data: { name } }` wrapper per label; wrappers
for right-aligned labels carry `children: []` so the primitive anchors them
`end`); `leafOffset = internalOffset = 0`, so each anchor point is the text's
own edge. `expected.labels = 6 + 9 + 13 = 28`. Roboto Regular, black on a
white halo 0.2; `fontSize = 6 px / pxPerUnit` at the target distance at
400×250 = **0.774** world units (7.75 px/unit; ~24 px at 1600×1000).

- **x axis (states), 6.** The notebook's `axisBottom(fx)` labels: the state
  abbreviation lying flat on the ground (`basisQuaternion((1,0,0),
  (0,0,−1))`: baseline +x, up −z, faces +y) in front of its column, centred
  on the column (`anchor start` at `cx − width/2`, width measured from the
  TTF via lib3 `VectorFont`), 9 px (`tickSize 6 + tickPadding 3`, the
  d3.axis defaults, `· S`) beyond the near edge plus half an em.
- **z axis (ages), 9.** The age group lying flat on the ground to the
  **right** of its row, `anchor start` 9 px beyond the plot area's right edge
  (`x = 19.78 + 0.19`), centred on the row. The brief said "along the side";
  the right side is the one camera A sees — the left side is behind the
  bars from a front-right camera.
- **y axis (ticks), 13.** `y.ticks(null)` formatted with `y.tickFormat(null,
  "s")` (`0.0M … 6.0M`, as `axisLeft(y).ticks(null, "s")`): each a thin fat
  line (`Line2`, 1 px, black) 6 px long pointing left from the axis line
  `x = 40 · S = 0.862` at the tick height, in the **front plane `z = 0`**, and
  its label standing in that plane (baseline +x, up +y, faces +z), `anchor
  end` 9 px before the axis line. The brief placed these on the back-left
  edge; from the front-right camera that edge is behind the tallest column
  (CA), which hides every tick label below ~4M. The front plane is the
  notebook's own picture plane — its axis is on the left of that plane — and
  nothing can stand between it and the camera, so the axis moved there
  (recorded as a change from the brief).
- Not billboarded; per-frame `labels.update(camera)` re-turns a label in its
  own plane if the orbit goes round the back. Layout-time mirror check
  flipped 0 of 28. Dumped to `marks/d3_grouped-bars.json` `labels[]` as
  `{ id, text, x, y, z, q, anchorX }` with ids `x CA`, `z <10`, `y 0.0M`.

## Camera

PerspectiveCamera fov 35, **elevation 30°, azimuth 35°** (the brief's pair),
fill 0.85, fitted by `frameCamera` to the bar box `[0.86, 19.78] × [0,
12.28] × [−27.3, 0]` plus the far corners of every label (three fit rounds,
since the em depends on the distance). Distance 51.1, target (9.26, 3.45,
−11.02). The camera is at +x +z: states read left to right, the near row is
at the bottom of the frame, the front-left corner nearest — as the notebook
reads, with the age groups receding into depth.

Camera B (rotated 90° about up) looks from the back-right: angle areas
0.343 / 0.373; 52 of 54 tops visible from B (`TX 70-79`, `TX ≥80` sit behind
taller rows from that side), 20/20 sampled hit.

Tried and not kept: azimuth −35° (camera front-left, so the back-left y axis
of the brief is visible) hides 16 of 54 bar tops — the tallest column, CA,
is then nearest the camera and covers the states behind it. Elevation 35° /
azimuth 45° clears every top from A (0 hidden) but squashes the front-plane
tick labels to near illegibility; the brief's 30°/35° with two centres
clipped by a hair reads better and was kept.

## Primitives for `src/`

Nothing new: `BoxGeometry`, `fatLine`/`lineMaterial` (src/link.js) for the
ticks, `frameCamera`, `attachOrbit`, `hierarchyLabels`/`basisQuaternion`,
lib3 `VectorFont` for measuring. `tools/ref.js`: `html, body` now sets
`color: #000` explicitly — headless Chromium on this desktop inherits a dark
colour scheme, so every d3.axis label and tick (`fill: currentColor`) rendered
white on white and `ref/grouped-bars.png` had no axes. Additive to every
notebook that uses `currentColor`; byte-identical for the ones that do not.

## For three-rs

d3 modules: d3-dsv (`csvParse`) + d3-array (`autoType`, `sort`, `sum`, `max`),
d3-scale (`scaleBand`, `scaleLinear` with `nice`, `ticks`, `tickFormat`,
`scaleOrdinal`), d3-scale-chromatic (`schemeSpectral`), d3-format (the `"s"`
tick format). Layout: three band/linear scales as above; every bar box is
`[fx(s), fx(s)+133]·S × [0, (580 − y(p))·S] × [z(a), z(a)+133]·S − 27.306`.
Positions, colours by age, and the 28 label anchors/quaternions are in
`marks/d3_grouped-bars.json`.
