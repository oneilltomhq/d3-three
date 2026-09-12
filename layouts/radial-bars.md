# radial stacked bar chart → stacks lifted upward

Source: `radial/radial-stacked-bar-chart.v3` (data-2.csv: 51 states incl. DC × 7
age groups = 357 values). 2D: `d3.stack` keyed by age over `d3.index(data, state,
age)`; states on a `scaleBand` around 2π (sorted by −total, `align(0)`); a
`scaleRadial` (sqrt of the linear map) from innerRadius 180 to outerRadius
0.67·928 = 621.76 px so each age-group segment is an annular sector whose inner
and outer radii are `y(d[0])`, `y(d[1])`; `schemeSpectral[7]`; grid circles at
`y.ticks(10).slice(1)` (5M … 35M) with tick text at 12 o'clock, "Population" above;
state codes tangential just inside the inner radius; a colour legend in the hole.

Built as `examples/d3_radial-bars.html`; this note is kept true to what runs.

## The lift

The stacking goes **up** instead of outward. Every (state, age group) is the same
annular sector in plan — inner radius `R_IN`, outer radius `R_OUT`, the state's
band — and the notebook's radial scale is reinterpreted as height:

- `S = 10 / 621.76` world units per notebook px (the outer circle is a 20-unit
  diameter). `R_OUT = 10`, `R_IN = 180·S = 2.895`.
- `h(v) = (y(v) − 180)·S` with `y` the notebook's `scaleRadial` unchanged
  (domain `[0, max stack top]` = [0, 37.25M], range `[180, 621.76]`), so a segment
  is a prism from `h(d[0])` to `h(d[1])`. Max height `h(37.25M) = 7.105`. The sqrt
  keeps the notebook's area proportionality as a *volume* proportionality (same
  footprint per state, height ∝ y): the bottom segments are the tallest and the
  chart is a spiral staircase descending clockwise from CA at 12 o'clock.
- angles: the notebook's `x(state)`, `x.bandwidth()` = 2π/51 around the circle,
  angle 0 at 12 o'clock (world −z) clockwise seen from above (notebook
  `(x, y) = (r sin a, −r cos a)` → world `(x, z)`); pad `1.5/180` rad at
  padRadius 180 px (= `R_IN`) applied as d3.arc applies it — at each radius the
  angular pad is `asin(padRadius / r · sin(pad/2))`; so all 357 prisms share
  the same pad geometry.
- what d3 decides: the stack (`d[0]`, `d[1]`), the state order and angles, the
  radial scale, the ticks (`y.ticks(10).slice(1)` = 5M…35M, `tickFormat(5, "s")`),
  the colours. What the page adds: the two radii, `h`, the ring/label placement.

Extents of mark positions `12.889 × 7.091 × 12.883`; depth ratio **0.550**.
(Mark positions are top-face centres at mid-radius 6.448, hence the xz extents;
the geometry spans the full 20 units.)

## Marks

- cell: one `Mesh(sectorPrism)` per (age group, state) (357), in the notebook's
  join order (series outer, state inner; `d3.index` keeps CSV order: AL, AK, AZ, …).
  `src/sector.js`: the d3.arc outline (2°-step arcs) extruded along +y, built
  in local coordinates around the **top-face centre** (mid-angle, mid-radius,
  `y = h(d[1])`), which is the mesh's world position — the pixel the picking gate
  raycasts. `normal = [0, 1, 0]`. Material `MeshStandardNodeMaterial`
  `schemeSpectral[7]` by age key (one per key), roughness 0.7; hemisphere 2.2 +
  directional 1.6. `expected = { cells: 7 × 51 = 357, labels: 66 }`.
- rings (not marks): the notebook's grid circles as thin `THREE.Line` loops
  (180 segments) at radius `R_OUT + 0.15` and height `h(tick)` for the 7 ticks;
  `LineBasicNodeMaterial` black, opacity 0.5. Plus one vertical axis line under
  the tick column, ground to the top ring.
