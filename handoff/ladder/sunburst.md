## N. sunburst → sphere

| artefact | path |
| --- | --- |
| page | `examples/d3_sunburst.html` |
| screenshot | `examples/screenshots/d3_sunburst.jpg` (400×250) |
| marks | `marks/d3_sunburst.json` (0 nodes, 0 links, 251 cells, 79 labels) |
| layout note | `layouts/sunburst.md` |
| reference render of the original notebook | `ref/sunburst.png` (928×938) |

Source notebook: `d3-gallery/notebooks/hierarchies/sunburst.v2`, data
`files/flare-2.json` (252 nodes, 220 leaves, height 4, 10 top-level packages).

**d3 modules needed:** d3-hierarchy (`hierarchy`, `partition`), d3-scale
(`scaleOrdinal`), d3-interpolate (`quantize`, `interpolateRgb`),
d3-scale-chromatic (`interpolateRainbow`). The DOM half of d3 is not used at all;
`d3.arc` is replaced by the shell-sector mesh.

**3D layout:** the disc becomes a sphere, root at the north pole. `d3.partition()
.size([2π, 464])` on the value-summed, value-sorted hierarchy runs exactly as the
notebook does and fixes every cell's longitude span `x0..x1` (padded by
`min((x1−x0)/2, 0.005)`, half each side) and its depth. Depth `d` (1..4) becomes the
colatitude band `[150°·(d−1)/4, 150°·d/4 − 0.4°]`, leaving a hole at the south
pole. Value becomes radial thickness `h = 0.05 + 1.5·√(value/root.value)`, growing
*inward* from the sphere `R = 10`: each cell is the closed solid between radii
`R − h` and `R`, its longitude span and its band (two spherical patches, four
walls). Result `19.16 × 16.05 × 19.95`, depth ratio 0.804. About 20 lines on top of
partition plus the ~100-line sector mesh (`src/shell.js`); full spec in
`layouts/sunburst.md`, including why the thickness grows inward and not outward:
a 180-camera picking sweep (elevation 20–45°, azimuth 0–87°) passes 0/180 outward at
the shallow cap (mean 16.6 of 20 hits; 12.6 at the draft's deep cap) and 180/180
inward, because slivers hide behind taller neighbours' walls from any oblique view.
The outward render (deep cap) is kept at `handoff/ladder/sunburst-outward.jpg`.

**Marks:** one `Mesh` per descendant with depth > 0 (251 cells), geometry from
`shellSector()` built in local coordinates around the mark point, which is the
centre of the cell's outer face (mid-longitude, mid-colatitude, radius `R − 1e-4`)
— that point is what the marks JSON carries. Each mark carries `normal`, the unit
radial through it; the picking gate samples only cells whose normal faces the
camera. Colour: the notebook's rainbow by top-level package, mixed 40 % toward
white and opaque (the notebook's `fill-opacity 0.6` on white, baked in).
`expected = { nodes: 0, links: 0, cells: 251 }`.

**Labels:** candidates are the notebook's subset, cells with `(y0+y1)/2·(x1−x0) > 10`
in notebook units (93 of 251); 79 placed, via `src/labels.js` (lib3 sdf-text, Roboto).
Each lies in the tangent plane of its outer face, centred on the mark point lifted 0.02
along the normal, baseline along the meridian (the notebook's radial text), the
direction chosen so it projects rightward from camera A (the notebook's
`rotate(x<180?0:180)`), `anchorX: center`, fill #333, white outline 0.25. Em per label
= min(8 px at 250 px, 0.7 × the cell's longitude chord across the baseline, the em at
which the string spans 0.55 × the band's arc along it); under 2 px the label is
dropped (14 deep slivers). Em range 2.1–8.0 px. `expected.labels = 79`; the marks
dump carries `labels` with position, quaternion and anchor. Eyeball render
`handoff/ladder/sunburst-1600x1000.jpg`.

**Camera:** PerspectiveCamera fov 40, elevation 35°, azimuth 150° (camera A over
longitude 300°, camera B over 210°), fitted at 0.85 fill to every cell's world
bounding-box corners plus every label's corners (nothing touches the frame edge).
Fixed; one frame.

**Gates:** depth 0.804 · counts 0/0, 0/0, cells 251/251 · angle 0.302 / 0.310 ·
picking 20/20 from both cameras (144 / 135 front-facing cells eligible) · labels
79/79. `e2e:twice` 0 px.

**Harness change carried by this rung (`src/d33.js`):** the counts gate also
compares `cell` marks against `expected.cells` (default 0); the angle and picking
gates run on nodes *and* cells; the picking gate reports `eligibleA/B` next to
rung 3's `sampledA/B`; the labels gate compares against `expected.labels` when the
page gives it (a cell layout labels only the cells the notebook labels), else
against the node count as before. Also `tools/ref.js` (outside the two allowed
exceptions, flagged): an svg sized only by `viewBox` gets `width: 928px` so the
notebook's `autoBox` chart has a size to screenshot.

**Gap:** the value-as-thickness is only visible from below or through the
south-pole hole with the inward extrusion; the outward version shows it from anywhere
but fails picking (sweep above). 14 of the notebook's 93 label candidates are dropped
as under 2 px. `expected.cells: 0` will appear in other examples'
marks JSON when they are regenerated under this `d33.js`.
