// d33 — sphere packing for a d3 hierarchy: the 3D lift of `d3.pack()`
// (layouts/pack.md). Volume, not area, is proportional to value, and every
// internal node is a sphere enclosing its children's spheres.
//
// Pure JS, no three dependency, so it runs under `node --test` as well as in
// the page. Deterministic: no randomness, no time; two runs give identical
// numbers.
//
//   pack3( root, { padding, radius, shrink, center } )
//
// expects `root` to be a d3 hierarchy with `.value` on every node (after
// `.sum()`), and sets on every node:
//
//   node.r          sphere radius
//   node.x/y/z      centre, LOCAL to the parent's centre (root at 0,0,0)
//
// Options:
//   padding   added to every internal node's enclosing radius, in the packer's
//             own units (cbrt(value)) — see `paddedPack3` for a fraction of R.
//   radius    if given, everything is scaled at the end so `root.r === radius`.
//   shrink    one pass of "move each child toward the centroid until it touches
//             another" after placement. Default false: with triple contacts
//             every child already touches three others and the pass changes
//             nothing on flare (root radius identical), so the note's own rule
//             (keep it only if the root radius drops by more than 5 %) turns
//             it off.
//   center    'centroid' (enclosing sphere centred on the children's centre of
//             mass) or 'enclosing' (the minimal enclosing sphere of the
//             children, found by the Bădoiu–Clarkson iteration from the
//             centre of mass). Default 'enclosing': the centroid version is far
//             looser with unequal radii (flare root radius 622 vs 273).
//
// Placement of an internal node's children (sorted by descending radius):
// child 0 at the origin, child 1 touching it along +x, child 2 touching both in
// the xy-plane; every further child at the candidate position touching three
// already placed spheres (all triples among the 32 placed spheres nearest the
// current centre of mass) that overlaps nothing and is nearest the centre of
// mass; if no triple candidate is valid, touching two (in the plane through
// them and the centre of mass), then one, then a last-resort position outside
// everything.

const EPS = 1e-12;

// Triples are enumerated among the NEAR placed spheres nearest the centroid.
// 12 was too few: once a node has more children than that, the nearest ones are
// all interior, every triple position is occupied, and placement falls through
// to the fallbacks (measured on flare's `methods`, 32 children: density 0.24
// with 12, 0.40 with 24 or more). 32 covers every node in flare (max 32).
const NEAR = 32;

export function pack3( root, { padding = 0, radius = null, shrink = false, center = 'enclosing' } = {} ) {

	root.eachAfter( node => {

		node.x = node.y = node.z = 0;

		if ( ! node.children ) {

			node.r = Math.cbrt( Math.max( 0, node.value || 0 ) );
			return;

		}

		const kids = node.children.slice().sort( ( a, b ) => b.r - a.r || 0 );

		packSiblings( kids );
		if ( shrink ) shrinkSiblings( kids );

		node.r = enclose( kids, center ) + padding;

	} );

	if ( radius ) {

		const k = radius / root.r;
		root.each( n => {

			n.r *= k; n.x *= k; n.y *= k; n.z *= k;

		} );

	}

	return root;

}

/**
 * `pack3` with the padding given as a fraction of the root radius: packs once
 * without padding to learn the unpadded root radius R0, then again with
 * padding = fraction * R0, and scales the result so `root.r === radius`.
 */
export function paddedPack3( root, { paddingFraction = 0.015, radius = 10, ...rest } = {} ) {

	pack3( root, { ...rest, padding: 0 } );
	const R0 = root.r;
	return pack3( root, { ...rest, padding: paddingFraction * R0, radius } );

}

/* ---------------- sibling placement ---------------- */

function dist2( ax, ay, az, b ) {

	const dx = ax - b.x, dy = ay - b.y, dz = az - b.z;
	return dx * dx + dy * dy + dz * dz;

}

// true when a sphere of radius r at (x,y,z) overlaps none of placed[0..n)
// (skipping index `skip`). Touching counts as not overlapping.
function fits( x, y, z, r, placed, n, skip = - 1 ) {

	for ( let i = 0; i < n; i ++ ) {

		if ( i === skip ) continue;
		const q = placed[ i ];
		const s = r + q.r;
		if ( dist2( x, y, z, q ) < s * s * ( 1 - 2e-12 ) ) return false;

	}

	return true;

}

