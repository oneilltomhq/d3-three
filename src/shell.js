// d3-three — shell sector: the solid a sunburst cell becomes on a sphere.
//
// A cell of `d3.partition` is an annular sector (angle span x0..x1, radius
// span y0..y1). Lifted onto a sphere it is a longitude span, a colatitude
// (depth) band and a radial thickness: a closed solid bounded by an outer and
// an inner spherical patch and four side walls. `shellSector` builds that as
// one BufferGeometry whose local origin is the cell's centroid, so a Mesh
// placed at `centroid` has `getWorldPosition() === centroid` and the marks JSON
// carries the centroid (layouts/sunburst.md, "Marks").
//
// Coordinates: pole axis is +y. A point at radius r, colatitude t (0 at the
// north pole) and longitude p is ( r sin t cos p, r cos t, r sin t sin p ).
// Every face gets its own vertices, so `computeVertexNormals` gives flat
// walls and smooth patches.

import * as THREE from 'three';

/**
 * @param {number} lon0   longitude span start (radians)
 * @param {number} lon1   longitude span end
 * @param {number} colat0 colatitude band start (radians, 0 = north pole)
 * @param {number} colat1 colatitude band end
 * @param {number} r0     inner radius
 * @param {number} r1     outer radius
 * @param {{ lon?: number, lat?: number, radial?: number }} segments
 *        tessellation along longitude, latitude and thickness (default 1)
 * @param {THREE.Vector3} [origin]  the point the geometry is built around;
 *        defaults to the sector's centre (mid-longitude, mid-colatitude,
 *        radius (r0 + r1) / 2)
 * @returns {{ geometry: THREE.BufferGeometry, centroid: THREE.Vector3, normal: THREE.Vector3 }}
 *          `centroid` is that origin; `normal` is the unit vector from the
 *          sphere's centre through it.
 */
export function shellSector( lon0, lon1, colat0, colat1, r0, r1, segments = {}, origin ) {

	const nLon = Math.max( 1, segments.lon | 0 || 1 );
	const nLat = Math.max( 1, segments.lat | 0 || 1 );
	const nRad = Math.max( 1, segments.radial | 0 || 1 );

	const rm = ( r0 + r1 ) / 2;

	// The centre of the sector in spherical coordinates: mid-longitude,
	// mid-colatitude, mid-radius. Always inside the solid (it lies on the
	// middle sphere within the patch), unlike the mean of the four corners,
	// which for a 37 degree band drops below the inner surface of every cell
	// thinner than ~1.1 units.
	const centroid = origin
		? origin.clone()
		: spherical( rm, ( colat0 + colat1 ) / 2, ( lon0 + lon1 ) / 2 );

	const normal = centroid.clone().normalize();

	const positions = [];
	const indices = [];

	const lerp = ( a, b, t ) => a + ( b - a ) * t;

	// outer patch, outward = +radial
	addGrid( positions, indices, nLon, nLat,
		( u, v ) => spherical( r1, lerp( colat0, colat1, v ), lerp( lon0, lon1, u ) ),
		p => p.clone() );

	// inner patch, outward = -radial
	addGrid( positions, indices, nLon, nLat,
		( u, v ) => spherical( r0, lerp( colat0, colat1, v ), lerp( lon0, lon1, u ) ),
		p => p.clone().negate() );

	// longitude walls, outward = -/+ the local east direction
	const east = lon => new THREE.Vector3( - Math.sin( lon ), 0, Math.cos( lon ) );

	addGrid( positions, indices, nLat, nRad,
		( u, v ) => spherical( lerp( r0, r1, v ), lerp( colat0, colat1, u ), lon0 ),
		() => east( lon0 ).negate() );

	addGrid( positions, indices, nLat, nRad,
		( u, v ) => spherical( lerp( r0, r1, v ), lerp( colat0, colat1, u ), lon1 ),
		() => east( lon1 ) );

	// latitude walls, outward = -/+ the local south direction
	const south = ( colat, lon ) => new THREE.Vector3(
		Math.cos( colat ) * Math.cos( lon ), - Math.sin( colat ), Math.cos( colat ) * Math.sin( lon ) );

	addGrid( positions, indices, nLon, nRad,
		( u, v ) => spherical( lerp( r0, r1, v ), colat0, lerp( lon0, lon1, u ) ),
		( p, u ) => south( colat0, lerp( lon0, lon1, u ) ).negate() );

	addGrid( positions, indices, nLon, nRad,
		( u, v ) => spherical( lerp( r0, r1, v ), colat1, lerp( lon0, lon1, u ) ),
		( p, u ) => south( colat1, lerp( lon0, lon1, u ) ) );

	// local coordinates around the centroid
	for ( let i = 0; i < positions.length; i += 3 ) {

		positions[ i ] -= centroid.x;
		positions[ i + 1 ] -= centroid.y;
		positions[ i + 2 ] -= centroid.z;

	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
	geometry.setIndex( indices );
	geometry.computeVertexNormals();

	return { geometry, centroid, normal };

}

export function spherical( r, colat, lon ) {

	const s = Math.sin( colat );
	return new THREE.Vector3( r * s * Math.cos( lon ), r * Math.cos( colat ), r * s * Math.sin( lon ) );

}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3();

// A (nu x nv) grid of quads over `point(u, v)`, u, v in [0, 1], wound so the
// face normal agrees with `outward(point, u, v)`.
function addGrid( positions, indices, nu, nv, point, outward ) {

	const base = positions.length / 3;
	const grid = [];

	for ( let j = 0; j <= nv; j ++ ) {

		for ( let i = 0; i <= nu; i ++ ) {

			const p = point( i / nu, j / nv );
			grid.push( p );
			positions.push( p.x, p.y, p.z );

		}

	}

	// decide the winding from the grid's first non-degenerate cell
	let flip = false;

	outer: for ( let j = 0; j < nv; j ++ ) {

		for ( let i = 0; i < nu; i ++ ) {

			const p00 = grid[ j * ( nu + 1 ) + i ];
			const p10 = grid[ j * ( nu + 1 ) + i + 1 ];
			const p01 = grid[ ( j + 1 ) * ( nu + 1 ) + i ];

			_a.subVectors( p10, p00 );
			_b.subVectors( p01, p00 );
			_n.crossVectors( _a, _b );

			if ( _n.lengthSq() > 1e-12 ) {

				flip = _n.dot( outward( p00, i / nu, j / nv ) ) < 0;
				break outer;

			}

		}

	}

	for ( let j = 0; j < nv; j ++ ) {

		for ( let i = 0; i < nu; i ++ ) {

			const a = base + j * ( nu + 1 ) + i;
			const b = a + 1;
			const c = a + ( nu + 1 );
			const d = c + 1;

			if ( flip ) indices.push( a, c, b, b, c, d );
			else indices.push( a, b, c, b, d, c );

		}

	}

}
