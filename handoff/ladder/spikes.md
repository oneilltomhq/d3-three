## N. spike map → the map flat, every spike standing up

| artefact | path |
| --- | --- |
| page | `examples/d3_spikes.html` |
| screenshot | `examples/screenshots/d3_spikes.jpg` (400×250) |
| eyeball render | `handoff/ladder/spikes-1600x1000.png` |
| marks | `marks/d3_spikes.json` (0 nodes, 0 links, 2833 cells, 5 labels) |
| layout note | `layouts/spikes.md` |
| reference render of the original notebook | `ref/spikes.png` (975×610) |

Source notebook: `d3-gallery/notebooks/dots/spike-map.v2`, data
`files/counties-albers-10m.json` (TopoJSON US Atlas pre-projected to 975×610:
3142 counties, 51 states, nation) and `files/population.json` (2910 rows
`[population, state, county]` after a header). The notebook's join drops rows
with no county geometry: **2833** spikes, sorted by descending population.

**d3 modules needed:** d3-geo (`geoPath()` with no projection: `centroid` of
the pre-projected county polygons), d3-scale (`scaleLinear`, `ticks(4)`,
`tickFormat(4, "s")`), d3-array (`max`, `descending`), d3-format (`",.0f"`),
and topojson-client (`feature`, `mesh`) — vendored as
`examples/jsm/vendor/topojson-client.js` (3.1.0 ESM). The DOM half is not used.

**3D layout:** the notebook's map in the ground plane, `x → x·S`, `y → y·S − H`
with `S = 20/975`, `H = 12.51` (north far from camera A, not mirrored); every
spike a narrow square pyramid standing along `+y` at its county centroid, base
`7·S = 0.144` (the notebook's 7 px), height `scaleLinear([0, 10 057 155], [0,
6])(population)` — the notebook's 200 px range becomes 6 world units (200·S =
4.1 would give depth ratio 0.20 and fail the gate; the brief asked for ≈ 6).
Extents `19.27 × 5.70 × 11.78`, depth ratio **0.296**. Ground: one grey slab
per state (`ExtrudeGeometry` over `ShapeUtils.triangulateShape`, 0.05 thick),
internal state borders one white `LineSegments`; neither are marks. Full spec
in `layouts/spikes.md`.

**Marks:** one `Mesh` per spike, `kind 'cell'`, no normal. The mesh origin is
5 % of the height below the apex, inside the solid, so the mark position is the
tip pixel and the picking ray enters a face instead of grazing the apex vertex
(`marks[].y = 0.05 + 0.95·h`). Shared unit geometry `src/spike.js`
`spikeGeometry`, scaled per spike; red, emissive 0.55, opacity 0.65. Legend:
five reference spikes (2M … 10M) at the notebook's `translate(886,592)`, not
marks.

**Camera:** PerspectiveCamera fov 35, elevation 35°, azimuth 20° (south-east),
fill 0.85, fitted to the projected ground corners, spike tips and legend text
corners. Position `(17.70, 15.90, 15.77)`, target `(10.28, 0.71, −4.63)`. Fixed;
one frame.

**Gates:** depth 0.296 · counts 0/0 nodes, 0/0 links, 2833/2833 cells · angle
0.508 / 0.595 · picking 20/20 from both cameras (2656 / 2683 tips unoccluded)
· labels 5/5 (page-supplied `expected.labels`) · twice 0 px (both raw PNGs
sha256 `a4a4b179…ffcb`).

**Labels (rung 3):** lib3 `sdf-text` via `src/labels.js`, Roboto Regular `#777`
on a white halo 0.2: the notebook's five legend values (`2M 4M 6M 8M 10M`,
`expected.labels = 5`), flat on the ground below their reference spikes
(+x baseline, +y = north), `fontSize = 10·S = 0.205` (the notebook's 10 px
scaled: ~3 px at 400×250, ~14 px at 1600×1000). `text-anchor: middle` is done
by shifting a `start` anchor left by half the TTF-measured width. 0 flipped;
per-frame `labels.update(camera)`. `marks/d3_spikes.json` `labels[]` carries
`{ id: 'legend0…4', text, x, y, z, q, anchorX }`. The brief's alternative (ten
largest counties' names) was not used; the legend is what the notebook draws.

**Shared-file changes on this branch:** none in `src/` (new file `src/spike.js`
only), none in `test/e2e/`. `tools/ref.js` gained an additive `REF_MODULES`
knob (JSON of cell name → ESM URL, imported and exposed on `window` like d3) so
the notebook's `topojson` cell dependency resolves.

**Gaps:** the notebook's spikes are flat triangles; the 1853 counties whose
spike is under 1 px tall in the notebook are here squat pyramids whose 0.144
base reads as a small red diamond on the ground — the same footprint as the
notebook's 7 px base, but with area. The notebook's `<title>` tooltips are the
mesh `name`s, not shown. The legend text is sub-pixel at 400×250 (faithful to
10 px on 975; legible at 1600×1000). `tools/stable.js` (the no-injection layout
proof, not a deliverable) times out on `networkidle0` for this page and was not
run; `e2e:twice` is the determinism proof here.
