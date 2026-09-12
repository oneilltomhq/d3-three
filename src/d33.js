// d33 — page-side API shared by every d3_*.html example.
//
// An example builds its scene, then calls:
//
//   register( { renderer, scene, camera, marks, expected, target } )
//
//   marks:    one entry per datum (HANDOFF §C.11)
//             { id, kind: 'node' | 'link' | 'cell', object, a?, b? }
//             `a`/`b` are the ids of the two endpoint marks of a link.
//   expected: { nodes, links } straight off the d3 hierarchy
//             ( root.descendants().length, root.links().length ) (§C.12)
//   target:   optional orbit target; defaults to the centroid of node/cell marks.
//
// The e2e harness then calls `window.d33.report()` after the screenshot and
// writes `marks/<file>.json` and `gates/<file>.json`. Everything here runs on
// the CPU and is deterministic: no renderer reads, no GPU readback.

import * as THREE from 'three';

const state = {
	renderer: null,
	scene: null,
	camera: null,
	marks: [],
	expected: { nodes: 0, links: 0 },
	target: null
};

// gate thresholds
const DEPTH_RATIO = 0.25;   // §B.7 smallest extent >= 1/4 of the largest
const AREA_FRACTION = 0.01; // §B.9 NDC bounding-box area, as a fraction of the viewport
const PICK_SAMPLES = 20;    // §B.10 how many nodes to raycast

export function register( options ) {

	state.renderer = options.renderer || null;
	state.scene = options.scene || null;
	state.camera = options.camera || null;
	state.marks = options.marks || [];
	state.expected = options.expected || { nodes: 0, links: 0 };
	state.target = options.target || null;

	window.d33 = api;

	return api;

}

/* positions */

function nodeIndex( marks ) {

	const byId = new Map();
	for ( const mark of marks ) byId.set( mark.id, mark );
	return byId;

}

function objectPosition( object ) {

	const v = new THREE.Vector3();
	object.getWorldPosition( v );
	return v;

}

// Position used for the gates: world position for nodes and cells, midpoint of
// the two endpoints for links.
function markPositions() {

	const { marks, scene } = state;

	if ( scene ) scene.updateMatrixWorld( true );

	const byId = nodeIndex( marks );
	const positions = new Map();

	for ( const mark of marks ) {

		if ( mark.kind !== 'link' ) positions.set( mark.id, objectPosition( mark.object ) );

	}

	for ( const mark of marks ) {

		if ( mark.kind !== 'link' ) continue;

		const a = positions.get( mark.a );
		const b = positions.get( mark.b );

		if ( a && b ) {

			positions.set( mark.id, a.clone().add( b ).multiplyScalar( 0.5 ) );

		} else {

			// endpoints not registered as marks — fall back to the object itself
			const fallback = byId.get( mark.id );
			positions.set( mark.id, objectPosition( fallback.object ) );

		}

	}

	return positions;

}

function centroid( points ) {

	const c = new THREE.Vector3();
	if ( points.length === 0 ) return c;
	for ( const p of points ) c.add( p );
	return c.multiplyScalar( 1 / points.length );

}

/* cameras */

// Camera B: camera A rotated 90 degrees about the scene up axis, around the
// same target and at the same distance (§B.9).
function orthogonalCamera( cameraA, target ) {

	const cameraB = cameraA.clone();
	const up = cameraA.up.clone().normalize();
	const offset = cameraA.position.clone().sub( target );

	offset.applyAxisAngle( up, Math.PI / 2 );

	cameraB.position.copy( target ).add( offset );
	cameraB.up.copy( up );
	cameraB.lookAt( target );
	cameraB.updateMatrixWorld( true );
	cameraB.updateProjectionMatrix();

	return cameraB;

}

function project( points, camera ) {

	return points.map( p => {

		const v = p.clone().project( camera );
		return { x: v.x, y: v.y };

	} );

}

// NDC space is 2 x 2, so viewport area is 4.
function ndcBoxArea( projected ) {

	if ( projected.length === 0 ) return { width: 0, height: 0, area: 0 };

	let minX = Infinity, maxX = - Infinity, minY = Infinity, maxY = - Infinity;

	for ( const p of projected ) {

		if ( p.x < minX ) minX = p.x;
		if ( p.x > maxX ) maxX = p.x;
		if ( p.y < minY ) minY = p.y;
		if ( p.y > maxY ) maxY = p.y;

	}

	const width = ( maxX - minX ) / 2;
	const height = ( maxY - minY ) / 2;

	return { width, height, area: width * height };

}

/* gates */

function depthGate( positions ) {

	if ( positions.length === 0 ) {

		return { extents: [ 0, 0, 0 ], ratio: 0, pass: false, note: 'no node or cell marks' };

	}

	const box = new THREE.Box3();
	for ( const p of positions ) box.expandByPoint( p );

	const size = new THREE.Vector3();
	box.getSize( size );

	const extents = [ size.x, size.y, size.z ];
	const max = Math.max( ...extents );
	const ratio = max > 0 ? Math.min( ...extents ) / max : 0;

	return { extents, ratio, pass: ratio >= DEPTH_RATIO };

}

