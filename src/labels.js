// d33 — text labels for a d3 hierarchy, via lib3's SDF text (rung 3).
//
// One `Text` per `root.descendants()`, all drawn by one `BatchedText` (an
// InstancedMesh of glyph quads sampling a single-channel SDF atlas built from
// the font's real outlines). Labels are not marks (HANDOFF §C.11 counts nodes,
// links and cells); they are the one billboard-like thing §B.8 allows — and
// even then they are NOT billboarded by default: each page supplies an
// `orient(node)` that puts the label in a plane that means something in that
// layout (the cone's vertical plane, the blade's plane).
//
// Text local frame: +x along the baseline, +y up, faces +z (DoubleSide, so the
// back reads too — mirrored). Mirroring is corrected here: if a label's local
// +x would project to the LEFT of its -x from the camera, the label is turned
// 180° about its own up axis and its anchor swapped start<->end, so the block
// of text still occupies the same side of the node but reads left-to-right.
// This is the notebook's `text-anchor: x < π ? start : end`. The check runs
// once at layout time against camera A (that state is what the reference
// screenshot and the marks dump record) and again every frame in
// `update(camera)`, where it is a two-axis test — reads left-to-right AND
// upright — choosing one of four 180° turns (none, about up, about the
// normal, about the baseline) so a label lying flat (tree of life) or seen
// from behind is re-turned in place: the plane never moves, only which way
// the text is read in it (rung 3, per-frame flip).
//
// Deterministic: opentype layout is pure arithmetic; the atlas is rasterised
// by Chromium's software Skia (Path2D fill + EDT). Two-run identity in the
// harness is the proof that nothing time- or GPU-dependent leaks in.

import * as THREE from 'three';
import { BatchedText, Text } from 'lib3/sdf-text';

// lib3's BatchedText places each glyph quad with a `positionNode` that reads
// the per-instance `aGlyphBounds` attribute, and relies on three's InstanceNode
// having already multiplied `positionLocal` by the instance matrix. Under the
// vendored three (3d010ef, REVISION 186dev) `NodeMaterial.setupPosition` lets
// `positionNode` overwrite `positionLocal` AFTER the instance transform, so
// every member lands at the origin (measured: a Text at (4, 2, 0) renders at
// the centre; under lib3's own three 0.184.0 the same page renders it up-right).
// Workaround, without touching lib3: bake each glyph's (padded) quad into its
// instance matrix — world × translate(centre) × scale(w, h) on the unit plane,
// which maps uv exactly as the positionNode did — and drop the positionNode, so
// the plain InstancedMesh path does the transform. `setMatrixAt(memberId)` and
// `sync()` both route through `_writeGlyphMatrices`, so billboard updates work.
const GLYPH_QUAD_PAD = 0.12; // BatchedText's own value: same halo margin
const _glyph = new THREE.Matrix4();
const _local = new THREE.Matrix4();

class LabelBatch extends BatchedText {

	constructor( maxTextCount, maxGlyphCount, options ) {

		super( maxTextCount, maxGlyphCount, undefined, options );
		this.material.positionNode = null;

	}

	_writeGlyphMatrices( text, info, glyphStart, glyphCount ) {

		const world = text.matrixWorld;
		const b = info.glyphBounds;

		for ( let g = 0; g < glyphCount; g ++ ) {

			const bi = g * 4;
			const glyph = info.glyphs[ g ];
			let x0 = b[ bi ], y0 = b[ bi + 1 ], x1 = b[ bi + 2 ], y1 = b[ bi + 3 ];

			if ( glyph.char && glyph.char !== ' ' ) {

				const w = x1 - x0, h = y1 - y0;
				x0 -= w * GLYPH_QUAD_PAD; x1 += w * GLYPH_QUAD_PAD;
				y0 -= h * GLYPH_QUAD_PAD; y1 += h * GLYPH_QUAD_PAD;

			}

			_local.makeScale( x1 - x0, y1 - y0, 1 ).setPosition( ( x0 + x1 ) / 2, ( y0 + y1 ) / 2, 0 );
			_glyph.multiplyMatrices( world, _local );
			THREE.InstancedMesh.prototype.setMatrixAt.call( this, glyphStart + g, _glyph );

		}

	}

}

const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _flip = new THREE.Quaternion();
const _rx = new THREE.Quaternion();
const _ry = new THREE.Quaternion();
const _rz = new THREE.Quaternion();

