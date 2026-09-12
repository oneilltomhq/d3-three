// Determinism proof for rung 0 (BRIEF.md items 1-4 and 7).
//
// Runs the same launch flags, the same deterministic injection and the same
// build interception as puppeteer.js, then reports:
//
//   1. Math.random() in the page vs frac( sin( PI/4 + k ) * 1e4 ) in node
//   2. performance.now() and Date.now() in the page
//   3. how many times requestAnimationFrame fired, before and after _renderStarted
//   4. that the intercepted three.webgpu.js carries the patches
//   7. the WebGPU backend and adapter actually in use
//
//   node test/e2e/determinism.js [example]

import puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { createServer } from './server.js';

const port = 1237;
const file = process.argv[ 2 ] || 'd3_blank';
const THREE_DIR = path.resolve( process.env.THREE_DIR || path.join( os.homedir(), 'src/vendor/three.js' ) );

const flags = [
	'--hide-scrollbars',
	'--enable-unsafe-webgpu',
	'--enable-features=Vulkan',
	'--disable-vulkan-surface', // see puppeteer.js: '--use-angle=vulkan' kills the WebGPU adapter here
	// see puppeteer.js: without these the GPU canvas is never readable here
	'--enable-unsafe-swiftshader',
	'--use-gl=angle',
	'--use-angle=swiftshader',
	'--use-webgpu-adapter=swiftshader',
	'--ignore-gpu-blocklist',
	'--disable-gpu-driver-bug-workarounds',
	'--disable-gpu-watchdog',
	'--no-sandbox'
];

const buildInjection = ( code ) => code
	.replace( /Math\.random\(\) \* 0xffffffff/g, 'Math._random() * 0xffffffff' )
	.replace( /this\.trackTimestamp\s*=\s*\(\s*parameters\.trackTimestamp\s*===\s*true\s*\);/g, 'Object.defineProperty(this, \'trackTimestamp\', { get: () => false, set: () => {} });' );

const rafCounter = `
( function () {
	const raf = window.requestAnimationFrame;
	window.__rafTotal = 0;
	window.__rafAfterStart = 0;
	window.requestAnimationFrame = function ( cb ) {
		return raf.call( window, function ( t ) {
			window.__rafTotal ++;
			if ( window._renderStarted === true ) window.__rafAfterStart ++;
			return cb( t );
		} );
	};
}() );
`;

const server = createServer();
await new Promise( resolve => server.listen( port, resolve ) );

const injection = await fs.readFile( 'test/e2e/deterministic-injection.js', 'utf8' );
const cleanPage = await fs.readFile( 'test/e2e/clean-page.js', 'utf8' );

const builds = {
	'three.core.js': buildInjection( await fs.readFile( path.join( THREE_DIR, 'build/three.core.js' ), 'utf8' ) ),
	'three.module.js': buildInjection( await fs.readFile( path.join( THREE_DIR, 'build/three.module.js' ), 'utf8' ) ),
	'three.webgpu.js': buildInjection( await fs.readFile( path.join( THREE_DIR, 'build/three.webgpu.js' ), 'utf8' ) )
};

async function newBrowser() {

	const browser = await puppeteer.launch( {
		headless: 'new',
		env: ( () => { const e = { ...process.env }; delete e.VK_DRIVER_FILES; return e; } )(),
		args: flags,
		defaultViewport: { width: 800, height: 500 },
		handleSIGINT: false,
		protocolTimeout: 0,
		userDataDir: './.puppeteer_profile'
	} );

	const page = await browser.newPage();
	page.on( 'console', msg => console.log( `[Browser ${ msg.type() }] ${ msg.text() }` ) );
	page.on( 'pageerror', err => console.log( `[Browser pageerror] ${ err }` ) );
	await page.evaluateOnNewDocument( injection );
	await page.evaluateOnNewDocument( rafCounter );
	await page.setRequestInterception( true );

	page.on( 'request', async request => {

		const url = request.url();

		for ( const build in builds ) {

			if ( url === `http://localhost:${ port }/build/${ build }` ) {

				await request.respond( { status: 200, contentType: 'application/javascript; charset=utf-8', body: builds[ build ] } );
				return;

			}

		}

		await request.continue();

	} );

	return { browser, page };

}

let { browser, page } = await newBrowser();

/* Item 7 needs a live adapter; the first launch after an idle gap does not get one. */

