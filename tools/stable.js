// tools/stable.js — prove that an example's LAYOUT is deterministic, not just
// its screenshot under the harness.
//
//   node tools/stable.js d3_force
//
// The e2e harness injects `deterministic-injection.js` (seeded Math.random,
// frozen clocks, a one-shot RAF) before every page, so `e2e:twice` proves the
// render reproduces *under that injection*. A layout that quietly consumed
// `Math.random()` or the clock would still pass it. This tool loads the page
// in two SEPARATE browser processes with NO injection — the page's own
// Math.random, real performance.now, a free-running RAF — reads
// `window.d33.report().marks` from each, and compares every mark's position
// exactly (`===` on the doubles). It also compares the first run against the
// harness's own `marks/<file>.json`, so all three sources must agree.
//
// Same Chromium flags as test/e2e/puppeteer.js (WebGPU has to come up for
// `register()` to be reached); a throwaway profile per launch; an ephemeral
// server port so it never collides with a running harness.

import puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { createServer } from '../test/e2e/server.js';

const file = ( process.argv[ 2 ] || '' ).replace( '.html', '' );

if ( ! file ) {

	console.error( 'usage: node tools/stable.js d3_<slug>' );
	process.exit( 1 );

}

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

async function loadOnce( run ) {

	const userDataDir = await fs.mkdtemp( path.join( os.tmpdir(), `d33-stable-${ run }-` ) );

	const browser = await puppeteer.launch( {
		headless: 'new',
		env,
		args: flags,
		defaultViewport: { width: 800, height: 500 },
		userDataDir
	} );

	try {

		const page = await browser.newPage();

		page.on( 'pageerror', e => console.error( `[run ${ run }]`, e.message ) );

		await page.goto( `http://localhost:${ port }/examples/${ file }.html`, { waitUntil: 'networkidle0', timeout: 120000 } );
		await page.waitForFunction( () => typeof window.d33 === 'object' && window.d33 !== null && window.d33.state.renderer !== null, { timeout: 60000 } );

		return await page.evaluate( () => {

			// the proof is about the page as it really runs: no injection here
			const injected = typeof Math._random === 'function' || typeof performance._now === 'function';
			const report = window.d33.report();

			return {
				injected,
				backend: report.env.backend,
				random: Math.random(), // differs between runs if Math.random is the real one
				now: performance.now(),
				marks: report.marks,
				labels: report.labels
			};

		} );

	} finally {

		await browser.close();
		await fs.rm( userDataDir, { recursive: true, force: true } );

	}

}

function compare( label, a, b ) {

	if ( a.length !== b.length ) {

		console.error( `${ label }: ${ a.length } vs ${ b.length } entries` );
		return false;

	}

	let differing = 0;
	let maxDelta = 0;

	for ( let i = 0; i < a.length; i ++ ) {

		const p = a[ i ], q = b[ i ];
		const same = p.id === q.id && p.x === q.x && p.y === q.y && p.z === q.z
			&& ( p.q === undefined || p.q.every( ( v, k ) => v === q.q[ k ] ) );

		if ( ! same ) {

			differing ++;
			maxDelta = Math.max( maxDelta, Math.abs( p.x - q.x ), Math.abs( p.y - q.y ), Math.abs( p.z - q.z ) );

		}

	}

	console.log( `${ label }: ${ a.length } entries, ${ differing } differ (max |delta| ${ maxDelta })` );
	return differing === 0;

}

const runs = [];

for ( let run = 1; run <= 2; run ++ ) {

	const r = await loadOnce( run );
	console.log( `[run ${ run }] injected=${ r.injected } backend=${ r.backend } Math.random()=${ r.random } performance.now()=${ r.now.toFixed( 1 ) } marks=${ r.marks.length } labels=${ r.labels.length }` );
	runs.push( r );

}

server.close();

let ok = true;

for ( const r of runs ) {

	if ( r.injected ) { console.error( 'deterministic injection is present; this proof is void' ); ok = false; }
	if ( r.backend !== 'WebGPUBackend' ) { console.error( `backend is ${ r.backend }` ); ok = false; }

}

ok = compare( 'run1 vs run2 marks', runs[ 0 ].marks, runs[ 1 ].marks ) && ok;
ok = compare( 'run1 vs run2 labels', runs[ 0 ].labels, runs[ 1 ].labels ) && ok;

try {

	const harness = JSON.parse( await fs.readFile( `marks/${ file }.json`, 'utf8' ) );
	ok = compare( `run1 vs marks/${ file }.json marks`, runs[ 0 ].marks, harness.marks ) && ok;
	ok = compare( `run1 vs marks/${ file }.json labels`, runs[ 0 ].labels, harness.labels || [] ) && ok;

} catch ( e ) {

	console.log( `marks/${ file }.json not found; skipped the harness comparison` );

}

console.log( ok ? `STABLE: ${ file } layout is identical across independent page loads without the harness injection` : `UNSTABLE: ${ file }` );
process.exit( ok ? 0 : 1 );