/** Quaternion whose local +x is `along` (unit) and local +y is `up` (unit). */
export function basisQuaternion( along, up, target = new THREE.Quaternion() ) {

	_x.copy( along ).normalize();
	_z.crossVectors( _x, up ).normalize();
	_y.crossVectors( _z, _x ).normalize();
	_m.makeBasis( _x, _y, _z );

	return target.setFromRotationMatrix( _m );

}

/**
 * @param {object} root  a d3 hierarchy node, laid out
 * @param {Map<object, string>} ids       node -> mark id (from hierarchyNodes)
 * @param {Map<object, THREE.Vector3>} positions  node -> world position
 * @param {object} opts
 * @param {string} opts.font              URL of a TTF (vector path: font-file metrics)
 * @param {(node) => THREE.Quaternion} opts.orient
 *        label orientation per node; local +x is the baseline direction.
 *        Leaves are anchored `start` and offset along +x; internal nodes are
 *        anchored `end` and offset along -x. (Ignored when `billboard`.)
 * @param {THREE.Camera} opts.camera      camera A, for the mirror check
 * @param {number} [opts.fontSize=1]      world units (em)
 * @param {number} [opts.leafOffset]      distance from node centre to the text anchor
 * @param {number} [opts.internalOffset]
 * @param {number|string} [opts.color=0x333333]
 * @param {number} [opts.outlineWidth=0.25]   SDF units, see lib3 VectorFontAtlas
 * @param {number|string} [opts.outlineColor=0xffffff]
 * @param {boolean} [opts.billboard=false]  copy the camera quaternion into every
 *        label each frame (`update(camera)`); overrides `orient`.
 * @param {number} [opts.renderOrder=1]   after nodes and links
 * @param {string} [opts.text]            property of `d.data` to show (default `name`)
 * @returns {Promise<{ group: THREE.Group, batched: BatchedText, labels: object[],
 *           count: number, flipped: number, update: (camera) => number }>}
 *          `labels[i]` = { id, node, text, object, anchorX: 'start' | 'end', flipped,
 *          anchor, q0, flipped0, state, poses } — `anchor`/`q0` are the anchor
 *          point and orient() quaternion the mirror check is made against,
 *          `flipped0` the layout-time verdict, `state` (0..3) which of the four
 *          `poses` ({ q, p }: none / about up / about the baseline / in-plane,
 *          relative to how it was laid out) the label is in (see `update`).
 */
