// d3-three — OrbitControls for looking at an example by hand. Damping is off so the
// camera never moves on its own: under the e2e harness exactly one frame is
// rendered and the camera must be bit-identical to the registered one.

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function attachOrbit( camera, domElement, target ) {

	const controls = new OrbitControls( camera, domElement );

	controls.enableDamping = false;
	if ( target ) controls.target.copy( target );
	controls.update();

	return controls;

}
