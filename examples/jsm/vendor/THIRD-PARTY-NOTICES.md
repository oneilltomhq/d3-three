# Third-party notices

The files in this directory, and some other files in this repository, come from
other projects. Their licences and notices are reproduced below. The rest of
d3-three is under the MIT licence in `/LICENSE`. The Roboto font and the
three.js harness files have their own files at the root: `/LICENSE-Roboto` and
`/LICENSE-three.js`.

- [d3.js](#d3js): d3 7 and d3-force-3d, bundled by `npm run build:d3`
- [d3-sankey.js](#d3-sankeyjs): d3-sankey 0.12.3 (BSD-3-Clause)
- [topojson-client.js](#topojson-clientjs): topojson-client 3.1.0 (ISC)
- [D3 gallery notebooks](#d3-gallery-notebooks): code ported into `examples/d3_*.html` and `ref/*.png` (ISC)
- [Data in examples/data](#data-in-examplesdata): the notebooks' file attachments and where their data comes from
- [newick.js](#newickjs): `parseNewick` in `examples/d3_tree-of-life.html` (MIT)

## d3.js

`d3.js` is an esbuild bundle of `src/vendor/d3-entry.js`
(`export * from 'd3'; export * as force3d from 'd3-force-3d'`). It contains
the following packages:

| package | version | licence | copyright |
| --- | --- | --- | --- |
| d3 | 7.9.0 | ISC | Copyright 2010-2023 Mike Bostock |
| d3-array | 3.2.4 | ISC | Copyright 2010-2023 Mike Bostock |
| d3-axis | 3.0.0 | ISC | Copyright 2010-2021 Mike Bostock |
| d3-binarytree | 1.0.2 | MIT | Copyright (c) 2017 Vasco Asturiano |
| d3-brush | 3.0.0 | ISC | Copyright 2010-2021 Mike Bostock |
| d3-chord | 3.0.1 | ISC | Copyright 2010-2021 Mike Bostock |
| d3-color | 3.1.0 | ISC | Copyright 2010-2022 Mike Bostock |
| d3-contour | 4.0.2 | ISC | Copyright 2012-2023 Mike Bostock |
| d3-delaunay | 6.0.4 | ISC | Copyright 2018-2021 Observable, Inc. |
| d3-dispatch | 3.0.1 | ISC | Copyright 2010-2021 Mike Bostock |
| d3-drag | 3.0.0 | ISC | Copyright 2010-2021 Mike Bostock |
| d3-dsv | 3.0.1 | ISC | Copyright 2013-2021 Mike Bostock |
| d3-ease | 3.0.1 | BSD-3-Clause | Copyright 2010-2021 Mike Bostock |
| d3-fetch | 3.0.1 | ISC | Copyright 2016-2021 Mike Bostock |
| d3-force | 3.0.0 | ISC | Copyright 2010-2021 Mike Bostock |
| d3-force-3d | 3.0.6 | MIT | Copyright (c) 2017 Vasco Asturiano |
| d3-format | 3.1.2 | ISC | Copyright 2010-2026 Mike Bostock |
| d3-geo | 3.1.1 | ISC | Copyright 2010-2024 Mike Bostock |
| d3-hierarchy | 3.1.2 | ISC | Copyright 2010-2021 Mike Bostock |
| d3-interpolate | 3.0.1 | ISC | Copyright 2010-2021 Mike Bostock |
| d3-octree | 1.1.0 | MIT | Copyright (c) 2017 Vasco Asturiano |
| d3-path | 3.1.0 | ISC | Copyright 2015-2022 Mike Bostock |
| d3-polygon | 3.0.1 | ISC | Copyright 2010-2021 Mike Bostock |
| d3-quadtree | 3.0.1 | ISC | Copyright 2010-2021 Mike Bostock |
| d3-random | 3.0.1 | ISC | Copyright 2010-2021 Mike Bostock |
| d3-scale | 4.0.2 | ISC | Copyright 2010-2021 Mike Bostock |
| d3-scale-chromatic | 3.1.0 | ISC | Copyright 2010-2024 Mike Bostock |
| d3-selection | 3.0.0 | ISC | Copyright 2010-2021 Mike Bostock |
| d3-shape | 3.2.0 | ISC | Copyright 2010-2022 Mike Bostock |
| d3-time | 3.1.0 | ISC | Copyright 2010-2022 Mike Bostock |
| d3-time-format | 4.1.0 | ISC | Copyright 2010-2021 Mike Bostock |
| d3-timer | 3.0.1 | ISC | Copyright 2010-2021 Mike Bostock |
| d3-transition | 3.0.1 | ISC | Copyright 2010-2021 Mike Bostock |
| d3-zoom | 3.0.0 | ISC | Copyright 2010-2021 Mike Bostock |
| delaunator | 5.1.0 | ISC | Copyright (c) 2026, Mapbox |
| internmap | 2.0.3 | ISC | Copyright 2021 Mike Bostock |
| robust-predicates | 3.0.3 | Unlicense | public domain (Unlicense) |

The licence texts follow. Each one is given once, with every package it covers and that package's copyright line.

### ISC: d3 and 28 of its modules and dependencies

- d3: Copyright 2010-2023 Mike Bostock
- d3-array: Copyright 2010-2023 Mike Bostock
- d3-axis: Copyright 2010-2021 Mike Bostock
- d3-brush: Copyright 2010-2021 Mike Bostock
- d3-chord: Copyright 2010-2021 Mike Bostock
- d3-color: Copyright 2010-2022 Mike Bostock
- d3-contour: Copyright 2012-2023 Mike Bostock
- d3-delaunay: Copyright 2018-2021 Observable, Inc.
- d3-dispatch: Copyright 2010-2021 Mike Bostock
- d3-drag: Copyright 2010-2021 Mike Bostock
- d3-dsv: Copyright 2013-2021 Mike Bostock
- d3-fetch: Copyright 2016-2021 Mike Bostock
- d3-force: Copyright 2010-2021 Mike Bostock
- d3-format: Copyright 2010-2026 Mike Bostock
- d3-hierarchy: Copyright 2010-2021 Mike Bostock
- d3-interpolate: Copyright 2010-2021 Mike Bostock
- d3-path: Copyright 2015-2022 Mike Bostock
- d3-polygon: Copyright 2010-2021 Mike Bostock
- d3-quadtree: Copyright 2010-2021 Mike Bostock
- d3-random: Copyright 2010-2021 Mike Bostock
- d3-scale: Copyright 2010-2021 Mike Bostock
- d3-selection: Copyright 2010-2021 Mike Bostock
- d3-shape: Copyright 2010-2022 Mike Bostock
- d3-time: Copyright 2010-2022 Mike Bostock
- d3-time-format: Copyright 2010-2021 Mike Bostock
- d3-timer: Copyright 2010-2021 Mike Bostock
- d3-transition: Copyright 2010-2021 Mike Bostock
- d3-zoom: Copyright 2010-2021 Mike Bostock
- internmap: Copyright 2021 Mike Bostock

The text below is from `d3`; the others differ only in the copyright line.

```
Copyright 2010-2023 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

### d3-binarytree, d3-force-3d, d3-octree

- d3-binarytree: Copyright (c) 2017 Vasco Asturiano
- d3-force-3d: Copyright (c) 2017 Vasco Asturiano
- d3-octree: Copyright (c) 2017 Vasco Asturiano

The text below is from `d3-binarytree`; the others differ only in the copyright line.

```
MIT License

Copyright (c) 2017 Vasco Asturiano

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### d3-ease

Includes Robert Penner's easing equations; BSD-3-Clause.

```
Copyright 2010-2021 Mike Bostock
Copyright 2001 Robert Penner
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the author nor the names of contributors may be used to
  endorse or promote products derived from this software without specific prior
  written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### d3-geo

Includes code from GeographicLib by Charles Karney, under the MIT licence quoted in the second half.

```
Copyright 2010-2024 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.

This license applies to GeographicLib, versions 1.12 and later.

Copyright 2008-2012 Charles Karney

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### d3-scale-chromatic

Includes the ColorBrewer colour schemes under the Apache License 2.0; the full Apache 2.0 text is in `/LICENSE-Roboto`.

```
Copyright 2010-2024 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.

Apache-Style Software License for ColorBrewer software and ColorBrewer Color Schemes

Copyright 2002 Cynthia Brewer, Mark Harrower, and The Pennsylvania State University

Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed
under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied. See the License for the
specific language governing permissions and limitations under the License.
```

### delaunator

```
ISC License

Copyright (c) 2026, Mapbox

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

### robust-predicates

```
This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org>
```

## d3-sankey.js

`d3-sankey.js` is d3-sankey 0.12.3 (https://github.com/d3/d3-sankey), bundled
from `src/vendor/d3-sankey/`, which is the npm tarball's `src/` unchanged. The
bundle also contains the parts of d3-array, d3-shape and d3-path that d3-sankey
imports; their ISC notices are in the d3.js section above. d3-sankey's own
licence is BSD-3-Clause:

```
Copyright 2015, Mike Bostock
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the author nor the names of contributors may be used to
  endorse or promote products derived from this software without specific prior
  written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## topojson-client.js

`topojson-client.js` is topojson-client 3.1.0
(https://github.com/topojson/topojson-client), `src/index.js` bundled as ESM.

```
Copyright 2012-2019 Michael Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

## D3 gallery notebooks

The example pages port chart code from these D3 gallery notebooks on Observable.
Some cells are copied verbatim, for example `parseNewick`, `maxLength` and the
data loading. `tools/ref.js` renders the same notebooks to `ref/*.png`.
The data files in `examples/data/` are their file attachments, listed in the
next section. Each notebook is published under the ISC licence:

| notebook | page | copyright |
| --- | --- | --- |
| [@d3/cluster/2](https://observablehq.com/@d3/cluster/2) | `examples/d3_cluster.html` | Copyright 2017–2023 Observable, Inc. |
| [@d3/tree/2](https://observablehq.com/@d3/tree/2) | `examples/d3_tree.html` | Copyright 2017–2023 Observable, Inc. |
| [@d3/hierarchical-edge-bundling/2](https://observablehq.com/@d3/hierarchical-edge-bundling/2) | `examples/d3_bundling.html` | Copyright 2019–2020 Observable, Inc. |
| [@d3/force-directed-graph/2](https://observablehq.com/@d3/force-directed-graph/2) | `examples/d3_force.html` | Copyright 2017–2023 Observable, Inc. |
| [@d3/pack/2](https://observablehq.com/@d3/pack/2) | `examples/d3_pack.html` | Copyright 2017–2023 Observable, Inc. |
| [@d3/sunburst/2](https://observablehq.com/@d3/sunburst/2) | `examples/d3_sunburst.html` | Copyright 2018–2023 Observable, Inc. |
| [@d3/treemap/2](https://observablehq.com/@d3/treemap/2) | `examples/d3_treemap.html` | Copyright 2017–2023 Observable, Inc. |
| [@d3/tree-of-life](https://observablehq.com/@d3/tree-of-life) | `examples/d3_tree-of-life.html` | Copyright 2012–2020 Mike Bostock |
| [@d3/force-directed-tree](https://observablehq.com/@d3/force-directed-tree) | `examples/d3_force-tree.html` | Copyright 2019–2023 Observable, Inc. |
| [@d3/disjoint-force-directed-graph/2](https://observablehq.com/@d3/disjoint-force-directed-graph/2) | `examples/d3_disjoint.html` | Copyright 2018–2023 Observable, Inc. |
| [@d3/chord-diagram/2](https://observablehq.com/@d3/chord-diagram/2) | `examples/d3_chord.html` | Copyright 2018–2023 Observable, Inc. |
| [@d3/splom/2](https://observablehq.com/@d3/splom/2) | `examples/d3_splom.html` | Copyright 2019–2023 Observable, Inc. |
| [@d3/grouped-bar-chart/2](https://observablehq.com/@d3/grouped-bar-chart/2) | `examples/d3_grouped-bars.html` | Copyright 2018–2020 Observable, Inc. |
| [@d3/spike-map/2](https://observablehq.com/@d3/spike-map/2) | `examples/d3_spikes.html` | Copyright 2020-2023 Observable, Inc. |
| [@d3/radial-stacked-bar-chart/3](https://observablehq.com/@d3/radial-stacked-bar-chart/3) | `examples/d3_radial-bars.html` | Copyright 2019–2023 Observable, Inc. |
| [@d3/ridgeline-plot](https://observablehq.com/@d3/ridgeline-plot) | `examples/d3_ridgeline.html` | Copyright 2018–2020 Observable, Inc. |
| [@d3/sankey/2](https://observablehq.com/@d3/sankey/2) | `examples/d3_sankey.html` | Copyright 2018–2023 Observable, Inc. |
| [@d3/world-choropleth/2](https://observablehq.com/@d3/world-choropleth/2) | `examples/d3_globe.html` | Copyright 2019–2023 Observable, Inc. |

The ISC licence text, which applies to each notebook under the copyright line
above:

```
Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

## Data in examples/data

`examples/data/` holds the notebooks' file attachments, byte for byte, so that
sixteen of the pages run from this repository alone. Each file keeps its
attachment name, except that the edge-bundling notebook's `flare.json` is
committed as `flare-imports.json`, and the treemap notebook's `flare.json`,
which is byte-identical to `flare-2.json`, is not committed twice. The source
column gives the credit each notebook gives for its data, or the source the
file itself shows.

| file | bytes | notebook attachment | source |
| --- | --- | --- | --- |
| `flare.json` | 11414 | @d3/cluster/2, @d3/tree/2 | the class hierarchy of the Flare visualization toolkit (Jeffrey Heer, UC Berkeley); no credit in the notebooks |
| `flare-2.json` | 11634 | @d3/pack/2, @d3/sunburst/2, @d3/force-directed-tree; @d3/treemap/2 as `flare.json` | Flare's class hierarchy with file sizes, as above |
| `flare-imports.json` | 34321 | @d3/hierarchical-edge-bundling/2, `flare.json` | Flare's classes and their imports, as above |
| `miserables.json` | 18844 | @d3/force-directed-graph/2 | character co-occurrence in Victor Hugo's *Les Misérables*, from Donald Knuth's *The Stanford GraphBase* |
| `graph.json` | 73595 | @d3/disjoint-force-directed-graph/2 | a citation graph of research papers and the patents that cite them; the notebook credits no source |
| `energy.csv` | 2267 | @d3/sankey/2 | UK energy flows, from the Department of Energy & Climate Change's 2050 Calculator, via Tom Counsell (https://tamc.github.io/Sankey/) |
| `penguins.csv` | 13506 | @d3/splom/2 | Kristen Gorman's measurements of penguins near Palmer Station, Antarctica (Palmer Station LTER) |
| `population.json` | 64302 | @d3/spike-map/2 | estimated population by county, 2016: U.S. Census Bureau, American Community Survey 5-year estimates, via the Census API |
| `counties-albers-10m.json` | 795407 | @d3/spike-map/2 | us-atlas 3.0.0 (ISC, below), derived from the U.S. Census Bureau's cartographic county boundaries, 2017 edition |
| `us-population-state-age.csv` | 3516 | @d3/grouped-bar-chart/2 | U.S. Census Bureau, American Community Survey |
| `data-2.csv` | 2806 | @d3/radial-stacked-bar-chart/3 | U.S. population by state and age group; the notebook credits no source |
| `countries-50m.json` | 756420 | @d3/world-choropleth/2 | world-atlas 2.0.2 (ISC, below), derived from Natural Earth's 1:50m Admin 0 country boundaries, version 4.1.0 (public domain) |
| `life.txt` | 11978 | @d3/tree-of-life | the tree of life in Newick format; the notebook credits a figure from *Nature* (https://www.nature.com/articles/nature08656/figures/1) and Jason Davies (https://www.jasondavies.com/tree-of-life/) |

Two attachments are not committed until their licences are checked:
`hale.csv` (@d3/world-choropleth/2, health-adjusted life expectancy from the
WHO) and `traffic.csv` (@d3/ridgeline-plot, credited to Christopher Möller).
The globe and ridgeline pages fetch them from the d3-gallery mirror at
`$GALLERY_DIR`.

`counties-albers-10m.json` is from us-atlas and `countries-50m.json` from
world-atlas, both by Mike Bostock under the ISC licence:

```
Copyright 2013-2019 Michael Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

## newick.js

`parseNewick` in `examples/d3_tree-of-life.html` is Jason Davies' Newick
parser (https://github.com/jasondavies/newick.js), in the minified form the
tree-of-life notebook uses. The tree-of-life layout itself is inspired by Jason
Davies' tree of life (https://www.jasondavies.com/tree-of-life/).

```
MIT License

Copyright (c) Jason Davies 2010.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