// Centre of mass of placed[0..n): centres weighted by volume. Measured on
// flare against the plain mean of the centres: root radius 272.8 -> 258.0 and
// the deepest level's median density 0.319 -> 0.346, because big spheres stay
// central and small ones fill the gaps around them.
function centroidOf( placed, n ) {

	let x = 0, y = 0, z = 0, w = 0;
	for ( let i = 0; i < n; i ++ ) {

		const k = placed[ i ];
		const v = k.r * k.r * k.r || EPS;
		x += k.x * v; y += k.y * v; z += k.z * v; w += v;

	}

	return { x: x / w, y: y / w, z: z / w };

}

// Positions of a sphere of radius r touching a, b and c (trilateration).
// Returns the number of solutions written to out[0], out[1].
function touching3( a, b, c, r, out ) {

	const ra = a.r + r, rb = b.r + r, rc = c.r + r;

	let exx = b.x - a.x, exy = b.y - a.y, exz = b.z - a.z;
	const d = Math.hypot( exx, exy, exz );
	if ( d < EPS ) return 0;
	exx /= d; exy /= d; exz /= d;

	const tx = c.x - a.x, ty = c.y - a.y, tz = c.z - a.z;
	const i = exx * tx + exy * ty + exz * tz;
	let eyx = tx - i * exx, eyy = ty - i * exy, eyz = tz - i * exz;
	const j = Math.hypot( eyx, eyy, eyz );
	if ( j < EPS * d ) return 0; // collinear centres
	eyx /= j; eyy /= j; eyz /= j;

	const ezx = exy * eyz - exz * eyy;
	const ezy = exz * eyx - exx * eyz;
	const ezz = exx * eyy - exy * eyx;

	const x = ( ra * ra - rb * rb + d * d ) / ( 2 * d );
	const y = ( ra * ra - rc * rc + i * i + j * j ) / ( 2 * j ) - ( i / j ) * x;
	const z2 = ra * ra - x * x - y * y;
	if ( z2 < - 1e-9 * ra * ra ) return 0;
	const z = Math.sqrt( Math.max( 0, z2 ) );

	const px = a.x + x * exx + y * eyx, py = a.y + x * exy + y * eyy, pz = a.z + x * exz + y * eyz;

	out[ 0 ].x = px + z * ezx; out[ 0 ].y = py + z * ezy; out[ 0 ].z = pz + z * ezz;
	out[ 1 ].x = px - z * ezx; out[ 1 ].y = py - z * ezy; out[ 1 ].z = pz - z * ezz;

	return z > 0 ? 2 : 1;

}

// Positions of a sphere of radius r touching a and b, in the plane through
// a, b and g (the two points of the contact circle nearest/farthest from g).
function touching2( a, b, r, g, out ) {

	const ra = a.r + r, rb = b.r + r;

	let exx = b.x - a.x, exy = b.y - a.y, exz = b.z - a.z;
	const d = Math.hypot( exx, exy, exz );
	if ( d < EPS ) return 0;
	exx /= d; exy /= d; exz /= d;

	const x = ( ra * ra - rb * rb + d * d ) / ( 2 * d );
	const rho2 = ra * ra - x * x;
	if ( rho2 < 0 ) return 0;
	const rho = Math.sqrt( rho2 );

	let tx = g.x - a.x, ty = g.y - a.y, tz = g.z - a.z;
	const i = exx * tx + exy * ty + exz * tz;
	tx -= i * exx; ty -= i * exy; tz -= i * exz;
	let n = Math.hypot( tx, ty, tz );

	if ( n < EPS ) {

		// g on the axis: any perpendicular will do; pick one deterministically
		if ( Math.abs( exx ) < 0.9 ) { tx = 0; ty = - exz; tz = exy; } else { tx = - exz; ty = 0; tz = exx; }
		n = Math.hypot( tx, ty, tz );

	}

	tx /= n; ty /= n; tz /= n;

	const px = a.x + x * exx, py = a.y + x * exy, pz = a.z + x * exz;
	out[ 0 ].x = px + rho * tx; out[ 0 ].y = py + rho * ty; out[ 0 ].z = pz + rho * tz;
	out[ 1 ].x = px - rho * tx; out[ 1 ].y = py - rho * ty; out[ 1 ].z = pz - rho * tz;

	return 2;

}

