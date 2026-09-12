## N. sunburst → sphere

| artefact | path |
| --- | --- |
| page | `examples/d3_sunburst.html` |
| screenshot | `examples/screenshots/d3_sunburst.jpg` (400×250) |
| marks | `marks/d3_sunburst.json` (0 nodes, 0 links, 251 cells) |
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
pole. Value becomes radial thickness `h = 0.2 + 6·√(value/root.value)`, growing
*inward* from the sphere `R = 10`: each cell is the closed solid between radii
`R − h` and `R`, its longitude span and its band (two spherical patches, four
walls). Result `19.16 × 16.05 × 19.95`, depth ratio 0.804. About 20 lines on top of
partition plus the ~100-line sector mesh (`src/shell.js`); full spec in
`layouts/sunburst.md`, including why the thickness grows inward and not outward
(outward towers occlude the sliver cells from every camera, so §B.10 cannot pass;
the outward render is kept at `handoff/ladder/sunburst-outward.jpg`).

**Marks:** one `Mesh` per descendant with depth > 0 (251 cells), geometry from
`shellSector()` built in local coordinates around the mark point, which is the
centre of the cell's outer face (mid-longitude, mid-colatitude, radius `R − 1e-4`)
— that point is what the marks JSON carries. Each mark carries `normal`, the unit
radial through it; the picking gate samples only cells whose normal faces the
camera. Colour: the notebook's rainbow by top-level package, mixed 40 % toward
white and opaque (the notebook's `fill-opacity 0.6` on white, baked in).
`expected = { nodes: 0, links: 0, cells: 251 }`.

**Camera:** PerspectiveCamera fov 40, elevation 35°, azimuth 150° (camera A over
longitude 300°, camera B over 210°), fitted to the mark positions at 0.85 fill.
Fixed; one frame.

**Gates:** depth 0.804 · counts 0/0, 0/0, cells 251/251 · angle 0.488 / 0.489 ·
picking 20/20 from both cameras (141 / 132 front-facing cells eligible).

**Harness change carried by this rung (`src/d33.js`):** the counts gate also
compares `cell` marks against `expected.cells` (default 0); the angle and picking
gates run on nodes *and* cells; a mark may carry `normal` and the picking gate
samples up to 20 marks per camera from those whose normal is absent or faces that
camera (`dot(normal, camera − mark) > 0`), reporting `sampledA/B` and
`eligibleA/B`; zero eligible marks for either camera fails.

**Gap:** no labels (rung 3 had not landed when this shipped; the note's Labels
section says which cells get one and how they lie). The value-as-thickness is only
visible from below or through the south-pole hole with the inward extrusion; the
outward version shows it from anywhere but fails picking.
