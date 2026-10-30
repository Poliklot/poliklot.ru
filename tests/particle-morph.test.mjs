import test from 'node:test';
import assert from 'node:assert/strict';
import {interactionWeight, makeParticles, particlePosition, repelParticle, MAX_PARTICLES} from '../src/lib/particleMorph.ts';

const source = Array.from({length: 2702}, (_, i) => ({x: .16 + i % 70 / 100, y: .12 + Math.floor(i / 70) / 100}));
const target = Array.from({length: 1200}, (_, i) => ({x: .5 + Math.cos(i / 1200 * Math.PI * 2) * .16, y: .4 + Math.sin(i / 1200 * Math.PI * 2) * .22}));

test('one bounded particle set has a source glyph pixel and destination face pixel for every identity', () => {
	const particles = makeParticles(source, target);
	assert.equal(particles.length, source.length);
	assert.equal(new Set(particles.map(p => p.from)).size, source.length);
	for (const p of particles) {
		assert.ok(source.includes(p.from));
		assert.ok(target.includes(p.to));
	}
	assert.equal(makeParticles([...source, ...source], target).length, MAX_PARTICLES);
	assert.deepEqual(makeParticles([], target), []);
	assert.deepEqual(makeParticles(source, []), []);
});

test('exact endpoints recover the words and form the face before the SVG handoff', () => {
	for (const p of makeParticles(source, target)) {
		assert.deepEqual(particlePosition(p, 0), p.from);
		assert.deepEqual(particlePosition(p, 1), p.to);
		assert.deepEqual(particlePosition(p, -1), p.from);
		assert.deepEqual(particlePosition(p, 2), p.to);
	}
});

test('scroll reversal and rebuilding the same masks are deterministic, without accumulated state', () => {
	const particles = makeParticles(source, target);
	const original = structuredClone(particles);
	const forward = [.07, .19, .37, .61, .89].map(t => particles.map(p => particlePosition(p, t)));
	const backward = [.89, .61, .37, .19, .07].map(t => particles.map(p => particlePosition(p, t)));
	assert.deepEqual(backward.reverse(), forward);
	assert.deepEqual(particles, original);
	assert.deepEqual(makeParticles(source, target), original);
});

test('intermediate particles form a spread-out cloud, not a rigid translation of word tiles', () => {
	const particles = makeParticles(source, target);
	const displaced = particles.filter(p => {
		const mid = particlePosition(p, .5);
		return Math.hypot(mid.x - (p.from.x + p.to.x) / 2, mid.y - (p.from.y + p.to.y) / 2) > .06;
	});
	assert.ok(displaced.length / particles.length > .9);
	assert.ok(new Set(particles.map(p => p.bend.x)).size > particles.length * .99);
});

test('small scroll changes produce small continuous movement and no singularities', () => {
	for (const p of makeParticles(source, target).filter((_, i) => i % 20 === 0)) {
		for (let step = 0; step < 1000; step++) {
			const a = particlePosition(p, step / 1000), b = particlePosition(p, (step + 1) / 1000);
			assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y));
			assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < .005);
		}
	}
});

test('cursor interaction starts on dotted letters and reaches exactly zero before the face handoff', () => {
	assert.equal(interactionWeight(0), 0);
	assert.equal(interactionWeight(.03), 0);
	assert.ok(interactionWeight(.034) > 0);
	assert.equal(interactionWeight(.05), 1);
	assert.ok(interactionWeight(.108) > 0 && interactionWeight(.108) < interactionWeight(.10));
	for (const p of [.115, .12, .13, 1]) assert.equal(interactionWeight(p), 0);
});

test('the cursor field is local, bounded, aspect-correct and does not alter the base path', () => {
	const cursor = {x: .5, y: .5};
	const point = {x: .53, y: .5};
	assert.ok(repelParticle(point, cursor, 1, .7).x > point.x);
	assert.deepEqual(point, {x: .53, y: .5});
	assert.deepEqual(repelParticle(point, cursor, 0, .7), point);
	assert.deepEqual(repelParticle(cursor, cursor, 1, .7), cursor, 'no singularity at the exact cursor center');
	assert.deepEqual(repelParticle({x: .9, y: .5}, cursor, 1, .7), {x: .9, y: .5});
	for (const aspect of [.7, 1, 2]) for (let x = .3; x <= .7; x += .002) {
		const base = {x, y: .52}, moved = repelParticle(base, cursor, 1, aspect);
		assert.ok(Math.hypot(moved.x - base.x, (moved.y - base.y) * aspect) < .077);
	}
	for (const p of makeParticles(source, target).slice(0, 100)) {
		const end = particlePosition(p, 1);
		assert.deepEqual(repelParticle(end, cursor, interactionWeight(.115), .7), p.to);
	}
});
