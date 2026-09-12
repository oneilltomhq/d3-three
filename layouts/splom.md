# scatterplot matrix → one 3D scatter

Source: `dots/splom.v2` (penguins.csv: 344 rows, Kristen Gorman's Palmer
Station penguins; four numeric columns `culmen_length_mm`, `culmen_depth_mm`,
`flipper_length_mm`, `body_mass_g`). 2D: a 4 × 4 matrix of cells, each a
scatter of one column against another, circles r 3.5 at fill-opacity 0.7
coloured by `species` (schemeCategory10), `#ddd` tick lines spanning the whole
matrix (`ticks(6)` per column), `#aaa` cell borders, column names in bold 10px
at the top-left of the diagonal cells.

Built as `examples/d3_splom.html`; this note is kept true to what runs.

## The lift

The matrix exists because a page cannot show three columns at once. Here the
first three columns are the three axes of one cube and the fourth is sphere
radius, so every penguin is one sphere and every off-diagonal cell of the
matrix is one face of this scatter (culmen length × culmen depth is the
back wall, culmen length × flipper length the floor, culmen depth × flipper
length the left wall). Class: 3D lift, obvious win (director ruling).

What d3 decides:
- `columns = data.columns.filter(d => typeof data[0][d] === "number")`, the
  notebook's line, so the axis order is the CSV's column order:
  x = `culmen_length_mm`, y = `culmen_depth_mm`, z = `flipper_length_mm`,
  radius = `body_mass_g`.
- One `scaleLinear` per column on `d3.extent(data, d => d[c])` exactly as the
  notebook (extent skips the NaN rows). Domains: x [32.1, 59.6],
  y [13.1, 21.5], z [172, 231], mass [2700, 6300]. Range `[0, 20]` for the
  three axes (the notebook's `rangeRound([padding/2, size − padding/2])` is a
  pixel detail; the mapping is the same linear one).
- Ticks: `scale.ticks(6)` per axis as the notebook's `axis.ticks(6)`:
  x 35 40 45 50 55 (5), y 14 … 21 (8), z 180 … 230 (6) → 19 tick labels.
- Colour: `scaleOrdinal().domain(data.map(d => d.species)).range(schemeCategory10)`
  — the notebook's own scale, so Adelie `#1f77b4`, Chinstrap `#ff7f0e`,
  Gentoo `#2ca02c` in order of first appearance.
- Rows kept: those with all four values present, `342` of 344 (the notebook
  drops a row from a cell when either of that cell's two values is NaN; a
  point of this scatter needs all four, and the two NaN rows are NaN in all
  four).

What the page adds:
- Radius: `scaleLinear` mass [2700, 6300] → [0.12, 0.3] world units; the
  median (4050 g, the notebook's r 3.5) lands at 0.1875.
- The cube is 20 × 20 × 20, so the depth gate ratio is exactly 1.

## Marks

- node: sphere `Mesh` per penguin (342), `SphereGeometry(radius(mass), 14, 10)`
  — one geometry per sphere because the radius is a datum. Colour by species
  as above; `MeshStandardNodeMaterial` with the colour as a light emissive
  (0.15), roughness 0.6, one material per species. The notebook's
  fill-opacity 0.7 is not reproduced: opaque lit spheres read their depth
  order, translucent ones would not. `expected.nodes = 342`, `links = 0`.
- helpers (not marks, not in `pickables`): `src/axes3.js` `cubeAxes` —
  three axis lines (`Line2`, `#555`, 1.5 px) on the cube's two front-bottom
  edges and its left-front vertical edge; a `LineSegments` grid (`#ddd`) at
  every tick on the three back walls (x = 0, z = 0, y = 0), 38 segments; the
  walls' three remaining outer edges in `#aaa`.
- labels: 22 = 19 tick values + 3 column names, `expected.labels = 22`. Two
  `hierarchyLabels` batches (ticks at the tick em, names at the title em)
  over the `{ descendants }` shim, composed into one `{ count, dump, update }`
  for `register`. Every label is planar (not billboarded) and anchored
  `start` with offset 0; centring and right-alignment are done in
  `cubeAxes` by measuring the text with lib3's `VectorFont`, so the per-frame
  flip in `src/labels.js` is untouched. Placement (world units, gap 0.35):
  - x ticks: in the plane z = 20 hanging under the front-bottom edge, centred
    on the tick, facing +z; the name below them centred on the edge.
  - z ticks: in the plane x = 20 under the right-bottom edge, baseline along
    −z (reads left-to-right from camera A), facing +x; the name below them.
  - y ticks: in the plane z = 20 left of the left-front vertical edge,
    right-aligned to it; the name above the edge's top, right-aligned
    (the notebook's top-left placement).
  - Em sizes: ticks 7 px and names 9 px at the target distance at 400 × 250
    (the notebook's 10 px ticks and bold 10 px names in a 928 px chart; bold is
    not in Roboto Regular, so the names are a size step up instead):
    1.042 and 1.340 world units. Roboto Regular, `#333` on a white halo 0.25.
    At 1600 × 1000 they are 28 / 36 px.
  - No label was mirror-flipped at layout time (`flipped: 0`).

### Numbers moved from the brief, and why

- **Axes on the silhouette edges, not the back-bottom edges.** Built first as
  the brief said (axes meeting at the far-bottom corner, labels hanging just
  outside). From the 25° camera the floor is see-through, so text below a
  back-bottom edge projects into the point cloud and is occluded by the
  spheres in front of it — the Gentoo cluster sat on the flipper ticks and
  the Adelie cluster on the culmen-depth ticks in the 1600 × 1000 eyeball
  render. Moved to the cube's front-bottom edges and left-front vertical
  edge, where every label projects outside the cube (the convention of every
  3D scatter tool). The grid stays on the back walls.
- fill-opacity 0.7 dropped (above).

## Camera

fov 40, **elevation 25°, azimuth 35°** (the brief's pair), fill 0.85, fitted
with `frameCamera` to the 342 sphere centres, the cube's 8 corners and the
four corners of every text block; the fit is iterated three times because
the em sizes depend on the target distance. Camera B (azimuth + 90°) sees
the x = 20 wall face-on. Angle areas 0.160 / 0.262. Picking: 342 candidates,
281 / 304 unoccluded from A / B, 20/20 hit from both (24 distinct marks
sampled). Depth ratio 1.000.

Layout determinism: `node tools/stable.js d3_splom` — two independent page
loads with no harness injection agree with each other and with
`marks/d3_splom.json`: 342/342 marks and 22/22 labels, max |Δ| 0.

## Primitives for `src/`

New: `src/axes3.js` — `cubeAxes({ axes: [{ name, scale, ticks }] × 3, side,
gap, tickSize, titleSize, measure })` → `{ group, wrappers, ids, positions,
orient, corners, count }`: the axis lines, grid and edges as one `Group`, and
the label shims for `hierarchyLabels`. Reused: `fatLine`, `lineMaterial`,
`basisQuaternion`, `frameCamera`, `attachOrbit`, `hierarchyLabels` unchanged.
No shared file edited.

## For three-rs

d3 modules: d3-dsv (`csvParse` + `autoType`), d3-array (`extent`),
d3-scale (`scaleLinear`, `ticks`, `tickFormat`, `scaleOrdinal`),
d3-scale-chromatic (`schemeCategory10`). Layout: four linear scales on the
column extents; three of them to [0, 20], the fourth to [0.12, 0.3] — three
lines of arithmetic, or the 342 positions from `marks/d3_splom.json` (sphere
radius is not in the marks JSON; recompute it from `body_mass_g`).
