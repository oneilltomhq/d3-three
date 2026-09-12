## N. radial stacked bar chart → stacks lifted upward

| artefact | path |
| --- | --- |
| page | `examples/d3_radial-bars.html` |
| screenshot | `examples/screenshots/d3_radial-bars.jpg` (400×250) |
| marks | `marks/d3_radial-bars.json` (0 nodes, 0 links, 357 cells, 66 labels, `planar: false`) |
| layout note | `layouts/radial-bars.md` |
| reference render of the original notebook | `ref/radial-bars.png` (928×928) |
| eyeball render | `handoff/ladder/radial-bars-1600x1000.png` |

Source notebook: `d3-gallery/notebooks/radial/radial-stacked-bar-chart.v3`, data
`files/data-2.csv` (51 rows incl. DC: `State`, then 7 age-group columns), flattened
as the notebook does to `{ state, age, population }` × 357.

**d3 modules needed:** d3-dsv (`csvParse`, `autoType`), d3-array (`union`, `index`,
`groupSort`, `sum`, `max`), d3-shape (`stack`; the `arc` pad rule is re-implemented
in `src/sector.js`), d3-scale (`scaleBand`, `scaleRadial`, `scaleOrdinal`, `ticks`,
`tickFormat(5, "s")`), d3-scale-chromatic (`schemeSpectral[7]`).

**3D layout:** the notebook's stack, band scale and radial (sqrt) scale unchanged;
the lift is that stacking runs up instead of outward. Every (state, age group) is
the same annular sector in plan — inner radius `R_IN = 180·S = 2.895`, outer
`R_OUT = 10` (`S = 10/621.76` per notebook px; the outer circle is a 20-unit
diameter), the state's band of 2π/51 with the notebook's pad `1.5/180` at
padRadius `R_IN` — extruded from `h(d[0])` to `h(d[1])` where
`h(v) = (y(v) − 180)·S`, max 7.105. Angle 0 (CA, the largest) is 12 o'clock =
world −z, clockwise from above. Mark-position extents `12.889 × 7.091 × 12.883`,
depth ratio 0.550. Full spec in `layouts/radial-bars.md`; three-rs ports the
stack + scales (a few lines) or reads the 357 top-face centres from the marks JSON.

**Marks:** one `Mesh(sectorPrism)` per (age group, state), 357, join order series
outer / state inner (CSV order within a series). `src/sector.js` (new): the d3.arc
outline (2° arc steps, linear pad) as an `ExtrudeGeometry` along +y, built in
local coordinates around the top-face centre (mid-angle, mid-radius 6.448,
`y = h(d[1])`) so the mesh's world position is its own top pixel; `normal
[0, 1, 0]`. `MeshStandardNodeMaterial`, `schemeSpectral[7]` by age group, one
material per key. Not marks: 7 grid rings (`THREE.Line` loops, radius
`R_OUT + 0.15`, height `h(tick)` for 5M…35M, black 0.5) plus a vertical axis line;
the notebook's colour legend as 7 thin boxes flat in the hole, shifted −1.0 in z
toward the far wall (from 35° the near wall hides the hole's near half).

**Camera:** PerspectiveCamera fov 40, elevation 35°, azimuth 25°, fill 0.85,
fitted to prism corners + ring samples + label block corners. Camera A on +z, so
12 o'clock is the far side and the chart reads clockwise as in the notebook.

**Gates:** depth 0.550 · counts 357/357 cells · angle 0.234 / 0.185 · picking
20/20 from both cameras (357 candidates, 49 / 39 visible after the harness's
occlusion pre-pass — a lower segment's top is the next one's floor, and the far
side's tall stacks hide near-side short ones, as the brief warned; no elevation
change was needed) · labels 66/66. `e2e:twice` 0 px (both raw PNGs sha256
`3f9f9171…d163`).

**Labels (66, one `hierarchyLabels` batch over a `{ descendants }` shim; lib3
`sdf-text`, Roboto Regular, `#222`, halo 0.25; font 12 px · 20/928 = 0.259 units —
the notebook's 10 px was 4 px on the far side from 35°):**
51 state codes flat outside the rim at the band's mid-angle (radius 10.25),
**lifted to the state's stack-top height** (on the ground they were behind the far
side's 7-unit walls), baseline radial, reading outward on the right half and
inward on the left (the notebook's upright rule), anchored at the rim end
(start / end) so text extends outward; 7 tick values + "Population" as an upright
column (vertical plane facing camera A, fixed, not billboarded) at the rings' edge
35° left of camera A's front point, text 6 px right of the axis line; 7 legend
names flat beside their squares. Per-frame `labels.update(camera)`. Every label's
anchor, quaternion and anchorX in `marks/d3_radial-bars.json` `labels[]`.

**Numbers moved from the brief, and why:** state labels at stack-top height, not
on the ground (hidden by walls); tick labels upright at the front, 35° off centre,
not flat at the front edge (flat there they read as painted on the disc top;
dead ahead they rose over the legend; at the notebook's 12 o'clock they were
4 px); font 12 px not 10 (far-side legibility). Camera as the brief.

**Shared-file changes on this branch:** none in `src/` (existing files),
`test/e2e/`, `tools/`, or `package.json`. New: `src/sector.js`.

**Gap:** far-side state labels (CA … FL) are ~6 px in the 1600×1000 eyeball
render — flat text at the far side of a 20-unit disc from 35° elevation; legible
on orbit. The notebook's `<title>` tooltips are not lifted. The blue "65 and
over" tops dominate the plan view because the sqrt scale makes the topmost
segments the thinnest, so the side walls carry the age breakdown.
