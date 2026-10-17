// d3-three — ridge primitive: a d3 area curve as a standing slab
// (layouts/ridgeline.md).
//
// A ridgeline plot draws, per series, `d3.area().curve(d3.curveBasis)` — a
// uniform cubic B-spline through the hourly values — filled down to a
// baseline, and its top edge stroked. Lifted, each series is one Mesh: the
// notebook's own curve, sampled densely through a recording path context
// (`sampleCurve`), closed to the baseline and extruded a small uniform
// thickness in z (`ridgeGeometry`). The Mesh is the datum; its top-edge line
// is a child of it, so the page stays one Object3D per series.

import * as THREE from 'three';

/**
 * Sample a d3 line/area generator's curve densely. The generator is given a
 * path context that records its commands (`moveTo`, `lineTo`,
 * `bezierCurveTo`) and every cubic bezier is flattened into
 * `samplesPerSegment` points, so the result is the curve d3 itself would
 * stroke, not a polyline through the data. `d3.curveBasis` emits one bezier
 * per interior data interval, so `samplesPerSegment` = samples per interval.
 *
 * @param {Function} generator  a `d3.line()` (or `area.lineY1()`) with x/y/curve set
 * @param {Array} data          what the generator is called with
 * @param {number} [samplesPerSegment=6]
 * @returns {THREE.Vector2[]}   the curve in the generator's (x, y) units
 */
export function sampleCurve( generator, data, samplesPerSegment = 6 ) {

	const points = [];
	let cx = 0, cy = 0;

	const context = {

		moveTo( x, y ) { points.push( new THREE.Vector2( x, y ) ); cx = x; cy = y; },
		lineTo( x, y ) { points.push( new THREE.Vector2( x, y ) ); cx = x; cy = y; },
		closePath() {},

		bezierCurveTo( x1, y1, x2, y2, x, y ) {

			const x0 = cx, y0 = cy;

			for ( let k = 1; k <= samplesPerSegment; k ++ ) {

				const t = k / samplesPerSegment, s = 1 - t;
				const a = s * s * s, b = 3 * s * s * t, c = 3 * s * t * t, d = t * t * t;
				points.push( new THREE.Vector2( a * x0 + b * x1 + c * x2 + d * x, a * y0 + b * y1 + c * y2 + d * y ) );

			}

			cx = x; cy = y;

		},

		// d3.curveBasis never emits these; other curves might
		quadraticCurveTo( x1, y1, x, y ) {

			// elevate to a cubic
			this.bezierCurveTo( cx + 2 / 3 * ( x1 - cx ), cy + 2 / 3 * ( y1 - cy ), x + 2 / 3 * ( x1 - x ), y + 2 / 3 * ( y1 - y ), x, y );

		},

		arc() { throw new Error( 'sampleCurve: arc() is not supported' ); }

	};

	const previous = generator.context();
	generator.context( context );
	generator( data );
	generator.context( previous );

	return points;

}

/**
 * The slab under a sampled top edge: the area between `top` (in the ridge's
 * own xy plane, world units) and the baseline `y = baseline`, extruded
 * `thickness` along z. Local frame: the geometry is translated so that
 * `origin` (a point on the FRONT face, the +z one) is at (0, 0, 0) — the
 * page puts the mesh there and registers it as the mark — so the slab spans
 * local z in [−thickness, 0] and its front face is the plane z = 0, facing
 * +z.
 *
 * @param {THREE.Vector2[]} top   the sampled top edge, x increasing
 * @param {{ thickness: number, baseline?: number, origin: THREE.Vector2 }} options
 * @returns {THREE.ExtrudeGeometry}
 */
export function ridgeGeometry( top, { thickness, baseline = 0, origin } ) {

	const first = top[ 0 ], last = top[ top.length - 1 ];

	const shape = new THREE.Shape();
	shape.moveTo( first.x, baseline );
	for ( const p of top ) shape.lineTo( p.x, p.y );
	shape.lineTo( last.x, baseline );
	shape.closePath();

	const geometry = new THREE.ExtrudeGeometry( shape, { depth: thickness, bevelEnabled: false, steps: 1 } );

	// extrusion runs 0 .. +depth: put the front face at local z = 0
	geometry.translate( - origin.x, - origin.y, - thickness );

	return geometry;

}

/**
 * The summit of a sampled edge: the first sample of greatest y. The mark of a
 * ridge is its summit, on the drawn curve (which, being a B-spline, sits
 * below the data maximum).
 *
 * @param {THREE.Vector2[]} top
 * @returns {THREE.Vector2}
 */
export function summit( top ) {

	let best = top[ 0 ];
	for ( const p of top ) if ( p.y > best.y ) best = p;
	return best;

}
