# d3-three

Eighteen charts from the [D3 gallery](https://observablehq.com/@d3/gallery)
ported to [three.js](https://threejs.org) `WebGPURenderer`. d3's layout
modules (d3-hierarchy, d3-shape, d3-scale, d3-force, d3-force-3d, d3-geo,
d3-chord, d3-sankey) still compute the layout. The DOM half of d3 (selection,
transition, zoom, drag) is replaced by Three objects, an orbit camera and
raycasting. Where a third axis helps, the layout is lifted into 3D (a cone
tree, nodes on a sphere, d3-force-3d). Where it does not, the 2D chart is drawn
flat inside the 3D world and can still be orbited.

Each page is graded by an end-to-end harness copied from three.js's own
(`test/e2e/`). It renders the page headless and diffs the frame against a
committed screenshot. It also checks that the scene is faithful to the data.

Formerly called d33.

## The pages

| | | |
| --- | --- | --- |
| [![](examples/screenshots/d3_cluster.jpg)](examples/d3_cluster.html)<br>cluster dendrogram → cone tree | [![](examples/screenshots/d3_tree.jpg)](examples/d3_tree.html)<br>tidy tree → radial fan of tidy planes | [![](examples/screenshots/d3_bundling.jpg)](examples/d3_bundling.html)<br>hierarchical edge bundling → sphere |
| [![](examples/screenshots/d3_force.jpg)](examples/d3_force.html)<br>force-directed graph → d3-force-3d | [![](examples/screenshots/d3_pack.jpg)](examples/d3_pack.html)<br>circle packing → sphere packing | [![](examples/screenshots/d3_sunburst.jpg)](examples/d3_sunburst.html)<br>sunburst (flat) |
| [![](examples/screenshots/d3_treemap.jpg)](examples/d3_treemap.html)<br>treemap (flat) | [![](examples/screenshots/d3_tree-of-life.jpg)](examples/d3_tree-of-life.html)<br>tree of life → cylinder | [![](examples/screenshots/d3_force-tree.jpg)](examples/d3_force-tree.html)<br>force-directed tree → d3-force-3d |
| [![](examples/screenshots/d3_disjoint.jpg)](examples/d3_disjoint.html)<br>disjoint force-directed graph → d3-force-3d | [![](examples/screenshots/d3_chord.jpg)](examples/d3_chord.html)<br>chord diagram (flat) | [![](examples/screenshots/d3_splom.jpg)](examples/d3_splom.html)<br>scatterplot matrix → one 3D scatter |
| [![](examples/screenshots/d3_grouped-bars.jpg)](examples/d3_grouped-bars.html)<br>grouped bar chart → bar matrix | [![](examples/screenshots/d3_spikes.jpg)](examples/d3_spikes.html)<br>spike map, spikes standing up | [![](examples/screenshots/d3_radial-bars.jpg)](examples/d3_radial-bars.html)<br>radial stacked bars, stacks lifted |
| [![](examples/screenshots/d3_ridgeline.jpg)](examples/d3_ridgeline.html)<br>ridgeline plot, series along z | [![](examples/screenshots/d3_sankey.jpg)](examples/d3_sankey.html)<br>sankey (flat) | [![](examples/screenshots/d3_globe.jpg)](examples/d3_globe.html)<br>world choropleth → globe |

`examples/d3_blank.html` is a test fixture rather than a chart. It proves the
gates fail on an empty scene, and an unfiltered `npm run e2e` skips it.

Each page also has a layout note in `layouts/<slug>.md` describing its 3D
layout. `ref/<slug>.png` is the original notebook rendered by `tools/ref.js`,
kept as a visual anchor.

## Setup

Node 24 and Linux were used to build this. The harness drives the Chromium
that puppeteer 25.9.0 installs, and WebGPU runs on Dawn's software
SwiftShader adapter, which is what keeps the frames reproducible.

```bash
npm ci
export THREE_DIR=/path/to/three.js
export GALLERY_DIR=/path/to/d3-gallery/notebooks   # globe and ridgeline only
```

- **`THREE_DIR`** is a three.js tree containing `build/three.webgpu.js`,
  `build/three.tsl.js`, `build/three.module.js` and `examples/jsm/`. A clone
  of [mrdoob/three.js](https://github.com/mrdoob/three.js) works, and so does
  the unpacked npm package (`npm pack three@0.186.1`). The committed
  screenshots pass at 0.0% against both three@0.186.1 and the dev branch at
  `5f610f5`.
- **`GALLERY_DIR`** is needed only by the globe and ridgeline pages, their
  e2e runs and `tools/ref.js`. The data the other sixteen pages read is
  committed in `examples/data/` and fetched relative to the page. Two
  gallery files are left out until their licences are checked, and those
  two pages fetch them from `/gallery/`:

```
maps/world-choropleth.v2/files/hale.csv       (d3_globe)
areas/ridgeline-plot/files/traffic.csv        (d3_ridgeline)
```

  `GALLERY_DIR` is laid out as `<section>/<slug>/files/<name>`, one directory
  per notebook such as `@d3/cluster/2`. Observable's export API
  (`https://api.observablehq.com/@d3/cluster/2.js?v=4`) lists each
  attachment's download URL. Without it, `npm run e2e` still grades the
  other sixteen pages and fails those two.

The files in `examples/data/` are the notebooks' attachments, unchanged. They
keep their notebook names except where two notebooks share a name:
`flare-imports.json` is the edge-bundling notebook's `flare.json`, and the
treemap notebook's `flare.json` is byte-identical to `flare-2.json`, so the
treemap reads that. `examples/jsm/vendor/THIRD-PARTY-NOTICES.md` lists where
each one came from. The chord diagram's data is inline in its page.

## Running

```bash
npm run serve        # http://localhost:1234/examples/d3_cluster.html
npm run e2e          # grade every page; e2e d3_tree grades one
npm run e2e:make     # rewrite examples/screenshots/ from the current render
npm run e2e:twice    # render each page twice and require 0 differing pixels
npm run determinism  # check the injected Math.random, clocks and RAF
npm test             # layout invariants for src/pack3.js
```

The pages are plain static files with an ordinary three.js import map:
`three`, `three/webgpu`, `three/tsl` and `three/addons/` point at three
0.186.1 on jsDelivr, `@oneilltom/lib3/sdf-text` at lib3 0.5.0 on jsDelivr, and
everything else (`d3`, `d3-three`, `src/`, fonts, data) is relative to the
page. Any static server works, with network access:

```bash
python3 -m http.server 8000   # from the repo root
# http://localhost:8000/examples/  lists the pages
```

`npm run serve` and the e2e harness grade against the local checkout instead.
The server mounts this repo at `/`, `$THREE_DIR/build` at `/build/`,
`$THREE_DIR/examples/jsm` at `/jsm/`, `$GALLERY_DIR` at `/gallery/` and the
lib3 package's `dist/` at `/lib3/`, and rewrites the jsDelivr prefixes in every
HTML page it serves to those mounts. So the pages pin three 0.186.1 from the
CDN, while e2e renders whatever three is in `$THREE_DIR`, offline; the harness
fails a page that makes any request outside localhost. Open the pages in a
WebGPU browser to orbit them.

`npm run e2e` loads each page under three.js's `deterministic-injection.js`,
which seeds `Math.random`, freezes the clocks and fires one animation frame.
Each frame is captured at 400×250 and compared with
`examples/screenshots/d3_<slug>.jpg` using three's `image.js`. A page fails
if more than 0.1% of its pixels differ, the same threshold three.js uses. The
harness then calls `window.d3three.report()` on the page and writes
`marks/d3_<slug>.json` and `gates/d3_<slug>.json`. A failed gate fails the
page the same way a pixel diff does:

- **depth**: the smallest axis extent of the mark positions is at least a
  quarter of the largest. Planar pages report this ratio but are exempt.
- **counts**: one scene object per datum, and the node and link counts equal
  the d3 hierarchy's `descendants()` and `links()`.
- **angle**: the marks cover a non-degenerate area seen from the page camera
  and from a second camera rotated 90°.
- **picking**: raycasting from a node's own pixel hits that node, from both
  cameras.
- **labels**: one label per labelled datum.

## The ladder

The work was built as a ladder of rungs, each one small enough to finish and
grade before the next began. Rung 0 copied the harness and proved the
injection was deterministic, with a blank page that fails the gates. Rungs 1
and 2 were the cluster dendrogram and the tidy tree, and they grew the shared
primitives in `src/`: node marks, links, framing and the orbit camera. Rung 3
added text labels through lib3's SDF text. After that the shared code was
frozen, and each further chart was built on its own branch, which added files
only, before being merged back.

Every finished rung leaves four things behind: the page
(`examples/d3_<slug>.html`), its screenshot, its marks and gates JSON, and its
layout note (`layouts/<slug>.md`), which says how the notebook's 2D layout was
lifted into 3D and is kept true to what runs.

The first charts were all lifted into 3D: a cone tree, a fan, a sphere. After
the sunburst and the treemap were eyeballed, the 3D was judged to add nothing
to them, and a ruling followed: lift a chart only where the third axis
obviously wins (cluster, tree, bundling, force, pack, tree of life), and
otherwise render the notebook's 2D chart faithfully, flat inside the 3D world,
orbitable and lit, with labels in the plane where the notebook puts them. Four
pages are planar: chord, sankey, sunburst and treemap. They call
`register({ planar: true })`. The depth gate still reports its
ratio but passes with the note "planar by ruling", every other gate applies
unchanged, and `planar` is written into the marks JSON.

## Related projects

- **[lib3](https://www.npmjs.com/package/@oneilltom/lib3)**
  (`@oneilltom/lib3`, MIT) provides the labels. Its `sdf-text` module
  (`BatchedText`, `Text`) renders SDF glyphs from
  `examples/fonts/Roboto-Regular.ttf`, and `src/labels.js` builds on it.
- **[three-rs](https://github.com/oneilltomhq/three-rs)** is a Rust port of
  three.js and `WebGPURenderer` on wgpu, graded by three.js's own e2e
  screenshots. three-rs grades against references that already exist, and
  d3-three creates references for it to grade against later. three-rs
  renders on a different rasterizer, so it cannot match these screenshots
  pixel for pixel. Its contract is `marks/d3_<slug>.json` instead: every
  datum's world position, link endpoints, and label pose. The layout notes
  in `layouts/` describe each chart for the port.

## Licence

MIT, see `LICENSE`. Some files come from other projects under their own
licences:

- `examples/jsm/vendor/d3.js` is an esbuild bundle of d3 7 (ISC) with
  d3-force-3d (MIT), built by `npm run build:d3`.
- `examples/jsm/vendor/d3-sankey.js` and `src/vendor/d3-sankey/` are
  d3-sankey 0.12.3 (BSD-3-Clause, see `src/vendor/d3-sankey/LICENSE`).
- `examples/jsm/vendor/topojson-client.js` is topojson-client 3.1.0 (ISC).
- `examples/fonts/Roboto-Regular.ttf` is Roboto 2.001047, Copyright 2015
  Google Inc. (Apache-2.0).
- `test/e2e/image.js`, `deterministic-injection.js` and `clean-page.js` were
  copied from three.js (MIT), and `puppeteer.js` and `server.js` were adapted
  from it.
- `examples/data/` holds the notebooks' data attachments, credited to their
  sources in `THIRD-PARTY-NOTICES.md`.
- The pages port code from the D3 gallery notebooks (ISC, Copyright
  Observable, Inc.; @d3/tree-of-life is Copyright Mike Bostock), and
  `parseNewick` in `examples/d3_tree-of-life.html` is Jason Davies's
  newick.js (MIT).

The full licence texts and notices are in
`examples/jsm/vendor/THIRD-PARTY-NOTICES.md`, `LICENSE-Roboto` and
`LICENSE-three.js`.
