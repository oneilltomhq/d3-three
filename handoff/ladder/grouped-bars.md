## N. grouped bar chart → bar matrix (state × age × population)

| artefact | path |
| --- | --- |
| page | `examples/d3_grouped-bars.html` |
| screenshot | `examples/screenshots/d3_grouped-bars.jpg` (400×250) |
| marks | `marks/d3_grouped-bars.json` (0 nodes, 0 links, 54 cells, 28 labels) |
| layout note | `layouts/grouped-bars.md` |
| reference render of the original notebook | `ref/grouped-bars.png` (928×600) |
| eyeball render | `handoff/ladder/grouped-bars-1600x1000.png` |

Source notebook: `d3-gallery/notebooks/bars/grouped-bar-chart.v2`, data
`files/us-population-state-age.csv` (52 states × 9 age columns). The notebook's
`data` cell: `csvParse` with `autoType`, sort states by total population
descending, keep 6, flatten age-major to 54 `{ state, age, population }` rows.

**d3 modules needed:** d3-dsv (`csvParse`), d3-array (`autoType`, `sort`, `sum`,
`max`), d3-scale (`scaleBand` ×3 with `rangeRound`/`paddingInner`/`padding`,
`scaleLinear().nice()`, `ticks`, `tickFormat(null, "s")`, `scaleOrdinal`),
d3-scale-chromatic (`schemeSpectral[9]`), d3-format. The DOM half (selection,
axis rendering) is not used.

**3D layout:** the notebook's outer band `fx` is x (state; domain CA, TX, FL,
NY, IL, PA; `rangeRound([40, 918])`, `paddingInner 0.1`; bandwidth 133 px,
step 148 px; world `x = px · 20/928`). The inner age band is lifted to z: same
domain (`<10 … ≥80`) and padding (0.05) but a range of `133/0.95 · 9.05 = 1267
px` so its bandwidth is also 133 px — every bar square in plan, 2.866 × 2.866
world units — and `z = px · S − 27.306` (first age at the far edge, last at
the near edge, so the rows ascend away from the camera). y is the notebook's
linear scale verbatim (`[0, 6.0M]` after `nice`, `rangeRound([580, 10])`),
bar height `(y(0) − y(pop)) · S` (6.0M = 12.284 units). Extents of the bar-top
centres `15.948 × 10.905 × 24.138`, depth ratio 0.452. Full spec in
`layouts/grouped-bars.md`.

**Marks:** one `Mesh(BoxGeometry)` per row (54), one shared unit box scaled
per bar, origin at the top-face centre, `normal = [0, 1, 0]`; colour per age
from `schemeSpectral[9]`, opaque `MeshStandardNodeMaterial`. Ids `c0 … c53` in
the notebook's data order. Thirteen 1 px `Line2` ticks (not marks) for the y
axis.

**Camera:** PerspectiveCamera fov 35, elevation 30°, azimuth 35° (the brief's
pair), fill 0.85, fitted to the bar box plus every label's far corners.
Distance 51.1, target (9.26, 3.45, −11.02). From A 52 of 54 bar tops are
unoccluded (the two clipped centres are each the second-tallest bar directly
behind its column's tallest, by < 0.2 units); camera B (back-right) also sees
52. Fixed; one frame.

**Gates:** depth 0.452 · counts 0/0 nodes, 0/0 links, 54/54 cells · angle
0.343 / 0.373 · picking 20/20 from both cameras (sampled 21; visibility
pre-pass excluded 2 from each) · labels 28/28 (page-supplied
`expected.labels`) · twice 0 px (both raw PNGs sha256 `b9691d80…c51a`).

**Labels (rung 3):** lib3 `sdf-text` via `src/labels.js` on a `{ descendants }`
shim, Roboto Regular, black on a white halo 0.2, `fontSize = 0.774` world
units (6 px at the target distance at 400×250; ~24 px at 1600×1000). Three
sets, 28 in all: the 6 state abbreviations (the notebook's `axisBottom(fx)`)
lying flat in front of their columns, centred, 9 px (`tickSize + tickPadding`)
beyond the near edge; the 9 age groups lying flat to the right of their rows,
anchor start 9 px beyond the plot area; the 13 tick values (`axisLeft(y)
.ticks(null, "s")`: `0.0M … 6.0M`) standing in the front plane `z = 0`,
anchor end 9 px left of the axis line `x = 0.862`, beside a 6 px tick line.
Per-frame in-plane flip; 0 flipped at camera A. `marks/d3_grouped-bars.json`
`labels[]` carries `{ id, text, x, y, z, q, anchorX }`, ids `x CA`, `z <10`,
`y 0.0M`.

**Changes from the brief, and why:** (1) the y axis sits on the **front-left**
edge (the notebook's picture plane), not the back-left: from the front-right
camera the back-left edge is behind the tallest column (CA), which hides every
tick label below ~4M; from the front-left instead (azimuth −35°) the CA column
hides 16 of 54 bar tops. (2) Age labels are on the **right** side, the side the
camera sees. (3) The z band's range is chosen so its bandwidth equals the
state bandwidth (bars square in plan) rather than dividing the state band.

**Shared-file changes on this branch:** none in `src/` or `test/e2e/`.
`tools/ref.js`: `html, body { color: #000 }` added — headless Chromium on this
desktop inherits a dark colour scheme, so `fill: currentColor` (every d3.axis
label and tick) rendered white on white and the reference had no axes;
byte-identical for notebooks that do not use `currentColor`.

**Gaps:** the notebook's `<title>` tooltips (formatted value per bar) and the
colour legend (`key` cell, a separate Observable import) are not reproduced.
At 400×250 the 6 px labels are foreshortened to a few pixels (they read at
1600×1000). Two bar-top centres are clipped by a hair from camera A (above);
elevation 35° / azimuth 45° clears them but squashes the front-plane tick
labels, so the brief's 30°/35° was kept.
