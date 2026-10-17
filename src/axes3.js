// d3-three — three axes on the silhouette edges of a cube, for a lifted scatter
// (splom). The 3D analogue of the notebook's `axisBottom` / `axisLeft` with
// `tickSize` spanning the whole chart: the scale's tick values as flat text
// labels just outside the cube, the column names as axis titles, and faint
// grid lines at every tick on the three back walls (the notebook's `#ddd`
// tick lines) with the walls' outer edges in the notebook's `#aaa` cell
// stroke.
//
// The axis lines are the cube's FRONT-bottom edges and its left-front
// vertical edge (x along z = side, z along x = side, y up from (0, 0, side)),
// not the back-bottom edges the brief first named: from the 25° camera the
// text hanging off a back-bottom edge projects into the point cloud (the
// floor is see-through) and is occluded by the spheres in front of it; on
// the silhouette edges every label projects outside the cube, which is
// where every 3D scatter convention puts them.
//
// Nothing here is a mark: the axes and grid are helpers (never in
// `pickables`); the labels are counted by the labels gate like any other
// `hierarchyLabels` batch. This module only decides WHERE the text goes —
// `wrappers`/`ids`/`positions`/`orient` feed `hierarchyLabels` through its
// `{ descendants }` shim (see examples/d3_force.html), so no shared primitive
// changes. Every label is anchored `start` with leafOffset 0 and centred or
// right-aligned here by measuring its width with the font, so the per-frame
// flip in src/labels.js keeps working unchanged.
//
// Frame: x along +x, y up, z along +z; the camera is expected at +x, +z
// (azimuth 35°), so the back walls are x = 0 and z = 0 and the floor y = 0.
// Text reads left-to-right from that camera: x labels run along +x in the
// z = side plane under the front edge, z labels run along −z in the x = side
// plane under the right edge (both facing the camera), y tick labels sit
// left of the left-front vertical edge in the z = side plane.

import * as THREE from 'three';
import { fatLine, lineMaterial } from './link.js';
import { basisQuaternion } from './labels.js';

/**
 * @param {object} options
 * @param {Array<{ name: string, scale: Function, ticks: number[], format?: Function }>} options.axes
 *        exactly three: x, y, z. `scale` maps data -> world [0, side].
 * @param {number} [options.side=20]     cube edge, world units
 * @param {number} [options.gap]         axis-to-text gap, world units
 * @param {number} options.tickSize      tick label em, world units
 * @param {number} options.titleSize     axis title em, world units
 * @param {(text: string, em: number) => number} options.measure  text width in world units
 * @param {boolean} [options.grid=true]
 * @returns {{ group: THREE.Group, wrappers: object[], ids: Map, positions: Map,
 *             orient: (w) => THREE.Quaternion, corners: THREE.Vector3[], count: number }}
 *          `corners` are the far corners of every text block, to include when
 *          framing the camera so no label is clipped.
 */
