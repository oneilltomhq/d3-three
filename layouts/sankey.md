# sankey → the notebook's sankey diagram, flat in the 3D world (planar by ruling)

Source: `networks/sankey.v2` (energy.csv: 68 links, 48 nodes derived from the
link endpoints, UK energy flows in TWh). 2D: `d3.sankey()` (d3-sankey 0.12)
`.nodeId(name).nodeAlign(sankeyJustify).nodeWidth(15).nodePadding(10)
.extent([[1, 5], [927, 595]])` in a 928 × 600 SVG; one rect per node coloured
by `category` (the name up to the first space, `schemeCategory10`) with a 1 px
black stroke; one `sankeyLinkHorizontal()` path per link, stroke-width
`max(1, width)`, stroke-opacity 0.5, `mix-blend-mode: multiply`; labels: the
node name at 10 px sans-serif, right of the node on the left half of the chart
and left of it on the right half.

Built as `examples/d3_sankey.html`; this note is kept true to what runs.

Class: **PLANAR by ruling** (`handoff/rung0/LOG.md`, director ruling on planar
lifts): a sankey is a 2D flow diagram; a third axis has nothing to encode.

## Inputs: what the notebook's defaults are

The notebook has two Observable inputs. Both are taken at the notebook's own
default value, read off `notebook.js`:

- `nodeAlign` — default **`sankeyJustify`** (the brief said `sankeyLeft`
  "the notebook's default; check"; checked: the `Inputs.select` value is
  `"sankeyJustify"`). Justify puts every sink node in the last column, which is
  what `ref/sankey.png` shows.
- `linkColor` — default **`source-target`**: a per-link `linearGradient` from
  the source node's colour to the target node's. Baked here as the **source
  colour** (one opaque material per source category); the target end of every
  ribbon is therefore the source's hue, not the target's. Recorded as a gap.

## The lift: none

The chart is the notebook's, lying in the world's ground plane (`y = 0`, up
`+y`). d3-sankey decides every node rect (`x0, y0, x1, y1`) and every link's
`y0, y1, width` exactly as the notebook — same data copy, same alignment,
nodeWidth, nodePadding, extent, default `iterations` (6). Nodes are built from
the links exactly as the notebook's `data` cell; the colour scale is consumed
in the notebook's order (all rects, then links) so every category gets the
same `schemeCategory10` swatch as in `ref/sankey.png`.

What the page adds to place it in 3D:
- mapping: notebook `x → x·S`, `y → z·S − 600·S` with `S = 20/928`, so the
  chart spans `[0, 20] × [−12.93, 0]` in `xz`. Camera A looks from `+x, +z`
  (azimuth 15°): the notebook's top edge is the far edge and its left edge the
  left edge, so the picture reads as in the notebook, not mirrored.
- nodes: each rect is a box of uniform thickness `NODE_THICK = 0.3` (1.5 % of
  the width) from `y = 0` to `y = 0.3`; a unit `BoxGeometry` hanging below its
  origin, scaled to `(15·S, 0.3, (y1−y0)·S)`. Full notebook colour
  (`schemeCategory10` by category, `MeshStandardNodeMaterial`, one per
  category). The notebook's 1 px black stroke — sub-pixel at 400×250 — is a
  black closed `Line` around each node's top rect, lifted 0.012 (`outlines`
  group; not marks, not pickable).
- links: each `sankeyLinkHorizontal()` path — a cubic Bézier from
  `(source.x1, y0)` to `(target.x0, y1)` with both control points at the mid
  x — is sampled at 33 points and offset **±max(1, width)/2 along the
  notebook's vertical** into a closed ribbon outline (`THREE.Shape`, 66
  points), extruded `LINK_THICK = 0.15` along `+y`. A vertical offset is
  the sankey convention (band height = flow value everywhere); the SVG
  stroke is perpendicular to the tangent, so on steep sections
  (Thermal generation → District heating, Electricity grid → the right
  column) the notebook's band is visually wider than the ribbon here. Ends
  are identical (horizontal tangent).
