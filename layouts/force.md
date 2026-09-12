# force-directed graph → d3-force-3d

Source: `networks/force-directed-graph.v2` (miserables.json: 77 nodes, 254 links,
character co-occurrence in Les Misérables). 2D: `forceSimulation` with `forceLink`,
`forceManyBody`, `forceCenter`; circles r 5 coloured by `group` (schemeCategory10),
lines `#999` opacity 0.6 width `sqrt(value)`.

## The lift

Same three forces in three dimensions via `d3-force-3d` (`forceSimulation(nodes,
3)`), so the layout is the same physics with one more degree of freedom; clusters
that overlap in the plane separate in depth.

What d3 decides: everything — positions come out of the simulation. What the page
controls so it is deterministic and finished before the first frame:
- `simulation.randomSource(d3.randomLcg(0.5))` (d3-force-3d exposes it) so the
  jiggle and any random init are seeded independently of the harness.
- `simulation.stop()` then tick synchronously to convergence:
  `n = ceil(log(alphaMin) / log(1 − alphaDecay))` ticks (≈ 300 with the defaults).
  No animation; the page renders the converged state.
- forces: `forceLink(links).id(d => d.id)`, `forceManyBody()`, `forceCenter(0,0,0)`.
  Distances at d3's defaults; scale the result so the largest axis extent is 20.
- Node order and link order as in the file.

## Marks

- node: sphere `Mesh` per node (77), radius 0.35 (≈ the notebook's r 5 relative
  to the 928 frame), colour `schemeCategory10` by group, white outline via a slightly
  larger back-face white sphere is NOT allowed (that is two objects per datum);
  use a `MeshStandardMaterial` with a light emissive instead. `expected.nodes = 77`.
- link: fat line per link (254), straight, `#999` opacity 0.6, linewidth
  `sqrt(value)` px. `a`, `b` = node ids. `expected.links = 254`.
- labels: all 77, `d.id`, planar: each label lies in the plane facing camera A's
  initial direction, orientation baked at layout time (not per-frame billboard);
  offset +x by node radius + 0.1, anchor start. Record the quaternion.

## Camera

fov 40, elevation 20°, azimuth 30°, fill 0.85. Depth gate: 3D many-body layouts are
close to isotropic; expect ratio > 0.6. If below 0.25 the simulation has collapsed
to a plane — check `forceCenter` is 3-argument and the init is 3D.

## Primitives for `src/`

Nothing new expected. If a straight fat line helper is needed, `fatLine` already
takes a two-point array.

## For three-rs

d3 modules: d3-force-3d (forceSimulation, forceLink, forceManyBody, forceCenter),
d3-random (randomLcg), d3-scale-chromatic (schemeCategory10). Layout: the seeded,
synchronously converged simulation; three-rs ports the force integrator.
