// d3-three — link primitive: one fat line per hierarchy link.
//
// `linkCurve` is the 3D analogue of d3's `linkHorizontal`: a cubic bezier whose
// two control points are the endpoints pushed to the half-way plane along one
// axis (in d3 that axis is the depth axis, x on screen). `fatLine` turns a point
// list into a Line2, which is a real screen-space-width line in the scene, not a
// sprite or a canvas stroke (marks and links are never sprites, textures,
// canvas-2D or CSS).

import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/webgpu/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

const _axis = new THREE.Vector3();

/**
 * Points of a cubic bezier from `a` to `b` whose control points are offset
 * along `axis` to the mid-coordinate of the two endpoints on that axis.
 *
 * @param {THREE.Vector3} a
 * @param {THREE.Vector3} b
 * @param {THREE.Vector3} axis  need not be normalised
 * @param {number} segments
 * @returns {THREE.Vector3[]} segments + 1 points
 */
export function linkCurve( a, b, axis, segments = 16 ) {

	_axis.copy( axis ).normalize();

	const da = a.dot( _axis );
	const db = b.dot( _axis );
	const mid = ( da + db ) / 2;

	const c1 = a.clone().addScaledVector( _axis, mid - da );
	const c2 = b.clone().addScaledVector( _axis, mid - db );

	return new THREE.CubicBezierCurve3( a, c1, c2, b ).getPoints( segments );

}

/**
 * A Line2 through `points`.
 *
 * @param {THREE.Vector3[]} points
 * @param {{ color?: number, opacity?: number, linewidth?: number, material?: THREE.Material }} options
 *        `linewidth` is in pixels (Line2NodeMaterial default, no size attenuation).
 *        Pass `material` to share one material across many links.
 */
export function fatLine( points, options = {} ) {

	const positions = [];
	for ( const p of points ) positions.push( p.x, p.y, p.z );

	const geometry = new LineGeometry();
	geometry.setPositions( positions );

	const material = options.material || lineMaterial( options );

	return new Line2( geometry, material );

}

/** A Line2NodeMaterial, so callers can share one across every link. */
export function lineMaterial( { color = 0x555555, opacity = 1, linewidth = 1.5 } = {} ) {

	return new THREE.Line2NodeMaterial( {
		color,
		linewidth,
		opacity,
		transparent: opacity < 1,
		depthWrite: opacity >= 1,
		worldUnits: false,
		dashed: false,
		alphaToCoverage: false
	} );

}