- link colour: the notebook's default is a source→target gradient at
  stroke-opacity 0.5 multiplied over white. Baked as **source category
  colour mixed 50 % toward white**, opaque (`lerp(color, white, 0.5)`,
  `MeshStandardNodeMaterial`, one per source category). Where the
  notebook multiplies overlapping translucent bands, here the later link
  in file order (the notebook's paint order) lies on top.
- link stacking: link `i` sits at `y ∈ [i·0.001, 0.15 + i·0.001]`
  (`LINK_STEP = 0.001`, max lift 0.067, top always below the node faces at
  0.3). Without this, crossing ribbons are coplanar and z-fight, and the
  picking raycast at a crossing is a coin toss between two equal-distance
  faces.
- lighting: hemisphere 2.0 + directional 1.6, as treemap; `roughness 0.75`.

Extents of mark positions `19.63 × 0.15 × 11.42` (nodes at y 0.3, links at
0.15 + lift); depth ratio 0.008 — the depth gate passes with note `planar by
ruling` (`register({ planar: true })`).

## Marks

All marks are **cells**; in this project a `link` mark means a line, and the
sankey link is a filled ribbon. `expected = { nodes: 0, links: 0, cells: 116,
labels: 48 }` — 48 nodes + 68 links, straight off the d3-sankey result.

- node cell (48): `Mesh(BoxGeometry)`, id `n<i>` in node order (the order of
  first appearance in the CSV, the notebook's), origin at the centre of the
  **top face** (y = 0.3) so `getWorldPosition` is the rect's own pixel.
  `normal = [0, 1, 0]`.
- link cell (68): `Mesh(ExtrudeGeometry)`, id `l<i>` in file order, `a`/`b`
  = the source/target node ids, origin at the centre of the ribbon's top face
  at the Bézier's `t = 0.5` (mid x between the columns, `(y0 + y1)/2`),
  y = `0.15 + i·0.001`. `normal = [0, 1, 0]`.
- Verified in the page (`window.__sankey`): every node box's world footprint
  equals its notebook rect scaled (top faces at y = 0.3); every link mark
  point is the link's own mid-point. Picking: all 116 eligible from both
  cameras; 106 (A) / 107 (B) visible — the rest have their mid-point under a
  node of the middle column or under a later ribbon (excluded by the gate's
  visibility pre-pass); 20/20 hit from both cameras, 0 misses.

## Labels

As the notebook: one `Text` per node (48), the node name, 10 px sans-serif =
`10·S = 0.2155` world units, lying in the top plane (local +x = world +x,
local +y = world −z, `basisQuaternion((1,0,0), (0,0,−1))`, faces up) at
`y = 0.312` (node top + lift). Anchor: nodes with `x0 < 464` (left half) get
`start` at `(x1 + 6 px, mid y)`; nodes on the right half get `end` at
`(x0 − 6 px, mid y)`; `anchorY middle` = the notebook's `dy 0.35em`.
Built with `hierarchyLabels` on a shim `{ descendants: () => wrappers }`: a
left-half wrapper is `{ data: node }` (a "leaf": start, +offset) and a
right-half wrapper `{ data: node, children: [] }` (an "internal" node: end,
−offset), `leafOffset = internalOffset = 6·S`. Roboto Regular, `#111`, halo
0.2 white (the notebook has no halo; the labels lie over ribbons here).
`flipped 0`; per-frame `labels.update(camera)` as every page.

Size on screen: 3.1 px em at 400×250 before foreshortening (the notebook's
10 px in a 928 px chart is 1.1 % of the width; the same fraction here),
~12.5 px at 1600×1000 — legible in `handoff/ladder/sankey-1600x1000.png`.
Labels overlap in the dense left column exactly where the notebook's do
(Biomass imports / Marine algae / Coal imports at 10 px pitch).

Dumped to `marks/d3_sankey.json` `labels[]` as `{ id, text, x, y, z, q,
anchorX }`, `id` = the node's cell id.

## Camera

PerspectiveCamera fov 35, **elevation 55°, azimuth 15°**, fill 0.85, fitted by
`frameCamera` to the 8 corners of `[0, 20] × [0, 0.312] × [−12.93, 0]` plus
every label's four block corners (refit once the labels are laid out;
labels lie inside the chart so they change the fit little). Distance ≈ 27.3
to the target (9.44, −0.60, −5.19). Camera B (rotated 90° about up) is at the
same elevation and sees the plane end-on to the flow (angle area 0.669 vs
0.580 for A; all 116 marks eligible from both). Fixed; one frame.

## Determinism

d3-sankey is pure arithmetic (relaxation for 6 iterations, no random source,
no timer); the page consumes neither `Math.random` nor the clock.
`e2e:twice` 0 px.

## Primitives for `src/`

Nothing new in `src/`. Vendored: **d3-sankey 0.12.3** — its npm `src/` verbatim
under `src/vendor/d3-sankey/` (ISC, LICENSE alongside), bundled by esbuild
from `src/vendor/d3-sankey-entry.js` into `examples/jsm/vendor/d3-sankey.js`
(ESM, d3-array/d3-shape resolved against the repo's d3 7) and mapped as
`"d3-sankey"` in the page's import map. No package.json change.
`tools/ref.js` gained one additive knob, `REF_MERGE`: comma-separated served
ESM modules whose exports are merged onto `window.d3` — what Observable's
`require("d3@7", "d3-sankey@0.12")` does — so the notebook's chart cell finds
`d3.sankey`. `ref/sankey.png` is rendered with
`REF_MERGE=/examples/jsm/vendor/d3-sankey.js
REF_VALUES='{"nodeAlign":"sankeyJustify","linkColor":"source-target"}'`.

## For three-rs

d3 modules: d3-sankey (`sankey`, `sankeyJustify`; `sankeyLinkHorizontal` is
re-derived as the Bézier above), d3-dsv (`csvParse` + `autoType`), d3-scale
(`scaleOrdinal`) + d3-scale-chromatic (`schemeCategory10`). Layout: the
notebook's sankey verbatim; node box `[x0·S, x1·S] × [0, 0.3] × [y0·S − 12.93,
y1·S − 12.93]`; link ribbon = Bézier `(source.x1, y0) → (target.x0, y1)`,
control points at mid x, ±max(1, width)/2 in y, extruded `[i·0.001, 0.15 +
i·0.001]`. Labels: per-label anchor, quaternion and anchor side in
`marks/d3_sankey.json` `labels[]`.
