# rung 3 log — labels

Branch `rung0`, worktree `d33/rung0/`. lib3 read from `~/src/projects/lib3`
(commit `b20b053ff649054259be85633338e27046e5d564`, `dist/` prebuilt, not
touched). Vendored three at `3d010ef` (package.json `0.185.0`, `REVISION
'186dev'`).

## Three-version compatibility check (first task)

- lib3 peer range `three >= 0.180.0`: 0.185.0 satisfies it.
- Smoke page (temporary, deleted) with one `BatchedText` of 15 glyphs on the
  vendored `three.webgpu.js` + WebGPUBackend/SwiftShader: the atlas builds
  (opentype + EDT chunks load from `/lib3/`), glyphs render (1496 dark px), so
  the NodeMaterial and SDF sampling work.
- **What did not work:** member transforms. A `Text` at (4, 2, 0) rendered at
  the centre of the frame. Same page under lib3's own three 0.184.0
  (`THREE_DIR=~/src/projects/lib3/node_modules/three`) renders it up-right.
  Cause: under 3d010ef `NodeMaterial.setupPosition` assigns `positionNode` to
  `positionLocal` after `InstanceNode` has applied the instance matrix, so
  BatchedText's `positionNode` (which reads `aGlyphBounds`) discards the
  per-glyph instance transform and every member collapses to the origin.
- Workaround, in `src/labels.js` only (lib3 untouched): `LabelBatch extends
  BatchedText` sets `material.positionNode = null` and overrides
  `_writeGlyphMatrices` to bake each padded glyph quad (`GLYPH_QUAD_PAD 0.12`,
  lib3's value) into its instance matrix, `world × translate(centre) ×
  scale(w, h)`. The plain InstancedMesh path then does the transform; the
  fragment side (uv, atlas, outline) is unchanged.

## Serving lib3

`test/e2e/server.js`: mount `/lib3/` → `$LIB3_DIR/dist` (`LIB3_DIR` defaults
to `~/src/projects/lib3`). Both pages add `"lib3/sdf-text": "/lib3/sdfText.js"`
to their importmap. `examples/fonts/Roboto-Regular.ttf` copied from lib3
(sha256 `56a45233d29f11b4dfb86d248e921939d115778f87325e7ae8cc108383d6664d`)
and committed. The standing server on port 1235 was not restarted; it needs a
restart to serve `/lib3/` (kill only its PID, `nohup node test/e2e/server.js
-p 1235 &`).

## Sizing

The brief's "≈ 8 px at 400×250" was the starting point; on flare it overlaps
badly on both pages (tree: 3.16 world units against a leaf pitch of 1; cluster
2.65 against ring chords of 2.24 seen foreshortened). Rule used:
`fontSize = min( LABEL_PX / pxPerUnit, LEAF_PITCH )` with
`pxPerUnit = 250 / ( 2·D·tan(fov/2) )`, `D` the camera–target distance.

| page | leaf pitch | fontSize (world) | px at 400×250 | px at 1600×1000 |
|---|---|---|---|---|
| cluster | 0.6 · 2·1.12·1 = 1.344 | 1.344 | 4.05 | 16.2 |
| tree | dx = 1 | 1.000 | 2.53 | 10.1 |

Cluster at the full pitch (2.24, 6.75 px) was legible but the near and far
sides of each ring overlap from 30° elevation; 0.6 reads as a dendrogram.
Fill `#333`, `outlineWidth 0.25`, `outlineColor #fff`, offsets leaf 0.80
(0.45 + 0.35), internal 0.95 (0.6 + 0.35). Flare: 2370 glyphs, 50 distinct
characters (atlas has 256 tiles), longest name 22 chars.

## Orientation and mirror

- cluster: `basisQuaternion(out, UP)` with `out` the horizontal parent→node
  vector (root: +x). 140/252 flipped at azimuth 35°.
- tree: `basisQuaternion(axis.get(node), UP)`, the blade's radial (root: +x).
  89/252 flipped at azimuth 9°.
- Mirror test projects `position ± localX` through camera A and flips (180°
  about local y, anchor start↔end) when +x lands left of −x. No mirrored text
  visible in either eyeball PNG.
- `billboard: true` implemented (`update(camera)` copies the camera quaternion
  and rewrites the member matrices each frame); off on both pages.

## Harness

- `register({ labels })`; `report().labels = { count, expectedNodes, pass }`,
  fifth gate line `labels: PASS count=252/252`; `d3_blank` reports
  `count=0/0 no labels registered` and still fails overall as before.
- `marks/*.json` gains `labels: [ { id, text, x, y, z, q, anchorX } ]`.
- `--size WxH` renders one frame at that size and writes
  `handoff/rung3/eyeball/<file>-<W>x<H>.png`, touching no reference. Bug found
  on the way: `new PNG({ width, height, data })` ignores `data` (pngjs
  zero-fills) — the first PNGs were fully transparent; fixed with
  `png.data = Buffer.from(...)`.

## Results

- `npm run e2e:make`: both pages green, all five gates.
- `npm run e2e` (unfiltered): Diff 0.0% both, `TEST PASSED! 2 examples passed.`
- `npm run e2e:twice`: cluster sha256
  `c13d5af075d3b874fe08ebe95121d4cff9ec5701f30420947fd7e3afb1ea3c7c` both runs,
  tree `a9fb151a7e15e0e42a2add3b6e97ab35bd13a8902be220faab2ee47f0f906376` both
  runs, 0 differing pixels — the atlas rasterisation is deterministic.
- `marks` array sha256 before/after (n = 503 each): cluster
  `45385b51c8fca81fb2850887909419ecc0c4262653c190a1d848e5231cf571ef`, tree
  `a3738a24f7552ca0d2b42ec5143f3311c7d9946589e6fa2898e50e41834afda1` —
  identical; the diff on the marks files is the new `labels` array only.
- Eyeballs: `handoff/rung3/eyeball/d3_cluster-1600x1000.png`,
  `handoff/rung3/eyeball/d3_tree-1600x1000.png`.
