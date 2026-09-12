# world choropleth → globe

Source: `maps/world-choropleth.v2` (`countries-50m.json`: TopoJSON World Atlas,
Natural Earth 1:50m, 241 country features; `hale.csv`: WHO healthy life expectancy
2016, 194 rows, 11 of them `-`). 2D: `d3.geoEqualEarth` fitted to a 928 × 510
frame, one `path` per `topojson.feature(world, world.objects.countries).features`
filled with `scaleSequential(extent(values), interpolateYlGnBu)`, a white sphere
outline, and `topojson.mesh(world, countries, (a, b) => a !== b)` — the internal
borders only — stroked white on top.

Built as `examples/d3_globe.html`; this note is kept true to what runs.

## The lift

The map goes back onto the sphere it was projected from. The data are already
spherical (lon/lat in degrees); the only thing the notebook adds is a projection,
and the globe is the one view in which no country is distorted. Radius **R = 10**,
so the globe is 20 units across; y is up (north pole +y), +z points at longitude 0
and +x at 90° E: `(cos φ sin λ, sin φ, cos φ cos λ)`.

What the notebook still decides (its cells run verbatim: `rename`, `hale`,
`countries`, `countrymesh`, the chart cell's `valuemap` and `color`):
- the set of countries (241) and their names, hence which 183 get a value;
- the colour of every country: `color(valuemap.get(d.properties.name))` over the
  extent `[44.9, 76.2]`;
- the border set: the countrymesh (187 lines, 19,439 vertices).

What the globe adds (`src/globe.js`):
- **Country surfaces.** Each feature's polygons are triangulated in the lon/lat
  plane with `THREE.ShapeUtils.triangulateShape` (earcut; holes supported — South
  Africa/Lesotho, Italy/Vatican), after every ring is *unwrapped*: wherever two
  consecutive vertices jump by more than 180° of longitude the rest of the ring is
  shifted by ±360°, so Russia's Chukotka runs on past 180° and Fiji's islands sit
  at 179–181° rather than being split. Longitude only enters the sphere through
  sin/cos, so unwrapped rings project correctly with no cut.
- **The pole.** World Atlas gives Antarctica an outer ring lying entirely on the
  south pole (degenerate, dropped) with the coastline as its hole; the coastline
  unwraps to a ring that ends a full turn from where it started. Such a ring is
  triangulated in the azimuthal-equidistant plane about that pole
  (`x = colat cos λ, y = colat sin λ`), where the cap is a plain disc, instead of
  in lon/lat. (A first attempt closed the ring through two pole points in lon/lat;
  the 360°-wide strip triangles that produces are degenerate on the sphere and
  their fans overlapped — mesh area 0.342 sr against d3's 0.302. In the azimuthal
  plane the area is 0.30196 sr, d3's to five digits.)
- **Refinement.** Every triangle is bisected along its longest edge (measured as
  arc on the sphere) until no edge spans more than **2°**; splits are always at
  the edge's midpoint in the triangulation plane, so the two triangles either side
  of an edge — within a country or across a border, since neighbours share the
  same TopoJSON arcs — split it identically: no T-junctions, no cracks. Degenerate
  earcut output (a repeated index, or three collinear points — Antarctica's coast
  has vertices exactly midway between their neighbours) is dropped rather than
  bisected forever. A flat 2° triangle sags at most `R(1 − cos 1°)` = 0.0015 below
  the sphere; land sits at **R + 0.01** over a plain sphere of radius R, so the
  ocean never shows through. Result: **138,785 triangles** over 241 meshes; all
  polygons' areas match `d3.geoArea` (Russia 0.41596 vs 0.41586 sr, Fiji, Canada,
  Indonesia, South Africa likewise) — `node --import ./test/three-loader.mjs
  --test test/globe.test.mjs`.
- **Mark point.** `d3.geoCentroid(feature)` where that lies on the country (204 of
  241); otherwise (Canada's is in Hudson Bay, an archipelago's at sea) the
  centroid of its largest polygon (33), and failing that the midpoint of the
  longest run of that polygon along the parallel through its centroid (4:
  Br. Indian Ocean Ter., and three more atoll/ribbon shapes). Every mark point
  is on its own country (`geoContains`, tested), so the picking ray through it
  meets that country's surface and nothing else. The brief said "the feature's
  geoCentroid"; 37 of them are at sea, and a ray at sea hits no cell.
- **Borders.** The countrymesh as ONE `LineSegments` (19,252 segments after
  cutting every segment to ≤ 1° of arc), white, at R + 0.02, in a non-mark
  group; the notebook's coastlines are not stroked either (the colour edge
  against the ocean is the coast).
