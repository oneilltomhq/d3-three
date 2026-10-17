// node --test test/pack3.test.mjs
//
// Invariants of src/pack3.js (layouts/pack.md): no two siblings overlap, every
// child lies inside its parent, two runs give identical output, the root is
// scaled to radius 10, and 252 nodes pack well under a second. Also prints the
// packing densities the director asked for.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hierarchy } from 'd3-hierarchy';
import { pack3, paddedPack3, density } from '../src/pack3.js';

const TOL = 1e-9;

const flare = JSON.parse( readFileSync( new URL( '../examples/data/flare-2.json', import.meta.url ), 'utf8' ) );

function flareRoot() {

	return hierarchy( flare ).sum( d => d.value ).sort( ( a, b ) => b.value - a.value );

}

/* a synthetic hierarchy with a deterministic LCG for the values */

function synthetic( fanout, depth, seed = 7 ) {

	let s = seed;
	const next = () => ( s = ( s * 1103515245 + 12345 ) % 2147483648 ) / 2147483648;

	const make = level => level === 0
		? { name: 'leaf', value: 1 + Math.floor( next() * 5000 ) }
		: { name: 'node', children: Array.from( { length: fanout }, () => make( level - 1 ) ) };

	return hierarchy( make( depth ) ).sum( d => d.value ).sort( ( a, b ) => b.value - a.value );

}

function checkInvariants( root ) {

	let pairs = 0, minGap = Infinity, maxOverhang = - Infinity;

	for ( const node of root.descendants() ) {

		if ( ! node.children ) continue;

		const kids = node.children;

		for ( let i = 0; i < kids.length; i ++ ) {

			const a = kids[ i ];

			// inside the parent: |c| + r <= R + tol (positions are local to the parent)
			const overhang = Math.hypot( a.x, a.y, a.z ) + a.r - node.r;
			maxOverhang = Math.max( maxOverhang, overhang );
			assert.ok( overhang <= TOL, `${ a.data.name } sticks out of ${ node.data.name } by ${ overhang }` );

			for ( let j = i + 1; j < kids.length; j ++ ) {

				const b = kids[ j ];
				const gap = Math.hypot( a.x - b.x, a.y - b.y, a.z - b.z ) - ( a.r + b.r );
				minGap = Math.min( minGap, gap );
				pairs ++;
				assert.ok( gap >= - TOL, `${ a.data.name } and ${ b.data.name } overlap by ${ - gap } in ${ node.data.name }` );

			}

		}

	}

	return { pairs, minGap, maxOverhang };

}

function snapshot( root ) {

	return root.descendants().map( n => [ n.x, n.y, n.z, n.r ] );

}

test( 'flare-2: siblings never overlap, children stay inside their parent', () => {

	const root = paddedPack3( flareRoot(), { paddingFraction: 0.0065, radius: 10 } );
	const { pairs, minGap, maxOverhang } = checkInvariants( root );

	assert.equal( root.descendants().length, 252 );
	assert.ok( pairs > 0 );
	console.log( `  flare-2: ${ pairs } sibling pairs, min gap ${ minGap.toExponential( 3 ) }, max overhang ${ maxOverhang.toExponential( 3 ) }` );

} );

test( 'flare-2: root radius is exactly 10 after scaling', () => {

	const root = paddedPack3( flareRoot(), { paddingFraction: 0.0065, radius: 10 } );
	assert.ok( Math.abs( root.r - 10 ) <= 1e-12, `root.r = ${ root.r }` );
	assert.deepEqual( [ root.x, root.y, root.z ], [ 0, 0, 0 ] );

} );

test( 'flare-2: two runs give identical output', () => {

	const a = snapshot( paddedPack3( flareRoot(), { paddingFraction: 0.0065, radius: 10 } ) );
	const b = snapshot( paddedPack3( flareRoot(), { paddingFraction: 0.0065, radius: 10 } ) );
	assert.deepEqual( a, b );

} );

test( 'flare-2: 252 nodes pack well under a second', () => {

	const root = flareRoot();
	const t0 = performance.now();
	paddedPack3( root, { paddingFraction: 0.0065, radius: 10 } );
	const ms = performance.now() - t0;
	console.log( `  flare-2: paddedPack3 (two pack3 passes) in ${ ms.toFixed( 1 ) } ms` );
	assert.ok( ms < 1000, `${ ms } ms` );

} );

test( 'flare-2: packing density report', () => {

	const root = paddedPack3( flareRoot(), { paddingFraction: 0.0065, radius: 10 } );
	const unpadded = pack3( flareRoot(), {} );

	const deepest = r => r.descendants().filter( n => n.children && n.height === 1 ).map( density ).sort( ( a, b ) => a - b );
	const median = xs => xs[ Math.floor( xs.length / 2 ) ];

	const d = deepest( root ), du = deepest( unpadded );

	console.log( `  root density (sum child volumes / root volume): ${ density( root ).toFixed( 3 ) } padded, ${ density( unpadded ).toFixed( 3 ) } unpadded` );
	console.log( `  deepest level (${ d.length } nodes whose children are all leaves): median ${ median( d ).toFixed( 3 ) }, min ${ d[ 0 ].toFixed( 3 ) }, max ${ d.at( - 1 ).toFixed( 3 ) } padded; median ${ median( du ).toFixed( 3 ) } unpadded` );

	assert.ok( density( root ) > 0.3 );
	assert.ok( median( d ) > 0.2 );

	// without padding the enclosing sphere is tight: some child touches it
	const { maxOverhang } = checkInvariants( unpadded );
	console.log( `  unpadded enclosing slack: ${ ( - maxOverhang ).toExponential( 3 ) } (of root radius ${ unpadded.r.toFixed( 1 ) })` );
	assert.ok( maxOverhang > - 1e-9 * unpadded.r, `enclosing sphere loose by ${ - maxOverhang }` );

} );

test( 'synthetic: 12^2 and a 100-way fan-out (past the nearest-32 cap) keep the invariants', () => {

	for ( const root of [ synthetic( 12, 2 ), synthetic( 100, 1 ), synthetic( 3, 4, 11 ) ] ) {

		pack3( root, { padding: 0.5, radius: 10 } );
		const { minGap, maxOverhang } = checkInvariants( root );
		assert.ok( Math.abs( root.r - 10 ) <= 1e-12 );
		console.log( `  synthetic ${ root.descendants().length } nodes: min gap ${ minGap.toExponential( 3 ) }, max overhang ${ maxOverhang.toExponential( 3 ) }, root density ${ density( root ).toFixed( 3 ) }` );

	}

} );

test( 'edge cases: single child, two children, zero value', () => {

	const one = hierarchy( { children: [ { value: 8 } ] } ).sum( d => d.value );
	pack3( one, {} );
	assert.equal( one.r, 2 );
	assert.equal( one.children[ 0 ].x, 0 );

	const two = hierarchy( { children: [ { value: 27 }, { value: 1 } ] } ).sum( d => d.value );
	pack3( two, {} );
	assert.ok( Math.abs( two.r - 4 ) < 1e-9, `two.r = ${ two.r }` ); // minimal enclosing sphere of r 3 and r 1 touching: diameter 8
	checkInvariants( two );

	const zero = hierarchy( { children: [ { value: 0 }, { value: 1 }, { value: 1 }, { value: 1 } ] } ).sum( d => d.value );
	pack3( zero, {} );
	checkInvariants( zero );

} );