export function cubeAxes( {
	axes,
	side = 20,
	gap = 0.35,
	tickSize,
	titleSize,
	measure,
	grid = true,
	axisColor = 0x555555,
	axisWidth = 1.5,
	gridColor = 0xdddddd,
	edgeColor = 0xaaaaaa
} ) {

	if ( ! axes || axes.length !== 3 ) throw new Error( 'cubeAxes: three axes (x, y, z) required' );
	if ( typeof measure !== 'function' ) throw new Error( 'cubeAxes: measure(text, em) is required' );

	const group = new THREE.Group();
	group.name = 'axes';

	const [ ax, ay, az ] = axes;
	const S = side;
	const v = ( x, y, z ) => new THREE.Vector3( x, y, z );

	/* axis lines: the two front-bottom edges and the left-front vertical edge */

	const axisMaterial = lineMaterial( { color: axisColor, linewidth: axisWidth } );

	for ( const [ name, a, b ] of [
		[ 'x', v( 0, 0, S ), v( S, 0, S ) ],
		[ 'y', v( 0, 0, S ), v( 0, S, S ) ],
		[ 'z', v( S, 0, 0 ), v( S, 0, S ) ]
	] ) {

		const line = fatLine( [ a, b ], { material: axisMaterial } );
		line.name = 'axis-' + name;
		group.add( line );

	}

	/* grid at every tick on the three back walls, plus the walls' outer edges */

	if ( grid ) {

		const pts = [];
		const seg = ( a, b ) => pts.push( a, b );

		for ( const t of ax.ticks ) {

			const x = ax.scale( t );
			seg( v( x, 0, 0 ), v( x, 0, S ) ); // floor
			seg( v( x, 0, 0 ), v( x, S, 0 ) ); // back wall

		}

		for ( const t of ay.ticks ) {

			const y = ay.scale( t );
			seg( v( 0, y, 0 ), v( S, y, 0 ) ); // back wall
			seg( v( 0, y, 0 ), v( 0, y, S ) ); // left wall

		}

		for ( const t of az.ticks ) {

			const z = az.scale( t );
			seg( v( 0, 0, z ), v( S, 0, z ) ); // floor
			seg( v( 0, 0, z ), v( 0, S, z ) ); // left wall

		}

		const gridLines = new THREE.LineSegments(
			new THREE.BufferGeometry().setFromPoints( pts ),
			new THREE.LineBasicNodeMaterial( { color: gridColor } )
		);
		gridLines.name = 'grid';
		group.add( gridLines );

		const edges = new THREE.LineSegments(
			new THREE.BufferGeometry().setFromPoints( [
				v( S, 0, 0 ), v( S, S, 0 ),   // back wall, right edge
				v( 0, S, 0 ), v( S, S, 0 ),   // back wall, top edge
				v( 0, S, 0 ), v( 0, S, S )    // left wall, top edge
			] ),
			new THREE.LineBasicNodeMaterial( { color: edgeColor } )
		);
		edges.name = 'edges';
		group.add( edges );

	}

	/* labels: positions and planes, anchored start (leafOffset 0) */

	const X = v( 1, 0, 0 ), Y = v( 0, 1, 0 ), Zneg = v( 0, 0, - 1 );
	const faceZ = basisQuaternion( X, Y );      // in a z = const plane, facing +z
	const faceX = basisQuaternion( Zneg, Y );   // in an x = const plane, facing +x

	const wrappers = [];
	const ids = new Map();
	const positions = new Map();
	const quaternions = new Map();
	const corners = [];

	const add = ( id, text, position, q, em ) => {

		const w = { data: { name: text } };
		wrappers.push( w );
		ids.set( w, id );
		positions.set( w, position );
		quaternions.set( w, q );

		// the block's four corners: baseline from `position` along local +x,
		// half an em either side vertically (anchorY middle)
		const width = measure( text, em );
		const along = X.clone().applyQuaternion( q );
		const up = Y.clone().applyQuaternion( q );
		for ( const sx of [ 0, width ] ) for ( const sy of [ - em / 2, em / 2 ] ) {

			corners.push( position.clone().addScaledVector( along, sx ).addScaledVector( up, sy ) );

		}

		return width;

	};

	const fmt = a => a.format || ( a.scale.tickFormat ? a.scale.tickFormat( a.ticks.length ) : String );

	// x axis: below the front-bottom edge, in the z = side plane, centred
	// under each tick; the title below the ticks, centred on the edge
	{
		const f = fmt( ax );
		const yRow = - ( gap + tickSize / 2 );
		ax.ticks.forEach( ( t, i ) => {

			const text = f( t );
			const w = measure( text, tickSize );
			add( 'tx' + i, text, v( ax.scale( t ) - w / 2, yRow, S ), faceZ, tickSize );

		} );

		const w = measure( ax.name, titleSize );
		add( 'ax', ax.name, v( S / 2 - w / 2, yRow - tickSize / 2 - gap - titleSize / 2, S ), faceZ, titleSize );
	}

	// z axis: below the right-bottom edge, in the x = side plane, text
	// running along −z so it reads left-to-right from the camera at +x, +z
	{
		const f = fmt( az );
		const yRow = - ( gap + tickSize / 2 );
		az.ticks.forEach( ( t, i ) => {

			const text = f( t );
			const w = measure( text, tickSize );
			add( 'tz' + i, text, v( S, yRow, az.scale( t ) + w / 2 ), faceX, tickSize );

		} );

		const w = measure( az.name, titleSize );
		add( 'az', az.name, v( S, yRow - tickSize / 2 - gap - titleSize / 2, S / 2 + w / 2 ), faceX, titleSize );
	}

	// y axis: left of the left-front vertical edge in the z = side plane,
	// right-aligned to it; the title above the edge's top, right-aligned the
	// same way (the notebook puts each name at the top-left of its cell)
	{
		const f = fmt( ay );
		ay.ticks.forEach( ( t, i ) => {

			const text = f( t );
			const w = measure( text, tickSize );
			add( 'ty' + i, text, v( - gap - w, ay.scale( t ), S ), faceZ, tickSize );

		} );

		const w = measure( ay.name, titleSize );
		add( 'ay', ay.name, v( - gap - w, S + gap + titleSize / 2, S ), faceZ, titleSize );
	}

	return {
		group, wrappers, ids, positions, corners,
		orient: w => quaternions.get( w ),
		count: wrappers.length
	};

}
