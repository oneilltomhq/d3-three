# tree of life → cylinder (angle × cluster depth × branch length)

Source: `hierarchies/tree-of-life` (life.txt, Newick; parsed by the notebook's
`parseNewick` into `{name, length, branchset}`). 2D: `d3.cluster().size([360,
innerRadius]).separation(() => 1)` on `d3.hierarchy(data, d => d.branchset)`
`.sum(leaf ? 1 : 0).sort(value, then data.length)`. Links are `linkStep`
(arc at the source radius, then a radial line to the target); a link
*extension* per leaf runs from the leaf out to `innerRadius`; leaf labels sit
at `innerRadius + 4`, rotated to the leaf's angle, flipped for x ≥ 180. Colour:
`setColor` — a node named Bacteria / Eukaryota / Archaea takes
`schemeCategory10` for that name, every other node inherits its parent's, the
root and the clade above the three domains are `null` (drawn black). The
notebook's checkbox toggles the radius between the cluster depth (`y`) and the
cumulative branch length (`radius` from `setRadius`, scale
`innerRadius / maxLength(root)`).

Built as `examples/d3_tree-of-life.html`; this note is kept true to what runs.
Data is vendored at `examples/data/life.txt` (byte copy of the notebook's
`files/life.txt`); `parseNewick`, `maxLength`, `setRadius`, `setColor` and the
`color` scale are the notebook's cells verbatim.

## The lift

The 2D chart has to *choose* one radius; the 3D chart shows both. Lay the tree
on a cylinder whose axis is +y:

- angle around the axis = `x` (cluster angle in degrees, `(x − 90)° → rad`
  exactly as in the notebook's `linkStep`). Convention: the notebook's screen x
  is world +x, its screen y (down) is world +z, so looking down the axis from
  +y with +z at the bottom of the frame is the notebook's picture;
- radius from the axis = cluster depth `y` (root on the axis, every leaf on the
  rim at `R`): `d3.cluster().size([360, R]).separation(() => 1)`, i.e. the
  notebook's `cluster` cell with `innerRadius = R`;
- height along the axis = cumulative branch length `radius` (root at 0, the
  longest path at `H`): `setRadius(root, root.data.length = 0, H / maxLength(root))`,
  `maxLength(root)` = 2.65671 on this file.

So the notebook's toggle becomes the vertical axis: looking down the axis you
see the constant-radius chart, looking from the side you see the branch-length
chart. Nothing about the tree is invented — `x`, `y`, `radius` are all d3's
numbers, only mapped onto a cylinder instead of a disc.

Scale: **`R = 10`, `H = 8`** as drafted; the node box is `19.999 × 8.000 ×
19.999`, depth ratio **0.400** (gate ≥ 0.25). Leaves all share radius `R` but
not height, so the rim is a ragged ring; the link extensions restore the clean
ring the notebook has, at height `H`.

## Marks

- node: `Mesh(SphereGeometry(0.12))` per `root.descendants()` — **381** (191
  leaves + 190 internal; a binary Newick tree), asserted by the counts gate.
  The notebook draws no node glyph, but 3D needs a solid to pick and the
  branch points are where the eye lands. Colour = `setColor` (null → `#000`),
  one `MeshStandardNodeMaterial` per colour (4), geometry shared, every datum
  its own Mesh. `expected.nodes = 381`.
- link: one fat line (`Line2`, `src/link.js` `fatLine`) per `root.links()` —
  **380**. Path = the 3D `linkStep` (`src/step.js` `stepCurve`): an arc at the
  source's (radius, height) around the axis from the source angle to the
  target angle, sampled every 2° (at least one segment), then one straight
  segment to the target's (radius, height); equal angles give the two-point
  line, as the notebook omits the arc. Colour = target's `setColor` colour
  (null → black), opaque, one shared material per colour. **Width 2 px**, not
  the draft's 1 px: the harness renders at 2× and box-filters down, so 2 px is
  the notebook's 1 px stroke (bundling's finding). `a`, `b` = node ids
  (`'n' + descendant index`; leaf names repeat in this file, e.g.
  `Escherichia_subclade`, so names are not ids).
- extension: one fat line per leaf — **191**, kind `extension`, `a` = the leaf's
  id — from the leaf's point straight up the rim to height `H` (the 2D
  extension goes from the leaf radius to `innerRadius`; here leaves already
  sit at `R`, so it runs along the height axis instead). Black, opacity 0.25,
  2 px. The two-point geometry is local to the extension's midpoint and the
  Line2 is positioned there, so the mark's dumped position is that midpoint
  (on the rim, inside the node box — the depth gate counts every non-link
  mark). `expected.extensions = 191`; the counts gate in `src/d33.js` learned
  this one kind.
