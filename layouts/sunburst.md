# sunburst → sphere

Source: `hierarchies/sunburst.v2` (flare-2.json: 252 nodes, 220 leaves, height 4,
10 top-level packages). 2D: `d3.partition().size([2π, radius])` on the value-summed,
value-sorted hierarchy; one `d3.arc` per descendant with depth > 0; rainbow colour by
top-level ancestor; fill-opacity 0.6; labels on cells wide enough.

Built as `examples/d3_sunburst.html`; this note is kept true to what runs.

## The lift

The disc becomes a sphere with the root at the north pole. Angle becomes longitude,
depth becomes a latitude band, and the value that the 2D chart only shows as arc
length also becomes radial thickness: bigger subtrees are thicker shell sectors.

What d3.partition still decides (run exactly as the notebook does, `.size([2π, R])`):
- `x0, x1` of every cell: its longitude span, verbatim. The pad angle is applied as
  in the notebook (`min((x1−x0)/2, 0.005)`), half on each side as `d3.arc` does.
- `y0, y1`: used only for the depth index (`depth = node.depth`).
- the value sort and the sum.

What the sphere adds:
- colatitude band for depth d (1..H, H = root.height): `[Θ (d−1)/H, Θ d/H − 0.4°]`,
  with `Θ = 150°` so the deepest ring stops short of the south pole and a hole stays
  open to look through. The 0.4° taken off the far edge of every band is the
  analogue of `outerRadius − 1`.
- outer radius `R = 10`: every cell's outer face lies on this one sphere. Radial
  thickness of a cell: `h = 0.02R + 0.6R · (value / root.value)^(1/2)` (0.2 … 4.24).
  Every cell is a solid shell sector from radius `R − h` to `R`: outer and inner
  spherical patches plus four side walls. Tessellation: one segment per 3° of
  longitude, rounded up to an even count (min 2), 4 segments of latitude.
- Colour: the notebook's `interpolateRainbow` quantised over `children.length + 1`,
  by top-level ancestor, then mixed 40 % toward white and used **opaque**. That is the
  notebook's `fill-opacity 0.6` over a white page baked into the colour: a really
  transparent shell shows its own far side through the near side and the rings stop
  reading (tried; see "Changed", below).
- No inner sphere: the cells reach inward to `R − h_max` and would cut through it.
  (When `EXTRUDE = +1`, below, a faint grey sphere of `0.98R` is added, not a mark.)

Extents of the mark positions `19.16 × 16.05 × 19.95`, depth ratio `0.804`.

**Changed from the draft of this note, and why.** The draft extruded every cell
*outward*, from `R` to `R + h`, so that big subtrees stand out as towers, and said
the mark position is the mean of the four corners at mid-thickness. Three things
did not survive contact with the picking gate (rule: sample cells whose radial
normal faces the camera, `dot(normal, camera − mark) > 0`, raycast each at its own
pixel, all must hit themselves):

1. *The corner-mean is not inside the cell.* A band is 37° of colatitude; the chord
   midpoint of a narrow cell sits at `0.947 · (R + h/2)`, which is below the inner
   surface of every cell thinner than 1.1 — most of them. Replaced by the centre of
   the cell's outer face (mid-longitude, mid-colatitude, radius `R`), pulled
   `1e-4` inside so a grazing pick ray enters the cell's own face first; with even
   segment counts that point is a vertex of the outer patch, so it is exactly on the
   tessellated surface.
2. *Outward towers occlude their neighbours.* A sunburst is mostly slivers (a leaf
   is 0.2°–1° of longitude) next to cells up to 4 units taller; from any oblique
   direction a sliver's face is behind a taller neighbour's wall. Measured on the
   outer-face centres: for every one of 180 cameras (elevation 20°–45°, azimuth
   0°–87° in 3° steps) at least one of the 20 sampled front-facing cells per camera
   is hidden by a neighbour (6–19 of 20 hit, mean 12.6; `EXTRUDE = +1` at the shipped
   camera: A 17/20, B 18/20). A facing margin does not fix it either: at
   `cos > 0.7` camera B still has 3–12 misses of 30–60. This is genuine occlusion,
   not a bug — the pixel of that cell really shows the neighbour.
3. So the thickness now grows *inward*: outer faces all on the sphere `R`, inner
   faces at `R − h`. The outer surface is then smooth, front-facing means visible,
   and the gate passes from every one of those 180 cameras (20/20 both). The
   value is still radial thickness, read through the south-pole hole and, in the
   live page, by orbiting under the sphere. The page keeps `EXTRUDE = ±1` as one
   constant so the outward version can be looked at (it is the more striking
   render; `handoff/ladder/sunburst-outward.jpg`), but it cannot pass §B.10 as
   the gate is written.

## Marks

- cell: one `Mesh` per `root.descendants().filter(d => d.depth)` (251), geometry
  from `src/shell.js`. The mesh's position is the centre of the cell's outer face
  (`spherical(R − 1e-4, (colat0+colat1)/2, (lon0+lon1)/2)`) and the geometry is
  built in local coordinates around it, so `getWorldPosition` is that point and
  that is what `marks/d3_sunburst.json` carries. Each mark carries `normal`: the
  unit vector from the origin through it (used by the picking gate to choose
  front-facing cells per camera).
- no node or link marks. `expected = { nodes: 0, links: 0, cells: 251 }`.
- `pickables`: the 251 cell meshes.
- labels: not built (rung 3 had not landed on `rung0` when this shipped). Plan, for
  when it does: as the notebook, only cells whose `(y0+y1)/2 · (x1−x0) > 10` in the
  notebook's own units (radius 464), so the label set is the notebook's. Each label
  lies tangent to the outer face at the mark point, baseline along longitude,
  flipped so it reads left-to-right from camera A.

## Camera

Pole axis = scene up. `frameCamera` fov 40, elevation 35°, azimuth 150°, fill 0.85,
fitted to the mark positions. Azimuth `a` puts camera A at longitude `90° − a`, so A
looks at longitude 300° (where query, analytics, scale and data meet) and camera B
(rotated +90° about up) at 210° (util, animate); both see the pole cap and several
packages. The draft's azimuth 20° put camera A at longitude 70°, in the middle of
`vis` (which spans 0°–163°), so the whole near side was one colour.

Gates as shipped: depth 0.804 · counts 0/0, 0/0, cells 251/251 · angle 0.488 /
0.489 · picking 20/20 from both cameras (141 / 132 cells front-facing).

## Primitives for `src/`

`src/shell.js`: `shellSector(lon0, lon1, colat0, colat1, r0, r1, segments, origin?)`
→ `{ geometry, centroid, normal }`, a closed BufferGeometry in local coordinates
around `origin` (default: the sector's centre at mid-radius); every face has its
own vertices, wound outward (checked: signed volume > 0 for all 251). Also exports
`spherical(r, colat, lon)`. Nothing else new.

## For three-rs

d3 modules: d3-hierarchy (hierarchy, partition), d3-scale (scaleOrdinal),
d3-interpolate/d3-scale-chromatic (interpolateRainbow, interpolateRgb, quantize).
Layout: the band and thickness formulas above, ~20 lines on top of partition's
`x0/x1/depth/value`; the shell-sector mesh is ~100 lines.
