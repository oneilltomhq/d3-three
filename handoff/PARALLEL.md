# Parallel examples (from rung 4 on)

After rung 3 the shared primitives (`src/d33.js`, `nodes.js`, `link.js`, `frame.js`,
`orbit.js`, `labels.js`, the harness, the server) are frozen for parallel workers.

Each example runs in its own worktree: from `~/src/projects/d33/`,
`git worktree add ex-<slug> -b ex-<slug> rung0`. Rules for a parallel worker:

1. Add files only. New primitives go in new files under `src/`. Do not edit any
   existing file in `src/`, `test/e2e/`, or another example's page/layout/marks.
   Exception: `package.json` deps, and only if unavoidable — say so in the report.
2. Your ladder entry goes in `handoff/ladder/<slug>.md`, not in LADDER-FOR-THREE-RS.md;
   the director concatenates it on merge.
3. Run `npm run e2e <your file>` and `e2e:twice <your file>` in your worktree; the
   harness serves your worktree. The unfiltered run is the director's job on merge.
4. Do not start a standing server; the harness starts and stops its own on 1234. If
   1234 is busy (another worker's harness), retry; do not kill anything.
5. Commit on your branch with `<slug>:` messages and the attribution trailer given
   in your instructions. Never touch `main/` or `rung0/`.
