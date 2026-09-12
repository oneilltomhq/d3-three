# hierarchical edge bundling → sphere

Source: `networks/hierarchical-edge-bundling.v2` (flare.json as a flat list: 220
classes, 764 imports). 2D: `d3.cluster().size([2π, radius − 100])` on the hierarchy
built from dotted names, leaves on a circle; each import drawn with `d3.lineRadial`
+ `d3.curveBundle` through `source.path(target)`, i.e. up the hierarchy and down
again; colour gradient source → target in 2^6 segments.

## The lift

Leaves live on a sphere instead of a circle, and the internal nodes the bundles pass
through are real points inside it, so the bundles become curves in 3D that dive
toward the centre exactly as deep as the hierarchy makes them.

What d3.cluster still decides (run as the notebook does, including the notebook's
`bilink` and sort):
- `leaf.x`: longitude of every leaf, verbatim.
- `node.x` of internal nodes: their longitude too (cluster gives the mean of children).
- `node.y`: used only as depth (`node.depth`).

What the sphere adds:
- `R = 10`. Leaf latitude: siblings fan symmetrically about the equator by rank
  `i` of `k` (sibling order after the notebook's sort):
  `lat = ((i + 0.5)/k − 0.5) · 90° · min(1, k/10)`. Leaf position
  `R · (cos lat cos x, sin lat, cos lat sin x)` with x its longitude.
- internal node at depth d (root depth 0, height H): radius `R · d/H`, direction =
  normalised mean of its leaves' unit vectors (root at the origin).
- bundle curve for import s → t: control points = positions of `s.path(t)`;
  `d3.curveBundle` straightening with β = 0.85 applied in 3D
  (`p_i' = β p_i + (1−β)(p_0 + (i/(n−1))(p_{n−1} − p_0))`), then a uniform cubic
  B-spline (the 3D `curveBasis`) sampled at 8 points per control interval.
- colour: the notebook's `d3.interpolateRdBu`-based `color(t)` … use the notebook's
  `color` cell verbatim, sampled per vertex along the curve (`LineGeometry.setColors`),
  so one Line2 per import rather than 64 segment paths. Opacity 0.6, linewidth 1 px.

Extents: sphere → depth ratio ≈ 0.9.

## Marks

- node: one sphere `Mesh` per `root.descendants()` (252 — the internal nodes are
  drawn small and grey, since in 3D they are the bundle waypoints and worth seeing;
  leaves coloured `#333`, radius 0.08R·… tune so 220 leaves read as dots).
- link: one Line2 per import (764), `a` = source id, `b` = target id.
  `expected = { nodes: 252, links: 764 }` (the page counts `leaf.outgoing`).
- labels: leaves only, as the notebook; tangent to the sphere at the leaf, baseline
  along the leaf's longitude direction, anchored start outward (radially away),
  flipped to read left-to-right from camera A.

## Camera

Sphere axis = up. fov 40, elevation 25°, azimuth 30°, fill 0.85. Picking samples
front-facing nodes per camera (leaves carry `normal` = their unit vector; internal
nodes carry none and are always eligible).

## Primitives for `src/`

`src/bundle.js`: `bundleCurve(points, beta, samplesPerSpan)` → Vector3[]
(straightening + uniform B-spline). Reuses `fatLine` with per-vertex colours; extend
`link.js` only if `fatLine` cannot take colours — prefer a new `fatLineColored` in
`bundle.js` to avoid touching shared files.

## For three-rs

d3 modules: d3-hierarchy (hierarchy, cluster), d3-array (ascending), d3-interpolate
(the colour ramp). Layout: latitude fan + inward internal nodes + 3D curveBundle,
~40 lines.
