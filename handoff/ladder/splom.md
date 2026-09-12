## N. scatterplot matrix → one 3D scatter

| artefact | path |
| --- | --- |
| page | `examples/d3_splom.html` |
| screenshot | `examples/screenshots/d3_splom.jpg` (400×250) |
| eyeball render | `handoff/ladder/splom-1600x1000.png` |
| marks | `marks/d3_splom.json` (342 nodes, 0 links, 22 labels) |
| layout note | `layouts/splom.md` |
| reference render of the original notebook | `ref/splom.png` (928×928) |

Source notebook: `d3-gallery/notebooks/dots/splom.v2`, data `files/penguins.csv`
(344 rows, `csvParse` with `autoType` as the notebook's `csv({typed: true})`;
four numeric columns `culmen_length_mm`, `culmen_depth_mm`, `flipper_length_mm`,
`body_mass_g`). Class: 3D lift, obvious win — the matrix draws every pair
because a page cannot show three columns at once.

**d3 modules needed:** d3-dsv (`csvParse`, `autoType`), d3-array (`extent`),
d3-scale (`scaleLinear` with `ticks(6)` and `tickFormat`, `scaleOrdinal`),
d3-scale-chromatic (`schemeCategory10`). No DOM half.

**3D layout:** the notebook's `columns` (numeric columns of the first row, CSV
order) become x = culmen length, y = culmen depth, z = flipper length, radius =
body mass. One `scaleLinear` per column on `d3.extent(data)` exactly as the
notebook (domains [32.1, 59.6], [13.1, 21.5], [172, 231], [2700, 6300]); the
three axes range `[0, 20]`, the radius `[0.12, 0.3]` world units (median
4050 g → 0.1875, the notebook's r 3.5). Rows kept: all four values present,
342 of 344. Every off-diagonal cell of the matrix is one face of this cube.
Full spec in `layouts/splom.md`; three-rs ports four linear scales or reads the
342 positions from the marks JSON (recompute the radius from `body_mass_g`).

**Marks:** one `Mesh(SphereGeometry(radius(mass), 14, 10))` per penguin, one
geometry each because the radius is a datum; colour from the notebook's own
`scaleOrdinal(data.map(d => d.species), schemeCategory10)` (Adelie blue,
Chinstrap orange, Gentoo green), `MeshStandardNodeMaterial` with a light
emissive (0.15) in place of the notebook's fill-opacity 0.7. `expected.nodes =
342`, `links = 0`. Axes, grid and edges are helpers, never marks and never
pickable.

**Axes (new primitive `src/axes3.js`, `cubeAxes`):** three `Line2` axis lines
(`#555`, 1.5 px) on the cube's two front-bottom edges and its left-front
vertical edge; a `LineSegments` grid (`#ddd`, the notebook's tick lines) at
every `ticks(6)` value on the three back walls; the walls' remaining outer
edges in the notebook's `#aaa`. The brief named the back-bottom edges: built
that way first, the tick text projected into the point cloud from the 25°
camera (the floor is see-through) and was occluded by the spheres; the
silhouette edges put every label outside the cube. Recorded in the layout note.

**Labels (rung 3):** 22 = 19 tick values (x 5, y 8, z 6) + 3 column names;
`expected.labels = 22`. lib3 `sdf-text` via `src/labels.js` unchanged, Roboto
Regular, `#333` on a white halo 0.25, two batches (ticks 7 px, names 9 px at
the target distance at 400×250 → 1.042 / 1.340 world units; 28 / 36 px in the
eyeball render) composed into one `{ count, dump, update }`. Planar, not
billboarded: x ticks and the y axis in the plane z = 20, z ticks in the plane
x = 20 with the baseline along −z so they read left-to-right from camera A;
centred / right-aligned by measuring the text with `VectorFont`, anchor
`start`, offset 0, so the per-frame flip works as on every page. `flipped: 0`
at layout time. Quaternions per label in `marks/d3_splom.json` `labels[].q`.

**Camera:** PerspectiveCamera fov 40, elevation 25°, azimuth 35°, fill 0.85,
fitted to the sphere centres, the cube corners and every text block's corners
(three iterations, the em depends on the distance). Fixed; one frame.

**Gates:** depth 1.000 (20 × 20 × 20) · counts 342/342, 0/0 · angle 0.160 /
0.262 · picking 20/20 from both cameras (24 distinct sampled; 281 / 304 of 342
unoccluded from A / B) · labels 22/22.

**Determinism, proven twice.** `e2e:twice` is 0 px (both raw PNGs sha256
`0907e6fe…7a84`). `node tools/stable.js d3_splom`: two independent page loads
with no harness injection agree with each other and with `marks/d3_splom.json`,
342/342 marks and 22/22 labels, max |Δ| 0.

**Shared-file changes on this branch:** none in `src/` (existing files),
`test/e2e/`, `tools/` or `package.json`. Added `src/axes3.js`.

**Gap:** the notebook's fill-opacity 0.7 is not reproduced (opaque spheres);
the notebook's `swatches` legend cell is not lifted (the species colours are
named in the layout note); the diagonal cells' identity plots have no
counterpart. From camera A the x = 20 wall is at 31° to the view, so the
flipper-length ticks are the most foreshortened text on the page; they are
legible at 1600×1000 and clearer as soon as the orbit turns toward +x.
