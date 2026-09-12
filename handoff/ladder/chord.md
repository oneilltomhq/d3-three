## N. chord diagram II, flat (planar by ruling)

| artefact | path |
| --- | --- |
| page | `examples/d3_chord.html` |
| screenshot | `examples/screenshots/d3_chord.jpg` (400×250) |
| marks | `marks/d3_chord.json` (0 nodes, 0 links, 14 cells, 26 labels, `planar: true`) |
| layout note | `layouts/chord.md` |
| reference render of the original notebook | `ref/chord.png` (640×640) |
| eyeball render | `handoff/ladder/chord-1600x1000.png` |

Source notebook: `d3-gallery/notebooks/networks/chord-diagram.v2`, data inline
(a 4×4 hair-colour matrix, names black / blond / brown / red, four colours; no
`files/`).

**d3 modules needed:** d3-chord (`chord` with `padAngle`, `sortSubgroups`;
`ribbon` is not called — its path is reimplemented for the slab outline), d3-array
(`sum`, `range`, `tickStep`, `descending`), d3-format (`formatPrefix`),
d3-interpolate (`interpolateRgb`). The DOM half of d3 is not used.

**Class:** planar. A chord diagram is a ring with ribbons through its centre;
by the director's ruling it is rendered as the notebook's chart, flat in the 3D
world, orbitable and lit.

**Layout:** `d3.chord().padAngle(20/270).sortSubgroups(descending)` on the
matrix, verbatim: 4 groups, 10 chords in d3's order (`i ≤ j`, both directions of a
pair collapsed, 4 self-chords). The disc lies in the `xz` plane, `y` up, 20 units
across (one notebook px = `20/640` units; outer radius 290 px, inner 270 px);
angle 0 is 12 o'clock, clockwise from above. Each group arc (d3.arc outline,
inner 270 / outer 290, no pad) is a slab extruded 0.3 along `+y`, colour
`colors[index]` opaque. Each ribbon (d3.ribbon's path at radius 270: source arc,
quadratic Bézier through the centre, target arc, quadratic back; self-chords skip
the middle) is a slab extruded 0.15, colour `colors[target.index]` at the
notebook's fill-opacity 0.7 over white baked into an opaque colour; ribbon `k` is
raised `k · 0.004` so later ribbons win where they overlap (the notebook's draw
order) and no tops are coplanar. The notebook's white ribbon stroke and the
see-through overlap of translucent ribbons are not reproduced. Ticks: one 1 px
`Line2` per tick (102, every 1 000 units, 290 → 296 px) at `y = 0.31`, not marks.
Lighting: hemisphere + one directional.

**Marks:** one `Mesh` per group arc (4, `g0…g3`) and one per ribbon (10, `r0…r9`),
all `kind: 'cell'` — this project's `link` kind is a line between two node marks,
which a ribbon is not — with `normal: [0,1,0]`; ribbons carry `a`/`b` = the two
group indices. Geometry is built in local coordinates around the mark point so the
mesh position is the mark: arcs at mid-angle, mid-radius on the top face; ribbons
on the top face at `0.5625·Ps + 0.0625·Pt` (the mid-line Bézier at t = 0.25, `Ps`/`Pt`
the source/target arc midpoints at radius 270), self-chords at `0.75·Ps`.
`expected = { nodes: 0, links: 0, cells: 14, labels: 26 }`; `pickables` = the 14
slabs.

**Labels:** 26 via `src/labels.js` (lib3 sdf-text, Roboto): the notebook's 22 tick
labels (every 5 000, `formatPrefix(",.0", 1000)`: "0k" … "40k", 10 px = em 0.3125,
3.7 px in the 400×250 reference) placed exactly as the notebook — block from R+8 px
outward along the radial, reading outward on the right half and inward on the left
(anchor start / end) — plus the 4 group names at each group's mid-angle, R+36 px,
12 px (the notebook keeps names in `<title>` tooltips only; a static render needs
them on the rim). All lie in the plane `y = 0.31`, fill #333, white outline 0.25.
Near 12 and 6 o'clock the baseline is turned about the face normal (anchor
swapped, block unmoved) so it projects rightward from camera A (5 of 26), which
keeps labels.js's up-axis mirror flip idle; `labels.update(camera)` runs before
every render for orbiting. The marks dump carries `labels` with position,
quaternion and anchor.

**Camera:** PerspectiveCamera fov 40, elevation 50°, azimuth 25° (camera A on the
`+z` side, 12 o'clock at the top of the frame), fitted at 0.85 fill to every slab's
world bounding-box corners, the tick ends and every label's corners. Camera B, at
the same elevation, sees the whole disc (eligible 14 / 14). Fixed; one frame.

**Gates:** depth ratio 0.010, PASS `planar by ruling` · counts 0/0, 0/0, cells
14/14 · angle 0.298 / 0.396 · picking 13/13 from both cameras (14 / 14 eligible, 13
visible — one ribbon mark sits under a higher ribbon from each camera and is
excluded by the visibility pre-pass) · labels 26/26. `e2e:twice` 0 px.

**Harness changes carried by this rung:** none. No file in `src/`, `test/e2e/` or
`tools/` changed.

**Gap:** the tick labels are the notebook's proportion, so in the 400×250 reference
they are ~4 px and only legible in the eyeball render. The notebook's translucent
ribbon overlap is replaced by opaque stacking in draw order.
