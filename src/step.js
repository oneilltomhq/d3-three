// d3-three — the tree-of-life notebook's `linkStep`, lifted onto a cylinder
// (layouts/tree-of-life.md).
//
// In the notebook a link is "M start · A (arc at the start radius to the end
// angle) · L end": an arc around the centre at the source's radius, then a
// radial line to the target. On the cylinder every node has an angle θ, a
// radius from the axis `r` and a height along the axis `h`; the arc stays at
// the source's (r, h) and the straight piece goes to the target's (r, h), so a
// link changes radius AND height on the straight piece only, as the 2D one
// changes radius only there.

import * as THREE from 'three';

/**
 * A point on the cylinder. Convention (layouts/tree-of-life.md): the
 * notebook's screen x is world +x, its screen y (down) is world +z, height is
 * world +y. Looking down the axis from +y with +z at the bottom of the frame
 * is exactly the notebook's picture.
 *
 * @param {number} theta   angle in radians, already `(x − 90)°` as in linkStep
 * @param {number} r       distance from the axis
 * @param {number} h       height along the axis
 */
export function cylinderPoint( theta, r, h, target = new THREE.Vector3() ) {

	return target.set( r * Math.cos( theta ), h, r * Math.sin( theta ) );

}

/**
 * Points of the 3D linkStep from (θ0, r0, h0) to (θ1, r1, h1): the arc at
 * (r0, h0) from θ0 to θ1, sampled every `arcStep` radians at least (so a short
 * arc gets few points and a long one stays round), then the straight segment
 * to the target. The first point is exactly the source, the last exactly the
 * target. Equal angles give a two-point straight line, as the notebook omits
 * the arc then.
 *
 * @returns {THREE.Vector3[]}
 */
export function stepCurve( theta0, r0, h0, theta1, r1, h1, arcStep = Math.PI / 90 ) {

	const points = [ cylinderPoint( theta0, r0, h0 ) ];

	const sweep = theta1 - theta0;

	if ( sweep !== 0 && r0 > 0 ) {

		const n = Math.max( 1, Math.ceil( Math.abs( sweep ) / arcStep ) );

		for ( let i = 1; i <= n; i ++ ) {

			points.push( cylinderPoint( theta0 + sweep * i / n, r0, h0 ) );

		}

	}

	points.push( cylinderPoint( theta1, r1, h1 ) );

	return points;

}
