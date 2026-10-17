// d3-three — camera framing. Fixed camera per example (HANDOFF §D.17): no controls
// state, no animation, just a deterministic position for a given set of marks.

import * as THREE from 'three';

const DEG = Math.PI / 180;

/**
 * Place `camera` so the content fills `fill` of the frame, looking at it from
 * `elevation` degrees above the horizontal plane and `azimuth` degrees around
 * the up axis.
 *
 * The fit is done on the projected points, not on the bounding sphere: a wide,
 * flat layout (a cone tree seen from above the leaf plane) has a sphere far
 * bigger than what it actually covers on screen, and fitting the sphere leaves
 * half the frame empty. The look-at target is nudged so the projection is
 * centred too. Both are iterated because perspective makes them non-linear.
 *
 * @param {THREE.PerspectiveCamera} camera
 * @param {THREE.Box3} box            bounding box of the marks
 * @param {{ elevation?: number, azimuth?: number, fill?: number, points?: THREE.Vector3[] }} options
 *        `points` are the positions to fit; defaults to the box's 8 corners.
 * @returns {THREE.Vector3} the look-at target, for OrbitControls and the gates.
 */
export function frameCamera( camera, box, { elevation = 30, azimuth = 35, fill = 0.85, points } = {} ) {

	const sphere = new THREE.Sphere();
	box.getBoundingSphere( sphere );

	const target = sphere.center.clone();
	const radius = sphere.radius || 1;

	const halfV = ( camera.fov * DEG ) / 2;
	const halfH = Math.atan( Math.tan( halfV ) * camera.aspect );

	const fitted = points && points.length ? points : boxCorners( box );

	const el = elevation * DEG;
	const az = azimuth * DEG;

	const direction = new THREE.Vector3(
		Math.cos( el ) * Math.sin( az ),
		Math.sin( el ),
		Math.cos( el ) * Math.cos( az )
	);

	let distance = radius / ( fill * Math.tan( Math.min( halfV, halfH ) ) );

	const place = () => {

		camera.position.copy( target ).addScaledVector( direction, distance );
		camera.lookAt( target );
		camera.near = Math.max( distance - radius * 2, distance / 100 );
		camera.far = distance + radius * 2;
		camera.updateProjectionMatrix();
		camera.updateMatrixWorld( true );

	};

	const right = new THREE.Vector3();
	const up = new THREE.Vector3();
	const v = new THREE.Vector3();

	for ( let i = 0; i < 24; i ++ ) {

		place();

		let minX = Infinity, maxX = - Infinity, minY = Infinity, maxY = - Infinity;

		for ( const p of fitted ) {

			v.copy( p ).project( camera );
			if ( v.x < minX ) minX = v.x;
			if ( v.x > maxX ) maxX = v.x;
			if ( v.y < minY ) minY = v.y;
			if ( v.y > maxY ) maxY = v.y;

		}

		// recentre: move the target sideways by the projected offset
		const cx = ( minX + maxX ) / 2;
		const cy = ( minY + maxY ) / 2;

		camera.matrixWorld.extractBasis( right, up, v );
		target.addScaledVector( right, cx * Math.tan( halfH ) * distance );
		target.addScaledVector( up, cy * Math.tan( halfV ) * distance );

		// refit: scale the distance by how much of the frame is used
		const extent = Math.max( maxX - minX, maxY - minY ) / 2;
		if ( extent === 0 ) break;

		const next = distance * extent / fill;
		const settled = Math.abs( next - distance ) < distance * 1e-4
			&& Math.abs( cx ) < 1e-4 && Math.abs( cy ) < 1e-4;

		distance = next;
		if ( settled ) break;

	}

	place();

	return target;

}

function boxCorners( box ) {

	const corners = [];

	for ( let i = 0; i < 8; i ++ ) {

		corners.push( new THREE.Vector3(
			i & 1 ? box.max.x : box.min.x,
			i & 2 ? box.max.y : box.min.y,
			i & 4 ? box.max.z : box.min.z
		) );

	}

	return corners;

}