- labels: **leaves only (191), as the notebook** (the labels gate now takes a
  page-supplied `expected.labels`, so internal nodes are not labelled). Text
  `name.replace(/_/g, " ")`. Each label lies **flat in the horizontal plane at
  height `H`** — the plane of the clean top-rim ring — anchored at the top of
  the leaf's extension pushed outward by 0.4, baseline along the leaf's
  radius, facing +y: the notebook's layout seen from above, lifted to the top
  of the cylinder, so no label is edge-on from any elevation. The notebook's
  flip rule: `x < 180` → local +x = radial outward, anchor start;
  `x ≥ 180` (96 leaves) → its `rotate(180)`: local +x = radial inward, anchor
  end, so the text still sits outward of the rim. Local up is the horizontal
  tangent `(out.z, 0, −out.x)` so `basisQuaternion(out, up)` faces +y.
  Implemented on the unchanged `hierarchyLabels` by handing it the leaves as
  shims `{ data, x, children: x < 180 ? undefined : [] }` — a "node with
  children" is exactly anchor end, offset −internalOffset along +x, with
  `internalOffset = leafOffset = 0.4` (the force page's shim trick). Font em =
  `min(8 px at target distance, leaf pitch)` with leaf pitch `2πR / 191 =
  0.329`: **0.329 world units = 3.13 px** at 400×250 (12.5 px at 1600×1000);
  at the label radius 10.4 the pitch is 0.342, so neighbours do not overlap.
  `hierarchyLabels`'s static mirror check from camera A flips **26 of 191**
  (about the label's own up axis, so those face −y); the per-frame 180° flip
  (`labels.update(camera)`) that fixes the halves seen from behind is the
  director's on merge, not implemented here. Roboto Regular, fill `#333`,
  halo 0.25, as the other examples. `expected.labels = 191`.

Colour legend (three swatches) is a 2D affordance; dropped, the three domain
colours are visible in the links.

## Camera

Camera A: PerspectiveCamera fov 40, elevation 35°, **azimuth 25°** (the draft
said ≈ 30: at 30–40° one sampled rim leaf, `Mycobacterium paratuberculosis`,
is hidden behind its 0.36-away neighbour from camera A at the grazing angle;
20–28° is a clean 20/20 run and 25 is its middle), fill 0.85, fitted to the
projected nodes plus every leaf label's far end (`0.4 + 0.5 em · length` along
the radial at height `H`, three refit iterations) — the notebook's 170 px label
margin. Camera B for the angle gate is the harness's orthogonal one. Orbit
attached without damping; one frame.

## Gates (`gates/d3_tree-of-life.json`)

depth 0.400 (`19.999 × 8.000 × 19.999`) · counts 381/381 nodes, 380/380 links,
191/191 extensions · angle 0.2606 / 0.2522 · picking 20/20 from both cameras
(sampled 20) · labels 191/191. No `normal` filter needed: the sphere-on-a-rim
geometry hides nothing by construction. `e2e:twice` 0 px.

## Primitives for `src/`

`src/step.js` (new, add-only): `cylinderPoint(θ, r, h)` and
`stepCurve(θ0, r0, h0, θ1, r1, h1, arcStep)` → Vector3[]. `src/d33.js`: the
counts gate accepts mark kind `extension` against `expected.extensions`
(defaults to 0), and the labels gate accepts a page-supplied `expected.labels`
(defaults to the node count) — every other page is unchanged. `link.js`, `labels.js`,
`frame.js`, `orbit.js` untouched.

## Reference

`REF_VALUES='{"width":954}' REF_SVG_SIZE=954 node tools/ref.js hierarchies/tree-of-life`
→ `ref/tree-of-life.png` (954×954), the checkbox unchecked (constant radius):
the "from above" view of this chart. The branch-length view,
`ref/tree-of-life-length.png`, is the same with
`REF_VALUES='{"width":954,"showLength":true}' REF_THEN=update REF_SETTLE_MS=1500`
and the output path as the third argument. The three env knobs are additive to
`tools/ref.js` (the notebook's `width` cell is 954 and its SVG has a viewBox but
no size, which the tool's presets did not cover).

## Gaps

- Labels on the half of the rim facing away from the camera are seen from
  behind (mirrored / upside down in the flat plane) until the director's
  per-frame flip lands; the static mirror check only corrects left-right.
- The notebook's hover (`link--active` up the ancestry) is not lifted.
- `marks/d3_tree-of-life.json` `expected` carries only `nodes`/`links` (the
  harness writes `report.expected` as is); `extensions` is in
  `gates/d3_tree-of-life.json` `counts.expectedExtensions`.

## For three-rs

d3 modules: d3-hierarchy (hierarchy, cluster), d3-array (ascending, max),
d3-scale (scaleOrdinal), d3-scale-chromatic (schemeCategory10). Layout: the
notebook's own cells plus the cylinder mapping above (`cylinderPoint`, ~5 lines)
and `stepCurve` (~20 lines). Every node position, link endpoint pair, extension
midpoint and leaf label (position, quaternion, anchor, string) is in
`marks/d3_tree-of-life.json`.
