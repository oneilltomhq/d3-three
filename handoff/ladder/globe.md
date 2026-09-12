## N. world choropleth → globe

| artefact | path |
| --- | --- |
| page | `examples/d3_globe.html` |
| screenshot | `examples/screenshots/d3_globe.jpg` (400×250) |
| eyeball | `handoff/ladder/globe-1600x1000.png` |
| marks | `marks/d3_globe.json` (241 cells, 30 labels) |
| gates | `gates/d3_globe.json` |
| layout note | `layouts/globe.md` |
| primitive + tests | `src/globe.js`, `test/globe.test.mjs` (`node --import ./test/three-loader.mjs --test test/globe.test.mjs`) |
| vendored | `examples/jsm/vendor/topojson-client.js` (topojson-client 3.1.0, ISC) |
| reference render of the original notebook | `ref/globe.png` (928×510, the flat equal-earth map) |

Source notebook: `d3-gallery/notebooks/maps/world-choropleth.v2`, data
`files/countries-50m.json` (TopoJSON World Atlas, 241 country features) and
`files/hale.csv` (healthy life expectancy 2016; 194 rows, 11 of them `-`). The
notebook's `rename`, `hale`, `countries`, `countrymesh`, `valuemap` and `color`
cells run verbatim; 183 of 241 countries get a value.

**d3 modules needed:** d3-geo (`geoCentroid`, `geoContains`, `geoArea`),
d3-scale (`scaleSequential`), d3-scale-chromatic (`interpolateYlGnBu`), d3-dsv
(`csvParse`), d3-array (`extent`); topojson-client (`feature`, `mesh`). No
projection: the layout is lon/lat → sphere.

**3D layout:** the map goes back onto the sphere it came from, radius 10, y up,
+z at longitude 0, +x at 90° E. Each country's polygons are triangulated in the
lon/lat plane (`THREE.ShapeUtils.triangulateShape`, holes kept) after unwrapping
every ring across the antimeridian (Russia, Fiji continuous past ±180°), except
rings that wind a full turn round a pole (Antarctica), which are triangulated in
the azimuthal-equidistant plane about that pole. Triangles are bisected along
their longest arc at the plane midpoint until every edge is ≤ 2°; since
neighbours share TopoJSON arcs the splits agree across borders (no cracks).
138,785 triangles; every polygon's area matches `d3.geoArea` (Antarctica 0.30196
sr both). Land sits at R + 0.01 over a plain dark-grey ocean sphere (not a
mark); the country mesh (internal borders, 19,252 ≤1° segments) is ONE white
`LineSegments` at R + 0.02 in a non-mark group. Unknown countries `#ccc` (the
notebook's Plot cell's `unknown`; its SVG cell leaves them black, which is what
`ref/globe.png` shows). Extents `19.61 × 19.55 × 19.76`, depth ratio 0.989.
Three-rs ports the unwrap / polar-plane / earcut / bisection pipeline of
`src/globe.js` or reads the mark points and colours from the marks JSON; the
triangles are derived from the TopoJSON and are not dumped.

**Determinism, proven twice.** `e2e:twice` is 0 px (both PNGs sha256
`85bda189…cde679`). `node tools/stable.js d3_globe` (two independent Chromium
processes, no harness injection): 241/241 marks and 30/30 labels identical, max
|Δ| 0.

**Marks:** one `Mesh` per feature, `kind: 'cell'`, `MeshStandardNodeMaterial`
roughness 0.85, one shared material per distinct colour, geometry local to the
mark point. Mark point = `geoCentroid` when it lies on the country (204),
otherwise the largest polygon's centroid (33), otherwise the midpoint of the
longest run along that polygon's central parallel (4); every mark point is on
its own country so the picking ray hits it (37 raw centroids are at sea). `normal`
= the unit vector through the mark point; the picking gate's normal filter gives
146 eligible from A, 84 from B. `expected.cells = features.length = 241`.

**Camera:** fov 40, elevation 20°, azimuth 20° (over 20° E: Africa and Europe
face it), fill 0.85, fitted by `frameCamera` to 400 Fibonacci points on the
sphere (the bounding cube's corners over-fit by 15%); distance 33.8. Key light
is a child of the camera so the orbited-in hemisphere is always lit. Fixed; one
frame.

**Gates:** depth 0.989 · counts cells 241/241 · angle 0.413 / 0.423 · picking
20/20 from both cameras (eligibleA 146, eligibleB 84, 0 misses) · labels 30/30.

**Labels (rung 3):** lib3 `sdf-text` via `src/labels.js` with a `{ descendants }`
shim (as d3_force), Roboto Regular, `#111` on a white halo 0.2; the 30 largest
countries by `geoArea`, `properties.name`, flat on the surface at the mark point
in the tangent plane (`basisQuaternion(east, north)`), lifted R + 0.03. Centred
by measuring the name in the TTF and starting half a width west (anchor start,
leafOffset 0). `fontSize` = 7 px at target distance at 400×250 = 0.688 units
(8 px made Chad and Sudan touch). `labels.update(camera)` per frame; 11 of 30
are flipped for camera A (they face away from it).

**Shared-file changes on this branch:** none in `src/d33.js`, `src/labels.js`
or `test/e2e/`. `tools/ref.js` (+61/−3, additive): imports the vendored
topojson-client onto `window.topojson` (optional, try/catch) and adds it to the
cell values; new `REF_IMPORTS` env (`{"Legend":"deps/color-legend"}`) loads a
cell imported from another notebook so the chart cell could be captured.
`test/three-loader.mjs` added (resolves bare `three` for node tests).

**Gap:** unknown-country colour follows the brief/Plot cell (`#ccc`), not the
SVG cell's black in `ref/globe.png`. The legend is not lifted. `labels.js`'s
per-axis flip can show a surface label mirrored when its baseline is
near-vertical on screen in odd orbits (seen on "Antarctica" from a south view);
camera A and B are clean. The notebook's `<title>` tooltips (name, value) are
not lifted.
