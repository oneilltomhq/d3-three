// Adapted from ~/src/vendor/three.js/test/e2e/puppeteer.js (3d010ef).
//
// Kept verbatim: launch flags, viewport 400x250 @ viewScale 2, Image.scale(1/2),
// pixel thresholds, the page flow (goto -> clean-page -> network idle 2s ->
// _renderStarted -> _renderFinished -> screenshot), the build injection regexes
// and request interception, console/error capture, -actual/-expected/-diff.jpg.
//
// Dropped: exceptionList, CI sharding, the --webgpu filter. Files are
// `examples/d3_*.html`.
//
// Added:
//   * builds are read from $THREE_DIR/build (the vendored three.js), served at
//     the same `/build/*` URLs so the interception still matches;
//   * after the screenshot, `window.d33.report()` is written to
//     `marks/<file>.json` and `gates/<file>.json`; a failing gate is a test
//     failure, printed red, like a diff failure; a page with no `window.d33`
//     is a failure;
//   * `--twice`: render + screenshot each file twice and assert compare()
//     finds 0 differing pixels (§D.18);
//   * `--size WxH` (rung 3): render at that size (still at viewScale 2, then
//     downscaled) and write `handoff/rung3/eyeball/<file>-<W>x<H>.png` for the
//     user to look at. No reference is read or written, no marks/gates either:
//     the 400x250 reference path is untouched.

import puppeteer from 'puppeteer';
import { Image } from './image.js';
import { PNG } from 'pngjs';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';
import { createServer } from './server.js';

const server = createServer();

const THREE_DIR = path.resolve( process.env.THREE_DIR || path.join( os.homedir(), 'src/vendor/three.js' ) );

/* Configuration */

const port = Number( process.env.E2E_PORT ) || 1234;
const pixelThreshold = 0.1; // threshold error in one pixel
const maxDifferentPixels = 0.1; // at most 0.1% different pixels

const idleTime = 2; // 2 seconds - for how long there should be no network requests
const parseTime = 1; // 1 second per megabyte

const networkTimeout = 5; // 5 minutes, set to 0 to disable
const renderTimeout = 5; // 5 seconds, set to 0 to disable

let width = 400;
let height = 250;
const viewScale = 2;
const jpgQuality = 95;

console.red = msg => console.log( `\x1b[31m${msg}\x1b[39m` );
console.green = msg => console.log( `\x1b[32m${msg}\x1b[39m` );
console.yellow = msg => console.log( `\x1b[33m${msg}\x1b[39m` );

let browser;

/* Launch server */

server.listen( port, main );

process.on( 'SIGINT', async () => {

	console.log( '\nInterrupted, cleaning up...' );

	if ( browser ) {

		try {

			await browser.close();

		} catch ( e ) {}

	}

	server.close();
	process.exit( 1 );

} );

