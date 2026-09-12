# d33 ladder, for the three-rs director

What d33 leaves behind for each finished example (HANDOFF §D.19–20): the HTML
page, the harness screenshot, the marks JSON, and the layout note — plus the d3
modules the layout needs and a summary of the 3D lift.

## Contract between the two projects

**Screenshots are visual anchors, never pixel graders.** d33 renders WebGPU on
Dawn's SwiftShader (headless Chromium); three-rs renders wgpu on lavapipe. The
rasterizers differ, so a pixel comparison between the two is meaningless.

**The pixel-exact contract is `marks/d3_<slug>.json`**: one entry per datum with
its id, kind (`node` / `link` / `cell`), world position, and for links the ids of
its two endpoints. A three-rs rung matches those numbers; it uses the screenshot
only to check it is looking at the same thing.

Ruling recorded by the d33 director after rung 0; see
`handoff/rung0/LOG.md` §1 for the measurements behind it.

The gates every example passes are in `gates/d3_<slug>.json`: depth (smallest
axis extent ≥ ¼ of the largest), counts (marks == `root.descendants()` /
`root.links()`), angle (non-degenerate from two orthogonal cameras), picking
(raycasting a node's own pixel hits that node from both cameras).

---

## 1. cluster dendrogram → cone tree

| artefact | path |
| --- | --- |
| page | `examples/d3_cluster.html` |
| screenshot | `examples/screenshots/d3_cluster.jpg` (400×250) |
| marks | `marks/d3_cluster.json` (252 nodes, 251 links) |
| layout note | `layouts/cluster.md` |
| reference render of the original notebook | `ref/cluster.png` (928×2500) |

Source notebook: `d3-gallery/notebooks/hierarchies/cluster.v2`, data
`files/flare.json` (252 nodes, 220 leaves, height 4, 10 top-level packages).

**d3 modules needed:** d3-hierarchy (`hierarchy`, `cluster`), d3-array
(`ascending`), d3-scale (`scaleOrdinal`), d3-scale-chromatic (`schemeTableau10`).
The DOM half of d3 is not used at all.

**3D layout:** a cone tree. `d3.cluster().nodeSize([1,1])` still fixes the depth
coordinate (`root.height - node.height`, every leaf deepest — the dendrogram
property) and the sibling order. Breadth, which d3 spreads along a line, is
wrapped into a circle under each parent: each node gets a cone radius `R(n)`,
the smallest circle on which its children's subtree discs fit side by side
(bisection on `Σ 2·asin(g_i/R) ≤ 2π`), and each child sits on that circle at the
running angle. Depth is rescaled so the tree is as deep as the root cone is wide
(`dy = R(root)/root.height`). Result `87.7 × 38.6 × 105.0`, depth ratio 0.368.
About 70 lines, inside `examples/d3_cluster.html`; full spec in
`layouts/cluster.md`.

**Marks:** one `Mesh(SphereGeometry)` per descendant (r 0.45 leaf / 0.6
internal, internal `#555`, leaves coloured by top-level package from
schemeTableau10), one `Line2` per link (cubic bezier with control points offset
along the depth axis — the 3D `linkHorizontal` — 16 segments, `#555`, opacity
0.4, 1.5 px).

**Camera:** PerspectiveCamera fov 40, elevation 30°, azimuth 35°, fitted to the
projected node positions at 0.85 fill. Fixed; one frame.

**Gates:** depth 0.368 · counts 252/252, 251/251 · angle 0.637 / 1.032 ·
picking 20/20 from both cameras.

**Gap:** no labels. The notebook labels every node; the 3D page has none, and
`src/` has no text primitive yet.

---

## 2. tidy tree → radial fan of tidy planes

| artefact | path |
| --- | --- |
| page | `examples/d3_tree.html` |
| screenshot | `examples/screenshots/d3_tree.jpg` (400×250) |
| marks | `marks/d3_tree.json` (252 nodes, 251 links) |
| layout note | `layouts/tree.md` |
| reference render of the original notebook | `ref/tree.png` (928×1945) |

Source notebook: `d3-gallery/notebooks/hierarchies/tree.v2`, data
`files/flare.json` (252 nodes, 220 leaves, height 4, 10 top-level packages).

**d3 modules needed:** d3-hierarchy (`hierarchy`, `tree`), d3-array
(`ascending`), d3-scale (`scaleOrdinal`), d3-scale-chromatic (`schemeTableau10`).
The DOM half of d3 is not used at all.

**3D layout:** a radial fan of tidy planes. Reingold–Tilford is compositional, so
d3's tidy layout is kept verbatim and each of the ten top-level subtrees becomes
its own vertical plane ("blade"), fanned around the root like pages around a
spine: top-level child `c_i` gets azimuth `θ_i = 2π i / 10`, and every node `n`
of its subtree goes to `(n.y·cos θ_i, n.x − c_i.x, n.y·sin θ_i)`. Depth runs
radially outward, breadth vertically inside a blade, root at the origin.
`nodeSize([1, dy])` with `dy = B/5`, `B = 74` the largest blade breadth (measured
by running the layout once at `nodeSize([1,1])`). Result `83.81 × 74.00 × 84.45`,
depth ratio 0.876. About 30 lines on top of d3.tree, inside
`examples/d3_tree.html`; full spec in `layouts/tree.md`.

**Marks:** one `Mesh(SphereGeometry)` per descendant (r 0.45 leaf / 0.6 internal,
internal `#555`, leaves coloured by top-level package from schemeTableau10 —
shared with rung 1 as `src/nodes.js`), one `Line2` per link (cubic bezier with
control points offset along that blade's radial axis — the 3D `linkHorizontal` —
16 segments, `#555`, opacity 0.4, 1.5 px).

**Camera:** PerspectiveCamera fov 40, elevation 30°, azimuth 9°, fitted to the
projected node positions at 0.85 fill. Azimuth 9° is 9° off every edge-on blade
for both the gate's orthogonal cameras (blades at multiples of 36°). Fixed; one
frame.

**Gates:** depth 0.876 · counts 252/252, 251/251 · angle 0.426 / 0.435 ·
picking 20/20 from both cameras.

**Gap:** no labels, same as rung 1.