export async function hierarchyLabels( root, ids, positions, {
	font,
	orient,
	camera,
	fontSize = 1,
	leafOffset = 0.9,
	internalOffset = 1.0,
	color = 0x333333,
	outlineWidth = 0.25,
	outlineColor = 0xffffff,
	billboard = false,
	renderOrder = 1,
	text: textKey = 'name',
	name = 'labels'
} = {} ) {

	if ( ! font ) throw new Error( 'hierarchyLabels: opts.font (TTF URL) is required' );
	if ( ! billboard && typeof orient !== 'function' ) throw new Error( 'hierarchyLabels: opts.orient(node) is required unless billboard' );
	if ( ! camera ) throw new Error( 'hierarchyLabels: opts.camera is required for the mirror check' );

	const nodes = root.descendants();

	// Size the batch to exactly this hierarchy: one member per node, one glyph
	// quad per character (lib3 counts spaces as blank glyphs too, but a
	// newline — a multi-line label — is a line break, not a glyph).
	const strings = nodes.map( n => String( n.data[ textKey ] ) );
	const glyphTotal = strings.reduce( ( s, t ) => s + t.replace( /\n/g, '' ).length, 0 );
	const uniqueChars = new Set( strings.join( '' ).replace( /[ \n]/g, '' ) );

	const batched = new LabelBatch( nodes.length, glyphTotal, {
		font, outlineWidth, outlineColor
	} );
	batched.name = name + '.batched';
	batched.renderOrder = renderOrder;
	// One InstancedMesh spans the whole layout; never let three cull it on the
	// unit plane's bounding sphere.
	batched.frustumCulled = false;

	const tiles = batched.atlas.cols * batched.atlas.rows;
	if ( uniqueChars.size > tiles ) {

		throw new Error( `hierarchyLabels: ${ uniqueChars.size } distinct glyphs but the atlas has ${ tiles } tiles` );

	}

	const group = new THREE.Group();
	group.name = name;
	group.add( batched );

	const labels = [];
	let flipped = 0;

	camera.updateMatrixWorld( true );

	for ( let i = 0; i < nodes.length; i ++ ) {

		const node = nodes[ i ];
		const leaf = ! node.children;
		const p = positions.get( node );

		const label = new Text();
		label.name = strings[ i ];
		label.text = strings[ i ];
		label.fontSize = fontSize;
		label.anchorY = 'middle';
		label.color.set( color );

		let anchorX = leaf ? 'start' : 'end';
		let wasFlipped = false;
		let q0 = null;

		if ( billboard ) {

			label.quaternion.copy( camera.quaternion );
			label.position.copy( p );

		} else {

			label.quaternion.copy( orient( node ) );
			q0 = label.quaternion.clone();

			// anchor point: leaves hang outward along +x, internal nodes sit inward along -x
			_x.set( 1, 0, 0 ).applyQuaternion( label.quaternion );
			label.position.copy( p ).addScaledVector( _x, leaf ? leafOffset : - internalOffset );

			// mirror check from camera A: local +x must project to the right of local -x
			if ( mirrored( label.position, label.quaternion, camera ) ) {

				_y.set( 0, 1, 0 );
				_flip.setFromAxisAngle( _y, Math.PI ); // about the label's own up axis (local)
				label.quaternion.multiply( _flip );
				anchorX = anchorX === 'start' ? 'end' : 'start';
				wasFlipped = true;
				flipped ++;

			}

		}

		label.anchorX = anchorX === 'start' ? 'left' : 'right'; // lib3 vocabulary
		label.updateMatrix();

		group.add( label );
		batched.addText( label );

		labels.push( {
			id: ids.get( node ), node, text: strings[ i ], object: label, anchorX, flipped: wasFlipped,
			// per-frame flip state (filled in after sync(), when the block width is known)
			anchor: label.position.clone(), q0, flipped0: wasFlipped, state: 0,
			baseQ: label.quaternion.clone(), poses: null
		} );

	}

	// Font-file metrics are needed for layout: wait for the TTF, then lay out
	// every member once. Nothing here depends on the renderer.
	await batched.ready;
	group.updateMatrixWorld( true );
	batched.sync();

	if ( batched.count !== glyphTotal ) {

		throw new Error( `hierarchyLabels: ${ batched.count } glyph quads laid out, expected ${ glyphTotal } (atlas or batch overflow)` );

	}

	// Per-frame flip poses. Turning a laid-out label 180° about an axis
	// through its origin moves the text block (about up: to the other side of
	// the node; about the baseline: below it; in-plane: both). The layout-time
	// flip compensates by swapping the anchor (a re-layout); the per-frame
	// turns must not re-lay anything out, so they keep lib3's anchor and move
	// the origin instead: the block's local extent [x0, x1] × [y0, y1]
	// (blockBounds) turned about the origin becomes [-x1, -x0] × [-y1, -y0],
	// and translating by (x0 + x1) along the laid-out +x and/or (y0 + y1)
	// along +y puts it back where it was. Same pixels, one matrix write.
	//   poses[0] none        q = base           p = anchor
	//   poses[1] about up    q = base·R_y(180°) p = anchor + (x0+x1)·X
	//   poses[2] about x     q = base·R_x(180°) p = anchor + (y0+y1)·Y
	//   poses[3] in-plane    q = base·R_z(180°) p = anchor + (x0+x1)·X + (y0+y1)·Y
	// index = (reads backwards ? 1 : 0) + (upside down ? 2 : 0).
	if ( ! billboard ) {

		const turns = [ null, _ry, _rx, _rz ];
		_ry.setFromAxisAngle( _y.set( 0, 1, 0 ), Math.PI );
		_rx.setFromAxisAngle( _x.set( 1, 0, 0 ), Math.PI );
		_rz.setFromAxisAngle( _z.set( 0, 0, 1 ), Math.PI );

		for ( const l of labels ) {

			const bb = l.object.textRenderInfo.blockBounds;
			const dx = _x.set( 1, 0, 0 ).applyQuaternion( l.baseQ ).multiplyScalar( bb[ 0 ] + bb[ 2 ] ).clone();
			const dy = _y.set( 0, 1, 0 ).applyQuaternion( l.baseQ ).multiplyScalar( bb[ 1 ] + bb[ 3 ] ).clone();

			l.poses = turns.map( ( turn, k ) => {

				const q = turn ? l.baseQ.clone().multiply( turn ) : l.baseQ.clone();
				const p = l.anchor.clone();
				if ( k & 1 ) p.add( dx );
				if ( k & 2 ) p.add( dy );
				return { q, p };

			} );

		}

	}

	const api = {
		group, batched, labels, count: labels.length, flipped, billboard,

		// Call once per frame, before render. Billboard mode: face every label
		// at `cam`. Planar mode: keep every label's plane, but re-run the
		// two-axis test against `cam` — local +x projects right of −x (reads
		// left-to-right) and local +y projects above −y (upright) — and put
		// each label in the one of its four poses for which both hold, so text
		// never reads backwards or upside down from any side of its plane.
		// Near edge-on (either projected axis shorter than EDGE_NDC) the label
		// keeps its state, so nothing flickers at the edge. Unchanged labels
		// cost the two projections only; touched ones get one setMatrixAt.
		// Returns the number of labels touched.
		update( cam ) {

			cam.updateMatrixWorld(); // project() below reads matrixWorldInverse

			let touched = 0;

			for ( let i = 0; i < labels.length; i ++ ) {

				const l = labels[ i ];
				const object = l.object;

				if ( billboard ) {

					object.quaternion.copy( cam.quaternion );

				} else {

					// Mirror test: same inputs as at layout time (orient() frame at
					// the anchor), so under camera A it agrees with `flipped0` bit
					// for bit. Upright test on the same frame (a turn about up does
					// not change +y).
					const dx = projectedExtent( l.anchor, l.q0, cam, _x.set( 1, 0, 0 ), 'x' );
					const dy = projectedExtent( l.anchor, l.q0, cam, _y.set( 0, 1, 0 ), 'y' );
					if ( Math.abs( dx ) <= EDGE_NDC || Math.abs( dy ) <= EDGE_NDC ) continue;

					const state = ( ( dx < 0 ) !== l.flipped0 ? 1 : 0 ) + ( dy < 0 ? 2 : 0 );
					if ( state === l.state ) continue;

					const turnX = ( state & 1 ) !== ( l.state & 1 ); // reading direction changes
					l.state = state;
					l.flipped = l.flipped0 !== ( ( state & 1 ) === 1 );
					if ( turnX ) l.anchorX = ( l.anchorX === 'start' ) ? 'end' : 'start';

					const pose = l.poses[ state ];
					object.quaternion.copy( pose.q );
					object.position.copy( pose.p );

				}

				object.updateMatrixWorld( true );
				batched.setMatrixAt( i, object.matrixWorld );
				touched ++;

			}

			return touched;

		},

		// The marks-dump entries: world anchor position, orientation, anchor.
		// The anchor point is the node-side end of the text block, which a
		// per-frame flip never moves (only the Text's origin does).
		dump() {

			return labels.map( l => {

				if ( l.q0 ) _p.copy( l.anchor ).applyMatrix4( group.matrixWorld );
				else l.object.getWorldPosition( _p );
				l.object.getWorldQuaternion( _q );
				return {
					id: l.id, text: l.text,
					x: _p.x, y: _p.y, z: _p.z,
					q: [ _q.x, _q.y, _q.z, _q.w ],
					anchorX: l.anchorX
				};

			} );

		}
	};

	return api;

}

// Does local +x of a frame at `position` with `quaternion` project to the left
// of local -x from `camera`?  (Uses the camera's real projection, so labels far
// off-axis under a perspective camera are judged where they actually appear.)
function mirrored( position, quaternion, camera ) {

	return projectedExtent( position, quaternion, camera, _x.set( 1, 0, 0 ), 'x' ) < 0;

}

// Signed NDC extent of the local `axis` (unit, in the frame's own space) at
// `position`: screen `component` of (position + axis) minus that of
// (position − axis). Negative = the axis points the wrong way on screen.
// `axis` is overwritten with its world direction.
function projectedExtent( position, quaternion, camera, axis, component ) {

	axis.applyQuaternion( quaternion );

	const plus = _p.copy( position ).add( axis ).project( camera )[ component ];
	const minus = _p.copy( position ).sub( axis ).project( camera )[ component ];

	return plus - minus;

}

// Hysteresis for the per-frame turns: below this projected half-extent (NDC)
// a label is edge-on and keeps its state rather than flickering.
const EDGE_NDC = 1e-3;
