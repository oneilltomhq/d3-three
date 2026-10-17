# chord diagram II, flat

Source: `networks/chord-diagram.v2` (the notebook's inline 4×4 hair-colour matrix,
names black / blond / brown / red, colours `#000000 #ffdd89 #957244 #f26223`; no
`files/`). 2D: svg 640×640, `outerRadius = 290`, `innerRadius = 270`;
`d3.chord().padAngle(20 / innerRadius).sortSubgroups(d3.descending)`; one `d3.arc`
(inner 270, outer 290) per group filled `colors[index]`; one `d3.ribbon().radius(270)`
per chord filled `colors[target.index]` at `fill-opacity 0.7` with a white stroke;
ticks every `tickStep(0, sum, 100)` = 1 000 units as 6 px lines outside the outer
radius, labelled every `tickStep(0, sum, 20)` = 5 000 with `formatPrefix(",.0", 1000)`
("0k" … "40k"), 10 px, turned on the left half. Group names appear only in
`<title>` tooltips.

Built as `examples/d3_chord.html`; this note is kept true to what runs.

Class: **planar by ruling** (README, "The ladder"). A chord diagram is a
ring and a set of ribbons through its centre; no third axis would say anything the
disc does not. The chart is the notebook's, flat in the 3D world, orbitable and lit.

## The chart in the 3D world

The notebook's disc, in the `xz` plane, `y` up, 20 world units across: one notebook
px is `S = 20 / 640` units and every px number of the notebook is multiplied by `S`
(outer radius 9.0625, inner 8.4375). Angle 0 is 12 o'clock and angles run clockwise
seen from above: notebook `(x, y) = (r sin a, −r cos a)` becomes world `(x, z)`.

What d3 decides, verbatim: `d3.chord` gives the 4 groups (`startAngle, endAngle,
value, index`) and the 10 chords (`source`/`target` subgroups, `i ≤ j`, both
directions of a pair collapsed into one ribbon exactly as the notebook draws; 4 of
them are self-chords with `source === target`), in the notebook's order; the tick
positions are the notebook's `groupTicks`.