async function main() {

	/* Create output directories */

	try {

		await fs.rm( 'test/e2e/output-screenshots', { recursive: true, force: true } );

	} catch ( e ) {}

	for ( const dir of [ 'test/e2e/output-screenshots', 'marks', 'gates', 'examples/screenshots' ] ) {

		try {

			await fs.mkdir( dir, { recursive: true } );

		} catch ( e ) {}

	}

	/* Find files */

	let isMakeScreenshot = false;
	let isTwice = false;
	let eyeball = null; // { width, height } from --size WxH

	let argvIndex = 2;

	while ( true ) {

		if ( process.argv[ argvIndex ] === '--make' ) {

			isMakeScreenshot = true;
			argvIndex ++;

		} else if ( process.argv[ argvIndex ] === '--twice' ) {

			isTwice = true;
			argvIndex ++;

		} else if ( process.argv[ argvIndex ] === '--size' ) {

			const m = /^(\d+)x(\d+)$/.exec( process.argv[ argvIndex + 1 ] || '' );
			if ( ! m ) {

				console.red( '--size needs WxH, e.g. --size 1600x1000' );
				process.exit( 1 );

			}

			eyeball = { width: parseInt( m[ 1 ], 10 ), height: parseInt( m[ 2 ], 10 ) };
			width = eyeball.width;
			height = eyeball.height;
			argvIndex += 2;

		} else break;

	}

	if ( eyeball ) await fs.mkdir( 'handoff/rung3/eyeball', { recursive: true } );

	const exactList = process.argv.slice( argvIndex )
		.map( f => f.replace( '.html', '' ) );

	const isExactList = exactList.length !== 0;

	let files = ( await fs.readdir( 'examples' ) )
		.filter( s => s.slice( - 5 ) === '.html' && s !== 'index.html' )
		.map( s => s.slice( 0, s.length - 5 ) )
		.filter( f => f.startsWith( 'd3_' ) )
		// `d3_blank` is the rung 0 fixture that proves the gates fail honestly, not
		// a ladder example: an unfiltered run skips it (rung 2 director ruling).
		// `npm run e2e d3_blank` still runs it, because it is an exact name.
		.filter( f => isExactList ? exactList.includes( f ) : f !== 'd3_blank' );

	if ( isExactList ) {

		for ( const file of exactList ) {

			if ( ! files.includes( file ) ) {

				console.log( `Warning! Unrecognised example name: ${ file }` );

			}

		}

	}

	/* Launch browser */

	const flags = [
		'--hide-scrollbars',
		'--enable-unsafe-webgpu',
		'--enable-features=Vulkan',
		// NOTE: three's file has '--use-angle=vulkan' here. On this machine, with
		// VK_DRIVER_FILES pointing at lavapipe, that flag makes Dawn fail to create a
		// WebGPU adapter ("Failed to create WebGPU Context Provider"), so every page
		// would silently drop to the WebGL2 backend. Replaced with the
		// '--disable-vulkan-surface' of the HANDOFF flag list; WebGL still runs on
		// ANGLE/Vulkan/lavapipe, WebGPU comes up on Dawn/SwiftShader.
		'--disable-vulkan-surface',
		// NOTE (rung 1): without these three, nothing a GPU canvas draws ever reaches
		// the headless compositor on this machine — `page.screenshot()` returns the
		// page background and the canvas is invisible, for WebGL and WebGPU alike
		// (three's own `npm run test-e2e -- --make webgpu_lines_fat` produces a blank
		// jpg here too). With ANGLE on SwiftShader the WebGL canvas composites, and
		// the WebGPU canvas can at least be read back with `toDataURL` (see
		// `grabCanvas` below). Dawn still picks its own SwiftShader adapter, so the
		// WebGPU results are unchanged.
		'--enable-unsafe-swiftshader',
		'--use-gl=angle',
		'--use-angle=swiftshader',
		'--use-webgpu-adapter=swiftshader',
		'--ignore-gpu-blocklist',
		'--disable-gpu-driver-bug-workarounds',
		'--disable-gpu-watchdog',
		'--no-sandbox'
	];

	const viewport = { width: width * viewScale, height: height * viewScale };

	// VK_DRIVER_FILES (lavapipe) must NOT be set: with it, the WebGPU canvas is
	// rendered but never readable — `toDataURL` returns a fully transparent
	// image (measured: 400000/400000 px at rgba 0,0,0,0). Without it, and with
	// the ANGLE/SwiftShader flags above, Dawn still selects its SwiftShader
	// adapter, so the rasterizer is the same software one and determinism is
	// unchanged; `ensureWebGPU` below asserts that.
	const env = { ...process.env };
	delete env.VK_DRIVER_FILES;

	const launchOptions = {
		headless: ( process.env.VISIBLE ) ? false : 'new',
		env,
		args: flags,
		defaultViewport: viewport,
		handleSIGINT: false,
		protocolTimeout: 0,
		userDataDir: './.puppeteer_profile'
	};

	/* Prepare injections */

	const buildInjection = ( code ) => code
		.replace( /Math\.random\(\) \* 0xffffffff/g, 'Math._random() * 0xffffffff' )
		// Disables WebGPU timestamp queries to prevent Inspector/Profiler from crashing in E2E software mode
		.replace( /this\.trackTimestamp\s*=\s*\(\s*parameters\.trackTimestamp\s*===\s*true\s*\);/g, 'Object.defineProperty(this, \'trackTimestamp\', { get: () => false, set: () => {} });' );

	const cleanPage = await fs.readFile( 'test/e2e/clean-page.js', 'utf8' );
	const injection = await fs.readFile( 'test/e2e/deterministic-injection.js', 'utf8' );

	const builds = {
		'three.core.js': buildInjection( await fs.readFile( path.join( THREE_DIR, 'build/three.core.js' ), 'utf8' ) ),
		'three.module.js': buildInjection( await fs.readFile( path.join( THREE_DIR, 'build/three.module.js' ), 'utf8' ) ),
		'three.webgpu.js': buildInjection( await fs.readFile( path.join( THREE_DIR, 'build/three.webgpu.js' ), 'utf8' ) )
	};

	/* Prepare page */

	const errorMessagesCache = [];

	const launchPage = async () => {

		browser = await puppeteer.launch( launchOptions );
		const page = await browser.newPage();
		await preparePage( page, injection, builds, errorMessagesCache );
		return page;

	};

	const ctx = {
		page: await launchPage(),
		async restart() {

			// SIGKILL the whole Chrome process tree; browser.close() can hang after a wedged GPU process
			const proc = browser.process();
			if ( proc ) {

				proc.kill( 'SIGKILL' );
				await new Promise( resolve => proc.once( 'exit', resolve ) );

			}

			errorMessagesCache.length = 0;
			ctx.page = await launchPage();

		}
	};

	/* WebGPU must actually come up before anything is measured */

	await ensureWebGPU( ctx );

	/* Loop for each file */

	const failedScreenshots = [];

	for ( const file of files ) {

		await checkFile( ctx, failedScreenshots, cleanPage, { isMakeScreenshot, isTwice, eyeball }, file );

	}

	/* Finish */

	failedScreenshots.sort();
	const list = failedScreenshots.join( ' ' );

	if ( eyeball && failedScreenshots.length ) {

		console.red( 'List of failed eyeball renders: ' + list );
		console.red( `${ failedScreenshots.length } from ${ files.length } eyeball renders failed.` );

	} else if ( eyeball ) {

		console.green( `${ files.length } eyeball renders written (${ width }x${ height }).` );

	} else if ( isMakeScreenshot && failedScreenshots.length ) {

		console.red( 'List of failed screenshots: ' + list );
		console.red( `${ failedScreenshots.length } from ${ files.length } screenshots have not generated successfully.` );

	} else if ( isMakeScreenshot && ! failedScreenshots.length ) {

		console.green( `${ files.length } screenshots successfully generated.` );

	} else if ( failedScreenshots.length ) {

		console.red( 'List of failed examples: ' + list );
		console.red( `TEST FAILED! ${ failedScreenshots.length } from ${ files.length } examples did not pass.` );

	} else {

		console.green( `TEST PASSED! ${ files.length } examples passed.` );

	}

	setTimeout( close, 300, failedScreenshots.length );

}

