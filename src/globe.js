// d3-three — GeoJSON polygons as meshes on a sphere (layouts/globe.md).
//
// The world choropleth's countries are GeoJSON (Multi)Polygons in degrees of
// longitude and latitude. Lifted onto a globe, each country becomes one Mesh:
// every ring is unwrapped so its longitudes are continuous across ±180°, a
// ring that winds round a pole (Antarctica) is taken to an azimuthal plane
// centred on that pole instead, the polygon (with its holes) is triangulated
// in that plane with THREE.ShapeUtils (earcut), every triangle is bisected
// along its longest edge until no edge spans more than `maxDeg` of arc on
// the sphere, and the vertices are placed on a sphere of radius `radius`. Longest-edge bisection only ever splits an
// edge at its own midpoint, so the two triangles on either side of an edge —
// inside one country or across a border, since neighbouring countries share
// the same TopoJSON arcs — split it identically and the surface has no
// T-junctions and no cracks. At `maxDeg` = 2° a flat triangle sags at most
// R (1 − cos 1°) = 0.00015 R below the sphere.
//
// Coordinates: y is up (the north pole is +y), +z points at longitude 0 and
// +x at longitude 90° E:  ( cos φ sin λ, sin φ, cos φ cos λ ).
//
// Nothing here touches the DOM or the renderer; it runs in node for tests.

import * as THREE from 'three';

const DEG = Math.PI / 180;
const SLIVER = 1e-12; // sin² of the smallest triangle angle kept by refineTriangles

/** Unit vector (or `r` long) at longitude `lon`, latitude `lat` (degrees). */
export function lonLatToVector3( lon, lat, r = 1, target = new THREE.Vector3() ) {

	const phi = lat * DEG, lambda = lon * DEG;
	const c = Math.cos( phi );
	return target.set( r * c * Math.sin( lambda ), r * Math.sin( phi ), r * c * Math.cos( lambda ) );

}

/** Local east (d/dλ), north (d/dφ) and up (radial) unit vectors at (lon, lat). */
export function tangentFrame( lon, lat ) {

	const phi = lat * DEG, lambda = lon * DEG;
	return {
		east: new THREE.Vector3( Math.cos( lambda ), 0, - Math.sin( lambda ) ),
		north: new THREE.Vector3( - Math.sin( phi ) * Math.sin( lambda ), Math.cos( phi ), - Math.sin( phi ) * Math.cos( lambda ) ),
		up: lonLatToVector3( lon, lat, 1 )
	};

}

/**
 * A GeoJSON ring made continuous in longitude: wherever consecutive points
 * jump by more than 180° the rest of the ring is shifted by ±360°. The
 * closing point (a repeat of the first) is dropped. If, after unwrapping, the
 * ring ends a full turn away from where it started it winds round a pole
 * (Antarctica's coastline): the returned array carries `pole = ±90`. A ring
 * lying entirely on a pole (world-atlas gives Antarctica such an outer ring)
 * is degenerate on the sphere and returns null.
 *
 * @param {number[][]} ring  [[lon, lat], ...]
 * @returns {number[][] | null}
 */
export function unwrapRing( ring ) {

	const out = [];
	let shift = 0;
	let prev = null;
	let allPole = true;

	for ( let i = 0; i < ring.length; i ++ ) {

		let lon = ring[ i ][ 0 ];
		const lat = ring[ i ][ 1 ];

		if ( prev !== null ) {

			const d = lon + shift - prev;
			if ( d > 180 ) shift -= 360;
			else if ( d < - 180 ) shift += 360;

		}

		lon += shift;
		prev = lon;
		if ( Math.abs( lat ) < 89.999 ) allPole = false;
		out.push( [ lon, lat ] );

	}

	if ( allPole ) return null;

	// closing point: equal to the first (mod a full turn) -> drop it
	const first = out[ 0 ], last = out[ out.length - 1 ];
	const turns = Math.round( ( last[ 0 ] - first[ 0 ] ) / 360 );

	if ( Math.abs( last[ 0 ] - first[ 0 ] - turns * 360 ) < 1e-9 && Math.abs( last[ 1 ] - first[ 1 ] ) < 1e-9 ) {

		out.pop();
		if ( turns === 0 ) return out;

		// winds round a pole (Antarctica's coastline): flag which one, so
		// triangulatePolygon works in a plane centred on that pole
		let meanLat = 0;
		for ( const p of out ) meanLat += p[ 1 ];
		out.pole = meanLat < 0 ? - 90 : 90;
		return out;

	}

	return out;

}

/**
 * Shift a (already unwrapped) hole by whole turns so it sits inside the
 * longitude range of its outer ring.
 */