function countsGate( marks ) {

	const nodes = marks.filter( m => m.kind === 'node' ).length;
	const links = marks.filter( m => m.kind === 'link' ).length;
	const expectedNodes = state.expected.nodes | 0;
	const expectedLinks = state.expected.links | 0;

	return {
		nodes, links, expectedNodes, expectedLinks,
		pass: nodes === expectedNodes && links === expectedLinks
	};

}

function angleGate( positions, cameraA, cameraB ) {

	if ( positions.length === 0 ) {

		return {
			a: { width: 0, height: 0, area: 0 },
			b: { width: 0, height: 0, area: 0 },
			threshold: AREA_FRACTION,
			pass: false,
			note: 'no node marks'
		};

	}

	const a = ndcBoxArea( project( positions, cameraA ) );
	const b = ndcBoxArea( project( positions, cameraB ) );

	return { a, b, threshold: AREA_FRACTION, pass: a.area >= AREA_FRACTION && b.area >= AREA_FRACTION };

}

function hits( raycaster, camera, ndc, object, scene ) {

	raycaster.setFromCamera( new THREE.Vector2( ndc.x, ndc.y ), camera );

	const intersections = raycaster.intersectObjects( scene.children, true );
	if ( intersections.length === 0 ) return false;

	let hit = intersections[ 0 ].object;

	while ( hit ) {

		if ( hit === object ) return true;
		hit = hit.parent;

	}

	return false;

}

function pickingGate( nodeMarks, positions, cameraA, cameraB ) {

	const { scene } = state;

	if ( nodeMarks.length === 0 || scene === null ) {

		return { sampled: 0, hitA: 0, hitB: 0, misses: [], pass: false, note: 'no node marks' };

	}

	const step = Math.max( 1, Math.floor( nodeMarks.length / PICK_SAMPLES ) );
	const raycaster = new THREE.Raycaster();

	const misses = [];
	let sampled = 0, hitA = 0, hitB = 0;

	for ( let i = 0; i < nodeMarks.length && sampled < PICK_SAMPLES; i += step ) {

		const mark = nodeMarks[ i ];
		const p = positions.get( mark.id );

		sampled ++;

		const ndcA = p.clone().project( cameraA );
		const ndcB = p.clone().project( cameraB );

		const okA = hits( raycaster, cameraA, ndcA, mark.object, scene );
		const okB = hits( raycaster, cameraB, ndcB, mark.object, scene );

		if ( okA ) hitA ++;
		if ( okB ) hitB ++;
		if ( ! okA || ! okB ) misses.push( { id: mark.id, a: okA, b: okB } );

	}

	return { sampled, hitA, hitB, misses, pass: sampled > 0 && hitA === sampled && hitB === sampled };

}

/* report */

function environment() {

	const renderer = state.renderer;
	const backend = renderer && renderer.backend ? renderer.backend.constructor.name : null;

	return {
		backend,
		isWebGPUBackend: backend === 'WebGPUBackend',
		hasNavigatorGPU: typeof navigator !== 'undefined' && 'gpu' in navigator,
		adapterInfo: window.__d33AdapterInfo || null
	};

}

const api = {

	get state() {

		return state;

	},

	report() {

		const marks = state.marks;
		const positions = markPositions();

		const nodeMarks = marks.filter( m => m.kind === 'node' );
		const solidMarks = marks.filter( m => m.kind !== 'link' ); // nodes + cells
		const solidPositions = solidMarks.map( m => positions.get( m.id ) );
		const nodePositions = nodeMarks.map( m => positions.get( m.id ) );

		const cameraA = state.camera;
		const target = state.target
			? state.target.clone()
			: centroid( solidPositions );

		const cameraB = cameraA ? orthogonalCamera( cameraA, target ) : null;

		const gates = {
			depth: depthGate( solidPositions ),
			counts: countsGate( marks ),
			angle: cameraA && cameraB
				? angleGate( nodePositions, cameraA, cameraB )
				: { pass: false, note: 'no camera registered' },
			picking: cameraA && cameraB
				? pickingGate( nodeMarks, positions, cameraA, cameraB )
				: { pass: false, note: 'no camera registered' }
		};

		gates.pass = gates.depth.pass && gates.counts.pass && gates.angle.pass && gates.picking.pass;

		return {
			marks: marks.map( m => {

				const p = positions.get( m.id );
				const out = { id: m.id, kind: m.kind, x: p.x, y: p.y, z: p.z };
				if ( m.a !== undefined ) out.a = m.a;
				if ( m.b !== undefined ) out.b = m.b;
				return out;

			} ),
			expected: { nodes: state.expected.nodes | 0, links: state.expected.links | 0 },
			target: { x: target.x, y: target.y, z: target.z },
			gates,
			env: environment()
		};

	}

};

export default api;
