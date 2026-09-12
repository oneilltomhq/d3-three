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

## The lift

The 2D chart has to *choose* one radius; the 3D chart shows both. Lay the tree
on a cylinder whose axis is +y:

- angle around the axis = `x` (cluster angle, degrees → radians, `x − 90` as
  in `linkStep` so the notebook's "up" is +z... pick one convention and record
  it);
- radius from the axis = cluster depth `y` (root on the axis, every leaf on the
  rim at `R`);
- height along the axis = cumulative branch length `radius` (root at 0, the
  longest path at `H`).

So the notebook's toggle becomes the vertical axis: looking down the axis you
see the constant-radius chart, looking from the side you see the branch-length
chart. Nothing about the tree is invented — `x`, `y`, `radius` are all d3's
numbers, only mapped onto a cylinder instead of a disc.

Scale: `R = 10` (20 across), `H` chosen so the box is 20 × H × 20 with depth
ratio ≥ 0.25 and the side view reads — start at `H = 8` and record what was
built. Leaves all share radius `R` but not height, so the rim is a ragged ring;
the link extensions restore the clean ring the notebook has.

## Marks

- node: small sphere per node (`d3.hierarchy` descendants, count from the
  parser — expect 381: 191 leaves + 190 internal for a binary Newick tree;
  assert against `root.descendants().length`). The notebook draws no node
  glyph, but 3D needs a solid to pick and the branch points are where the
  eye lands; keep them small (≈ 0.12) and coloured by `setColor` (null →
  `#000`). `expected.nodes` = descendants count.
- link: one fat line per `root.links()` (expect 380). Path = the 3D `linkStep`:
  an arc at the source's (radius, height) around the axis from the source
  angle to the target angle, then a straight segment to the target's (radius,
  height). Colour = target's `setColor` colour (null → black), width 1 px,
  opaque. `a`, `b` = node ids (use the descendant index — leaf names repeat in
  this file, e.g. `Escherichia_subclade`, so names are not ids).
- extension: one fat line per leaf (expect 191), from the leaf's point straight
  up the rim to height `H` (the 2D extension goes from the leaf radius to
  `innerRadius`; here leaves already sit at `R`, so the extension runs along
  the height axis instead). Black, opacity 0.25, width 1 px.
  `expected.extensions = 191`.
- labels: all leaves (191), `name.replace(/_/g, " ")`, at the top of the
  extension (rim, height `H`), pushed outward by 0.4, lying in the tangent
  plane… no: lying in the *radial vertical* plane like the notebook's radial
  text — text runs outward from the rim along the radius at the leaf's angle,
  anchor start, so from above it reads exactly like the 2D chart. Use
  `hierarchyLabels` with the `update(camera)` 180° flip (src/labels.js) so no
  label is ever mirrored. Font em: 8 px at target distance, capped so
  neighbouring labels (angular pitch 360/191 = 1.88° at R = 10 → 0.33 units)
  do not overlap — expect ≈ 0.3 units.

Colour legend (three swatches) is a 2D affordance; drop it, the three domain
colours are visible in the links.

## Camera

Camera A: elevation ≈ 35°, azimuth ≈ 30°, framed on the whole cylinder
including label corners, so the ring and the height both read. Camera B for the
angle gate is the harness's orthogonal one. Orbit attached as in the others.

## Gates

depth ratio from the 20 × H × 20 box (≥ 0.25 with H ≥ 5); counts nodes 381,
links 380, extensions 191, labels 191; angle gate over solid marks (the node
spheres); picking over the node spheres with the visibility pre-pass. The
sphere-on-a-rim geometry means nothing is hidden by construction; no `normal`
filter should be needed.

Reference: `tools/ref.js tree-of-life` renders the notebook with the checkbox
unchecked (constant radius) — that is the "from above" view of this chart;
the branch-length view is `ref/tree-of-life-length.png` if the tool can toggle
`showLength` (it is a `viewof` checkbox; setting it via the runtime's
`redefine("showLength", true)` is enough). Record both if cheap, the first is
required.
