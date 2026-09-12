// d33 — annular-sector prism: d3.arc's sector outline extruded along +y.
//
// The 2D shape is exactly what d3.arc draws for `{ innerRadius, outerRadius,
// startAngle, endAngle, padAngle, padRadius }` (no corner radius): angle 0 is
// 12 o'clock and angles run clockwise seen from above, so the notebook's
// (x, y) = (r sin a, -r cos a) becomes world (x, z). The pad is d3's linear
// pad: at each radius the angular pad is asin(padRadius / r · sin(padAngle / 2))
// and an edge collapses to the mid-angle when the pad would exceed the span.
//
// The prism runs from y = 0 to y = `height`, built in local coordinates
// around `centre` (default: the centre of the TOP face — mid-angle,
// mid-radius, y = height) so a Mesh placed at `centre` has its world position
// on its own top face, the pixel the picking gate raycasts.
//
// Lifted out of examples/d3_sunburst.html (where it was inline, thickness
// fixed); the radial stacked bar chart stacks these upward.

import * as THREE from 'three';

const ARC_STEP = 2 * Math.PI / 180; // one outline segment per 2 degrees of arc

/**
 * @param {object} arc
 * @param {number} arc.innerRadius
 * @param {number} arc.outerRadius
 * @param {number} arc.startAngle   radians, 0 = 12 o'clock, clockwise from above
 * @param {number} arc.endAngle
 * @param {number} [arc.padAngle=0]
 * @param {number} [arc.padRadius]  defaults to sqrt(r0² + r1²) as d3 does
 * @param {number} height           extrusion along +y
 * @param {THREE.Vector3} [centre]  local origin; default top-face centre
 * @returns {THREE.ExtrudeGeometry}
 */
export function sectorPrism( arc, height, centre = sectorTopCentre( arc, height ) ) {

	const r0 = arc.innerRadius;
	const r1 = arc.outerRadius;
	const ap = ( arc.padAngle || 0 ) / 2;
	const rp = arc.padRadius !== undefined ? arc.padRadius : Math.sqrt( r0 * r0 + r1 * r1 );

	let a00 = arc.startAngle, a10 = arc.endAngle, a01 = arc.startAngle, a11 = arc.endAngle;

	if ( ap > 1e-12 ) {

		const p0 = Math.asin( rp / r0 * Math.sin( ap ) );
		const p1 = Math.asin( rp / r1 * Math.sin( ap ) );
		const mid = ( arc.startAngle + arc.endAngle ) / 2;
		if ( a10 - a00 - 2 * p0 > 1e-12 ) { a00 += p0; a10 -= p0; } else a00 = a10 = mid;
		if ( a11 - a01 - 2 * p1 > 1e-12 ) { a01 += p1; a11 -= p1; } else a01 = a11 = mid;

	}

	// outline in the shape's (u, v) = world (x, -z): outer arc forward, inner arc back
	const pts = [];
	const arcPoints = ( r, a, b ) => {

		const n = Math.max( 1, Math.ceil( Math.abs( b - a ) / ARC_STEP ) );
		for ( let i = 0; i <= n; i ++ ) {

			const t = a + ( b - a ) * i / n;
			pts.push( new THREE.Vector2( r * Math.sin( t ), r * Math.cos( t ) ) );

		}

	};

	arcPoints( r1, a01, a11 );
	arcPoints( r0, a10, a00 );

	const geometry = new THREE.ExtrudeGeometry( new THREE.Shape( pts ), { depth: height, bevelEnabled: false } );

	// (u, v, w) -> (u, w, -v): extrusion along +y, shape v -> world -z; then local coordinates around `centre`
	geometry.rotateX( - Math.PI / 2 );
	geometry.translate( - centre.x, - centre.y, - centre.z );
	geometry.computeVertexNormals();

	return geometry;

}

/** Centre of the prism's top face: mid-angle, mid-radius, y = height. */
export function sectorTopCentre( arc, height ) {

	const am = ( arc.startAngle + arc.endAngle ) / 2;
	const rm = ( arc.innerRadius + arc.outerRadius ) / 2;
	return new THREE.Vector3( rm * Math.sin( am ), height, - rm * Math.cos( am ) );

}

/** World (x, z) of polar (angle, radius) in the same convention, at height y. */
export function polar( angle, radius, y = 0 ) {

	return new THREE.Vector3( radius * Math.sin( angle ), y, - radius * Math.cos( angle ) );

}
