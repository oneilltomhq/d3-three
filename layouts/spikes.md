# spike map → the map flat, every spike standing up

Source: `dots/spike-map.v2` (US county population, 2016 ACS). Data:
`files/counties-albers-10m.json` (TopoJSON US Atlas, pre-projected AlbersUSA,
975 × 610 px: 3142 counties, 51 states, the nation) and `files/population.json`
(2910 rows after the header: `[population, state fips, county fips]`). 2D: one
flat triangular `path` per county with a population figure, `M−3.5,0 L0,−h L3.5,0`
(base 7 px), `h = scaleLinear([0, max], [0, 200])(population)`, red at
`fill-opacity 0.5` with a red 0.5 px stroke, at `d3.geoPath().centroid(county)`;
nation `#ddd`, internal state borders white; legend of `length.ticks(4).slice(1)`
spikes at `translate(886,592)`, 20 px apart, values below in 10 px `#777`.

Built as `examples/d3_spikes.html`; this note is kept true to what runs.

## The lift

The notebook's spikes already pretend to stand up; here they do. The
pre-projected map lies in the world's ground plane (`y = 0`, up `+y`) and each
spike is a narrow square pyramid rising along `+y` from its county's centroid.
The third axis is the data axis, so this is a real lift, not planar.

What d3 decides, exactly as the notebook: the join (`population` rows ×
`countymap`, rows without a county dropped → **2833** spikes), the sort
(descending population), the length scale's domain (`[0, 10 057 155]`, Los
Angeles), the centroids (`d3.geoPath().centroid` on the pre-projected GeoJSON —
the identity projection, so these are the notebook's own pixel coordinates), the
legend ticks (`length.ticks(4).slice(1)` = 2M, 4M, 6M, 8M, 10M — five, not the
brief's three; the notebook draws five for this domain) and their format
(`tickFormat(4, "s")`).

What the page adds to place it in 3D:
- mapping: notebook `x → x·S`, `y → y·S − H` with `S = 20/975`, `H = 610·S =
  12.51`, so the map spans `[0, 20] × [−12.51, 0]` in `xz`. Camera A looks from
  `+x, +z` (south-east): the notebook's top edge (north) is the far edge and
  its left edge the left edge, so seen from above the map is not mirrored.
- spike height: the notebook's length scale with range `[0, SPIKE_MAX = 6]`
  world units instead of `[0, 200]` px. The px range scaled would be 200·S =
  4.10; the brief asked for ≈ 6 and 6 is also what the depth gate needs: mark
  extents are `19.27 × 5.70 × 11.78` → ratio **0.296** (≥ 0.25); at 4.10 it
  would be 0.20 and fail.
- spike shape: square pyramid, base `SPIKE_W = 7·S = 0.144` (the notebook's
  7 px) on the ground at `y = THICK`, apex at `THICK + h`. One shared unit
  geometry (`src/spike.js` `spikeGeometry`, flat shaded, base side 1, height 1)
  scaled `(SPIKE_W, h, SPIKE_W)` per spike. Red `MeshStandardNodeMaterial`,
  `emissive` red 0.55, `transparent`, opacity 0.65 (the notebook's 0.5 fill +
  red stroke; 0.5 alone was washed out under the lights).
- ground: one `Mesh` per **state** (51), `#ddd`, the state's MultiPolygon
  triangulated by `THREE.ShapeUtils.triangulateShape` (through
  `ExtrudeGeometry`, depth `THICK = 0.05`, no bevel; `src/spike.js`
  `groundGeometry`, 40 608 triangles in all), turned into the `xz` plane. Not
  marks, not pickable. The notebook fills the nation as one path; per-state
  slabs give the same picture (no outer stroke, so islands and inlets read).
- borders: the notebook's `topojson.mesh(states, (a, b) => a !== b)` as one
  white `LineSegments` (2829 segments) lifted `LIFT = 0.012` above the slab.
  Not a mark.
- legend: five reference spikes (same geometry and material, not marks) at
  `toWorld(886 + 20·i, 592)` with heights `length(v)`, and the five values as
  flat labels (below).
- lights: hemisphere 2.0 + directional 1.6, as the treemap.

## Marks

- cell: one `Mesh` per spike (2833), `kind 'cell'`, no `normal` (the tip is a
  point, eligible from every camera). The mesh origin is `TIP = 5 %` of the
  height **below the apex**, inside the solid, so `getWorldPosition` is the
  spike's tip pixel and a ray through it enters a side face rather than grazing
  the apex vertex (which the raycaster can miss). `marks[].y` is therefore
  `THICK + 0.95·h`, 0.053 … 5.75. `name` is the notebook's tooltip text
  (`"County, State\n1,234,567"`). `expected = { nodes: 0, links: 0, cells:
  2833, labels: 5 }`; `pickables` = the spike meshes.
- A first build had the pyramid's faces wound inward: raycasts hit the far
  (exit) face, so a neighbour in front in the dense east coast (Hartford over
  Tolland, CT, from camera B) won by 1e-8. Fixed in `spikeGeometry` (outward
  normals verified); picking is then 20/20 from both cameras, 2656 / 2683 of
  2833 tips unoccluded.

## Labels

The notebook's legend values, lying on the ground: one `Text` per legend spike
(**5**, `expected.labels = 5`), Roboto Regular `#777` on a white halo 0.2, flat
(`basisQuaternion((1,0,0), (0,0,−1))`: +x baseline, +y = north), `fontSize =
10·S = 0.205` world units (the notebook's 10 px scaled; ~3 px at 400×250 and
~14 px at 1600×1000, where they read). The notebook's `text-anchor: middle` /
`dy 1em` becomes anchor `start` shifted left by half the measured width (lib3
`VectorFont` advances + kerning) and the line centre 0.75 em south of the base.
Built with `hierarchyLabels` on a `{ descendants }` shim of five `{ data: {
name } }` wrappers; 0 flipped at camera A; `labels.update(camera)` per frame.
Dumped to `marks/d3_spikes.json` `labels[]` as `{ id: 'legend0…4', text, x, y,
z, q, anchorX }`. The alternative in the brief (the ten largest counties'
names) was not used: the legend is what the notebook draws.

## Camera

PerspectiveCamera fov 35, **elevation 35°, azimuth 20°** (from the south-east,
as the brief), fill 0.85, fitted by `frameCamera` to the projected points —
the map's four ground corners, every spike tip (2833 + 5 legend) and the
legend text's corners — rather than to the box's eight corners (box corners
6 units above the far corners left the top third of the frame empty).
Position `(17.70, 15.90, 15.77)`, target `(10.28, 0.71, −4.63)`, distance
26.49, 14.96 px/unit at 400×250. Angle areas 0.508 (A) / 0.595 (B).

## Primitives for `src/`

`src/spike.js` (new): `spikeGeometry({ tip })` and `groundGeometry(geoJSON, {
scale, offsetZ, thickness })`. `examples/jsm/vendor/topojson-client.js` (new):
topojson-client 3.1.0 `src/index.js` bundled by esbuild as ESM, in the page's
import map as `topojson-client`. `tools/ref.js` gained `REF_MODULES` (JSON of
cell name → ESM URL, imported in the page and exposed as `window[name]` and the
cell's value, as d3 is) so the notebook's `topojson` dependency resolves:
`REF_MODULES='{"topojson":"/examples/jsm/vendor/topojson-client.js"}' node
tools/ref.js dots/spike-map.v2 ref/spikes.png`.

## For three-rs

d3 modules: d3-geo (`geoPath` with no projection → `centroid` of pre-projected
polygons), d3-scale (`scaleLinear`, `ticks`, `tickFormat`), d3-array
(`max`, `descending`), d3-format; topojson-client (`feature`, `mesh`). Layout:
spike `i` (in descending-population order) stands at `(cx·S, THICK, cy·S − H)`
with height `6 · population / 10 057 155`; the 2833 tips (5 % below the apex)
are in `marks/d3_spikes.json`. Ground: the 51 state MultiPolygons triangulated
in the plane; borders: the state mesh.
