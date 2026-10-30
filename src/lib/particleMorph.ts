/** Normalized mask coordinates. Each particle retains both endpoints for reverse scroll. */
export type Point = {x: number; y: number};
export type Particle = {from: Point; to: Point; bend: Point; delay: number; radius: number};
export const MAX_PARTICLES = 4000;
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };

/** Interaction is available even on dotted letters, but never on the completed face. */
export function interactionWeight(storyProgress: number) {
	if (storyProgress <= .03 || storyProgress >= .115) return 0;
	return smooth((storyProgress - .03) / .008) * (1 - smooth((storyProgress - .095) / .02));
}

/** A local, bounded field added to the scroll-owned position, never stored in the particles. */
export function repelParticle(point: Point, cursor: Point, strength: number, aspect: number): Point {
	if (strength <= 0) return point;
	const dx = point.x - cursor.x, dy = (point.y - cursor.y) * aspect;
	const distance = Math.hypot(dx, dy);
	if (distance >= .14) return point;
	const force = .075 * clamp(strength) * smooth(1 - distance / .14) / (distance + .012);
	return {x: point.x + (dx - dy * .22) * force, y: point.y + (dy + dx * .22) * force / aspect};
}

// A fixed hash, not a simulation: identical scroll positions always produce identical base positions.
function noise(i: number) {
	let n = Math.imul(i + 1, 0x45d9f3b);
	n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
	return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function aroundCenter(points: Point[]) {
	const center = points.reduce((c, p) => ({x: c.x + p.x / points.length, y: c.y + p.y / points.length}), {x: 0, y: 0});
	return [...points].sort((a, b) => Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x));
}

export function makeParticles(source: Point[], target: Point[]): Particle[] {
	if (!source.length || !target.length) return [];
	const from = aroundCenter(source), to = aroundCenter(target);
	const count = Math.min(from.length, MAX_PARTICLES);
	return Array.from({length: count}, (_, i) => {
		const angle = noise(i * 3) * Math.PI * 2;
		const reach = .1 + noise(i * 3 + 1) * .24;
		return {
			from: from[Math.floor(i * from.length / count)],
			to: to[Math.floor(i * to.length / count)],
			bend: {x: Math.cos(angle) * reach, y: Math.sin(angle) * reach},
			delay: noise(i * 3 + 2) * .12,
			radius: .65 + noise(i + 17) * .35,
		};
	});
}

export function particlePosition(p: Particle, progress: number): Point {
	const t = smooth((progress - p.delay) / (1 - p.delay));
	if (t === 0) return p.from;
	if (t === 1) return p.to;
	// The envelope vanishes at both endpoints; a quarter-turn makes the cloud curl inward.
	const spread = Math.sin(Math.PI * t);
	const angle = t * Math.PI * .5;
	return {
		x: p.from.x + (p.to.x - p.from.x) * t + spread * (p.bend.x * Math.cos(angle) - p.bend.y * Math.sin(angle)),
		y: p.from.y + (p.to.y - p.from.y) * t + spread * (p.bend.x * Math.sin(angle) + p.bend.y * Math.cos(angle)),
	};
}
