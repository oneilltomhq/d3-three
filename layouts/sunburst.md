# sunburst → sphere

Source: `hierarchies/sunburst.v2` (flare-2.json: 252 nodes, 220 leaves, height 4,
10 top-level packages). 2D: `d3.partition().size([2π, radius])` on the value-summed,
value-sorted hierarchy; one `d3.arc` per descendant with depth > 0; rainbow colour by
top-level ancestor; fill-opacity 0.6; labels on cells wide enough.

## The lift

The disc becomes a sphere with the root at the north pole. Angle becomes longitude,
depth becomes a latitude band, and the value that the 2D chart only shows as arc
length also becomes radial thickness: bigger subtrees stand out from the sphere.

What d3.partition still decides (run exactly as the notebook does, `.size([2π, R])`):
- `x0, x1` of every cell: its longitude span, verbatim. The pad angle is applied as
  in the notebook (`min((x1−x0)/2, 0.005)`), shrinking the span symmetrically.
- `y0, y1`: used only for the depth index (`depth = node.depth`).
- the value sort and the sum.

What the sphere adds:
- colatitude band for depth d (1..H, H = root.height): `[Θ (d−1)/H, Θ d/H]`, with
  `Θ = 150°` so the deepest ring stops short of the south pole and a hole stays open
  to look through. A pad of 0.4° between bands is the analogue of `outerRadius − 1`.
- base radius `R = 10`. Radial extrusion of a cell: `h = 0.02R + 0.6R · (value / root.value)^(1/2)`.
  Every cell is a solid shell sector from radius `R` to `R + h`: outer and inner
  spherical patches plus four side walls. Tessellation: one segment per 3° of
  longitude (min 2), 4 segments of latitude.
- Colour, opacity 0.6 (transparent material, depthWrite on), exactly the notebook's
  `interpolateRainbow` quantised over `children.length + 1`. Sphere interior is empty;
  a faint grey inner sphere of radius `0.98R` (not a mark) gives the hole something to
  look at. Omit if it hurts the render.

Extents ≈ (2(R+h_max), 2(R+h_max)·sin(150°/2)·…, …): all three near 2R; depth ratio > 0.9.

## Marks

- cell: one `Mesh` per `root.descendants().filter(d => d.depth)` (251). The mesh's
  position is the cell's centroid (mean of the four corners at radius `R + h/2`) and
  the geometry is built in local coordinates around it, so `getWorldPosition` is the
  centroid. Each mark carries `normal`: the unit vector from the origin through the
  centroid (used by the picking gate to choose front-facing cells per camera).
- no node or link marks. `expected = { nodes: 0, links: 0, cells: 251 }`.
- labels: as the notebook, only cells whose `(y0+y1)/2 · (x1−x0) > 10` in the
  notebook's own units, so the label set is the notebook's (compute it with the
  notebook's radius 464). Each label lies tangent to the outer patch at the centroid,
  baseline along longitude, flipped so it reads left-to-right from camera A.

## Camera

Pole axis = scene up. `frameCamera` fov 40, elevation 35°, azimuth 20°, fill 0.85.
Camera B (rotated 90° about up) sees the other flank; both see the pole cap.

## Primitives for `src/`

`src/shell.js`: `shellSector(lon0, lon1, colat0, colat1, r0, r1, segments)` →
BufferGeometry centred on its centroid, returning `{ geometry, centroid, normal }`.
Nothing else new.

## For three-rs

d3 modules: d3-hierarchy (hierarchy, partition), d3-scale (scaleOrdinal),
d3-interpolate/d3-scale-chromatic (interpolateRainbow, quantize). Layout: the band and
extrusion formulas above, ~20 lines on top of partition's `x0/x1/depth/value`.
