# sunburst, flat

Source: `hierarchies/sunburst.v2` (flare-2.json: 252 nodes, 220 leaves, height 4,
10 top-level packages). 2D: `d3.partition().size([2π, 464])` on the value-summed,
value-sorted hierarchy; one `d3.arc` per descendant with depth > 0 (inner radius
`y0`, outer `y1 − 1`, pad angle `min((x1−x0)/2, 0.005)` at pad radius 232); rainbow
colour by top-level ancestor at fill-opacity 0.6; 10 px labels on cells with
`(y0+y1)/2 · (x1−x0) > 10`, rotated along the radius, turned 180° on the left half.

Built as `examples/d3_sunburst.html`; this note is kept true to what runs.

**Retired: the sphere.** The first build lifted the disc onto a sphere (angle →
longitude, depth → colatitude band, value → radial thickness, 251 shell-sector
solids, `src/shell.js`). The user eyeballed it and ruled that the third axis added
nothing the disc did not already say; the director's ruling (handoff/rung0/LOG.md,
"planar lifts") is to lift only where the third axis obviously wins and otherwise
render the 2D chart faithfully inside the 3D world. `src/shell.js` stays in the tree
for history; the page no longer imports it. What was learned there and still holds:
outward extrusion of a sunburst cannot pass the picking gate (slivers hide behind
taller neighbours from every oblique camera; 0/180 cameras at any thickness), and
a text frame chosen with a fixed facing must be turned about its normal, not its
up axis, to read from the camera.

## The chart in the 3D world

The notebook's disc, in the `xz` plane, `y` up, 20 world units across: one
notebook px is `S = 20 / 928` units and every px number of the notebook is
multiplied by `S`. Angle 0 is 12 o'clock and angles run clockwise seen from above:
notebook `(x, y) = (r sin a, −r cos a)` becomes world `(x, z)`.

What d3 decides, verbatim: `partition` gives every cell `x0, x1, y0, y1`; the sort,
the sum and the colour scale are the notebook's; the visible set is
`descendants().filter(d => d.depth && d.x1 − d.x0 > 0.001 && d.y1 > d.y0)` (251 —
no cell is thinner than 0.0017 rad, so this is every non-root cell).

What the page adds:
- Each cell is a **thin slab**: the notebook's arc outline (inner radius `y0·S`,
  outer `(y1 − 1)·S`, the pad applied as `d3.arc` applies it — a linear pad, so the
  angular pad at radius `r` is `asin(rp / r · sin(pa / 2))` with `rp = 232·S`, and an
  edge collapses to its mid-angle when the pad would exceed the span) extruded
  `THICKNESS = 0.3` (1.5 % of the diameter) along `+y`, so it has a lit edge and a top
  face. Outline tessellation: one segment per 2° of arc, min 1 per edge.
- Colour: the notebook's `interpolateRainbow` quantised over `children.length + 1`
  by top-level ancestor, mixed 40 % toward white and used opaque (fill-opacity 0.6
  over the white page, baked in, so the slab edges stay clean).
- Lighting: hemisphere + one directional light; the disc reads as a lit object
  rather than a flat fill. Nothing else: no base plate, no inner disc.

Extents of the mark positions `15.70 × 0 × 15.86`; the page registers
`planar: true` and the depth gate passes by ruling (ratio 0 reported).

## Marks

- cell: one `Mesh` per visible cell (251), `kind: 'cell'`. The geometry is built in
  local coordinates around the **centre of the slab's top face at mid-angle and
  mid-radius** (the notebook's label point, `(y0+y1)/2`), height `THICKNESS`; the
  mesh sits there, so `getWorldPosition` is that point and it is what
  `marks/d3_sunburst.json` carries. Each mark carries `normal: [0, 1, 0]`.
- no node or link marks. `expected = { nodes: 0, links: 0, cells: 251, labels: 93 }`.
- `pickables`: the 251 slabs. All top faces are coplanar, so nothing occludes a
  mark from any camera above the plane.

## Labels

`src/labels.js` (lib3 sdf-text, Roboto Regular), not marks. Exactly the notebook's
set: cells with `(y0+y1)/2 · (x1−x0) > 10` in notebook units, 93. `hierarchyLabels`
is handed a pseudo-root `{ descendants: () => subset }` over the real d3 nodes.

Placement is the notebook's `rotate(x−90) translate(y,0) rotate(x<180?0:180)`,
`text-anchor: middle`, `dy 0.35em`, font-size 10: each label lies in the top plane
(`LABEL_LIFT = 0.01` above the top face so it never fights the slab), centred on the
mark point, baseline along the radius at mid-angle, em `10·S = 0.216` world units
(3.35 px in the 400×250 reference — the notebook's proportion), `anchorX: center`
(set on each `Text` after `hierarchyLabels` returns, then one more `sync()`),
`anchorY: middle`, fill `#333`, outline 0.25 white, render order 1. The baseline
reads outward on the right half (`x < 180°`) and inward on the left, as the
notebook's turn does.

The notebook's left-half turn exists so that its text reads left-to-right; from
the oblique camera the same intent is "the baseline projects rightward from camera
A", and where the two rules disagree — labels near 12 and 6 o'clock, whose baseline
is nearly vertical on screen — the page turns the baseline about the face normal
(10 of 93 at the shipped camera, counted as `turned` in the console line). That
keeps `labels.js`'s own mirror check idle (`flipped: 0`): that check turns a label
about its *up* axis, which for an up-facing label would show its back, mirrored.
No per-frame flip is wired in (the director adds it on merge).

## Camera

`frameCamera` fov 40, elevation 50°, azimuth 25°, fill 0.85, fitted to every slab's
world bounding-box corners plus every label's corners (fit on the slabs first, lay
the labels out, refit with their corners). Azimuth 25° puts camera A on the `+z`
side, so screen-up is roughly `−z` and the notebook's 12 o'clock is at the top of
the frame; camera B (rotated +90° about up) is at the same elevation and sees the
whole disc too (eligible 251 / 251).

Gates as shipped: depth ratio 0, pass by ruling · counts 0/0, 0/0, cells 251/251 ·
angle 0.448 / 0.551 · picking 20/20 from both cameras (251 / 251 eligible) · labels
93/93 · twice 0 px.

## Primitives for `src/`

None new. The slab is `THREE.ExtrudeGeometry` over a `THREE.Shape` of the arc
outline (~40 lines in the page); labels use `src/labels.js` as is. `src/d33.js`
gains `planar` (state, `register` option, depth-gate note, report field) and the
harness copies `planar` into both JSON files.

## For three-rs

d3 modules: d3-hierarchy (hierarchy, partition), d3-scale (scaleOrdinal),
d3-interpolate/d3-scale-chromatic (interpolateRainbow, interpolateRgb, quantize).
Geometry: the arc outline with d3's pad rule (above), extruded 0.3 along `+y`.
Labels: 93 SDF-text strings, each a position, a quaternion (baseline along the
radius, face `+y`) and `anchorX: center`, em 0.216, all in `marks/d3_sunburst.json`;
`planar: true` in both JSON files says which class the example is in.
