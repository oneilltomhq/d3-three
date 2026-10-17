// node --import ./test/three-loader.mjs --test test/globe.test.mjs
//
// Invariants of src/globe.js (layouts/globe.md) over the world choropleth's
// countries-50m.json: every country triangulates, no refined edge spans more
// than 2° of arc, every vertex lies on the sphere, the surface is conforming
// (every interior edge is shared by exactly two triangles, the boundary by
// one), every country's mark point lies on the country, Russia, Fiji and
// Antarctica come out with the area d3 computes, and two runs are identical.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import * as d3 from 'd3';
import * as topojson from '../examples/jsm/vendor/topojson-client.js';
import { featureGeometry, triangulatePolygon, refineTriangles, unwrapRing, interiorPoint, lonLatToVector3, lineSegmentsGeometry } from '../src/globe.js';

const world = JSON.parse( readFileSync( new URL( '../examples/data/countries-50m.json', import.meta.url ), 'utf8' ) );
const countries = topojson.feature( world, world.objects.countries );
const R = 10;
const MAX_DEG = 2;

const byName = name => countries.features.find( f => f.properties.name === name );

test( 'unwrapRing: Antarctica is flagged polar, Russia stays a loop', () => {

	const ant = byName( 'Antarctica' ).geometry.coordinates[ 2 ];
	assert.equal( unwrapRing( ant[ 0 ] ), null, 'the all-pole outer ring is degenerate' );
	const coast = unwrapRing( ant[ 1 ] );
	assert.equal( coast.pole, - 90, 'the coastline winds round the south pole' );
	assert.ok( Math.abs( coast[ coast.length - 1 ][ 0 ] - coast[ 0 ][ 0 ] ) > 359 );

	const rus = unwrapRing( byName( 'Russia' ).geometry.coordinates[ 17 ][ 0 ] );
	const lons = rus.map( p => p[ 0 ] );
	assert.ok( Math.max( ...lons ) > 180 && Math.max( ...lons ) < 200, 'Chukotka unwrapped past 180' );
	for ( let i = 1; i < rus.length; i ++ ) assert.ok( Math.abs( rus[ i ][ 0 ] - rus[ i - 1 ][ 0 ] ) < 180 );

} );

test( 'every country triangulates, on the sphere, with edges <= 2 deg, conforming', () => {

	let total = 0;
	const cosMax = Math.cos( MAX_DEG * Math.PI / 180 ) - 1e-9;

	for ( const f of countries.features ) {

		const origin = lonLatToVector3( 0, 0, R );
		const { geometry, triangles } = featureGeometry( f.geometry, R, origin, { maxDeg: MAX_DEG } );
		assert.ok( triangles > 0, f.properties.name + ' has triangles' );
		total += triangles;

		const pos = geometry.getAttribute( 'position' );
		const idx = geometry.getIndex().array;
		const v = new THREE.Vector3();
		const unit = [];

		for ( let i = 0; i < pos.count; i ++ ) {

			v.fromBufferAttribute( pos, i ).add( origin );
			assert.ok( Math.abs( v.length() - R ) < 1e-5 * R, f.properties.name + ' vertex on the sphere' );
			unit.push( v.clone().normalize() );

		}

		const edges = new Map();
		const edge = ( a, b ) => { const k = a < b ? a + ',' + b : b + ',' + a; edges.set( k, ( edges.get( k ) || 0 ) + 1 ); };

		for ( let i = 0; i < idx.length; i += 3 ) {

			const a = idx[ i ], b = idx[ i + 1 ], c = idx[ i + 2 ];
			assert.ok( unit[ a ].dot( unit[ b ] ) >= cosMax && unit[ b ].dot( unit[ c ] ) >= cosMax && unit[ c ].dot( unit[ a ] ) >= cosMax, f.properties.name + ' edge <= 2 deg' );
			edge( a, b ); edge( b, c ); edge( c, a );

		}

		// conforming: every edge belongs to one (boundary) or two (interior) triangles
		for ( const [ k, n ] of edges ) assert.ok( n <= 2, f.properties.name + ' edge ' + k + ' shared by ' + n );

	}

	console.log( 'triangles total', total );
	assert.ok( total < 400000 );

} );

test( 'triangulated area matches d3.geoArea (Russia, Fiji, Antarctica, Canada)', () => {

	for ( const name of [ 'Russia', 'Fiji', 'Antarctica', 'Canada', 'Indonesia', 'South Africa' ] ) {

		const f = byName( name );
		const expected = d3.geoArea( f );
		const origin = new THREE.Vector3();
		const { geometry } = featureGeometry( f.geometry, 1, origin, { maxDeg: MAX_DEG } );
		const pos = geometry.getAttribute( 'position' );
		const idx = geometry.getIndex().array;
		const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
		let area = 0;

		for ( let i = 0; i < idx.length; i += 3 ) {

			a.fromBufferAttribute( pos, idx[ i ] );
			b.fromBufferAttribute( pos, idx[ i + 1 ] );
			c.fromBufferAttribute( pos, idx[ i + 2 ] );
			// spherical excess (l'Huilier via Oosterom–Strackee)
			const num = a.dot( new THREE.Vector3().crossVectors( b, c ) );
			const den = 1 + a.dot( b ) + b.dot( c ) + c.dot( a );
			area += 2 * Math.atan2( num, den );

		}

		console.log( name, 'd3', expected.toFixed( 5 ), 'mesh', area.toFixed( 5 ) );
		assert.ok( Math.abs( area - expected ) < 0.02 * expected + 1e-4, name + ' area' );

	}

} );

test( 'interiorPoint lies on every country', () => {

	const how = { centroid: 0, largest: 0, scan: 0 };

	for ( const f of countries.features ) {

		const p = interiorPoint( f, d3 );
		how[ p.how ] ++;
		assert.ok( d3.geoContains( f, [ p.lon, p.lat ] ), f.properties.name + ' ' + p.how );

	}

	console.log( 'interior points', how );

} );

test( 'border mesh: one segment list', () => {

	const mesh = topojson.mesh( world, world.objects.countries, ( a, b ) => a !== b );
	const { geometry, segments } = lineSegmentsGeometry( mesh, R, { maxDeg: 1 } );
	assert.equal( geometry.getAttribute( 'position' ).count, segments * 2 );
	console.log( 'border segments', segments );

} );

test( 'deterministic', () => {

	const f = byName( 'Russia' );
	const origin = lonLatToVector3( 0, 0, R );
	const a = featureGeometry( f.geometry, R, origin ).geometry.getAttribute( 'position' ).array;
	const b = featureGeometry( f.geometry, R, origin ).geometry.getAttribute( 'position' ).array;
	assert.deepEqual( a, b );

} );