/* On this machine the FIRST Chromium launch after an idle gap reliably fails to
   bring up a WebGPU adapter ("Failed to create WebGPU Context Provider" /
   "A valid external Instance reference no longer exists."), and the page would
   silently fall back to the WebGL2 backend. A restart always fixes it, so probe
   for a real adapter before measuring anything and restart until we have one.
   Never accept the WebGL fallback. */

async function ensureWebGPU( ctx, attempts = 5 ) {

	for ( let i = 0; i < attempts; i ++ ) {

		const page = ctx.page;

		await page.goto( `http://localhost:${ port }/` );

		const info = await page.evaluate( async () => {

			if ( ! ( 'gpu' in navigator ) ) return { gpu: false };

			try {

				const adapter = await navigator.gpu.requestAdapter();
				if ( ! adapter ) return { gpu: true, adapter: null };

				return { gpu: true, adapter: {
					vendor: adapter.info.vendor,
					architecture: adapter.info.architecture,
					device: adapter.info.device,
					description: adapter.info.description
				} };

			} catch ( e ) {

				return { gpu: true, error: String( e ) };

			}

		} );

		if ( info.adapter ) {

			if ( info.adapter.architecture !== 'swiftshader' ) {

				console.red( `WebGPU adapter is ${ JSON.stringify( info.adapter ) }, not SwiftShader. Screenshots would not reproduce.` );
				close( 1 );

			}

			console.green( `WebGPU adapter: ${ JSON.stringify( info.adapter ) } (attempt ${ i + 1 })` );
			return info.adapter;

		}

		console.yellow( `No WebGPU adapter on attempt ${ i + 1 }: ${ JSON.stringify( info ) }. Restarting browser...` );
		await ctx.restart();

	}

	console.red( 'WebGPU adapter never initialised. Refusing to run on the WebGL fallback.' );
	close( 1 );

}

