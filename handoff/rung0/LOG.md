# Rung 0 log

Worker: Opus, 2026-09-12, branch `rung0`, worktree `d3-three/rung0`.
Goal (HANDOFF §E.21): a copy of Three's e2e harness runs against this repo,
deterministic injection is proven, and a blank page fails the depth gate honestly.

Machine: Fedora, node v24.13.0, Chromium 152.0.7977.54 from `~/.cache/puppeteer`
(puppeteer pinned to `25.9.0` exactly — `^25.0.0` resolved to 25.10.0, which wants
Chromium 152.0.7977.**75** and would have downloaded a second browser).

---

## 0. Harness files copied byte for byte

`sha256sum` of the copies in `test/e2e/` against the originals in
`~/src/vendor/three.js/test/e2e/` (three.js @ 3d010ef):

```
e9f522857cd68ee92621caad2cc397e6a6798a49b369b983aca3fa0bf83ce145  test/e2e/image.js
90f1c95c8bf845d6e5627b36bc36ec1d36cc2c0c242910527d6ff64e1075ce6f  test/e2e/deterministic-injection.js
d2b20befb6fd61594b991b49d98bb00136fae97e39c6062c6a55d3a2457a0788  test/e2e/clean-page.js
e9f522857cd68ee92621caad2cc397e6a6798a49b369b983aca3fa0bf83ce145  /home/tom/src/vendor/three.js/test/e2e/image.js
90f1c95c8bf845d6e5627b36bc36ec1d36cc2c0c242910527d6ff64e1075ce6f  /home/tom/src/vendor/three.js/test/e2e/deterministic-injection.js
d2b20befb6fd61594b991b49d98bb00136fae97e39c6062c6a55d3a2457a0788  /home/tom/src/vendor/three.js/test/e2e/clean-page.js
```

Identical. `puppeteer.js` is adapted (see §Deviations) and `server.js` is adapted
from `~/src/vendor/three.js/utils/server.js`.

---

## 1. WebGPU: lavapipe does NOT come up; Dawn/SwiftShader does

Reported first, as the brief asks. Two separate findings.

**(a) `--use-angle=vulkan` kills WebGPU on this machine.** With
`VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json` and three's exact
flag list, `navigator.gpu.requestAdapter()` returns `null` and the page falls to
the WebGL2 backend. Console text:

```
Failed to create WebGPU Context Provider
A valid external Instance reference no longer exists.
THREE.WebGPURenderer: WebGPU is not available, running under WebGL2 backend.
THREE.THREE.WebGPURenderer: WebGL Device Lost:  Message: Unknown reason
```

Measured, six page loads per flag set, same profile, same session:

```
with-angle-vulkan 0/6 null,null,null,null,null,null
no-angle-flag     6/6 adapter,adapter,adapter,adapter,adapter,adapter
```

`--use-angle=vulkan` was replaced with `--disable-vulkan-surface` (which is what
the HANDOFF flag list says anyway). WebGL is still ANGLE-on-Vulkan-on-lavapipe with
that change:

```
no-angle-flag {"adapter":"google/swiftshader/","webgl":"ANGLE (Mesa, Vulkan 1.4.328 (llvmpipe (LLVM 21.1.8 256 bits) (0x00000000)), llvmpipe)"}
with-angle-vulkan-again {"adapter":"null","webgl":"ANGLE (Mesa, Vulkan 1.4.328 (llvmpipe (LLVM 21.1.8 256 bits) (0x00000000)), llvmpipe)"}
```

With the new flag list the adapter is stable — 10/10 page loads across two browser
launches all returned an adapter.

**(b) WebGPU runs on Dawn/SwiftShader, not on lavapipe.** With `VK_DRIVER_FILES`
set to lavapipe, Dawn will not use the lavapipe ICD (a CPU Vulkan adapter) and
falls back to its bundled SwiftShader:

```
vendor=google architecture=swiftshader device=0xc0de description=SwiftShader Device (Subzero)
```

Tried and all landed on SwiftShader: `--use-webgpu-adapter=vulkan`,
`--enable-webgpu-developer-features`, `--enable-dawn-features=allow_unsafe_apis`,
`--disable-software-rasterizer`, `--enable-unsafe-swiftshader`.
Without `VK_DRIVER_FILES` the adapter becomes the real GPU
(`vendor=intel architecture=gen-12lp`) — non-deterministic, so `VK_DRIVER_FILES`
stays as the HANDOFF says.

This is **not** a silent WebGL fallback: the backend is `WebGPUBackend`, and the
harness fails any page whose `renderer.backend` is not `WebGPUBackend` (after two
browser restarts). SwiftShader is a software rasterizer, so reproducibility holds —
see item 5. Whether three-rs's wgpu side can reproduce SwiftShader output pixel for
pixel is an open question for the director.

