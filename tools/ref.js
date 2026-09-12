// tools/ref.js — render the ORIGINAL d3 gallery notebook to `ref/<slug>.png`.
//
//   node tools/ref.js hierarchies/cluster.v2
//
// The visual anchor for an example (HANDOFF §C.15), never a grader.
//
// How it works, without pulling in the Observable runtime: a notebook module
// declares each cell as a plain top-level function (`_chart`, `_data`, ...) and
// then wires them up at the bottom with
// `main.variable(observer("chart")).define("chart", ["d3","data"], _chart)`.
// We read those `define` lines to learn each cell's dependency names, eval the
// notebook's function declarations in a page that has d3 loaded, call the
// `data` cell with a FileAttachment stub that fetches the notebook's own
// `files/`, then call the `chart` cell and screenshot whatever DOM node it
// returns at its natural size.

import puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { createServer } from '../test/e2e/server.js';

const GALLERY_DIR = path.resolve( process.env.GALLERY_DIR || path.join( os.homedir(), 'src/vendor/d3-gallery/notebooks' ) );

const target = process.argv[ 2 ];

if ( ! target ) {

	console.error( 'usage: node tools/ref.js <section>/<slug>   e.g. hierarchies/cluster.v2' );
	process.exit( 1 );

}

const slug = path.basename( target ).replace( /\.v\d+$/, '' );
const outFile = process.argv[ 3 ] || `ref/${ slug }.png`;

// Notebooks whose chart animates itself (a force simulation on d3-timer) are
// not finished when the cell returns: REF_SETTLE_MS waits that long before the
// screenshot. Default 0, so the static notebooks are unchanged.
const settleMs = Number( process.env.REF_SETTLE_MS ) || 0;

// tree-of-life: its `width` cell is 954 (the preset below is 928, and presets
// shadow cells), its SVG has a viewBox but no width/height (so it has no
// natural size in the shrink-to-fit #chart), and its branch-length view is
// the `update` cell run with `showLength = true`. Three additive knobs:
//   REF_VALUES='{"width":954,"showLength":true}'  JSON merged over the presets
//   REF_SVG_SIZE=954   width/height (px) given to a returned SVG that has none
//   REF_THEN=update    comma-separated cells evaluated after `chart`
const extraValues = JSON.parse( process.env.REF_VALUES || '{}' );
const svgSize = Number( process.env.REF_SVG_SIZE ) || 0;
const thenCells = ( process.env.REF_THEN || '' ).split( ',' ).map( s => s.trim() ).filter( Boolean );
// Cells that are Observable inputs (`viewof tile` = Inputs.select(...)) have no
// value here; REF_EXPRS supplies them as a JSON object of JS expressions
// evaluated in the page with `d3` in scope, e.g.
//   REF_EXPRS='{"tile":"d3.treemapBinary"}' node tools/ref.js hierarchies/treemap.v2
const extraExprs = JSON.parse( process.env.REF_EXPRS || '{}' );
// A notebook whose `d3` cell is `require("d3@7", "d3-sankey@0.12")` gets one
// merged namespace from Observable. REF_MERGE lists served ESM modules
// (comma-separated paths under this repo) whose exports are merged onto
// window.d3 before the cells run, e.g.
//   REF_MERGE=/examples/jsm/vendor/d3-sankey.js node tools/ref.js networks/sankey.v2
const mergeModules = ( process.env.REF_MERGE || '' ).split( ',' ).map( s => s.trim() ).filter( Boolean );

/* The notebook's cell wiring: cell name -> { deps, fn } */