async function preparePage( page, injection, builds, errorMessages ) {

	await page.evaluateOnNewDocument( injection );
	await page.setRequestInterception( true );

	page.on( 'console', async msg => {

		const type = msg.type();

		const file = page.file;

		if ( file === undefined ) {

			return;

		}

		const args = await Promise.all( msg.args().map( async arg => {

			try {

				return await arg.executionContext().evaluate( arg => arg instanceof Error ? arg.message : arg, arg );

			} catch ( e ) {

				// Execution context might have been already destroyed

				return arg;

			}

		} ) );

		let text = args.join( ' ' ); // https://github.com/puppeteer/puppeteer/issues/3397#issuecomment-434970058

		text = text.trim();
		if ( text === '' ) return;
		if ( text.includes( 'Timestamp tracking is disabled' ) ) return;

		text = file + ': ' + text.replace( /\[\.WebGL-(.+?)\] /g, '' );

		if ( text === `${ file }: JSHandle@error` ) {

			text = `${ file }: Unknown error`;

		}

		if ( errorMessages.includes( text ) ) {

			return;

		}

		errorMessages.push( text );

		if ( type === 'warning' ) {

			console.yellow( text );

		} else if ( type === 'error' ) {

			page.error = text;

		} else {

			console.log( `[Browser] ${text}` );

		}

	} );

	page.on( 'response', async ( response ) => {

		try {

			if ( response.status === 200 ) {

				await response.buffer().then( buffer => page.pageSize += buffer.length );

			}

		} catch ( e ) {}

	} );

	page.on( 'request', async ( request ) => {

		const url = request.url();

		for ( const build in builds ) {

			if ( url === `http://localhost:${ port }/build/${ build }` ) {

				await request.respond( {
					status: 200,
					contentType: 'application/javascript; charset=utf-8',
					body: builds[ build ]
				} );

				return;

			}

		}

		await request.continue();

	} );

}

/* Load, render and screenshot one page once. Returns the raw PNG buffer, the
   downscaled Image and the d33 report. */