const _cand = [ { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 } ];

function packSiblings( kids ) {

	const n = kids.length;

	for ( const k of kids ) k.x = k.y = k.z = 0;
	if ( n === 1 ) return;

	kids[ 1 ].x = kids[ 0 ].r + kids[ 1 ].r;
	if ( n === 2 ) return;

	{

		// third sphere touching the first two, in the xy-plane, y > 0
		const r = kids[ 2 ].r;
		const R0 = kids[ 0 ].r + r, R1 = kids[ 1 ].r + r, d = kids[ 1 ].x;
		const x = ( d * d + R0 * R0 - R1 * R1 ) / ( 2 * d );
		kids[ 2 ].x = x;
		kids[ 2 ].y = Math.sqrt( Math.max( 0, R0 * R0 - x * x ) );

	}

	for ( let m = 3; m < n; m ++ ) {

		const k = kids[ m ];
		const r = k.r;
		const g = centroidOf( kids, m );

		// the placed spheres nearest the centroid, by index so ties are stable
		const near = [];
		for ( let i = 0; i < m; i ++ ) near.push( i );
		near.sort( ( a, b ) => dist2( g.x, g.y, g.z, kids[ a ] ) - dist2( g.x, g.y, g.z, kids[ b ] ) || a - b );
		if ( near.length > NEAR ) near.length = NEAR;

		let best = Infinity, bx = 0, by = 0, bz = 0;

		const consider = count => {

			for ( let c = 0; c < count; c ++ ) {

				const p = _cand[ c ];
				const s = dist2( p.x, p.y, p.z, g );
				if ( s < best && fits( p.x, p.y, p.z, r, kids, m ) ) {

					best = s; bx = p.x; by = p.y; bz = p.z;

				}

			}

		};

		// touching three
		for ( let a = 0; a < near.length; a ++ )
			for ( let b = a + 1; b < near.length; b ++ )
				for ( let c = b + 1; c < near.length; c ++ )
					consider( touching3( kids[ near[ a ] ], kids[ near[ b ] ], kids[ near[ c ] ], r, _cand ) );

		// touching two
		if ( best === Infinity )
			for ( let a = 0; a < near.length; a ++ )
				for ( let b = a + 1; b < near.length; b ++ )
					consider( touching2( kids[ near[ a ] ], kids[ near[ b ] ], r, g, _cand ) );

		// touching one, on its centroid-facing side
		if ( best === Infinity ) {

			for ( let a = 0; a < m; a ++ ) {

				const q = kids[ a ];
				let dx = g.x - q.x, dy = g.y - q.y, dz = g.z - q.z;
				let l = Math.hypot( dx, dy, dz );
				if ( l < EPS ) { dx = 1; dy = 0; dz = 0; l = 1; }
				const s = ( q.r + r ) / l;
				_cand[ 0 ].x = q.x + dx * s; _cand[ 0 ].y = q.y + dy * s; _cand[ 0 ].z = q.z + dz * s;
				consider( 1 );

			}

		}

		// last resort: beyond everything along +x (never overlaps)
		if ( best === Infinity ) {

			let M = 0;
			for ( let a = 0; a < m; a ++ ) M = Math.max( M, Math.hypot( kids[ a ].x, kids[ a ].y, kids[ a ].z ) + kids[ a ].r );
			bx = M + r; by = 0; bz = 0;

		}

		k.x = bx; k.y = by; k.z = bz;

	}

}