---

## Determinism items

### 1. `Math.random()` — page vs node

`npm run determinism` (test/e2e/determinism.js), measured on a fresh page before
anything has consumed the stream:

```
== 1. Math.random ==
k   page                    node frac(sin(PI/4+k)*1e4)  equal
0   0.06781186547505058     0.06781186547505058       true
1   0.6126389947567077      0.6126389947567077        true
2   0.10126532103868158     0.10126532103868158       true
```

### 2. `performance.now()` and `Date.now()` are 0

```
== 2. clocks ==
performance.now() = 0
Date.now()        = 0
new Date().getTime() = 0
window.TESTING    = true
```

### 3. RAF fires exactly once, after `_renderStarted`

Counted in the page by wrapping the injected `requestAnimationFrame`; the count is
read 1 s after `_renderFinished`, so "exactly once" is a real claim, not a race.

```
== 3. requestAnimationFrame ==
before _renderStarted: total=0 afterStart=0
after  _renderFinished (+1s): total=1 afterStart=1
_renderStarted=true _renderFinished=true
```

### 4. The served three builds are the patched copies

`fetch()`ed from inside the page, i.e. through the harness's request interception:

```
== 4. served builds (through the harness interception) ==
{
	"three.webgpu.js": { "length": 2268203, "patchedRandom": 0, "rawRandom": 0,
	                     "trackTimestampDefineProperty": 1, "rawTrackTimestamp": 0 },
	"three.core.js":   { "length": 1458034, "patchedRandom": 4, "rawRandom": 0,
	                     "trackTimestampDefineProperty": 0, "rawTrackTimestamp": 0 },
	"three.module.js": { "length": 660470,  "patchedRandom": 0, "rawRandom": 0,
	                     "trackTimestampDefineProperty": 0, "rawTrackTimestamp": 0 }
}
```

Note for the record: in this build of three, `Math.random() * 0xffffffff` lives
only in `three.core.js` (4 hits, all in `generateUUID`), which
`build/three.webgpu.js` imports — so the page gets it via the intercepted
`three.core.js`. `three.webgpu.js` itself carries the `trackTimestamp`
`defineProperty` patch (1 hit). In every build the unpatched form is gone
(`rawRandom: 0`, `rawTrackTimestamp: 0`).

### 5. Two consecutive runs are identical

```
> d3-three@0.0.0 e2e:twice
> VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json node test/e2e/puppeteer.js --twice d3_blank

WebGPU adapter: {"vendor":"google","architecture":"swiftshader","device":"","description":""} (attempt 1)
[Browser] d3_blank: JSHandle:d3-three backend: JSHandle:WebGPUBackend JSHandle:navigator.gpu: JSHandle:true JSHandle:adapter: JSHandle:{"vendor":"google","architecture":"swiftshader","device":"","description":""}
[d3-three] d3_blank: backend=WebGPUBackend navigator.gpu=true adapter={"vendor":"google","architecture":"swiftshader","device":"","description":""}
[twice] d3_blank: sha256(test/e2e/output-screenshots/d3_blank-run1.png) = 52df94d11f6b9ed1d0c64935f4772b7b74b6772f890b50af28041fa2d0fc6dc0
[twice] d3_blank: sha256(test/e2e/output-screenshots/d3_blank-run2.png) = 52df94d11f6b9ed1d0c64935f4772b7b74b6772f890b50af28041fa2d0fc6dc0
Two runs identical: 0 differing pixels in file: d3_blank
TEST PASSED! 1 examples passed.
```

Both raw 800x500 PNGs hash to
`52df94d11f6b9ed1d0c64935f4772b7b74b6772f890b50af28041fa2d0fc6dc0`, and
`Image.compare()` on the 400x250 downscales returns 0 differing pixels.

### 6. Reference made, then diffed: 0.0% but the run still FAILS on the gates

```
> d3-three@0.0.0 e2e:make
> VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json node test/e2e/puppeteer.js --make d3_blank

WebGPU adapter: {"vendor":"google","architecture":"swiftshader","device":"","description":""} (attempt 1)
[d3-three] d3_blank: backend=WebGPUBackend navigator.gpu=true adapter={"vendor":"google","architecture":"swiftshader","device":"","description":""}
Screenshot generated for file d3_blank
  gate depth: FAIL ratio=0.000 extents=[0.000, 0.000, 0.000]      <- yellow in --make
  gate counts: PASS nodes=0/0 links=0/0
  gate angle: FAIL areaA=0.0000 areaB=0.0000 (>= 0.01)
  gate picking: FAIL sampled=0 hitA=0 hitB=0 no node marks
1 screenshots successfully generated.
```

