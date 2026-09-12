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
// +x would project to the LEFT of its -x from the registered camera, the label
// is turned 180° about its own up axis and its anchor swapped start<->end, so
// the block of text still occupies the same side of the node but reads
// left-to-right. This is the notebook's `text-anchor: x < π ? start : end`.
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
 *           count: number, flipped: number, update: (camera) => void }>}
 *          `labels[i]` = { id, node, text, object, anchorX: 'start' | 'end', flipped }
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
	// quad per character (lib3 counts spaces as blank glyphs too).
	const strings = nodes.map( n => String( n.data[ textKey ] ) );
	const glyphTotal = strings.reduce( ( s, t ) => s + t.length, 0 );
	const uniqueChars = new Set( strings.join( '' ).replace( / /g, '' ) );

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

		if ( billboard ) {

			label.quaternion.copy( camera.quaternion );
			label.position.copy( p );

		} else {

			label.quaternion.copy( orient( node ) );

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

		labels.push( { id: ids.get( node ), node, text: strings[ i ], object: label, anchorX, flipped: wasFlipped } );

	}

	// Font-file metrics are needed for layout: wait for the TTF, then lay out
	// every member once. Nothing here depends on the renderer.
	await batched.ready;
	group.updateMatrixWorld( true );
	batched.sync();

	if ( batched.count !== glyphTotal ) {

		throw new Error( `hierarchyLabels: ${ batched.count } glyph quads laid out, expected ${ glyphTotal } (atlas or batch overflow)` );

	}

	const api = {
		group, batched, labels, count: labels.length, flipped, billboard,

		// Billboard mode: face every label at `camera` (call once per frame).
		update( cam ) {

			if ( ! billboard ) return;

			for ( let i = 0; i < labels.length; i ++ ) {

				const object = labels[ i ].object;
				object.quaternion.copy( cam.quaternion );
				object.updateMatrixWorld( true );
				batched.setMatrixAt( i, object.matrixWorld );

			}

		},

		// The marks-dump entries: world anchor position, orientation, anchor.
		dump() {

			return labels.map( l => {

				l.object.getWorldPosition( _p );
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

	_x.set( 1, 0, 0 ).applyQuaternion( quaternion );

	const right = _p.copy( position ).add( _x ).project( camera ).x;
	const left = _p.copy( position ).sub( _x ).project( camera ).x;

	return right < left;

}
