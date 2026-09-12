// d33 — page-side API shared by every d3_*.html example.
//
// An example builds its scene, then calls:
//
//   register( { renderer, scene, camera, marks, expected, target } )
//
//   marks:    one entry per datum (HANDOFF §C.11)
//             { id, kind: 'node' | 'link' | 'cell', object, a?, b?, normal? }
//             `a`/`b` are the ids of the two endpoint marks of a link.
//             `normal` (unit Vector3 or [x, y, z]) is the outward facing
//             direction of a solid mark; the picking gate only samples marks
//             whose normal is absent or faces the camera.
//   expected: { nodes, links, cells } straight off the d3 hierarchy
//             ( root.descendants().length, root.links().length ) (§C.12);
//             `cells` defaults to 0.
//   target:   optional orbit target; defaults to the centroid of node/cell marks.
//   pickables: optional array of Object3D the picking gate is allowed to hit.
//             Defaults to the node/cell mark objects, so grids, helpers and
//             link geometry can never occlude a node (rung 0 director ruling).
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
	expected: { nodes: 0, links: 0, cells: 0 },
	target: null,
	pickables: null
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
	state.expected = options.expected || { nodes: 0, links: 0, cells: 0 };
	state.target = options.target || null;
	state.pickables = options.pickables || null;

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
	const cells = marks.filter( m => m.kind === 'cell' ).length;
	const expectedNodes = state.expected.nodes | 0;
	const expectedLinks = state.expected.links | 0;
	const expectedCells = state.expected.cells | 0;

	return {
		nodes, links, cells, expectedNodes, expectedLinks, expectedCells,
		pass: nodes === expectedNodes && links === expectedLinks && cells === expectedCells
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

function hits( raycaster, camera, ndc, object, pickables ) {

	raycaster.setFromCamera( new THREE.Vector2( ndc.x, ndc.y ), camera );

	const intersections = raycaster.intersectObjects( pickables, true );
	if ( intersections.length === 0 ) return false;

	let hit = intersections[ 0 ].object;

	while ( hit ) {

		if ( hit === object ) return true;
		hit = hit.parent;

	}

	return false;

}

// A mark with a `normal` is only sampled from a camera it faces
// (dot( normal, camera - mark ) > 0): a cell on the far side of a closed shell
// is rightly occluded by the near side, so it cannot be a picking failure.
function facesCamera( mark, p, camera ) {

	if ( ! mark.normal ) return true;

	const n = mark.normal.isVector3 ? mark.normal : new THREE.Vector3().fromArray( mark.normal );
	return n.dot( camera.position.clone().sub( p ) ) > 0;

}

// Sample up to PICK_SAMPLES marks that face `camera`, evenly along the list,
// and raycast each at its own projected pixel.
function pickFrom( solidMarks, positions, camera, pickables, raycaster ) {

	const eligible = solidMarks.filter( m => facesCamera( m, positions.get( m.id ), camera ) );
	const step = Math.max( 1, Math.floor( eligible.length / PICK_SAMPLES ) );

	const misses = [];
	let sampled = 0, hit = 0;

	for ( let i = 0; i < eligible.length && sampled < PICK_SAMPLES; i += step ) {

		const mark = eligible[ i ];
		const p = positions.get( mark.id );

		sampled ++;

		const ndc = p.clone().project( camera );

		if ( hits( raycaster, camera, ndc, mark.object, pickables ) ) hit ++;
		else misses.push( mark.id );

	}

	return { eligible: eligible.length, sampled, hit, misses };

}

function pickingGate( solidMarks, positions, cameraA, cameraB ) {

	const { scene } = state;

	// Only the node/cell marks are pickable unless the example says otherwise,
	// so helpers and links cannot occlude a node (rung 0 director ruling).
	const pickables = state.pickables
		|| state.marks.filter( m => m.kind !== 'link' ).map( m => m.object );

	if ( solidMarks.length === 0 || scene === null ) {

		return { sampled: 0, sampledA: 0, sampledB: 0, hitA: 0, hitB: 0, misses: [], pass: false, note: 'no node marks' };

	}

	const raycaster = new THREE.Raycaster();

	const a = pickFrom( solidMarks, positions, cameraA, pickables, raycaster );
	const b = pickFrom( solidMarks, positions, cameraB, pickables, raycaster );

	const misses = [
		...a.misses.map( id => ( { id, camera: 'a' } ) ),
		...b.misses.map( id => ( { id, camera: 'b' } ) )
	];

	return {
		sampled: Math.max( a.sampled, b.sampled ),
		sampledA: a.sampled, sampledB: b.sampled,
		eligibleA: a.eligible, eligibleB: b.eligible,
		hitA: a.hit, hitB: b.hit,
		pickables: pickables.length, misses,
		pass: a.sampled > 0 && b.sampled > 0 && a.hit === a.sampled && b.hit === b.sampled,
		note: a.sampled === 0 || b.sampled === 0 ? 'no eligible marks for a camera' : undefined
	};

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

		const solidMarks = marks.filter( m => m.kind !== 'link' ); // nodes + cells
		const solidPositions = solidMarks.map( m => positions.get( m.id ) );

		const cameraA = state.camera;
		const target = state.target
			? state.target.clone()
			: centroid( solidPositions );

		const cameraB = cameraA ? orthogonalCamera( cameraA, target ) : null;

		const gates = {
			depth: depthGate( solidPositions ),
			counts: countsGate( marks ),
			angle: cameraA && cameraB
				? angleGate( solidPositions, cameraA, cameraB )
				: { pass: false, note: 'no camera registered' },
			picking: cameraA && cameraB
				? pickingGate( solidMarks, positions, cameraA, cameraB )
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
			expected: { nodes: state.expected.nodes | 0, links: state.expected.links | 0, cells: state.expected.cells | 0 },
			target: { x: target.x, y: target.y, z: target.z },
			gates,
			env: environment()
		};

	}

};

export default api;