What the page adds:
- Each **group arc** is a thin slab: the notebook's `d3.arc` outline (outer arc
  forward at 290 px, inner arc back at 270 px, no pad, no corner radius — d3.arc is
  not called, the outline is sampled directly, one segment per 2° of arc, min 1)
  extruded `ARC_THICKNESS = 0.3` (1.5 % of the diameter, the sunburst's value) along
  `+y`. Colour `colors[index]`, opaque, as the notebook.
- Each **ribbon** is a thinner slab: the notebook's `d3.ribbon` path — source arc at
  270 px, quadratic Bézier through the centre `(1−t)²P0 + t²P2` to the target's
  start, target arc, quadratic back to the source's start; a self-chord skips the
  middle two as d3 does — sampled (2° per arc segment, 32 per Bézier) into a
  `THREE.Shape` and extruded `RIBBON_THICKNESS = 0.15`. Colour `colors[target.index]`
  at the notebook's fill-opacity **0.7** over the white page, baked into an opaque
  colour (`interpolateRgb(c, '#fff')(0.3)`). The brief said 0.75; the notebook says
  0.7 and the notebook wins.
- **Stacking:** the notebook draws ribbons in `d3.chord` order, later on top, and
  their translucency shows one through another. Opaque slabs cannot do that, so
  ribbon `k` is raised by `k · RIBBON_STEP = k · 0.004` (bottom `k·0.004`, top
  `0.15 + k·0.004`): where two overlap the later one wins, as in the notebook, and no
  two top faces are coplanar (no z-fighting). Max lift 0.036 — invisible at any
  camera. The notebook's white ribbon stroke is not reproduced; the lit extruded
  edge separates neighbours instead. This notebook has no `mix-blend-mode` (the
  brief mentioned one; that is chord diagram I), so nothing else is lost beyond the
  translucent overlap.
- **Ticks:** one `Line2` (`src/link.js` fatLine, 1 px, black) per tick, 102 of them,
  from 290 px to 296 px at the tick's angle, lying `LABEL_LIFT = 0.01` above the arc
  tops (`y = 0.31`). Not marks (the notebook's `<line>`s are decoration, like a
  grid); in their own `ticks` group, not pickable.
- Lighting: hemisphere + one directional light, as the sunburst.

Extents of the mark positions `14.93 × 0.15 × 14.92` (the 0.15 is the ribbons' top
vs the arcs' top); the page registers `planar: true` and the depth gate passes by
ruling (ratio 0.010 reported).

## Marks

- cell, group arc: one `Mesh` per group (4), ids `g0 … g3`, `kind: 'cell'`, geometry
  built in local coordinates around the **centre of the slab's top face at
  mid-angle and mid-radius** (280 px), height 0.3; the mesh sits there, so
  `getWorldPosition` is the mark. `normal: [0, 1, 0]`.
- cell, ribbon: one `Mesh` per chord (10), ids `r0 … r9` in `d3.chord` order, also
  `kind: 'cell'` — this project's `kind: 'link'` is a line between two node marks
  (its position is the midpoint of `a` and `b`), which a ribbon is not, so ribbons
  are cells; they carry `a` / `b` = `source.index` / `target.index` (the two group
  indices, as the brief asked; not mark ids). Mark point: on the top face, on the
  ribbon's mid-line (the quadratic through the centre from the source arc's middle
  `Ps` to the target arc's middle `Pt`) at `t = 0.25`, i.e. `0.5625 Ps + 0.0625 Pt`,
  well inside the ribbon near its source end; a self-chord (a petal) uses `0.75 Ps`.
  `normal: [0, 1, 0]`.
- no node or link marks. `expected = { nodes: 0, links: 0, cells: 14, labels: 26 }`
  with `cells = groups.length + chords.length` straight off `d3.chord`.
- `pickables`: the 14 slabs. Ribbons overlap; the picking gate's visibility
  pre-pass excludes a mark whose pixel belongs to a higher ribbon (1 of 14 from each
  camera at the shipped view), and every remaining sample hits.

## Labels

`src/labels.js` (lib3 sdf-text, Roboto Regular), not marks; `hierarchyLabels` is
handed a shim `{ descendants: () => wrappers }` of `{ data: { name } }` wrappers.
26 labels = 22 tick labels + 4 group names:

- **Tick labels** — exactly the notebook's: every tick whose value is a multiple of
  5 000, text `formatPrefix(",.0", 1000)(value)` ("0k", "5k", …, "40k"), 10 px
  (`10·S = 0.3125` units, 3.7 px in the 400×250 reference), `dy .35em` → `anchorY:
  middle`, fill `#333`, white outline 0.25. Placement is the notebook's
  `rotate(angle−90) translate(outerRadius, 0)` + `x = 8`, and on the left half
  (`angle > π`) `rotate(180) translate(−16)` with `text-anchor: end`: in both cases
  the text block occupies `[R+8, R+8+w]` along the radial, baseline along the
  radial, reading outward on the right half and inward on the left. In
  `hierarchyLabels` terms: an outward label is a "leaf" (anchor start, offset 0), an
  inward one an "internal node" (`children: []`, anchor end, offset 0), both at the
  point `R + 8` px.
- **Group names** — `names[index]` at the group's mid-angle, `R + 36` px (clear of
  the widest tick label, "40k" ≈ R + 25), 12 px (`0.375` units), same turn rule. The
  notebook's svg has no names; they live in its `<title>` tooltips, which a static
  render cannot show, and the brief asks for them on the rim. Font sizes differ per
  label, so after `hierarchyLabels` returns the page sets `fontSize` per `Text`, calls
  `sync()` once more, and rebuilds the four per-frame flip poses from the new block
  widths (the same arithmetic as labels.js).
- Direction from camera A: the notebook's left-half turn exists so its text reads
  left-to-right; from the oblique camera the same intent is "the baseline projects
  rightward from camera A". Where the two disagree (labels near 12 and 6 o'clock)
  the baseline is turned about the face normal and the anchor swapped, so the block
  stays put (5 of 26 at the shipped camera, `turned` in the console line). That keeps
  labels.js's own mirror check idle (`flipped: 0`): it turns about the label's up
  axis, which for an up-facing label would show its back. The per-frame flip
  (`labels.update(camera)` before every render) then keeps every label reading
  left-to-right and upright when orbited.
- All labels lie in the plane `y = 0.31` (`ARC_THICKNESS + LABEL_LIFT`).

## Camera

`frameCamera` fov 40, elevation 50°, azimuth 25°, fill 0.85, fitted to every slab's
world bounding-box corners plus the tick ends, then refitted with every label's
corners. Azimuth 25° puts camera A on the `+z` side, so screen-up is roughly `−z`
and the notebook's 12 o'clock is at the top of the frame. Camera B (rotated +90°
about up) is at the same elevation and sees the whole disc (eligible 14 / 14 with
the `[0,1,0]` normals).

Gates as shipped: depth ratio 0.010, pass by ruling · counts 0/0, 0/0, cells 14/14
· angle 0.298 / 0.396 · picking 13/13 from both cameras (14 / 14 eligible, 13
visible from each) · labels 26/26 · twice 0 px.

## Primitives for `src/`

None new. Arcs and ribbons are `THREE.ExtrudeGeometry` over a `THREE.Shape` of the
sampled outline (~60 lines in the page); ticks use `fatLine`/`lineMaterial` from
`src/link.js`; labels use `src/labels.js` as is. No shared file changed.

## For three-rs

d3 modules: d3-chord (`chord`; `ribbon`'s path is reimplemented as the outline
above), d3-array (`sum`, `range`, `tickStep`, `descending`), d3-format
(`formatPrefix`), d3-interpolate (`interpolateRgb`). Geometry: arc outlines
extruded 0.3, ribbon outlines extruded 0.15 raised `k · 0.004`, 102 tick segments.
Labels: 26 SDF-text strings, each a position, a quaternion (baseline along the
radial, face `+y`) and `anchorX` start/end, em 0.3125 (ticks) / 0.375 (names), all
in `marks/d3_chord.json`; `planar: true` in both JSON files says which class the
example is in.