function alignHole( hole, outer ) {

	let min = Infinity, max = - Infinity;
	for ( const p of outer ) { if ( p[ 0 ] < min ) min = p[ 0 ]; if ( p[ 0 ] > max ) max = p[ 0 ]; }
	const mid = ( min + max ) / 2;

	let c = 0;
	for ( const p of hole ) c += p[ 0 ];
	c /= hole.length;

	const k = Math.round( ( mid - c ) / 360 );
	return k === 0 ? hole : hole.map( p => [ p[ 0 ] + k * 360, p[ 1 ] ] );

}

/**
 * Triangulate one GeoJSON polygon (outer ring + holes) in the lon/lat plane.
 *
 * @param {number[][][]} polygon  GeoJSON Polygon coordinates
 * @returns {{ points: number[][], triangles: number[][] } | null}
 *          `points` [lon, lat] (unwrapped), `triangles` index triples
 */
export function triangulatePolygon( polygon ) {

	// world-atlas gives Antarctica an outer ring lying entirely on the south
	// pole (degenerate, dropped) with the coastline as its only hole: the
	// first usable ring is then the boundary.
	const rings = polygon.map( unwrapRing ).filter( r => r !== null && r.length >= 3 );
	if ( rings.length === 0 ) return null;

	const outer = rings[ 0 ];
	const holes = rings.slice( 1 ).map( h => alignHole( h, outer ) );

	// The plane the polygon is triangulated and refined in: lon/lat, or, for
	// a ring round a pole, the azimuthal equidistant plane about that pole
	// (x = colatitude·cos λ, y = colatitude·sin λ), where the cap is a plain
	// disc and no edge has to run along the pole.
	const pole = outer.pole || 0;
	const plane = pole === 0 ? lonLatPlane : azimuthalPlane( pole );

	const contour = outer.map( p => plane.to( p ) );
	const holeContours = holes.map( h => h.map( p => plane.to( p ) ) );

	// earcut wants the outer ring counter-clockwise and holes clockwise in
	// its plane; ShapeUtils enforces that itself (isClockWise + reverse).
	const triangles = THREE.ShapeUtils.triangulateShape( contour, holeContours );

	const points = contour.map( v => [ v.x, v.y ] );
	for ( const h of holeContours ) for ( const v of h ) points.push( [ v.x, v.y ] );

	return { points, triangles, toLonLat: plane.from };

}

const lonLatPlane = {
	to: p => new THREE.Vector2( p[ 0 ], p[ 1 ] ),
	from: p => p
};

function azimuthalPlane( pole ) {

	return {
		to: p => {

			const colat = 90 - Math.abs( p[ 1 ] );
			return new THREE.Vector2( colat * Math.cos( p[ 0 ] * DEG ), colat * Math.sin( p[ 0 ] * DEG ) );

		},
		from: p => {

			const colat = Math.hypot( p[ 0 ], p[ 1 ] );
			return [ Math.atan2( p[ 1 ], p[ 0 ] ) / DEG, pole > 0 ? 90 - colat : colat - 90 ];

		}
	};

}

/**
 * Bisect triangles along their longest edge until every edge spans at most
 * `maxDeg` degrees of arc on the sphere. Splits happen at the midpoint of
 * the edge in the triangulation plane, and only there, so adjacent triangles
 * (in this or any other call over the same edge in the same plane) stay
 * conforming.
 *
 * @param {number[][]} points     plane coordinates ([lon, lat] by default), appended to
 * @param {number[][]} triangles  index triples, replaced
 * @param {number} maxDeg
 * @param {(p: number[]) => number[]} [toLonLat]  plane -> [lon, lat]
 * @returns {number[][]} the refined triangle list
 */
