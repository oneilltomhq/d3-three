// d3-three — node marks for a d3 hierarchy: one Mesh(SphereGeometry) per
// `root.descendants()` (HANDOFF §C.11), coloured the way the dendrogram
// notebooks colour them — internal nodes grey, leaves by their top-level
// ancestor from `d3.schemeTableau10`, so the branches read apart in 3D.
//
// Lifted out of `examples/d3_cluster.html` at rung 2, when `d3_tree.html`
// needed the same code. Geometry is shared between nodes of the same class and
// one material is made per colour, but every datum still gets its own Mesh.

import * as THREE from 'three';
import * as d3 from 'd3';

/**
 * @param {object} root            a d3 hierarchy node, already laid out
 * @param {Map<object, THREE.Vector3>} position  node -> world position
 * @param {{ internalRadius?: number, leafRadius?: number, internalColor?: number,
 *           palette?: readonly string[], name?: string }} options
 * @returns {{ group: THREE.Group, marks: object[], ids: Map<object, string>,
 *             colour: Function }}
 *          `marks` are d3-three mark entries ready to be concatenated with the
 *          link marks; `ids` maps each hierarchy node to its mark id, which
 *          the links need for their `a`/`b` endpoints.
 */
export function hierarchyNodes( root, position, {
	internalRadius = 0.6,
	leafRadius = 0.45,
	internalColor = 0x555555,
	palette = d3.schemeTableau10,
	name = 'nodes'
} = {} ) {

	const packages = root.children.map( c => c.data.name );
	const colour = d3.scaleOrdinal( packages, palette );

	const internalGeometry = new THREE.SphereGeometry( internalRadius, 16, 12 );
	const leafGeometry = new THREE.SphereGeometry( leafRadius, 14, 10 );
	const internalMaterial = new THREE.MeshStandardNodeMaterial( { color: internalColor, roughness: 0.65, metalness: 0.0 } );
	const leafMaterials = new Map();

	const group = new THREE.Group();
	group.name = name;

	const ids = new Map();
	root.each( ( node, i ) => ids.set( node, 'n' + i ) );

	const marks = [];

	for ( const node of root.descendants() ) {

		const leaf = ! node.children;
		let material = internalMaterial;

		if ( leaf ) {

			const pkg = node.depth === 0 ? packages[ 0 ] : node.ancestors().at( - 2 ).data.name;

			if ( ! leafMaterials.has( pkg ) ) {

				leafMaterials.set( pkg, new THREE.MeshStandardNodeMaterial( {
					color: new THREE.Color( colour( pkg ) ), roughness: 0.65, metalness: 0.0
				} ) );

			}

			material = leafMaterials.get( pkg );

		}

		const mesh = new THREE.Mesh( leaf ? leafGeometry : internalGeometry, material );
		mesh.position.copy( position.get( node ) );
		mesh.name = node.data.name;
		group.add( mesh );

		marks.push( { id: ids.get( node ), kind: 'node', object: mesh } );

	}

	return { group, marks, ids, colour };

}
