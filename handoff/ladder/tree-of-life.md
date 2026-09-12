## N. tree of life → cylinder (angle × cluster depth × branch length)

| artefact | path |
| --- | --- |
| page | `examples/d3_tree-of-life.html` |
| screenshot | `examples/screenshots/d3_tree-of-life.jpg` (400×250) |
| marks | `marks/d3_tree-of-life.json` (381 nodes, 380 links, 191 extensions, 381 labels) |
| layout note | `layouts/tree-of-life.md` |
| reference render of the original notebook | `ref/tree-of-life.png` (954×954, constant radius); `ref/tree-of-life-length.png` (branch length) |
| eyeball render | `handoff/ladder/tree-of-life-1600x1000.png` |

Source notebook: `d3-gallery/notebooks/hierarchies/tree-of-life`, data
`files/life.txt` (Newick, vendored byte for byte at `examples/data/life.txt`).
The notebook's `parseNewick`, `maxLength`, `setRadius`, `setColor` and `color`
cells are used verbatim: 381 nodes (191 leaves, 190 internal — a binary tree,
height 20), 380 links; `maxLength(root)` = 2.65671. Three nodes in the file are
unnamed (the root, the clade above Eukaryota/Archaea, one at depth 12).

**d3 modules needed:** d3-hierarchy (`hierarchy(data, d => d.branchset)`,
`sum`, `sort`, `cluster().size([360, R]).separation(() => 1)`, `links`,
`leaves`), d3-array (`ascending`, `max`), d3-scale (`scaleOrdinal`),
d3-scale-chromatic (`schemeCategory10`). The DOM half (selection, transition,
the checkbox) is not used.

**3D layout:** the notebook has to choose one radius (cluster depth or branch
length, its checkbox); the cylinder shows both. Axis +y. Angle around the axis
= `(x − 90)°` as in the notebook's `linkStep` (its screen x → world +x, its
screen y → world +z, so the view down the axis with +z at the bottom is the
notebook's picture). Radius from the axis = cluster depth `y` in `0..R`,
`R = 10` (root on the axis, every leaf on the rim). Height = cumulative branch
length from `setRadius(root, 0, H / maxLength(root))`, `H = 8`. Node box
`19.999 × 8.000 × 19.999`, depth ratio 0.400. Full spec in
`layouts/tree-of-life.md`; the mapping is five lines (`src/step.js`
`cylinderPoint`).

**Marks:** one `Mesh(SphereGeometry(0.12))` per node, coloured by `setColor`
(null → black; 4 materials). One `Line2` per link: the 3D `linkStep`
(`src/step.js` `stepCurve`) — an arc at the source's (radius, height) from the
source angle to the target angle, sampled every 2°, then one straight segment to
the target's (radius, height); colour = the target's `setColor` colour, opaque,
2 px (the notebook's 1 px after the harness's 2× render and box filter). One
`Line2` per leaf of a new mark kind **`extension`** (`a` = the leaf id): from the
leaf's point straight up the rim to height `H`, black at opacity 0.25, 2 px —
the notebook's `linkExtension`, which restores the clean ring; its dumped
position is the extension's midpoint. `expected = { nodes: 381, links: 380,
extensions: 191 }`; `src/d33.js`'s counts gate learned `extension` /
`expected.extensions` (defaults to 0, other pages unchanged).

**Labels:** every node (381; the labels gate is `count === nodes`), same
primitive and dependency as the earlier entries (lib3 `sdf-text`,
`src/labels.js`, Roboto Regular, `#333` on a white halo 0.25), text
`name.replace(/_/g, " ")`, empty for the three unnamed nodes. Leaves are anchored
at the top of their extension (rim, height `H`) and lie in the radial vertical
plane — local +x = the leaf's radial direction outward, +y = the axis — pushed
outward by 0.4, anchor start, so from above they read exactly like the
notebook's rotated text; internal nodes sit at their own point, anchor end,
0.27 inward along their radius. `fontSize = min(8 px at target distance, leaf
pitch 2πR/191 = 0.329) = 0.329` world units (3.13 px at 400×250, 12.5 px at
1600×1000). Mirror check from camera A flips 192 of 381. Every label's anchor
position, quaternion, anchor and string is in `marks/d3_tree-of-life.json`
`labels[]`.

**Camera:** PerspectiveCamera fov 40, elevation 35°, azimuth 25°, fitted at 0.85
fill to the projected nodes plus the far ends of the leaf labels (three refit
iterations). Fixed; one frame. (Azimuth 30–40° hides one sampled rim leaf behind
its 0.36-away neighbour from camera A; 20–28° is a clean 20/20 run.)

**Gates:** depth 0.400 · counts 381/381, 380/380, extensions 191/191 · angle
0.2606 / 0.2522 · picking 20/20 from both cameras (sampledA 20, sampledB 20) ·
labels 381/381. `e2e:twice` 0 px (both raw PNGs sha256 `281f3f2d…9a4f3`).

**Shared-file changes on this branch:** `src/d33.js` counts gate, +3 lines and
two doc lines (mark kind `extension`, `expected.extensions`). `tools/ref.js`
gained three additive env knobs — `REF_VALUES` (JSON merged over the presets:
this notebook's `width` cell is 954, and presets shadow cells), `REF_SVG_SIZE`
(size given to a returned SVG that has only a viewBox), `REF_THEN` (cells to
evaluate after `chart`: `update` with `showLength: true` for the branch-length
reference). Existing references render byte-identically without them
(`ref/cluster.png` checked). `src/step.js` added.

**Gap:** leaf labels in the radial vertical plane are edge-on at the near and far
sides of the rim from any side view, so at 35° elevation the labels at the top
and bottom of the frame do not read; the left and right quadrants do, and all of
them read from above. The notebook's hover (highlight the ancestry) is not
lifted. The per-frame 180° label flip is the director's on merge.