export function refineTriangles( points, triangles, maxDeg = 2, toLonLat = p => p ) {

	const cosMax = Math.cos( maxDeg * DEG );
	const toUnit = p => { const ll = toLonLat( p ); return lonLatToVector3( ll[ 0 ], ll[ 1 ], 1 ); };
	const unit = points.map( toUnit );
	const midpoints = new Map(); // "i,j" (i<j) -> index

	const mid = ( i, j ) => {

		const key = i < j ? i + ',' + j : j + ',' + i;
		let k = midpoints.get( key );
		if ( k !== undefined ) return k;

		const a = points[ i ], b = points[ j ];
		k = points.length;
		points.push( [ ( a[ 0 ] + b[ 0 ] ) / 2, ( a[ 1 ] + b[ 1 ] ) / 2 ] );
		unit.push( toUnit( points[ k ] ) );
		midpoints.set( key, k );
		return k;

	};

	// cosine of the arc between two vertices; smaller = longer edge
	const cosArc = ( i, j ) => unit[ i ].dot( unit[ j ] );

	const out = [];
	const stack = triangles.slice();

	while ( stack.length ) {

		const t = stack.pop();
		const [ a, b, c ] = t;

		// earcut can emit a degenerate triangle (a repeated vertex, or three
		// collinear points — Antarctica's coast has vertices exactly midway
		// between their neighbours); it fills nothing, and bisecting it
		// would only make thinner slivers forever. Dropped when the sine of
		// the angle at `a` is below 1e-6.
		if ( a === b || b === c || c === a ) continue;
		const pa = points[ a ], pb = points[ b ], pc = points[ c ];
		const ux = pb[ 0 ] - pa[ 0 ], uy = pb[ 1 ] - pa[ 1 ], vx = pc[ 0 ] - pa[ 0 ], vy = pc[ 1 ] - pa[ 1 ];
		const cross = ux * vy - uy * vx;
		if ( cross * cross < SLIVER * ( ux * ux + uy * uy ) * ( vx * vx + vy * vy ) ) continue;

		const ab = cosArc( a, b ), bc = cosArc( b, c ), ca = cosArc( c, a );
		const longest = Math.min( ab, bc, ca );

		if ( longest >= cosMax ) {

			out.push( t );
			continue;

		}

		if ( longest === ab ) {

			const m = mid( a, b );
			stack.push( [ a, m, c ], [ m, b, c ] );

		} else if ( longest === bc ) {

			const m = mid( b, c );
			stack.push( [ a, b, m ], [ a, m, c ] );

		} else {

			const m = mid( c, a );
			stack.push( [ a, b, m ], [ m, b, c ] );

		}

	}

	return out;

}

/**
 * One BufferGeometry for a GeoJSON Polygon or MultiPolygon feature, on a
 * sphere of radius `radius`, in coordinates local to `origin` (a point on
 * the same sphere; the Mesh is placed there so its world position is the
 * mark's). Triangles are wound so their normals point outward.
 *
 * @param {object} geometry   GeoJSON geometry (Polygon | MultiPolygon)
 * @param {number} radius
 * @param {THREE.Vector3} origin
 * @param {{ maxDeg?: number }} options
 * @returns {{ geometry: THREE.BufferGeometry, triangles: number, vertices: number }}
 */
export function featureGeometry( geometry, radius, origin, { maxDeg = 2 } = {} ) {

	const polygons = geometry.type === 'Polygon' ? [ geometry.coordinates ]
		: geometry.type === 'MultiPolygon' ? geometry.coordinates : [];

	const positions = [];
	const indices = [];
	let triangleCount = 0;

	const v = new THREE.Vector3();
	const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3(), centre = new THREE.Vector3();

	for ( const polygon of polygons ) {

		const tri = triangulatePolygon( polygon );
		if ( tri === null ) continue;

		const { points, toLonLat } = tri;
		const triangles = refineTriangles( points, tri.triangles, maxDeg, toLonLat );

		const base = positions.length / 3;

		for ( const p of points ) {

			const ll = toLonLat( p );
			lonLatToVector3( ll[ 0 ], ll[ 1 ], radius, v ).sub( origin );
			positions.push( v.x, v.y, v.z );

		}

		for ( const [ a, b, c ] of triangles ) {

			// outward winding: (b - a) x (c - a) . centre > 0
			const ia = ( base + a ) * 3, ib = ( base + b ) * 3, ic = ( base + c ) * 3;
			e1.set( positions[ ib ] - positions[ ia ], positions[ ib + 1 ] - positions[ ia + 1 ], positions[ ib + 2 ] - positions[ ia + 2 ] );
			e2.set( positions[ ic ] - positions[ ia ], positions[ ic + 1 ] - positions[ ia + 1 ], positions[ ic + 2 ] - positions[ ia + 2 ] );
			n.crossVectors( e1, e2 );
			if ( n.lengthSq() === 0 ) continue; // degenerate (pole slivers)
			centre.set( positions[ ia ], positions[ ia + 1 ], positions[ ia + 2 ] ).add( origin );

			if ( n.dot( centre ) >= 0 ) indices.push( base + a, base + b, base + c );
			else indices.push( base + a, base + c, base + b );

			triangleCount ++;

		}

	}

	const out = new THREE.BufferGeometry();
	out.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
	out.setIndex( indices );

	// smooth normals = the sphere's: exact, and no seams between triangles
	const normals = new Float32Array( positions.length );
	for ( let i = 0; i < positions.length; i += 3 ) {

		v.set( positions[ i ], positions[ i + 1 ], positions[ i + 2 ] ).add( origin ).normalize();
		normals[ i ] = v.x; normals[ i + 1 ] = v.y; normals[ i + 2 ] = v.z;

	}

	out.setAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ) );
	out.computeBoundingSphere();

	return { geometry: out, triangles: triangleCount, vertices: positions.length / 3 };

}