async function renderOnce( page, cleanPage, file ) {

	const pageStart = performance.now();

	page.file = file;
	page.pageSize = 0;
	page.error = undefined;

	/* Load target page */

	try {

		await page.goto( `http://localhost:${ port }/examples/${ file }.html`, {
			waitUntil: 'networkidle0',
			timeout: networkTimeout * 60000
		} );

	} catch ( e ) {

		throw new Error( `Error happened while loading file ${ file }: ${ e }` );

	}

	try {

		/* Render page */

		await page.evaluate( cleanPage );

		await page.waitForNetworkIdle( {
			timeout: networkTimeout * 60000,
			idleTime: idleTime * 1000
		} );

		await page.evaluate( async ( renderTimeout, parseTime ) => {

			await new Promise( resolve => setTimeout( resolve, parseTime ) );

			/* Resolve render promise */

			window._renderStarted = true;

			await new Promise( function ( resolve, reject ) {

				const renderStart = performance._now();

				const waitingLoop = setInterval( function () {

					const renderTimeoutExceeded = ( renderTimeout > 0 ) && ( performance._now() - renderStart > 1000 * renderTimeout );

					if ( renderTimeoutExceeded ) {

						clearInterval( waitingLoop );
						reject( 'Render timeout exceeded' );

					} else if ( window._renderFinished ) {

						clearInterval( waitingLoop );
						resolve();

					}

				}, 100 );

			} );

		}, renderTimeout, page.pageSize / 1024 / 1024 * parseTime * 1000 );

	} catch ( e ) {

		if ( e.includes && e.includes( 'Render timeout exceeded' ) === false ) {

			throw new Error( `Error happened while rendering file ${ file }: ${ e }` );

		}

	}

	const elapsed = ( performance.now() - pageStart ) / 1000;

	const png = await grabCanvas( page );
	const screenshot = ( await Image.read( png ) ).scale( 1 / viewScale );

	if ( page.error !== undefined ) throw new Error( page.error );

	/* d33 report: marks, expected counts and gates (§C.13, §B.7-10) */

	const hasAPI = await page.evaluate( () => typeof window.d33 === 'object' && window.d33 !== null );

	if ( ! hasAPI ) throw new Error( `no d33 API in file: ${ file }` );

	const report = await page.evaluate( () => window.d33.report() );

	return { png, screenshot, report, elapsed };

}

/* The headless compositor never gets the GPU canvas on this machine, so
   `page.screenshot()` would return an empty page. Read the canvas itself
   instead — `toDataURL` goes through Chrome's own readback path and returns the
   rendered WebGPU image. Falls back to `page.screenshot()` if there is no
   canvas. The result is the same size as the viewport (dpr 1), so
   `Image.scale( 1 / viewScale )` downscales exactly as before. */

async function grabCanvas( page ) {

	// `_renderFinished` is set by the injected RAF *before* the callback runs, so
	// at this point the frame may still be in flight. Draw one more frame and
	// drain the device queue before reading back. Deterministic: same scene,
	// same camera, frozen clocks, no randomness.

	await page.evaluate( async () => {

		const state = window.d33 ? window.d33.state : null;
		const renderer = state ? state.renderer : null;

		if ( ! renderer ) return;

		if ( state.scene && state.camera ) renderer.render( state.scene, state.camera );

		const device = renderer.backend ? renderer.backend.device : null;
		if ( device ) await device.queue.onSubmittedWorkDone();

	} );

	const dataURL = await page.evaluate( () => {

		const renderer = window.d33 && window.d33.state ? window.d33.state.renderer : null;
		const canvas = ( renderer && renderer.domElement ) || document.querySelector( 'canvas' );

		if ( ! canvas ) return null;

		return canvas.toDataURL( 'image/png' );

	} );

	if ( dataURL === null || ! dataURL.startsWith( 'data:image/png;base64,' ) ) {

		return await page.screenshot();

	}

	return Buffer.from( dataURL.slice( 'data:image/png;base64,'.length ), 'base64' );

}

