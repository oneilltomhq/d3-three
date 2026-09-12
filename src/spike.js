// d33 — spike map primitives: a unit spike (narrow square pyramid) and a
// thin ground slab from a pre-projected GeoJSON (Multi)Polygon.
//
// Both are plain BufferGeometries in the world frame (y up): the map lies in
// the xz plane and a spike stands along +y. Deterministic: no random, no time.

import * as THREE from 'three';

/**
 * A square pyramid, base side 1 in x and z centred on the y axis, height 1,
 * the apex at local y = +tip and the base at y = tip − 1. Scale it to
 * (width, height, width) and put the Mesh at the spike's tip; its origin is
 * then `tip` of the height below the apex, inside the solid, so a ray through
 * the mark position hits a face of the spike (not the apex vertex).
 * Flat shaded: the four faces have their own vertices and normals.
 *
 * @param {{ tip?: number }} options   default tip 0.05
 */
export function spikeGeometry( { tip = 0.05 } = {} ) {

	const apex = [ 0, tip, 0 ];
	const y0 = tip - 1;
	const base = [ [ - 0.5, y0, - 0.5 ], [ 0.5, y0, - 0.5 ], [ 0.5, y0, 0.5 ], [ - 0.5, y0, 0.5 ] ];

	const positions = [];

	// four sides, counter-clockwise seen from outside (base runs clockwise
	// seen from above, so each side is b, a, apex)
	for ( let i = 0; i < 4; i ++ ) {

		const a = base[ i ], b = base[ ( i + 1 ) % 4 ];
		positions.push( ...b, ...a, ...apex );

	}

	// the base, facing down
	positions.push( ...base[ 0 ], ...base[ 1 ], ...base[ 2 ] );
	positions.push( ...base[ 0 ], ...base[ 2 ], ...base[ 3 ] );

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
	geometry.computeVertexNormals();
	geometry.computeBoundingSphere();

	return geometry;

}

/**
 * A thin extruded slab of a pre-projected GeoJSON Polygon or MultiPolygon
 * (screen px, y down), lying in the xz plane from y = 0 to y = thickness:
 * notebook (x, y) -> world (x·scale, ·, y·scale + offsetZ). Every ring is
 * triangulated by THREE.ShapeUtils.triangulateShape (via ExtrudeGeometry, no
 * bevel); the first ring of a polygon is its outline, further rings holes.
 *
 * @param {object} geometry   GeoJSON geometry, type Polygon | MultiPolygon
 * @param {{ scale?: number, offsetZ?: number, thickness?: number }} options
 */
export function groundGeometry( geometry, { scale = 1, offsetZ = 0, thickness = 0.05 } = {} ) {

	const polygons = geometry.type === 'Polygon' ? [ geometry.coordinates ] : geometry.coordinates;
	const shapes = [];

	// Shape space: X = x·scale, Y = −(y·scale + offsetZ). The geometry is
	// extruded along +Z and then turned by −90° about x, which maps shape
	// (X, Y, Z) to world (X, Z, −Y): the extrusion becomes +y and Y becomes −z.
	const toShape = ( [ x, y ] ) => new THREE.Vector2( x * scale, - ( y * scale + offsetZ ) );

	for ( const rings of polygons ) {

		if ( rings.length === 0 || rings[ 0 ].length < 4 ) continue;

		const shape = new THREE.Shape( rings[ 0 ].map( toShape ) );

		for ( let i = 1; i < rings.length; i ++ ) {

			if ( rings[ i ].length < 4 ) continue;
			shape.holes.push( new THREE.Path( rings[ i ].map( toShape ) ) );

		}

		shapes.push( shape );

	}

	const extruded = new THREE.ExtrudeGeometry( shapes, { depth: thickness, bevelEnabled: false, curveSegments: 1 } );
	extruded.rotateX( - Math.PI / 2 );
	extruded.computeBoundingSphere();

	return extruded;

}