```
> d3-three@0.0.0 e2e
> VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json node test/e2e/puppeteer.js d3_blank

WebGPU adapter: {"vendor":"google","architecture":"swiftshader","device":"","description":""} (attempt 1)
[Browser] d3_blank: JSHandle:d3-three backend: JSHandle:WebGPUBackend JSHandle:navigator.gpu: JSHandle:true JSHandle:adapter: JSHandle:{"vendor":"google","architecture":"swiftshader","device":"","description":""}
[d3-three] d3_blank: backend=WebGPUBackend navigator.gpu=true adapter={"vendor":"google","architecture":"swiftshader","device":"","description":""}
Diff 0.0% in file: d3_blank (3.1s)
  gate depth: FAIL ratio=0.000 extents=[0.000, 0.000, 0.000]      <- red
  gate counts: PASS nodes=0/0 links=0/0
  gate angle: FAIL areaA=0.0000 areaB=0.0000 (>= 0.01)
  gate picking: FAIL sampled=0 hitA=0 hitB=0 no node marks
Error: Gates failed (depth, angle, picking) in file: d3_blank
List of failed examples: d3_blank
TEST FAILED! 1 from 1 examples did not pass.
```

Process exit code: `1`.
`sha256(examples/screenshots/d3_blank.jpg) = abdffc570ab702728c231b67d35499d044d30a15c2e67a5fa8ae310a42b7a321`

### 7. The WebGPU device really initialised

```
== 7. WebGPU backend ==
{
	"backend": "WebGPUBackend",
	"isWebGPUBackend": true,
	"hasNavigatorGPU": true,
	"adapterInfo": { "vendor": "google", "architecture": "swiftshader",
	                 "device": "", "description": "" }
}
```

`adapter.requestDevice()` succeeds. Caveat (a)/(b) in §1 above: this is
Dawn/SwiftShader, not lavapipe.

---

## Blank page gate results (`gates/d3_blank.json`)

| gate | result | why |
| --- | --- | --- |
| depth | **FAIL** | extents `[0, 0, 0]`, ratio `0` (`"no node or cell marks"`) — never NaN, never a vacuous pass |
| counts | **PASS** | nodes 0/0, links 0/0 — honest: the page declares `expected: { nodes: 0, links: 0 }` and has zero marks |
| angle | **FAIL** | NDC box area 0 from both cameras, threshold 0.01 |
| picking | **FAIL** | 0 nodes sampled |
| overall | **FAIL** | |

`marks/d3_blank.json` is `{ "file": "d3_blank", "expected": {"nodes":0,"links":0}, "marks": [] }`.

This is exactly the rung 0 outcome §E.21 asks for: the harness runs, the page
renders on WebGPU, the screenshot reproduces, and the depth gate fails honestly.

---

## Deviations from BRIEF.md

1. **`--use-angle=vulkan` dropped** from the flag list, replaced with
   `--disable-vulkan-surface`. The brief said to keep three's real flags; with that
   flag WebGPU cannot start at all here (§1a). The replacement is the flag the
   HANDOFF's own list names.
2. **WebGPU is Dawn/SwiftShader, not lavapipe** (§1b). Nothing to do about it from
   here; `VK_DRIVER_FILES` is kept because it still forces lavapipe for WebGL/ANGLE
   and keeps the real Intel GPU out of WebGPU.
3. **`ensureWebGPU()` warm-up added** to `puppeteer.js`. The first Chromium launch
   on a cold/idle profile reliably gets a `null` adapter; a restart fixes it. The
   harness now probes for an adapter before any measurement and restarts up to 5
   times, and each example gets up to 2 browser restarts if its page comes up on
   the WebGL backend. It never accepts the fallback: no adapter → red message and
   exit 1.
4. **Gate failure does not block `--make`.** In `--make` the gates are printed
   yellow and the reference is still written, because you cannot diff against a
   reference that does not exist. In a normal `e2e` run a gate failure is a red
   test failure exactly as the brief specifies.
5. **Puppeteer pinned to exactly `25.9.0`**, not `^25`, so it reuses the Chromium
   already in `~/.cache/puppeteer` (see header).
6. **`npm run determinism` added** (`test/e2e/determinism.js`) so items 1–4 and 7
   are reproducible instead of being one-off notes. Not in the brief's script list.
7. Angle gate threshold implemented as "NDC bounding-box area ≥ 0.01 of the
   viewport". The brief's parenthetical "(2% per side)" does not match 0.01 of the
   area (2% per side would be 0.0004); the numeric threshold 0.01 was used, and the
   per-side widths are reported in `gates/*.json` alongside it.

