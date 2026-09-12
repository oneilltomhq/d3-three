// node --import ./test/three-loader.mjs <script>
//
// Resolves the bare specifier `three` to the vendored three.js build
// ($THREE_DIR/build/three.module.js) so src/ primitives that import three can
// run under node's test runner without a node_modules copy of three.

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import * as os from 'node:os';
import * as path from 'node:path';

const THREE_DIR = path.resolve( process.env.THREE_DIR || path.join( os.homedir(), 'src/vendor/three.js' ) );
const threeUrl = pathToFileURL( path.join( THREE_DIR, 'build/three.module.js' ) ).href;

register( 'data:text/javascript,' + encodeURIComponent( `
export async function resolve( specifier, context, next ) {
	if ( specifier === 'three' ) return { url: ${ JSON.stringify( threeUrl ) }, shortCircuit: true };
	return next( specifier, context );
}
` ), pathToFileURL( './' ) );