/**
 * A GeoJSON MultiLineString (topojson.mesh) as one LineSegments geometry on
 * the sphere: every segment is cut into pieces of at most `maxDeg` of arc so
 * the border hugs the surface.
 *
 * @param {object} multiLineString  GeoJSON MultiLineString | LineString
 * @param {number} radius
 * @returns {{ geometry: THREE.BufferGeometry, segments: number }}
 */
export function lineSegmentsGeometry( multiLineString, radius, { maxDeg = 1 } = {} ) {

	const lines = multiLineString.type === 'LineString' ? [ multiLineString.coordinates ] : multiLineString.coordinates;
	const positions = [];
	const a = new THREE.Vector3(), b = new THREE.Vector3(), p = new THREE.Vector3();
	let segments = 0;

	for (const line of lines ) {

		for ( let i = 1; i < line.length; i ++ ) {

			let [ lon0, lat0 ] = line[ i - 1 ];
			let [ lon1, lat1 ] = line[ i ];
			if ( lon1 - lon0 > 180 ) lon1 -= 360;
			else if ( lon1 - lon0 < - 180 ) lon1 += 360;

			lonLatToVector3( lon0, lat0, 1, a );
			lonLatToVector3( lon1, lat1, 1, b );
			const arc = Math.acos( Math.min( 1, Math.max( - 1, a.dot( b ) ) ) ) / DEG;
			const n = Math.max( 1, Math.ceil( arc / maxDeg ) );

			for ( let k = 0; k < n; k ++ ) {

				const t0 = k / n, t1 = ( k + 1 ) / n;
				lonLatToVector3( lon0 + ( lon1 - lon0 ) * t0, lat0 + ( lat1 - lat0 ) * t0, radius, p );
				positions.push( p.x, p.y, p.z );
				lonLatToVector3( lon0 + ( lon1 - lon0 ) * t1, lat0 + ( lat1 - lat0 ) * t1, radius, p );
				positions.push( p.x, p.y, p.z );
				segments ++;

			}

		}

	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
	return { geometry, segments };

}

/**
 * A point on the country, for the mark and its label: d3.geoCentroid where
 * that lies on the feature, otherwise (Canada's is in Hudson Bay, an
 * archipelago's at sea) the centroid of its largest polygon, and failing that
 * the midpoint of the longest run of that polygon along the parallel through
 * its centroid, trying nearby parallels. Needs d3-geo (geoCentroid,
 * geoContains, geoArea).
 *
 * @returns {{ lon: number, lat: number, how: 'centroid' | 'largest' | 'scan' }}
 */
export function interiorPoint( feature, d3 ) {

	const c = d3.geoCentroid( feature );
	if ( d3.geoContains( feature, c ) ) return { lon: c[ 0 ], lat: c[ 1 ], how: 'centroid' };

	const g = feature.geometry;
	const polygons = g.type === 'Polygon' ? [ g.coordinates ] : g.coordinates;
	let largest = null, area = - 1;

	for ( const coordinates of polygons ) {

		const poly = { type: 'Polygon', coordinates };
		const a = d3.geoArea( poly );
		if ( a > area && a < 2 * Math.PI ) { area = a; largest = poly; }

	}

	if ( largest === null ) return { lon: c[ 0 ], lat: c[ 1 ], how: 'centroid' };

	const lc = d3.geoCentroid( largest );
	if ( d3.geoContains( largest, lc ) ) return { lon: lc[ 0 ], lat: lc[ 1 ], how: 'largest' };

	const ring = unwrapRing( largest.coordinates[ 0 ] ) || largest.coordinates[ 0 ];
	let min = Infinity, max = - Infinity;
	for ( const p of ring ) { if ( p[ 0 ] < min ) min = p[ 0 ]; if ( p[ 0 ] > max ) max = p[ 0 ]; }

	let best = null;

	for ( const dLat of [ 0, 1, - 1, 2, - 2, 4, - 4, 8, - 8 ] ) {

		const lat = lc[ 1 ] + dLat;
		if ( Math.abs( lat ) > 89 ) continue;
		const step = ( max - min ) / 400;
		let runStart = null;

		for ( let lon = min; lon <= max + step; lon += step ) {

			const inside = lon <= max && d3.geoContains( largest, [ lon, lat ] );

			if ( inside && runStart === null ) runStart = lon;

			if ( ! inside && runStart !== null ) {

				const len = lon - step - runStart;
				if ( best === null || len > best.len ) best = { len, lon: runStart + len / 2, lat };
				runStart = null;

			}

		}

	}

	if ( best !== null ) return { lon: best.lon, lat: best.lat, how: 'scan' };
	return { lon: lc[ 0 ], lat: lc[ 1 ], how: 'largest' };

}
