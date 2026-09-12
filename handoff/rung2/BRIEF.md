# Rung 2 brief: tidy tree → radial fan of tidy planes (director: Fable; worker: Opus)

Read HANDOFF.md, handoff/rung0/LOG.md (harness contract + rulings), handoff/rung1/BRIEF.md
(the pattern you are repeating), examples/d3_cluster.html and src/*.js (reuse them), and
layouts/tree.md — the design. Implement it; if a number must move to pass a gate or to look
right, move it and update the note.

## Deliverables (as rung 1, slug `tree`)
1. `examples/d3_tree.html`, data `/gallery/hierarchies/tree.v2/files/flare.json`.
2. `examples/screenshots/d3_tree.jpg` via `npm run e2e:make d3_tree`; `npm run e2e d3_tree`
   all gates green; `npm run e2e:twice d3_tree` = 0 px.
3. `marks/d3_tree.json`, `gates/d3_tree.json` (252 / 251).
4. `layouts/tree.md` kept true.
5. `ref/tree.png` via `tools/ref.js hierarchies/tree.v2`.
6. Second entry in `handoff/LADDER-FOR-THREE-RS.md`.
7. Director ruling: `npm run e2e` with no filter must skip `d3_blank` (it is a rung 0 fixture,
   not an example) and pass; keep `npm run e2e d3_blank` working explicitly. Run the
   unfiltered `npm run e2e` at the end and paste it: both cluster and tree green.
8. If you lift shared code into `src/nodes.js`, `d3_cluster.html` must use it too and
   `npm run e2e d3_cluster` must still be `Diff 0.0%` (the reference must not change).

## Rules
As rung 1: one Object3D per datum, no sprites/canvas/instancing, deterministic page, white
background, no labels. Fan out at most 2 sub-workers and only if genuinely parallel.
Commit on `rung0` with `rung2:` messages and the attribution trailer. Never touch `main/`.

## Report (§E.24)
Gate numbers, layout as built with any numbers changed and why, primitives added/changed,
gaps, artefact paths, and the unfiltered `npm run e2e` output.