- legend (not marks): the notebook's 18 px squares as thin boxes (`18·FONT_S`
  square, 0.02 thick) flat in the hole at the notebook's `translate(−40,
  (n/2 − i − 1)·20)`, shifted `LEGEND_Z = −1.0` toward the far wall because from
  35° the near inner wall hides the hole's near half.

## Labels (66, one `hierarchyLabels` batch over a `{ descendants }` shim)

`FONT_S = 20/928` (the notebook's frame as 20 units); font **12 px · FONT_S =
0.259** units — the notebook's 10 px (0.216) was 4 px on the far side of the disc
from 35°, so +20 %. Roboto Regular, `#222`, white halo 0.25.

- 51 states: outside the outer rim at the band's mid-angle, radius `R_OUT + 0.25`,
  **at the height of that state's stack top** (`h` of the last series' `d[1]`),
  flat (face up), baseline radial, reading outward on the right half and inward
  on the left half (`am ≥ π` negates the baseline: the notebook's rule that text
  stays upright), anchor `start` at the rim when reading outward and `end` when
  reading inward, so the text always extends outward. A camera-A projection check
  turns the baseline in-plane where the rule and "projects rightward" disagree
  (7 turned near 12/6 o'clock), so labels.js's mirror flip has nothing to do
  (`flipped 0`). Labels on the ground were behind the far side's 7-unit walls
  (CA, TX, NY, UT, KS invisible), hence the lift to the stack top.
- 7 tick values + "Population": an upright column (vertical plane facing camera
  A, fixed at layout time, not billboarded) at the rings' edge `AXIS_OFFSET = 35°`
  left of camera A's front point, each at `h(tick)`, text 6 px right of the axis
  line, anchor start; the title 1 em above the top ring. Tried flat at the front
  edge (read as painted on the disc top behind) and flat at the notebook's
  12 o'clock beside CA (4 px from the far side); dead ahead, the column rose over
  the legend; to the left of the line, 5M sat on the OK label.
- 7 legend names: flat beside their squares, baseline +x, anchor start, at the
  notebook's x 24, y 9.

Per frame `labels.update(camera)` (labels.js's four-pose flip) keeps every label
reading left-to-right and upright from any orbit.

## Camera

fov 40, **elevation 35°, azimuth 25°**, fill 0.85, fitted to every prism's
bounding-box corners, ring samples and every label's block corners (two passes:
before and after the labels exist). Azimuth 25 puts camera A on +z: the
notebook's 12 o'clock (CA) is the far side, 3 o'clock is screen right, so the
chart reads as the notebook, clockwise. Camera B (+90° about up) looks from +x.
Angle areas 0.234 / 0.185.

Picking: 357 candidates; the harness's visibility pre-pass leaves 49 (A) / 39 (B)
visible top-face centres (every lower segment's top is the next segment's floor,
and the far side's tall stacks hide near-side short ones — exactly as the brief
warned); 20/20 hit from both cameras, no elevation change needed.

## Primitives for `src/`

New file `src/sector.js`: `sectorPrism(arc, height, centre?)` (d3.arc outline
with the linear pad, extruded along +y, local origin at the top-face centre),
`sectorTopCentre(arc, height)`, `polar(angle, radius, y)`. The sunburst's inline
`sectorSlab` is the same shape with a fixed thickness. No shared file changed.

## For three-rs

d3 modules: d3-array (`union`, `index`, `groupSort`, `sum`, `max`), d3-shape
(`stack`; `arc`'s pad rule re-implemented in `src/sector.js`), d3-scale
(`scaleBand`, `scaleRadial`, `scaleOrdinal`, `ticks`, `tickFormat`),
d3-scale-chromatic (`schemeSpectral[7]`), d3-dsv (`csvParse`, `autoType`).
Layout: the notebook's stack and scales unchanged; the lift is `h(v) =
(y(v) − 180)·10/621.76` and the shared sector footprint; or read the 357
top-face centres and 66 label poses from `marks/d3_radial-bars.json`.
