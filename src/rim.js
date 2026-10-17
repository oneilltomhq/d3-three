// d3-three — a stroked-circle look for a sphere: the notebook draws internal nodes
// as `fill #fff, stroke #000`, and a white sphere on a white page has no edge.
// This darkens the sphere's silhouette with a view-dependent Fresnel term in
// TSL (`colorNode`), so the mark stays one Mesh per datum (the counts gate):
// no second back-face sphere, no ring geometry.

import { color, dot, float, mix, normalView, positionViewDirection, pow, saturate } from 'three/tsl';

/**
 * A TSL colour node: `fill` in the middle of the sphere, `stroke` at its
 * silhouette. Assign to `material.colorNode`.
 *
 * @param {{ fill?: number, stroke?: number, power?: number, strength?: number }} options
 *        `power` sharpens the rim (higher = thinner), `strength` its darkness.
 */
export function rimColor( { fill = 0xffffff, stroke = 0x000000, power = 2.5, strength = 0.9 } = {} ) {

	const facing = saturate( dot( normalView, positionViewDirection ) );
	const rim = pow( float( 1 ).sub( facing ), power ).mul( strength );

	return mix( color( fill ), color( stroke ), rim );

}