function cellDefinitions( source ) {

	const cells = new Map();
	const re = /main\.variable\(\s*observer\(\s*"([^"]+)"\s*\)\s*\)\.define\(\s*"[^"]+"\s*,\s*(?:\[([^\]]*)\]\s*,\s*)?(_\w+)\s*\)/g;

	let m;
	while ( ( m = re.exec( source ) ) !== null ) {

		const deps = ( m[ 2 ] || '' ).split( ',' )
			.map( s => s.trim().replace( /^["']|["']$/g, '' ) )
			.filter( Boolean );

		cells.set( m[ 1 ], { deps, fn: m[ 3 ] } );

	}

	return cells;

}

const notebookPath = path.join( GALLERY_DIR, target, 'notebook.js' );
const source = await fs.readFile( notebookPath, 'utf8' );
const cells = cellDefinitions( source );

if ( ! cells.has( 'chart' ) ) {

	console.error( `No "chart" cell in ${ notebookPath }. Cells: ${ [ ...cells.keys() ].join( ', ' ) }` );
	process.exit( 1 );

}

// The notebook is an ES module; strip the export so it can be eval'd as a
// classic script and leave every cell function as a global.
const script = source.replace( /export\s+default\s+function\s+define/, 'function define' );

// An ephemeral port: a static server for this repo may already be running on a
// fixed one, and this tool must not collide with it.
const server = createServer();
await new Promise( resolve => server.listen( 0, resolve ) );
const port = server.address().port;

const browser = await puppeteer.launch( {
	headless: 'new',
	args: [ '--hide-scrollbars', '--no-sandbox' ],
	defaultViewport: { width: 1200, height: 800 }
} );

const page = await browser.newPage();

page.on( 'pageerror', e => console.error( '[page]', e.message ) );
page.on( 'console', m => { if ( m.type() === 'error' ) console.error( '[page]', m.text() ); } );

// go to the served origin first, so the page can import the d3 bundle
await page.goto( `http://localhost:${ port }/examples/` );

await page.setContent( `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
	html, body { margin: 0; background: #fff; }
	#chart { display: inline-block; font: 10px sans-serif; }
	/* a chart that sizes itself only by viewBox (sunburst.v2: autoBox) gets the notebook width */
	#chart svg:not([width]) { width: 928px; }
</style></head><body><div id="chart"></div></body></html>` );

// the bundle is an ES module, so re-export it onto window
await page.evaluate( async ( url, merge ) => {

	window.d3 = { ...await import( url ) };
	for ( const m of merge ) Object.assign( window.d3, await import( m ) );

}, `http://localhost:${ port }/examples/jsm/vendor/d3.js`, mergeModules.map( m => `http://localhost:${ port }${ m }` ) );

const size = await page.evaluate( async ( script, cells, filesBase, extraValues, svgSize, thenCells, extra ) => {

	eval( script ); // eslint-disable-line no-eval

	const values = {
		d3: window.d3,
		width: 928,
		// Observable's `invalidation` resolves when the cell is re-run; here it
		// never is, so a promise that never settles. Passed to the cell as-is
		// (see `call`): awaiting it would never return.
		invalidation: new Promise( () => {} ),
		// Observable's DOM.uid: a unique id usable as `id` / `url(#id)`
		DOM: { uid: ( () => { let n = 0; return name => { const id = `O-${ name || '' }-${ ++ n }`; return { id, href: `#${ id }`, toString: () => `url(#${ id })` }; }; } )() },
		FileAttachment: name => ( {
			json: () => fetch( filesBase + name ).then( r => r.json() ),
			text: () => fetch( filesBase + name ).then( r => r.text() ),
			csv: async options => window.d3.csvParse( await fetch( filesBase + name ).then( r => r.text() ), options && options.typed ? window.d3.autoType : undefined ),
			tsv: async options => window.d3.tsvParse( await fetch( filesBase + name ).then( r => r.text() ), options && options.typed ? window.d3.autoType : undefined ),
			url: () => filesBase + name
		} )
	};

	for ( const [ name, expression ] of Object.entries( extra ) ) {

		values[ name ] = ( 0, eval )( `( d3 => ( ${ expression } ) )` )( window.d3 ); // eslint-disable-line no-eval

	}

	const call = async name => {

		if ( name in values ) return values[ name ];

		const cell = cells[ name ];
		if ( ! cell ) throw new Error( `no value for cell "${ name }"` );

		const args = [];
		for ( const dep of cell.deps ) args.push( dep === 'invalidation' ? values.invalidation : await call( dep ) );

		values[ name ] = await eval( cell.fn )( ...args ); // eslint-disable-line no-eval
		return values[ name ];

	};

	Object.assign( values, extraValues );

	const node = await call( 'chart' );

	if ( svgSize > 0 && node.tagName === 'svg' && ! node.hasAttribute( 'width' ) ) {

		node.setAttribute( 'width', svgSize );
		node.setAttribute( 'height', svgSize );

	}

	document.getElementById( 'chart' ).appendChild( node );

	for ( const name of thenCells ) await call( name );

	const rect = node.getBoundingClientRect();
	return { width: Math.ceil( rect.width ), height: Math.ceil( rect.height ) };

}, script, Object.fromEntries( cells ), `http://localhost:${ port }/gallery/${ target }/files/`, extraValues, svgSize, thenCells, extraExprs );

await page.setViewport( { width: size.width, height: size.height } );

if ( settleMs > 0 ) await new Promise( resolve => setTimeout( resolve, settleMs ) );

await fs.mkdir( path.dirname( outFile ), { recursive: true } );

const element = await page.$( '#chart > *' );
await element.screenshot( { path: outFile, captureBeyondViewport: true } );

console.log( `${ outFile }: ${ size.width } x ${ size.height } from ${ path.relative( GALLERY_DIR, notebookPath ) }` );

await browser.close();
server.close();
