# treemap → stacked partitions

Source: `hierarchies/treemap.v2` (flare.json: 252 nodes, 220 leaves, height 4).
2D: `d3.treemap().tile(d3.treemapBinary).size([1154, 1154]).padding(1).round(true)`
on the value-summed, value-sorted hierarchy; one rect per leaf coloured by
top-level ancestor (schemeTableau10); labels: name lines + formatted value.

## The lift

A treemap hides the hierarchy that produced it: only leaves are drawn. Stacking
makes it visible. Every node is a slab; a node's slab sits on top of its parent's,
covering the parent's footprint for that node, so the whole thing is a stepped
pyramid whose steps are the levels of flare and whose top faces are the notebook's
treemap exactly.

What d3.treemap still decides: `x0, y0, x1, y1` of every node (leaves AND internal
nodes — treemap sets them for all), the tiling (`treemapBinary`), padding 1, the
sort. Run it exactly as the notebook.

What the stack adds:
- footprint: `[x0, x1] × [y0, y1]` mapped to the ground plane (x → x, y → −z so the
  notebook's top-left is the far-left corner from camera A). Size scaled so the
  square is 20 × 20.
- slab for depth d occupies height `[d·t, (d+1)·t]`, `t = 20 · 0.3 / (H + 1)` where
  `H = root.height`, so the stack is 0.3 of the footprint and the depth gate holds
  (ratio 0.3).
- slab inset: a node's slab is its footprint shrunk by 0.05 on each side, so the
  step edges read as edges; the root slab is the ground.
- colour: leaves by top-level ancestor (schemeTableau10) as the notebook; internal
  slabs the same hue at 45 % lightness mix toward white; root slab `#ddd`.

Extents ≈ (20, 6, 20), depth ratio 0.3.

## Marks

- cell: one `Mesh(BoxGeometry)` per `root.descendants()` (252), mesh position at the
  box centre. `expected = { nodes: 0, links: 0, cells: 252 }`. Marks carry
  `normal = (0, 1, 0)`... no: cells are boxes; leave `normal` unset so picking
  samples all cells — a cell's centre from above is its own top face, and from
  camera B likewise (both cameras are elevated). If a low, thin slab is occluded by
  a neighbour's higher stack from camera B, raise elevation (note it) before
  touching the layout.
- labels: leaves only, as the notebook: `d.data.name` (first line only; the
  notebook's split-on-capitals and value lines are a gap), lying flat on the leaf's
  top face, baseline along +x, anchored at the leaf's far-left corner + inset,
  clipped to leaves whose footprint is at least 1.2 × label height. Labels count
  ≠ nodes here: register `labels: { count, expected: <leaves labelled> }` — the
  labels gate compares to the page's own `expected` when given (small d33.js change,
  exception (b)).

## Camera

fov 35, elevation 40°, azimuth 25°, fill 0.85.

## Primitives for `src/`

Nothing new; `BoxGeometry` and the existing label batch.

## For three-rs

d3 modules: d3-hierarchy (hierarchy, treemap, treemapBinary), d3-scale +
d3-scale-chromatic. Layout: slab height by depth over treemap's rects, ~15 lines.
