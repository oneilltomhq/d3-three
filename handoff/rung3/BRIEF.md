# Rung 3 brief: text labels via lib3 sdf-text (director: Opus; worker: Opus)

Not a new example. Rung 3 adds the label primitive both finished examples lack, applies it
to `d3_cluster` and `d3_tree`, and regenerates their references. Read HANDOFF.md,
handoff/rung0/LOG.md, handoff/rung1/BRIEF.md, handoff/rung2/BRIEF.md, src/*.js, both
example pages, layouts/cluster.md, layouts/tree.md.

## Source: `~/src/projects/lib3` (do not modify it)
- `dist/sdfText.js` (ESM, built from `src/sdf-text/`): `BatchedText`, `Text`,
  `VectorFont`, `VectorFontAtlas`. README §"SDF Text" documents the API. Vector path via
  `font:` URL (TTF) gives font-file metrics; Roboto Regular is at
  `examples/assets/fonts/Roboto-Regular.ttf`.
- Imports `three/webgpu` and `three/tsl` bare; lazy-imports `opentype.js` as a sibling
  chunk (`dist/opentype-*.js`) and `dist/edt-*.js`.
- lib3 declares peer three >= 0.180. FIRST TASK: confirm the vendored three build (commit
  3d010ef) satisfies this and that `BatchedText` renders at all under it. If it does not,
  stop and report the exact error before anything else.

## Decisions
1. Serve lib3 at `/lib3/*` → `~/src/projects/lib3/dist/*` (env `LIB3_DIR`), same pattern as
   `/build/` and `/jsm/`. Importmap gets `"lib3/sdf-text": "/lib3/sdfText.js"`. Copy
   `Roboto-Regular.ttf` into `examples/fonts/` (committed; it is the deterministic glyph
   source). Record lib3's commit hash in handoff/rung3/LOG.md.
2. `src/labels.js`: `hierarchyLabels(root, ids, positions, opts)` → `{ batched, labels }`.
   One `Text` per hierarchy node (252), all in one `BatchedText` (sized to the node count
   and total glyph count; fail loudly if the atlas would overflow). Content `d.data.name`;
   `outlineWidth` giving a white halo, the 3D counterpart of the notebook's
   `paint-order: stroke`; fill `#333`; font size chosen so a label is ~8 px tall at
   400×250 (tune, note the value).
3. Orientation is NOT billboarded by default. `opts.orient` is a function
   `(node) → Quaternion` (or a Matrix4 basis) and each page supplies its own:
   - cluster: label in the vertical plane through the node and its parent cone's axis,
     text baseline horizontal, facing outward from the axis (i.e. away from the parent's
     x/z). Leaves: anchored start, offset outward; internal: anchored end, offset inward.
   - tree: label in the blade's plane (rotation θ_i about the vertical axis), baseline along
     the blade's radial direction. Leaves anchorX start offset +radial; internal anchorX
     end offset −radial. This is the notebook's placement rotated with the subtree.
   `opts.billboard: true` overrides orient and copies the camera quaternion into every
   label each frame (implement it, keep it off in both pages; note it in the layout notes).
   Text must never be mirrored: check that the label's local +x projects to the right of
   its own −x from camera A, flip 180° about the label's up axis if not.
4. Labels are not marks. `register()` gets `labels: { count }` and `report()` includes
   `labels: { count, expectedNodes, pass: count === nodes }`; a fifth gate line in the
   harness output. Picking still raycasts `pickables` only, so labels never occlude nodes
   in the gate; but ensure labels render after nodes (renderOrder or depthWrite) so they are
   readable in the screenshot.
5. Regenerate `examples/screenshots/d3_cluster.jpg` and `d3_tree.jpg` with `--make`; then
   `npm run e2e` unfiltered green, `e2e:twice` for both = 0 px. Marks JSON for both must be
   byte-identical to before (labels change nothing about mark positions) — prove with git.
6. Eyeball renders: add `--size WxH` to the harness (default 400x250, must not change the
   reference path) writing to `handoff/rung3/eyeball/<file>-<W>x<H>.png`; produce 1600×1000
   for both examples. These are for the user, not references.
7. Font loading: `await` the vector font before the first `sync()`; the harness's
   `_renderStarted` gate means the page must not set up its RAF until labels are laid out.
   Two-run identity proves the atlas is deterministic; if it is not, find out why
   (canvas rasterization in the SDF path is the suspect) and report.
8. Update layouts/cluster.md and layouts/tree.md ("Marks" → add a "Labels" section) and
   both entries in handoff/LADDER-FOR-THREE-RS.md: lib3 sdf-text is now a dependency of the
   ladder and three-rs needs an SDF-text equivalent; describe what the layout note supplies
   (per-label position, quaternion, anchor, string) so a port can consume it from
   `marks/` — add a `labels` array to the marks dump: `{ id, text, x, y, z, q: [x,y,z,w],
   anchorX }`.

## Rules
As before: deterministic page, no canvas/sprite marks (the SDF atlas is a texture for
labels, which §B.8 allows), never touch `main/`, at most 2 sub-workers. Commit on `rung0`
with `rung3:` messages; end each commit message with:
Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PdRMgE4MjoGjFWxJ2zT5ah

## Report
Three-version check result; label count gate for both pages; two-run identity output; the
font size and outline values chosen; how orientation was implemented per page and whether
any label needed the mirror flip; unfiltered `npm run e2e` output; paths of the two eyeball
PNGs; anything that did not survive contact with reality.