for ( let i = 0; i < 5; i ++ ) {

	await page.goto( `http://localhost:${ port }/` );
	const ok = await page.evaluate( async () => !! ( navigator.gpu && await navigator.gpu.requestAdapter() ) );
	if ( ok ) break;
	console.log( `(no WebGPU adapter on attempt ${ i + 1 }, restarting)` );
	await browser.close();
	( { browser, page } = await newBrowser() );

}

/* Items 1 and 2 — measured on a plain page so nothing has consumed the stream */

await page.goto( `http://localhost:${ port }/` );

const inPage = await page.evaluate( () => ( {
	random: [ Math.random(), Math.random(), Math.random() ],
	performanceNow: performance.now(),
	dateNow: Date.now(),
	newDateGetTime: new Date().getTime(),
	testing: window.TESTING
} ) );

const inNode = [ 0, 1, 2 ].map( k => {

	const x = Math.sin( Math.PI / 4 + k ) * 10000;
	return x - Math.floor( x );

} );

console.log( '\n== 1. Math.random ==' );
console.log( 'k   page                    node frac(sin(PI/4+k)*1e4)  equal' );
for ( let k = 0; k < 3; k ++ ) {

	console.log( `${ k }   ${ String( inPage.random[ k ] ).padEnd( 22 ) }  ${ String( inNode[ k ] ).padEnd( 24 ) }  ${ inPage.random[ k ] === inNode[ k ] }` );

}

console.log( '\n== 2. clocks ==' );
console.log( `performance.now() = ${ inPage.performanceNow }` );
console.log( `Date.now()        = ${ inPage.dateNow }` );
console.log( `new Date().getTime() = ${ inPage.newDateGetTime }` );
console.log( `window.TESTING    = ${ inPage.testing }` );

/* Items 3, 4 and 7 — on the real example page, through the real page flow */

await page.goto( `http://localhost:${ port }/examples/${ file }.html`, { waitUntil: 'networkidle0' } );
await page.evaluate( cleanPage );
await page.waitForNetworkIdle( { idleTime: 2000 } );

const beforeStart = await page.evaluate( () => ( { total: window.__rafTotal, afterStart: window.__rafAfterStart } ) );

await page.evaluate( async () => {

	window._renderStarted = true;

	await new Promise( ( resolve, reject ) => {

		const start = performance._now();
		const loop = setInterval( () => {

			if ( performance._now() - start > 5000 ) {

				clearInterval( loop );
				reject( 'Render timeout exceeded' );

			} else if ( window._renderFinished ) {

				clearInterval( loop );
				resolve();

			}

		}, 100 );

	} );

} );

// give any further RAF a chance to fire, so "exactly once" is a real claim
await new Promise( resolve => setTimeout( resolve, 1000 ) );

const afterRender = await page.evaluate( () => ( {
	total: window.__rafTotal,
	afterStart: window.__rafAfterStart,
	renderStarted: window._renderStarted,
	renderFinished: window._renderFinished
} ) );

console.log( '\n== 3. requestAnimationFrame ==' );
console.log( `before _renderStarted: total=${ beforeStart.total } afterStart=${ beforeStart.afterStart }` );
console.log( `after  _renderFinished (+1s): total=${ afterRender.total } afterStart=${ afterRender.afterStart }` );
console.log( `_renderStarted=${ afterRender.renderStarted } _renderFinished=${ afterRender.renderFinished }` );

const served = await page.evaluate( async () => {

	const out = {};

	for ( const build of [ 'three.webgpu.js', 'three.core.js', 'three.module.js' ] ) {

		const text = await ( await fetch( '/build/' + build ) ).text();

		out[ build ] = {
			length: text.length,
			patchedRandom: ( text.match( /Math\._random\(\) \* 0xffffffff/g ) || [] ).length,
			rawRandom: ( text.match( /Math\.random\(\) \* 0xffffffff/g ) || [] ).length,
			trackTimestampDefineProperty: ( text.match( /Object\.defineProperty\(this, 'trackTimestamp'/g ) || [] ).length,
			rawTrackTimestamp: ( text.match( /this\.trackTimestamp = \( parameters\.trackTimestamp === true \);/g ) || [] ).length
		};

	}

	return out;

} );

console.log( '\n== 4. served builds (through the harness interception) ==' );
console.log( JSON.stringify( served, null, '\t' ) );

const env = await page.evaluate( () => window.d33 ? window.d33.report().env : null );

console.log( '\n== 7. WebGPU backend ==' );
console.log( JSON.stringify( env, null, '\t' ) );

await browser.close();
server.close();