function formatGates( gates ) {

	const lines = [];

	lines.push( `depth: ${ gates.depth.pass ? 'PASS' : 'FAIL' } ratio=${ gates.depth.ratio.toFixed( 3 ) } extents=[${ gates.depth.extents.map( e => e.toFixed( 3 ) ).join( ', ' ) }]` );
	lines.push( `counts: ${ gates.counts.pass ? 'PASS' : 'FAIL' } nodes=${ gates.counts.nodes }/${ gates.counts.expectedNodes } links=${ gates.counts.links }/${ gates.counts.expectedLinks }` );

	if ( gates.angle.a ) {

		lines.push( `angle: ${ gates.angle.pass ? 'PASS' : 'FAIL' } areaA=${ gates.angle.a.area.toFixed( 4 ) } areaB=${ gates.angle.b.area.toFixed( 4 ) } (>= ${ gates.angle.threshold })` );

	} else {

		lines.push( `angle: ${ gates.angle.pass ? 'PASS' : 'FAIL' } ${ gates.angle.note || '' }` );

	}

	lines.push( `picking: ${ gates.picking.pass ? 'PASS' : 'FAIL' } sampled=${ gates.picking.sampled } hitA=${ gates.picking.hitA } hitB=${ gates.picking.hitB }${ gates.picking.note ? ' ' + gates.picking.note : '' }` );

	const labels = gates.labels || { pass: false, count: 0, expectedNodes: 0, note: 'no labels gate in report' };
	lines.push( `labels: ${ labels.pass ? 'PASS' : 'FAIL' } count=${ labels.count }/${ labels.expectedNodes }${ labels.note ? ' ' + labels.note : '' }` );

	return lines;

}

async function writeReport( file, report ) {

	await fs.writeFile( `marks/${ file }.json`, JSON.stringify( {
		file,
		expected: report.expected,
		planar: report.planar === true,
		marks: report.marks,
		labels: report.labels || []
	}, null, '\t' ) + '\n' );

	await fs.writeFile( `gates/${ file }.json`, JSON.stringify( {
		file,
		gates: report.gates,
		expected: report.expected,
		planar: report.planar === true,
		target: report.target,
		env: report.env
	}, null, '\t' ) + '\n' );

}

function sha256( buffer ) {

	return crypto.createHash( 'sha256' ).update( buffer ).digest( 'hex' );

}

