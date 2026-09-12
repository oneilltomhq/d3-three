// tools/flip.js — prove that planar labels re-flip per frame when the camera
// orbits behind their plane (rung 3, per-frame mirror flip).
//
//   node tools/flip.js d3_tree [--azimuth 180] [--size 1600x1000]
//
// The e2e harness renders one frame from camera A, where the layout-time
// mirror check already made every label read left-to-right, so it can never
// show a flip. This tool loads the page WITHOUT the deterministic injection
// (free-running RAF, real clocks), reads `window.d33dev = { camera, controls,
// labels }`, checks that no label is turned at camera A, orbits the camera by
// `--azimuth` degrees about the target's vertical axis, calls
// `labels.update( camera )` and counts the labels whose state changed. It then
// renders one frame at the given size (at viewScale 2, box-filtered down like
// the harness eyeballs) and writes
// `handoff/rung3/eyeball/<file>-flipped-<W>x<H>.png` for the director.
//
// Exit 0 when at least one label flipped and a second update() touches none.

import puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { PNG } from 'pngjs';
import { createServer } from '../test/e2e/server.js';
import { Image } from '../test/e2e/image.js';

const args = process.argv.slice( 2 );
const file = ( args.find( a => ! a.startsWith( '--' ) ) || '' ).replace( '.html', '' );

if ( ! file ) {

	console.error( 'usage: node tools/flip.js d3_<slug> [--azimuth 180] [--size 1600x1000]' );
	process.exit( 1 );

}

function option( name, fallback ) {

	const i = args.indexOf( name );
	return i >= 0 && args[ i + 1 ] !== undefined ? args[ i + 1 ] : fallback;

}

const azimuth = parseFloat( option( '--azimuth', '180' ) );
const noUpdate = args.includes( '--no-update' ); // diagnostic: orbit but skip update(), expect mirrored text
const size = /^(\d+)x(\d+)$/.exec( option( '--size', '1600x1000' ) );

if ( ! size || ! Number.isFinite( azimuth ) ) {

	console.error( '--size needs WxH and --azimuth a number' );
	process.exit( 1 );

}

const width = parseInt( size[ 1 ], 10 );
const height = parseInt( size[ 2 ], 10 );
const viewScale = 2;

// Same Chromium flags as tools/stable.js (WebGPU on SwiftShader, no lavapipe).
const flags = [
	'--hide-scrollbars',
	'--enable-unsafe-webgpu',
	'--enable-features=Vulkan',
	'--disable-vulkan-surface',
	'--enable-unsafe-swiftshader',
	'--use-gl=angle',
	'--use-angle=swiftshader',
	'--use-webgpu-adapter=swiftshader',
	'--ignore-gpu-blocklist',
	'--disable-gpu-driver-bug-workarounds',
	'--disable-gpu-watchdog',
	'--no-sandbox'
];

const env = { ...process.env };
delete env.VK_DRIVER_FILES;

const server = createServer();
await new Promise( resolve => server.listen( 0, resolve ) );
const port = server.address().port;

const userDataDir = await fs.mkdtemp( path.join( os.tmpdir(), 'd33-flip-' ) );

const browser = await puppeteer.launch( {
	headless: 'new',
	env,
	args: flags,
	defaultViewport: { width: width * viewScale, height: height * viewScale },
	protocolTimeout: 600000, // SwiftShader at 3200x2000 is slow
	userDataDir
} );

let ok = false;