// One pass: each child slides toward the centroid of all the children along a
// straight line, as far as it can without overlapping a sibling (bisection).
function shrinkSiblings( kids ) {

	const n = kids.length;
	if ( n < 2 ) return;

	const g = centroidOf( kids, n );

	for ( let i = 0; i < n; i ++ ) {

		const k = kids[ i ];
		const ox = k.x, oy = k.y, oz = k.z;
		const dx = g.x - ox, dy = g.y - oy, dz = g.z - oz;

		if ( fits( g.x, g.y, g.z, k.r, kids, n, i ) ) {

			k.x = g.x; k.y = g.y; k.z = g.z;
			continue;

		}

		let lo = 0, hi = 1;

		for ( let it = 0; it < 48; it ++ ) {

			const t = ( lo + hi ) / 2;
			if ( fits( ox + dx * t, oy + dy * t, oz + dz * t, k.r, kids, n, i ) ) lo = t; else hi = t;

		}

		k.x = ox + dx * lo; k.y = oy + dy * lo; k.z = oz + dz * lo;

	}

}

/* ---------------- enclosing sphere ---------------- */

// Translates the children so the enclosing centre is the origin and returns
// the enclosing radius (without padding).
function enclose( kids, center ) {

	const n = kids.length;
	const g = centroidOf( kids, n );

	if ( center === 'enclosing' && n > 1 ) {

		// Bădoiu–Clarkson: step toward the farthest point of the farthest sphere
		for ( let it = 1; it <= 400; it ++ ) {

			let far = - Infinity, fx = 0, fy = 0, fz = 0;

			for ( let i = 0; i < n; i ++ ) {

				const k = kids[ i ];
				const dx = k.x - g.x, dy = k.y - g.y, dz = k.z - g.z;
				const l = Math.hypot( dx, dy, dz );
				const e = l + k.r;

				if ( e > far ) {

					far = e;
					const s = l > EPS ? k.r / l : 0;
					fx = k.x + dx * s; fy = k.y + dy * s; fz = k.z + dz * s;

				}

			}

			const step = 1 / ( it + 1 );
			g.x += ( fx - g.x ) * step; g.y += ( fy - g.y ) * step; g.z += ( fz - g.z ) * step;

		}

		// Polish: Bădoiu–Clarkson converges as 1/k and leaves a few tenths of a
		// percent of slack. Greedy descent on the (convex) enclosing radius —
		// step toward the farthest point, halve the step when that does not
		// help — is monotone and deterministic and closes the gap.
		let R = radiusAbout( kids, n, g );
		let step = R / 4;

		for ( let it = 0; it < 200 && step > R * 1e-15; it ++ ) {

			const f = farthest( kids, n, g );
			const l = Math.hypot( f.x - g.x, f.y - g.y, f.z - g.z );
			if ( l < EPS ) break;

			const t = { x: g.x + ( f.x - g.x ) / l * step, y: g.y + ( f.y - g.y ) / l * step, z: g.z + ( f.z - g.z ) / l * step };
			const Rt = radiusAbout( kids, n, t );

			if ( Rt < R ) { g.x = t.x; g.y = t.y; g.z = t.z; R = Rt; } else step /= 2;

		}

	}

	let R = 0;

	for ( const k of kids ) {

		k.x -= g.x; k.y -= g.y; k.z -= g.z;
		R = Math.max( R, Math.hypot( k.x, k.y, k.z ) + k.r );

	}

	return R;

}

function radiusAbout( kids, n, g ) {

	let R = 0;
	for ( let i = 0; i < n; i ++ ) {

		const k = kids[ i ];
		R = Math.max( R, Math.hypot( k.x - g.x, k.y - g.y, k.z - g.z ) + k.r );

	}

	return R;

}

// the farthest point of the farthest sphere from g
function farthest( kids, n, g ) {

	let far = - Infinity, f = { x: 0, y: 0, z: 0 };

	for ( let i = 0; i < n; i ++ ) {

		const k = kids[ i ];
		const dx = k.x - g.x, dy = k.y - g.y, dz = k.z - g.z;
		const l = Math.hypot( dx, dy, dz );

		if ( l + k.r > far ) {

			far = l + k.r;
			const s = l > EPS ? k.r / l : 0;
			f = { x: k.x + dx * s, y: k.y + dy * s, z: k.z + dz * s };

		}

	}

	return f;

}

/* ---------------- diagnostics ---------------- */

/** Packing density of a node: sum of its children's volumes over its own. */
export function density( node ) {

	if ( ! node.children ) return 1;
	let v = 0;
	for ( const c of node.children ) v += c.r ** 3;
	return v / node.r ** 3;

}