async function checkFile( ctx, failedScreenshots, cleanPage, mode, file ) {

	const { isMakeScreenshot, isTwice, eyeball } = mode;

	try {

		let first;

		// If the page came up on the WebGL fallback, that is never an acceptable
		// result: restart the browser and try again, then fail loudly.
		for ( let attempt = 1; ; attempt ++ ) {

			first = await renderOnce( ctx.page, cleanPage, file );

			if ( first.report.env.isWebGPUBackend === true ) break;

			if ( attempt >= 3 ) {

				throw new Error( `Renderer is not on the WebGPU backend in file: ${ file } (backend=${ first.report.env.backend })` );

			}

			console.yellow( `${ file }: backend=${ first.report.env.backend }, not WebGPU. Restarting browser (attempt ${ attempt })...` );
			await ctx.restart();

		}

		const gates = first.report.gates;
		const env = first.report.env;

		console.log( `[d33] ${ file }: backend=${ env.backend } navigator.gpu=${ env.hasNavigatorGPU } adapter=${ JSON.stringify( env.adapterInfo ) }` );

		if ( eyeball ) {

			/* Eyeball render for the user: PNG at the requested size, nothing else touched */

			const out = `handoff/rung3/eyeball/${ file }-${ eyeball.width }x${ eyeball.height }.png`;
			const png = new PNG( { width: first.screenshot.width, height: first.screenshot.height } );
			png.data = Buffer.from( first.screenshot.data );
			await fs.writeFile( out, PNG.sync.write( png ) );

			console.green( `Eyeball render written: ${ out } (${ first.screenshot.width }x${ first.screenshot.height })` );

			for ( const line of formatGates( gates ) ) {

				( gates.pass ? console.green : console.yellow )( `  gate ${ line }` );

			}

			return;

		}

		await writeReport( file, first.report );

		if ( isTwice ) {

			/* Two consecutive runs must be byte-identical (§D.18) */

			const second = await renderOnce( ctx.page, cleanPage, file );

			const pathA = `test/e2e/output-screenshots/${ file }-run1.png`;
			const pathB = `test/e2e/output-screenshots/${ file }-run2.png`;

			await fs.writeFile( pathA, first.png );
			await fs.writeFile( pathB, second.png );

			const diff = first.screenshot.clone();
			const numDifferentPixels = first.screenshot.compare( second.screenshot, diff, pixelThreshold );

			console.log( `[twice] ${ file }: sha256(${ pathA }) = ${ sha256( first.png ) }` );
			console.log( `[twice] ${ file }: sha256(${ pathB }) = ${ sha256( second.png ) }` );

			if ( numDifferentPixels === 0 ) {

				console.green( `Two runs identical: 0 differing pixels in file: ${ file }` );

			} else {

				await diff.write( `test/e2e/output-screenshots/${ file }-twice-diff.jpg`, jpgQuality );
				throw new Error( `Two runs differ in ${ numDifferentPixels } pixels in file: ${ file }` );

			}

			return;

		}

		if ( isMakeScreenshot ) {

			/* Make screenshots */

			await first.screenshot.write( `examples/screenshots/${ file }.jpg`, jpgQuality );

			console.green( `Screenshot generated for file ${ file }` );

			// Gates are reported in --make too, but they do not block reference
			// generation: you need a reference before you can diff against it.
			for ( const line of formatGates( gates ) ) {

				( gates.pass ? console.green : console.yellow )( `  gate ${ line }` );

			}

			return;

		}

		/* Diff screenshots */

		let expected;

		try {

			expected = await Image.read( `examples/screenshots/${ file }.jpg` );

		} catch ( e ) {

			await first.screenshot.write( `test/e2e/output-screenshots/${ file }-actual.jpg`, jpgQuality );
			throw new Error( `Screenshot does not exist: ${ file }` );

		}

		const actual = first.screenshot.bitmap;
		const diff = first.screenshot.clone();

		let numDifferentPixels;

		try {

			numDifferentPixels = expected.compare( first.screenshot, diff, pixelThreshold );

		} catch ( e ) {

			await first.screenshot.write( `test/e2e/output-screenshots/${ file }-actual.jpg`, jpgQuality );
			await expected.write( `test/e2e/output-screenshots/${ file }-expected.jpg`, jpgQuality );
			throw new Error( `Image sizes do not match in file: ${ file }` );

		}

		/* Print results */

		const differentPixels = numDifferentPixels / ( actual.width * actual.height ) * 100;

		if ( differentPixels < maxDifferentPixels ) {

			console.green( `Diff ${ differentPixels.toFixed( 1 ) }% in file: ${ file } (${ first.elapsed.toFixed( 1 ) }s)` );

		} else {

			await first.screenshot.write( `test/e2e/output-screenshots/${ file }-actual.jpg`, jpgQuality );
			await expected.write( `test/e2e/output-screenshots/${ file }-expected.jpg`, jpgQuality );
			await diff.write( `test/e2e/output-screenshots/${ file }-diff.jpg`, jpgQuality );
			throw new Error( `Diff wrong in ${ differentPixels.toFixed( 1 ) }% of pixels in file: ${ file } (${ first.elapsed.toFixed( 1 ) }s)` );

		}

		/* Gates (§B.7-10, §C.12) — a failing gate fails the test */

		for ( const line of formatGates( gates ) ) {

			( gates.pass ? console.green : console.red )( `  gate ${ line }` );

		}

		if ( ! gates.pass ) {

			const failed = [ 'depth', 'counts', 'angle', 'picking', 'labels' ].filter( g => ! gates[ g ] || ! gates[ g ].pass );
			throw new Error( `Gates failed (${ failed.join( ', ' ) }) in file: ${ file }` );

		}

	} catch ( e ) {

		if ( String( e ).includes( 'WebGPU Device Lost' ) ) {

			console.yellow( `${ e }` );
			console.yellow( 'Restarting browser...' );
			await ctx.restart();

		} else {

			console.red( e );
			failedScreenshots.push( file );

		}

	} finally {

		ctx.page.file = undefined; // release lock

	}

}

function close( exitCode = 1 ) {

	console.log( 'Closing...' );

	browser.close();
	server.close();
	process.exit( exitCode );

}