- **Ocean.** `SphereGeometry(10, 128, 96)`, `#3c4148`, lit like the land. The
  notebook's sphere is white; on the globe a white ocean would swallow the
  palest YlGnBu countries, so dark grey by the brief.
- Unknown countries (no row, or `-`): **`#ccc`**, the notebook's Plot cell's
  `unknown`. Note the notebook's SVG cell renders them *black* (`color()` returns
  `undefined`, `attr("fill", undefined)` removes the attribute, SVG's default fill
  is black) — that is what `ref/globe.png` shows for Greenland and Antarctica; the
  page follows the brief and the Plot cell.

Extents `19.61 × 19.55 × 19.76`, depth ratio **0.989** (the marks are on the
sphere; the y extent is Antarctica at −85° to Greenland at +72°).

## Marks

- cell: one `Mesh` per feature (241), `kind: 'cell'`, geometry local to the mark
  point (so `getWorldPosition()` is that point), `MeshStandardNodeMaterial`
  roughness 0.85, one material per distinct colour (shared). Normals are the
  sphere's own (exact, smooth). `normal` on the mark = the unit vector through the
  mark point, so the picking gate samples each country only from a camera it
  faces (146 eligible from A, 84 from B). `expected.cells = features.length =
  241`; nodes and links 0.
- labels: the **30 largest countries by `d3.geoArea`** (Russia … Mauritania;
  the list is in `marks/d3_globe.json` `labels[]`), `properties.name`, flat on
  the surface at the mark point: +x east, +y north, facing outward
  (`basisQuaternion(east, north)`, `tangentFrame` in `src/globe.js`), lifted
  R + 0.03. Centred by measuring the name in the TTF (lib3 `VectorFont`) and
  starting the block half a width to the west, anchor start, so
  `hierarchyLabels` needed no change (a `{ descendants }` shim over 30 proxies,
  as d3_force). Em **7 px at the target distance at 400×250** = 0.688 world units
  (28 px in the 1600×1000 eyeball); 8 px made Chad and Sudan touch. 11 of the 30
  are on the far side from camera A and are mirror-flipped at layout; from A
  they are behind the globe.

## Camera

fov 40, **elevation 20°, azimuth 20°** (the camera sits over longitude 20° E, so
Africa and Europe face it), fill 0.85, fitted by `frameCamera` to 400 Fibonacci
points on the sphere's surface rather than to the bounding cube's corners (the
cube's corners project 15% wider than the globe). Distance 33.8. Labels lie on
the surface, inside that fit. Camera B (rotated 90° about up) looks at 110° E:
Asia and Australia; angle areas 0.413 / 0.423. The key light is a child of the
camera (upper right of the view) so the hemisphere orbited into view is always
the lit one and the colours read the same from every side; camera A is fixed so
the frame is deterministic (two runs 0 px, `tools/stable.js` 241/241 marks and
30/30 labels identical without the harness injection).

## Gates

depth 0.989 · counts cells 241/241 · angle 0.413 / 0.423 · picking 20/20 from
both cameras (146 eligible A, 84 B, all visible, 0 misses) · labels 30/30.

## Primitives for `src/`

New: `src/globe.js` — `lonLatToVector3`, `tangentFrame`, `unwrapRing`,
`triangulatePolygon`, `refineTriangles`, `featureGeometry`, `lineSegmentsGeometry`,
`interiorPoint`. Tested in node by `test/globe.test.mjs` via
`test/three-loader.mjs` (resolves `three` to the vendored build). Vendored
`examples/jsm/vendor/topojson-client.js` (topojson-client 3.1.0 `src/index.js`
bundled to ESM with esbuild, ISC), in the page's import map as
`topojson-client`. `tools/ref.js` gained `topojson` on `window` (mirroring d3,
optional) and `REF_IMPORTS` (`{"Legend":"deps/color-legend"}`: a cell imported
from another notebook, evaluated with the same machinery in its own scope) so the
chart cell, which needs both, could be captured as `ref/globe.png`.

## For three-rs

d3 modules: d3-geo (geoCentroid, geoContains, geoArea — the mark points and the
label subset), d3-scale (scaleSequential) + d3-scale-chromatic (interpolateYlGnBu),
d3-dsv (csvParse), d3-array (extent); topojson-client (feature, mesh). The
projection is not needed: the layout *is* lon/lat → sphere. Three-rs ports the
unwrap / polar-plane / earcut / longest-edge-bisection pipeline of `src/globe.js`
(earcut has a Rust crate) or reads the 241 mark points and colours from
`marks/d3_globe.json`; the triangles themselves are derived from the TopoJSON and
are not dumped.