## Open questions for the director

- SwiftShader vs lavapipe: three-rs will render with wgpu on lavapipe. If the
  three-rs grader compares against d3-three's screenshots pixel for pixel, the
  rasterizers differ. Is the d3-three screenshot a visual anchor (fine) or a pixel
  reference (needs thought)?
- The picking gate currently raycasts `scene.children` recursively. Once examples
  add helpers/grids, those will occlude nodes; we may need a `pickables` layer in
  `register()`.

## Director rulings (Fable, after review)

- **Rasterizer.** d3-three renders WebGPU on Dawn's SwiftShader; three-rs renders wgpu on
  lavapipe. Screenshots are therefore visual anchors for three-rs, never a pixel grader.
  The pixel-exact contract between the two projects is `marks/d3_<slug>.json` (positions,
  counts, link endpoints). Record this in LADDER-FOR-THREE-RS.md when it is first written.
- **Pickables.** `register()` gains an optional `pickables` list (defaults to the node/cell
  mark objects); the picking gate raycasts only those, so grids and helpers cannot occlude.
- Flag substitution (`--disable-vulkan-surface` for `--use-angle=vulkan`), exact puppeteer
  pin, WebGPU warm-up and `--make` not blocking on gates are accepted as-is.

---

## Rung 1 correction (worker: Fable, 2026-09-12)

Rung 0's determinism items 5 and 6 held, but the images they were comparing were
empty. On this machine the headless compositor never receives the GPU canvas:
`page.screenshot()` returns only the page's CSS background, for WebGL and WebGPU
alike. `d3_blank.jpg` was black because the blank page's `body` is `#000`, not
because the renderer drew a black scene. Three's own harness has the same
problem here — `npm run test-e2e -- --make webgpu_lines_fat` in
`~/src/vendor/three.js` produces a blank white jpg.

Measured with a bare WebGPU clear-to-red on a 200×100 canvas:

```
flags                                    webgl px       webgpu px      toDataURL
rung0 (--disable-vulkan-surface)         0,0,0          0,0,0          0,0,0
+ --use-gl=angle --use-angle=swiftshader 0,255,0        0,0,0          255,0,0
```

Two things had to change, both in `test/e2e/puppeteer.js`:

1. **Read the canvas, not the page.** `grabCanvas()` calls
   `canvas.toDataURL('image/png')` on the registered renderer's canvas, which
   goes through Chrome's own readback path. It first draws one more frame and
   awaits `device.queue.onSubmittedWorkDone()`, because the injected RAF sets
   `_renderFinished` *before* the callback runs and a WebGPU frame can still be
   in flight. Same size as the viewport, so `Image.scale(1/2)` is unchanged.
2. **`VK_DRIVER_FILES` (lavapipe) had to go**, and `--enable-unsafe-swiftshader
   --use-gl=angle --use-angle=swiftshader --use-webgpu-adapter=swiftshader`
   added. With `VK_DRIVER_FILES` set, the canvas readback comes back fully
   transparent (measured: 400000/400000 px at rgba 0,0,0,0) even though the
   frame renders. Without it, and with those flags, Dawn *still* selects its
   SwiftShader adapter — `{"vendor":"google","architecture":"swiftshader"}` —
   so the rasterizer, and therefore determinism, is unchanged. `ensureWebGPU()`
   now fails the run if the adapter is not SwiftShader, so this cannot silently
   drift onto the real Intel GPU. The `VK_DRIVER_FILES=...` prefix is gone from
   the npm scripts and both harness scripts scrub it from the child env.

`examples/screenshots/d3_blank.jpg` was regenerated and now shows the blank
page's actual clear colour (`#0b0b12`). The blank page still fails depth, angle
and picking and passes counts, exactly as before.

## Director ruling: planar lifts (after eyeballing sunburst and treemap)

The user's verdict on the sphere sunburst and the stacked treemap: the 3D adds
nothing the 2D chart did not already say. New rule for the ladder: lift a
chart into 3D only where the third axis obviously wins (cluster cone, tree
fan, bundling sphere, force, pack, tree of life). Where it does not, render
the 2D chart faithfully inside the 3D world — flat, orbitable, properly lit,
labels in the plane as the notebook places them — and be proud of that.

Gate consequence: a page may `register({ planar: true })`. The depth gate
still reports the ratio but passes with `note: 'planar by ruling'`. Counts,
angle (two cameras still see different projections of a plane), picking and
labels apply unchanged. `planar` is written into the marks JSON so three-rs
knows which class the example is in.