try {

	const page = await browser.newPage();

	page.on( 'pageerror', e => console.error( '[page]', e.message ) );

	await page.goto( `http://localhost:${ port }/examples/${ file }.html`, { waitUntil: 'networkidle0', timeout: 120000 } );
	await page.waitForFunction( () => typeof window.d33dev === 'object' && window.d33dev !== null
		&& window.d33 && window.d33.state.renderer !== null, { timeout: 60000 } );

	// hide the info bar like the harness's clean-page.js
	await page.evaluate( () => { const info = document.getElementById( 'info' ); if ( info ) info.style.display = 'none'; } );

	// Let the free-running loop draw one frame at camera A (so update() has run
	// once from the page's own animate), then stop it: from here on the only
	// frames drawn are the ones this script asks for.
	await page.evaluate( () => new Promise( r => requestAnimationFrame( () => requestAnimationFrame( r ) ) ) );
	await page.evaluate( () => window.d33.state.renderer.setAnimationLoop( null ) );
	console.log( `[${ file }] loaded; animation loop stopped` );

	// One render per step, each read back through the canvas like the
	// harness's grabCanvas. Step 1's frame is a warm-up and is discarded: the
	// FIRST render after setAnimationLoop( null ) still draws the label
	// instance matrices as they were in the last loop frame (camera and marks
	// are current, labels are one update behind), so a flip made just before
	// it is invisible; the second render of the same state is pixel-identical
	// to a loop frame. The harness never sees this because its grabCanvas
	// render is always the second one after the injected RAF frame.
	const step = ( src, ...params ) => page.evaluate( async ( src, ...params ) => {

		const { renderer, scene, camera } = window.d33.state;
		const { controls, labels } = window.d33dev;

		const info = ( new Function( 'camera', 'controls', 'labels', 'THREE', `return (${ src })(camera, controls, labels)` ) )( camera, controls, labels );

		renderer.render( scene, camera );
		const device = renderer.backend ? renderer.backend.device : null;
		if ( device ) await device.queue.onSubmittedWorkDone();

		return { ...info, dataURL: renderer.domElement.toDataURL( 'image/png' ) };

	}, src, ...params );

	const injected = await page.evaluate( () => typeof Math._random === 'function' || typeof performance._now === 'function' );

	// 1. camera A, loop stopped: update() must touch nothing, no label turned
	const atA = await step( `( camera, controls, labels ) => ( {
		count: labels.count,
		turnedBefore: labels.labels.filter( l => l.state === 1 ).length,
		touchedAtA: labels.update( camera )
	} )` );

	// 2. orbit about the target's vertical axis, then update (unless --no-update)
	const after = await step( `( camera, controls, labels ) => {

		const offset = camera.position.clone().sub( controls.target );
		offset.applyAxisAngle( camera.up.clone().normalize(), ${ azimuth } * Math.PI / 180 );
		camera.position.copy( controls.target ).add( offset );
		controls.update(); // lookAt(target), as OrbitControls does after a drag

		const touched = ${ noUpdate } ? - 1 : labels.update( camera );
		const turnedAfter = labels.labels.filter( l => l.state === 1 ).length;
		const touchedAgain = ${ noUpdate } ? - 1 : labels.update( camera ); // same camera: idempotent

		return { touched, turnedAfter, touchedAgain, flippedNow: labels.labels.filter( l => l.flipped ).length };

	}` );

	const result = { injected, ...atA, ...after };

	const png = Buffer.from( result.dataURL.slice( 'data:image/png;base64,'.length ), 'base64' );
	const image = ( await Image.read( png ) ).scale( 1 / viewScale );

	await fs.mkdir( 'handoff/rung3/eyeball', { recursive: true } );
	const out = `handoff/rung3/eyeball/${ file }-${ noUpdate ? 'noupdate' : 'flipped' }-${ width }x${ height }.png`;
	const outPng = new PNG( { width: image.width, height: image.height } );
	outPng.data = Buffer.from( image.data );
	await fs.writeFile( out, PNG.sync.write( outPng ) );

	console.log( `[${ file }] injected=${ result.injected } labels=${ result.count }` );
	console.log( `[${ file }] at camera A: turned=${ result.turnedBefore } update() touched=${ result.touchedAtA }` );
	console.log( `[${ file }] after azimuth +${ azimuth }°: update() touched=${ result.touched } turned=${ result.turnedAfter }/${ result.count } (flipped relative to orient(): ${ result.flippedNow }); second update() touched=${ result.touchedAgain }` );
	console.log( `[${ file }] eyeball written: ${ out } (${ image.width }x${ image.height })` );

	ok = ! result.injected && result.turnedBefore === 0 && result.touchedAtA === 0 && result.touched > 0 && result.touchedAgain === 0;

} finally {

	await browser.close();
	await fs.rm( userDataDir, { recursive: true, force: true } );
	server.close();

}

console.log( ok ? `FLIP OK: ${ file }` : `FLIP FAILED: ${ file }` );
process.exit( ok ? 0 : 1 );
