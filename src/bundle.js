// d33 — hierarchical edge bundling in 3D (layouts/bundling.md).
//
// `bundleCurve` is d3's `curveBundle(beta)` + `curveBasis` lifted from the plane
// to space, piece for piece: the control points are first straightened toward
// the chord (beta), then run through the uniform cubic B-spline exactly the way
// d3-shape's basis curve emits it (move, a short line into the spline, one
// cubic per interior control point, a short line out), so the first and last
// sample ARE the first and last control point. That is what makes a bundle
// start on its source leaf and end on its target leaf.
//
// `fatLineColored` is `fatLine` (src/link.js) with a colour per vertex, so one
// Line2 carries the notebook's source → target gradient instead of 2^k split
// paths. Line2NodeMaterial multiplies its `color` by the per-instance colour,
// so the material colour is white.

import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/webgpu/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();

/**
 * d3.curveBundle(beta) straightening in 3D: p_i' = beta·p_i + (1−beta)·(p_0 + t_i·(p_n − p_0)).
 *
 * @param {THREE.Vector3[]} points
 * @param {number} beta
 * @returns {THREE.Vector3[]}
 */
export function straighten( points, beta ) {

	const n = points.length - 1;
	if ( n < 1 ) return points.map( p => p.clone() );

	const p0 = points[ 0 ];
	const chord = points[ n ].clone().sub( p0 );

	return points.map( ( p, i ) => {

		const t = i / n;
		return new THREE.Vector3(
			beta * p.x + ( 1 - beta ) * ( p0.x + t * chord.x ),
			beta * p.y + ( 1 - beta ) * ( p0.y + t * chord.y ),
			beta * p.z + ( 1 - beta ) * ( p0.z + t * chord.z )
		);

	} );

}

/**
 * d3.curveBasis in 3D, sampled. Emits the same pieces as d3-shape's basis:
 *
 *   M p0 · L (5p0+p1)/6 · for i ≥ 2: C (2p_{i−2}+p_{i−1})/3 (p_{i−2}+2p_{i−1})/3 (p_{i−2}+4p_{i−1}+p_i)/6
 *   · (lineEnd) C … (p_{n−2}+5p_{n−1})/6 · L p_{n−1}
 *
 * Every piece is sampled at `samplesPerSpan` points (its end included, its
 * start being the previous piece's end), so `points[0]` and the last sample
 * are exactly the first and last control point.
 *
 * @param {THREE.Vector3[]} points  ≥ 2 control points
 * @param {number} samplesPerSpan
 * @returns {THREE.Vector3[]}
 */
export function basisCurve( points, samplesPerSpan = 8 ) {

	const n = points.length;
	if ( n < 2 ) return points.map( p => p.clone() );

	const out = [ points[ 0 ].clone() ];

	const lineTo = ( to ) => {

		const from = out[ out.length - 1 ];
		for ( let s = 1; s <= samplesPerSpan; s ++ ) {

			out.push( from.clone().lerp( to, s / samplesPerSpan ) );

		}

	};

	const bezierTo = ( c1, c2, to ) => {

		const from = out[ out.length - 1 ];
		const curve = new THREE.CubicBezierCurve3( from, c1.clone(), c2.clone(), to.clone() );
		for ( let s = 1; s <= samplesPerSpan; s ++ ) {

			out.push( curve.getPoint( s / samplesPerSpan ) );

		}

	};

	if ( n === 2 ) {

		lineTo( points[ 1 ] );
		return out;

	}

	// d3's `point()` on the third point: L (5·p0 + p1) / 6
	lineTo( _a.copy( points[ 0 ] ).multiplyScalar( 5 ).add( points[ 1 ] ).multiplyScalar( 1 / 6 ) );

	const piece = ( p0, p1, p2 ) => {

		_b.copy( p0 ).multiplyScalar( 2 ).add( p1 ).multiplyScalar( 1 / 3 );
		_c.copy( p0 ).add( _d.copy( p1 ).multiplyScalar( 2 ) ).multiplyScalar( 1 / 3 );
		_d.copy( p0 ).addScaledVector( p1, 4 ).add( p2 ).multiplyScalar( 1 / 6 );
		bezierTo( _b, _c, _d );

	};

	for ( let i = 2; i < n; i ++ ) piece( points[ i - 2 ], points[ i - 1 ], points[ i ] );

	// d3's `lineEnd()` in state 3: one more piece with the last point repeated, then L p_{n−1}
	piece( points[ n - 2 ], points[ n - 1 ], points[ n - 1 ] );
	lineTo( points[ n - 1 ] );

	return out;

}

/**
 * The 3D `d3.lineRadial().curve(d3.curveBundle)`: straighten, then basis.
 *
 * @param {THREE.Vector3[]} points   control points (the hierarchy path source → target)
 * @param {number} [beta=0.85]       d3.curveBundle's default
 * @param {number} [samplesPerSpan=8]
 * @returns {THREE.Vector3[]}
 */
export function bundleCurve( points, beta = 0.85, samplesPerSpan = 8 ) {

	return basisCurve( straighten( points, beta ), samplesPerSpan );

}

/**
 * A Line2 through `points` with one colour per point.
 *
 * @param {THREE.Vector3[]} points
 * @param {THREE.Color[]} colors  same length as `points` (working colour space)
 * @param {THREE.Material} material  a `coloredLineMaterial()`; share it across links
 */
export function fatLineColored( points, colors, material ) {

	const positions = [];
	for ( const p of points ) positions.push( p.x, p.y, p.z );

	const rgb = [];
	for ( const c of colors ) rgb.push( c.r, c.g, c.b );

	const geometry = new LineGeometry();
	geometry.setPositions( positions );
	geometry.setColors( rgb );

	return new Line2( geometry, material );

}

/** A Line2NodeMaterial that takes its colour from the geometry (`setColors`). */
export function coloredLineMaterial( { opacity = 1, linewidth = 1 } = {} ) {

	return new THREE.Line2NodeMaterial( {
		color: 0xffffff,
		vertexColors: true,
		linewidth,
		opacity,
		transparent: opacity < 1,
		depthWrite: opacity >= 1,
		worldUnits: false,
		dashed: false,
		alphaToCoverage: false
	} );

}
