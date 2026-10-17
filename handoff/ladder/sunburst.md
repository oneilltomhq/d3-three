## N. sunburst, flat (planar by ruling)

| artefact | path |
| --- | --- |
| page | `examples/d3_sunburst.html` |
| screenshot | `examples/screenshots/d3_sunburst.jpg` (400×250) |
| marks | `marks/d3_sunburst.json` (0 nodes, 0 links, 251 cells, 93 labels, `planar: true`) |
| layout note | `layouts/sunburst.md` |
| reference render of the original notebook | `ref/sunburst.png` (928×938) |
| eyeball render | `handoff/ladder/sunburst-1600x1000.jpg` |

Source notebook: `d3-gallery/notebooks/hierarchies/sunburst.v2`, data
`files/flare-2.json` (252 nodes, 220 leaves, height 4, 10 top-level packages).

**d3 modules needed:** d3-hierarchy (`hierarchy`, `partition`), d3-scale
(`scaleOrdinal`), d3-interpolate (`quantize`, `interpolateRgb`),
d3-scale-chromatic (`interpolateRainbow`). `d3.arc` is not called; its padding rule
is reimplemented for the slab outline (below). The DOM half of d3 is not used.

**Class:** planar. A sphere lift was built first (angle → longitude, depth →
colatitude band, value → radial thickness) and retired by the director's ruling
after the user's eyeball: the third axis added nothing. The chart is the notebook's
disc, flat in the 3D world, orbitable and lit (`layouts/sunburst.md` keeps one
paragraph on the sphere; `src/shell.js` stays for history, unused).

**Layout:** `d3.partition().size([2π, 464])` on the value-summed, value-sorted
hierarchy, verbatim. The disc lies in the `xz` plane, `y` up, 20 units across (one
notebook px = `20/928` units); angle 0 is 12 o'clock, clockwise from above. Every
cell with depth > 0 (251; the notebook's `x1−x0 > 0.001 && y1 > y0` filter removes
none) is a thin slab: the notebook's arc outline — inner radius `y0`, outer `y1−1`,
pad angle `min((x1−x0)/2, 0.005)` at pad radius 232 applied as d3.arc applies it
(angular pad `asin(rp/r · sin(pa/2))` per radius, edge collapses to mid-angle when
the pad exceeds the span) — extruded 0.3 (1.5 % of the diameter) along `+y`.
Colour by top-level ancestor, the notebook's rainbow at fill-opacity 0.6 over white
baked into an opaque colour. Lighting: hemisphere + one directional.

**Marks:** one `Mesh` per cell (251), `kind: 'cell'`, geometry built in local
coordinates around the centre of the slab's top face at mid-angle and mid-radius
(the notebook's label point), so the mesh position is the mark; `normal: [0,1,0]`.
`expected = { nodes: 0, links: 0, cells: 251, labels: 93 }`; `pickables` = the slabs.

**Labels:** exactly the notebook's: cells with `(y0+y1)/2·(x1−x0) > 10` in notebook
units (93), via `src/labels.js` (lib3 sdf-text, Roboto). Each lies in the top plane
0.01 above its slab, centred on the mark point, baseline along the radius, em
`10·S = 0.216` units (the notebook's 10 px; 3.35 px in the 400×250 reference),
`anchorX: center`, `anchorY: middle`, fill #333, white outline 0.25. Direction: the
notebook's (outward on the right half, inward on the left), except that near 12 and 6
o'clock the baseline is turned about the face normal so it projects rightward from
camera A (10 of 93) — the same intent as the notebook's turn, seen obliquely; this
keeps `labels.js`'s up-axis mirror flip idle (it would show an up-facing label's
back). No per-frame flip. The marks dump carries `labels` with position, quaternion
and anchor.

**Camera:** PerspectiveCamera fov 40, elevation 50°, azimuth 25° (camera A on the
`+z` side, 12 o'clock at the top of the frame), fitted at 0.85 fill to every slab's
world bounding-box corners plus every label's corners. Camera B, at the same
elevation, sees the whole disc (eligible 251 / 251). Fixed; one frame.

**Gates:** depth ratio 0.000, PASS `planar by ruling` · counts 0/0, 0/0, cells
251/251 · angle 0.448 / 0.551 · picking 20/20 from both cameras (251 / 251 eligible)
· labels 93/93. `e2e:twice` 0 px.

**Harness changes carried by this rung:** `src/d3-three.js` — the counts gate compares
`cell` marks against `expected.cells` (default 0); angle and picking run on nodes
and cells, picking reports `eligibleA/B`; the labels gate honours `expected.labels`;
`register({ planar: true })` makes the depth gate pass with `note: 'planar by
ruling'` (ratio still reported) and `planar` is written into the report.
`test/e2e/puppeteer.js` — `E2E_PORT`, and `planar` copied into `marks/` and
`gates/` JSON (two lines). `tools/ref.js` — an svg sized only by `viewBox` gets
`width: 928px` (accepted).

**Gap:** the labels are the notebook's proportion, so in the 400×250 reference they
are ~3 px and only legible in the eyeball render. `expected.cells: 0` and
`planar: false` will appear in other examples' JSON when regenerated under this
harness.
