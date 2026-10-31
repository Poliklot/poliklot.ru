import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {productStory} from '../src/data/productStory.ts';

const opening = readFileSync(new URL('../src/styles/scope-opening.css', import.meta.url), 'utf8');
const layers = readFileSync(new URL('../src/components/ScopeLayers.astro', import.meta.url), 'utf8');
const panel = readFileSync(new URL('../src/components/ScopePanel.astro', import.meta.url), 'utf8');
const product = readFileSync(new URL('../src/components/ScopeProduct.astro', import.meta.url), 'utf8');

// Read the actual CSS score, not a second implementation of the animation.
function frames(source, name) {
	const start = source.indexOf(`@keyframes ${name} {`);
	assert.notEqual(start, -1, `missing keyframes: ${name}`);
	const bodyStart = source.indexOf('{', start) + 1;
	let level = 1, end = bodyStart;
	while (level && end < source.length) {
		if (source[end] === '{') level++;
		if (source[end] === '}') level--;
		end++;
	}
	return [...source.slice(bodyStart, end - 1).replace(/\bfrom\b/g, '0%').replace(/\bto\b/g, '100%').matchAll(/([\d.% ,]+)\{([^}]+)\}/g)]
		.flatMap(([, offsets, declarations]) => offsets.split(',').map(offset => ({
			at: parseFloat(offset),
			style: Object.fromEntries(declarations.trim().split(';').filter(s => s.trim()).map(s => {
				const colon = s.indexOf(':');
				return [s.slice(0, colon).trim(), s.slice(colon + 1).trim()];
			})),
		}))).sort((a, b) => a.at - b.at);
}

// Compare authored stops; continuous interpolation is exercised in the browser.
function at(name, percent, property = 'opacity') {
	return frames(opening, name).filter(f => f.at === percent && property in f.style).at(-1)?.style[property];
}

test('four bilingual semantic chains feed one set of conclusions and derived tasks', () => {
	for (const story of Object.values(productStory)) {
		assert.deepEqual(story.points.map(p => p.key), ['goal', 'behavior', 'data', 'quality']);
		assert.equal(story.phases.length, 4);
		assert.equal(story.brief.lines.length, 3);
		assert.deepEqual(story.points.map(p => p.spec.artifact), ['proposal.md', 'specs/', 'design.md', 'tasks.md']);
		for (const p of story.points) assert.ok(p.spec.title && p.spec.summary);
		assert.match(story.phases[1].description, /OpenSpec/);
		for (const point of story.points) {
			for (const field of ['seed', 'question', 'requirement', 'task']) assert.ok(point[field].length > 3);
		}
	}
	assert.equal((product.match(/\{point.requirement\}/g) || []).length, 1, 'reuse the conclusions inside the spec');
	assert.equal((product.match(/data-point=\{point.key\}/g) || []).length, 1, 'the requirement and action share one owner');
	assert.match(layers, /<ol class="product-phases">\{productStory\[locale\].phases.map/);
	assert.match(product, /class="product-spec-brand" aria-label="OpenSpec"/);
	assert.match(product, /href="\/brands\/openspec.svg"/);
	assert.match(productStory.ru.phases[0].description, /кабинет заказчика/);
	assert.doesNotMatch(JSON.stringify(productStory), /Понятный путь к результату|Явные правила и состояния/);
});

test('the marketplace brief becomes sampled particles, never rectangular text fragments', () => {
	assert.equal(productStory.ru.brief.lines.join(' '), 'Реализовать кабинет заказчика на бирже');
	assert.match(product, /<canvas class="product-particles"/);
	assert.match(product, /import '..\/lib\/productMorph'/);
	assert.doesNotMatch(product + opening, /briefTiles|brief-tile|brief-particle|brief-dissolve/);
	assert.equal(at('brief-fallback', 0), '1');
	assert.equal(at('brief-fallback', 100), '0');
	assert.equal(at('product-person', 0), 'var(--particle-face-opacity, 0)');
	assert.equal(at('product-person', 13), 'var(--particle-face-opacity, 1)');
	assert.equal(at('product-spec', 13), '0');
	assert.equal(at('product-spec', 16), '1');
	const runtime = readFileSync(new URL('../src/lib/productMorph.ts', import.meta.url), 'utf8');
	assert.match(runtime, /getImageData/);
	assert.match(runtime, /document.fonts.ready/);
	assert.match(runtime, /svg.cloneNode/);
	assert.match(runtime, /Math.min\(devicePixelRatio \|\| 1, 2\)/);
	assert.match(runtime, /progress === this.lastProgress/);
	assert.match(runtime, /this.abort\?\.abort\(\)/);
	assert.match(runtime, /this.observer\?\.disconnect\(\)/);
	assert.doesNotMatch(runtime, /Math.random|setInterval|setTimeout|preventDefault|scrollTo|new Path2D/);
});

test('the face mask uses an encoded image URL allowed by the production CSP', () => {
	const runtime = readFileSync(new URL('../src/lib/productMorph.ts', import.meta.url), 'utf8');
	const caddy = readFileSync(new URL('../deploy/Caddyfile.example', import.meta.url), 'utf8');
	const policies = [...caddy.matchAll(/Content-Security-Policy "([^"]+)"/g)];
	assert.ok(policies.length > 0);
	for (const [, policy] of policies) assert.match(policy, /img-src 'self' data:;/);
	assert.match(runtime, /image\.src = `data:image\/svg\+xml;charset=utf-8,\$\{encodeURIComponent\(new XMLSerializer\(\)\.serializeToString\(copy\)\)\}`/);
	assert.match(runtime, /await image\.decode\(\)/);
	assert.doesNotMatch(runtime, /URL\.(?:create|revoke)ObjectURL|new Blob/);
});

test('concrete answers precede their sheet, separation, OpenSpec and the plan', () => {
	assert.equal((product.match(/class="product-face"/g) || []).length, 1);
	assert.equal(at('product-mouth', 23, 'transform'), 'scaleY(1)');
	assert.equal(at('product-mouth', 30, 'transform'), 'scaleY(-1)');
	assert.match(opening, /\.story-answer \{[^}]*contain calc\(20% \+ var\(--i\) \* 1%\) contain calc\(24% \+ var\(--i\) \* 1%\)/);
	assert.equal(at('answer-fragment-paper', 27), '0');
	assert.equal(at('answer-fragment-paper', 30), '1');
	assert.match(product, /'Ответы на вопросы' : 'Questions answered'/);
	assert.doesNotMatch(product, /'Спецификация' : 'Specification'/);
	assert.match(opening, /\.product-fragment \{[^}]*contain 34% contain 38\.5%, contain 38% contain 43%/);
	assert.match(opening, /\.spec-letter-ink \{[^}]*contain 46% contain 48%/);
	assert.ok(ranges('product-fragment')[2][0] >= 48, 'plan starts after the original OpenSpec hold');
	assert.ok(ranges('product-fragment').at(-1)[1] <= 70, 'plan settles before the existing frontend entrance');
	assert.equal(at('product-screen', 70), '0');
	assert.equal(at('product-screen', 72), '1');
	assert.equal(at('product-logic', 77), '0');
	assert.equal(at('product-data', 79), '0');
	assert.doesNotMatch(panel + product + opening, /product-save|product-editor|product-record|product-status/);
});

test('the early category-to-question reel stays continuous and opaque', () => {
	assert.match(product, /class="note-heading" data-story-motion><div class="question-reel" data-story-motion><span class="story-seed">/);
	assert.match(opening, /\.note-heading \{[^}]*height: 1.4em; overflow: hidden/);
	assert.match(opening, /\.question-reel > span \{[^}]*height: 1.4em/);
	assert.deepEqual(frames(opening, 'question-roll').map(f => f.style), [{transform: 'translateY(0)'}, {transform: 'translateY(-1.4em)'}]);
	assert.doesNotMatch(opening, /\.scope-scene \.(?:story-seed|story-question) \{/);
	assert.match(opening, /\.product-note \{[^}]*contain calc\(14% \+ var\(--i\) \* \.5%\) contain calc\(23% \+ var\(--i\) \* \.5%\)/);
	assert.equal(at('product-person', 21, 'transform'), 'translate(0, 0) translateZ(14px) scale(.5)');
});

test('the answer sheet separates into its original fragments, not duplicate text', () => {
	assert.match(product, /product-fragment[\s\S]*class="fragment-paper"[\s\S]*class="product-note"/);
	assert.equal(at('answer-fragment-spread', 0, 'left'), '4%');
	assert.equal(at('answer-fragment-spread', 100, 'left'), 'var(--split-left)');
	assert.equal(at('answer-fragment-place', 100, 'top'), 'var(--split-top)');
	assert.equal(at('answer-fragment-paper', 31, 'border-top-color'), 'var(--top-edge, transparent)');
	assert.equal(at('answer-fragment-paper', 34, 'border-color'), '#65758c');
	assert.equal(at('answer-header-pin', 100, 'transform'), 'translateY(-12.857143cqw)');
	assert.doesNotMatch(product, /const links|product-derivations/);
	const mark = readFileSync(new URL('../public/brands/openspec.svg', import.meta.url), 'utf8');
	assert.match(mark, /viewBox="0 0 640 80"/);
	assert.doesNotMatch(mark, /<script|href=|<foreignObject/);
});

test('each separated card receives exactly one spec artifact and the shared heading leaves', () => {
	assert.equal((product.match(/\{point.spec.title\}/g) || []).length, 1);
	assert.equal((product.match(/\{point.spec.artifact\}/g) || []).length, 1);
	assert.equal((product.match(/\{point.spec.summary\}/g) || []).length, 1);
	assert.doesNotMatch(product + opening, /stage-label-shift|story-stage|answer-window|answer-reel|answer-to-spec/);
	assert.match(product, /class="fragment-paper"[^>]*>[\s\S]*i === 0 && <div class="product-spec-heading"/);
	assert.doesNotMatch(product + opening, /product-answer-header|answer-header-paper/);
	assert.match(opening, /\.discovery-answer \{[^}]*contain 31% contain 34%/);
	assert.deepEqual(frames(opening, 'discovery-retire').map(f => f.style), [{opacity: '1'}, {opacity: '0'}]);
	assert.equal(at('spec-title', 32.5), '1', 'new title exists before old copy retires');
	assert.equal(at('spec-title', 34, 'left'), '100%', 'annotation stays beside the old text until it is gone');
	assert.equal(at('spec-title', 34, 'transform'), 'translateX(-100%)');
	assert.equal(at('spec-title', 40.5, 'left'), '3cqw');
	assert.equal(at('spec-title', 40.5, 'transform'), 'translateX(0)');
	assert.equal(at('spec-title', 100), '1');
	assert.match(opening, /\.spec-title \{[^}]*width: max-content; white-space: nowrap/);
	assert.doesNotMatch(opening, /\.(?:spec-title|spec-copy|story-answer|discovery-answer) \{[^}]*(?:overflow: hidden|clip-path|;\s*height:)/);
	assert.match(opening, /\.spec-copy \{[^}]*width: var\(--compact-copy-width\)/);
	assert.match(opening, /\.spec-copy \{[^}]*contain 43% contain 45%/);
});

test('the plan has no derivation wires; the later nonrepeating product signal is unchanged', () => {
	assert.doesNotMatch(product + opening, /product-derivations|product-plan-paper|product-plan-sheet/);
	assert.equal(at('product-spec', 72, 'transform'), 'translate(0, 0) translateZ(10px) scale(1)');
	assert.equal(at('product-flow', 86), '0');
	assert.equal(at('product-flow', 90, 'stroke-dashoffset'), '-.94');
	assert.equal(at('product-flow', 100), '0');
	const signals = product.match(/<path class="product-flow"[^>]+/g);
	assert.equal(signals.length, 1);
	assert.match(signals[0], /pathLength="1"/);
	assert.doesNotMatch(signals[0], /non-scaling-stroke/);
});

test('compact parts and documents are covered before the neutral frontend handoff', () => {
	assert.match(opening, /\.product-layer \{[^}]*height: 12%/);
	assert.equal(at('product-spec', 84, 'transform'), 'translate(-3.12%, -19.78%) translateZ(10px) scale(.66)');
	assert.match(opening, /\.product-spec \{[^}]*transform-origin: 57% 61%/);
	assert.equal(78 * -.04, -3.12, 'same horizontal retreat as the former 78%-wide panel');
	assert.equal(86 * -.23, -19.78, 'same vertical retreat as the former 86%-tall panel');
	assert.equal(at('product-internals-presence', 100, 'visibility'), 'hidden');
	assert.equal(at('product-foundation', 100), '1');
	assert.equal(at('product-screen', 100), '1');
	assert.equal(at('product-screen', 100, 'transform'), 'translateY(0) scale(1)');
	assert.equal(at('product-camera', 100, 'transform'), 'rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)');
	assert.equal(at('product-tools', 100), '1');
	assert.equal(at('product-grid', 100), '0');
});

test('independent native tracks add two screens without stretching later chapters', () => {
	assert.match(layers, /timeline-scope: --scope-layers, --product-story/);
	assert.match(layers, /\.product-timeline-track \{ top: 0; height: calc\(4 \* var\(--stage-height\)\); view-timeline: --product-story block/);
	assert.match(layers, /\.layers-timeline-track \{ top: calc\(2 \* var\(--stage-height\)\); bottom: 0; view-timeline: --scope-layers block/);
	assert.match(opening, /#scope-1 \{ height: calc\(3 \* var\(--stage-height\)\)/);
	assert.ok(layers.indexOf('view-timeline-inset:') > layers.indexOf('view-timeline: --scope-layers'), 'inset follows the shorthand that resets it');
	// 3 product screens + 5 original chapters = 8; contain subtracts 1 viewport.
	const productSpan = 4 - 1, laterStart = 2, laterSpan = 8 - laterStart - 1;
	assert.equal(productSpan, laterStart + .2 * laterSpan);
	assert.equal(laterSpan, 5);
	assert.match(layers, /class="scope-opening-camera" data-story-motion/);
	assert.match(layers, /scope-surface_\$\{kind\}.*data-story-motion/);
});

test('later layer movement, depth and release retain their original keyframes', () => {
	const expected = {
		'scope-depth': [[0,'translateZ(calc(var(--level) * 6px))'],[84,'translateZ(calc(var(--level) * 6px))'],[89,'translateZ(calc(var(--level) * 50px))'],[94,'translateZ(calc(var(--level) * 50px))'],[100,'translateZ(calc(var(--level) * 6px))']],
		'scope-backend': [[0,'translateY(0)'],[43,'translateY(0)'],[50,'translateY(calc(-1 * var(--stage-height)))'],[85,'translateY(calc(-1 * var(--stage-height)))'],[88,'translateY(0)'],[100,'translateY(0)']],
		'scope-devops': [[0,'translateY(0)'],[63,'translateY(0)'],[70,'translateY(calc(-1 * var(--stage-height)))'],[84,'translateY(calc(-1 * var(--stage-height)))'],[87,'translateY(0)'],[100,'translateY(0)']],
	};
	for (const [name, expectedFrames] of Object.entries(expected)) {
		assert.deepEqual(frames(layers, name).map(f => [f.at, f.style.transform]), expectedFrames);
	}
	assert.deepEqual(frames(layers, 'scope-frontend').filter(f => f.at >= 23).map(f => [f.at, f.style.transform]), [[23,'translateY(0)'],[30,'translateY(calc(-1 * var(--stage-height)))'],[86,'translateY(calc(-1 * var(--stage-height)))'],[89,'translateY(0)'],[100,'translateY(0)']]);
	assert.deepEqual(frames(layers, 'scope-complete').map(f => [f.at,f.style.opacity]), [[0,'0'],[96.5,'0'],[99,'1'],[100,'1']]);
});

test('native layers keep their accessibility gates; only the opening has a Canvas enhancement', () => {
	assert.match(opening, /prefers-reduced-motion: no-preference/);
	assert.match(opening, /forced-colors: none/);
	assert.match(opening, /min-width: 901px/);
	assert.match(opening, /min-height: 700px/);
	assert.match(opening, /animation-timeline: --product-story/);
	for (const source of [opening, layers, panel]) {
		assert.match(source, /timeline-scope: --scope-layers/);
		assert.match(source, /prefers-reduced-motion: no-preference/);
		assert.match(source, /forced-colors: none/);
	}
	assert.doesNotMatch(opening, /animation-(?:duration|delay):\s*\d+(?:ms|s)/);
	assert.doesNotMatch(layers, /<script|requestAnimationFrame|preventDefault/);
	assert.equal((panel.match(/class="browser-shell build"/g) || []).length, 1, 'reuse the existing frontend DOM');
	assert.doesNotMatch(layers, /front-intro|style=\{`--phase:/);
});

test('static model is complete, decorative and bilingual', () => {
	assert.match(layers, /<ScopeProduct locale=\{locale\} staticView/);
	assert.match(product, /aria-hidden="true"/);
	assert.match(product, /!staticView &&/);
	assert.match(product, /'Логика' : 'Logic'/);
	assert.match(product, /'Данные' : 'Data'/);
	assert.match(product, /'Правила и сценарии' : 'Rules and workflows'/);
	assert.match(product, /'Состояние и история' : 'State and history'/);
	assert.doesNotMatch(product, /<button|<input|tabindex|aria-live/);
	assert.match(opening, /\.product-model_static.*\.build.*animation: none !important/);
});


test('question anchors share the heading row, independent of answer height', () => {
	assert.match(product, /class="note-heading-row">\s*<i class="note-anchor"/);
	assert.match(opening, /\.note-heading-row \{[^}]*align-items: center/);
	assert.doesNotMatch(opening, /\.note-anchor \{[^}]*(?:top:|position: absolute)/);
});

test('overlapping card axes preserve closed edges, readable text and the later score', () => {
	const cards = [...product.matchAll(/\{x: (\d+), y: (\d+), w: (\d+), h: (\d+)\}/g)].map(([,x,y,w,h])=>({x:+x,y:+y,w:+w,h:+h}));
	assert.equal(cards.length, 4);
	assert.equal(cards.filter(c=>c.y<30).length, 2);
	assert.equal(cards.filter(c=>c.y>60).length, 2);
	assert.ok(cards.every(c=>c.w===cards[0].w && c.h===cards[0].h));
	assert.equal(cards[0].y, cards[1].y);
	assert.equal(cards[2].y, cards[3].y);
	assert.match(opening, /\.product-fragment \{[^}]*contain 34% contain 38\.5%, contain 38% contain 43%/);
	assert.match(opening, /\.spec-letter-ink \{[^}]*contain 46% contain 48%/);
	assert.equal(at('answer-fragment-paper', 34, 'border-color'), '#65758c');
	assert.equal(at('answer-fragment-paper', 34, 'border-radius'), '2cqw');
	assert.equal(at('answer-fragment-spread', 100, 'width'), 'var(--split-width)');
	assert.equal(frames(opening, 'answer-fragment-spread').length, 2, 'no internal stop in horizontal travel');
	assert.equal(frames(opening, 'answer-fragment-place').length, 2, 'no internal stop in vertical travel');
	assert.equal(at('product-spec', 48, 'transform'), 'translate(0, 0) translateZ(6px) scale(1)');
	assert.equal(at('product-person', 48, 'transform'), 'translate(0, 0) translateZ(14px) scale(.5)');
	const horizontal = ranges('product-fragment')[0], vertical = ranges('product-fragment')[1];
	const retire = ranges('discovery-answer')[0], body = ranges('spec-copy')[0], brand = ranges('spec-letter-ink')[0];
	assert.ok(retire[1] <= horizontal[0], 'old copy retires before resizing');
	assert.ok(34 <= horizontal[0], 'paper edges are closed before moving');
	assert.ok(vertical[0] < horizontal[1], 'axes overlap instead of stop-turn-start');
	assert.ok(vertical[1] <= body[0], 'body appears after all cards settle');
	assert.ok(body[1] <= brand[0], 'OpenSpec follows readable cards');
	assert.ok(brand[1] < ranges('spec-letter')[0][0], 'the assembled mark holds before its glyphs move');
	assert.ok(horizontal[1] - horizontal[0] >= 4.5, 'no compressed horizontal burst');
	assert.ok(vertical[1] - vertical[0] >= 5, 'vertical motion has room to decelerate');
	assert.ok(body[1] - body[0] >= 2 && brand[1] - brand[0] >= 2, 'reveals are not one-step flashes');
	assert.match(opening, /\.product-fragment \{[^}]*animation-timing-function: cubic-bezier\(\.42, 0, \.58, 1\)/);
});

// Read both native ranges, avoiding a duplicate timeline in the tests.
function ranges(className) {
	const rule = opening.match(new RegExp(`\\.${className} \\{[^}]*animation-range: ([^;]+)`));
	assert.ok(rule, `missing animation ranges: ${className}`);
	return [...rule[1].matchAll(/contain ([\d.]+)% contain ([\d.]+)%/g)].map(([, start, end]) => [+start, +end]);
}

// Solve the authored CSS timing curve; this is a geometry regression, not a runtime animator.
function ease(t, [x1, y1, x2, y2]) {
	if (t <= 0) return 0;
	if (t >= 1) return 1;
	const cubic = (u, a, b) => 3 * (1-u)**2 * u * a + 3 * (1-u) * u**2 * b + u**3;
	let lo = 0, hi = 1;
	for (let i = 0; i < 40; i++) {
		const u = (lo + hi) / 2;
		if (cubic(u, x1, x2) < t) lo = u; else hi = u;
	}
	return cubic((lo + hi) / 2, y1, y2);
}

test('the descending first paper edge clips a stationary header, without an opacity exit', () => {
	assert.match(opening, /\.product-fragment_first \.fragment-paper \{[^}]*overflow: hidden/);
	assert.deepEqual(ranges('product-spec-heading'), [[31, 34]]);
	assert.match(opening, /\.product-spec-heading \{[^}]*white-space: nowrap/, 'clipped copy must not wrap back into the first card');
	assert.match(opening, /\.product-fragment_first \.fragment-paper \{[^}]*contain 31% contain 34%/);
	assert.equal(at('answer-header-edge', 0, 'top'), 'calc(-12.857143cqw - 1px)');
	assert.equal(at('answer-header-edge', 100, 'top'), '-1px');
	assert.equal(at('answer-header-pin', 0, 'transform'), 'translateY(0)');
	assert.equal(at('answer-header-pin', 100, 'transform'), 'translateY(-12.857143cqw)');
	for (const name of ['answer-header-edge', 'answer-header-pin']) assert.ok(frames(opening, name).every(f => !('opacity' in f.style)));
	assert.doesNotMatch(opening, /\.product-note \{[^}]*overflow: hidden/);
});

// These authored arrays also generate both the SVG and its source contacts.
function pointsFrom(name) {
	const literal=product.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\n\\]);`))[1];
	return JSON.parse(literal.replace(/,\s*]/g, ']'));
}

test('four PCB routes start on different card edges and continue into one closed socket', () => {
	const routes=pointsFrom('circuitRoutes'), rails=pointsFrom('socketRails');
	const cards=[...product.matchAll(/\{x: (\d+), y: (\d+), w: (\d+), h: (\d+)\}/g)].map(([,x,y,w,h])=>({x:+x*1.4,y:+y,w:+w*1.4,h:+h}));
	assert.equal(routes.length,4);
	assert.equal(rails.length,4);
	assert.match(product, /class="spec-circuits"[^>]*viewBox="0 0 140 100"/);
	assert.match(product, /class="spec-socket"[^>]*viewBox="0 0 140 100"/);
	const near=(a,b)=>Math.abs(a-b)<.0001;
	const interior=([x,y],r)=>x>r.x+.0001&&x<r.x+r.w-.0001&&y>r.y+.0001&&y<r.y+r.h-.0001;
	const edges=routes.map((route,i)=>{
		const [x,y]=route[0],c=cards[i];
		assert.ok(x>=c.x-.0001&&x<=c.x+c.w+.0001&&y>=c.y-.0001&&y<=c.y+c.h+.0001);
		assert.deepEqual(route.at(-1),rails[i][0],'the arriving trace becomes the socket rail');
		if(near(y,c.y+c.h))return 'bottom';
		if(near(x,c.x))return 'left';
		if(near(x,c.x+c.w))return 'right';
		if(near(y,c.y))return 'top';
		assert.fail('source must be on its paper border');
	});
	assert.deepEqual(edges,['bottom','left','right','top']);
	for(const [routeIndex,route] of [...routes,...rails].entries())for(let i=1;i<route.length;i++){
		const a=route[i-1],b=route[i],dx=b[0]-a[0],dy=b[1]-a[1];
		assert.ok(near(dx,0)||near(dy,0)||near(Math.abs(dx),Math.abs(dy)),'only physical 45/90-degree routing');
		for(let t=0;t<=1;t+=.01){
			const point=[a[0]+dx*t,a[1]+dy*t];
			assert.ok(cards.every(c=>!interior(point,c)),'no path cuts through a card');
			if(routeIndex<4)assert.ok(!interior(point,{x:47,y:49,w:46,h:11}),'traces stop at the socket, never under the label');
		}
	}
	const cycle=[0,1,3,2];
	cycle.forEach((i,n)=>assert.deepEqual(rails[i].at(-1),rails[cycle[(n+1)%4]][0]));
	assert.match(product,/circuitRoutes.map\(points => \(\{d: path\(points\), port: points\[0\]\}\)\)/);
	assert.match(product,/class="spec-port" cx=\{port\[0\]\} cy=\{port\[1\]\}/);
	assert.match(product,/socketOutline = `\$\{path\(\[0, 1, 3, 2\]/,'fill reuses the connected rails');
});

test('neon borders feed the traces, then the socket, then the original glyphs', () => {
	assert.equal(at('answer-fragment-paper',44,'border-color'),'var(--spec-neon)');
	assert.match(at('answer-fragment-paper',44,'box-shadow'),/#70baff/);
	assert.equal(at('answer-fragment-paper',49,'border-color'),'#65758c');
	assert.equal(at('answer-fragment-paper',49,'box-shadow'),'0 0 0 transparent, inset 0 0 0 transparent');
	assert.match(opening,/\.spec-trace, \.spec-socket-rail, \.spec-socket-core \{[^}]*stroke: var\(--spec-neon\)/);
	assert.match(product, /class="spec-trace-reveal"[^>]*pathLength="1"/);
	assert.match(opening, /\.spec-trace \{[^}]*stroke-dasharray: 1.1 1/);
	assert.equal(at('spec-trace-draw',0,'stroke-dashoffset'),'1');
	assert.equal(at('spec-trace-draw',100,'stroke-dashoffset'),'0');
	const trace=ranges('spec-trace-reveal')[0],socket=ranges('spec-socket-rail')[0],brand=ranges('spec-letter-ink')[0];
	assert.ok(trace[0]>=ranges('product-fragment')[1][1]);
	assert.ok(trace[1]<=socket[0]);
	assert.ok(socket[1]<=brand[0]);
	assert.doesNotMatch(opening, /\.product-spec-brand \{[^}]*animation-name/, 'the word is built by the glyph mask, not another opacity overlay');
	assert.equal(at('spec-letter-develop',0,'clip-path'),'inset(50% 0)');
	assert.equal(at('spec-letter-develop',100,'clip-path'),'inset(0% 0)');
	assert.ok(brand[1]<ranges('spec-letter')[0][0],'mask opens fully before the existing glyph flight');
	assert.equal(at('spec-circuits',48),'0','fixed traces leave before their source cards move');
	assert.equal(at('spec-socket',49),'0','the empty socket does not follow the flying glyphs');
	assert.equal(at('spec-socket-core',46.1),'.9','the light axis exists as the glyphs begin to develop');
	assert.equal(at('spec-socket-core',47.5),'0','the axis does not strike through the complete wordmark');
});

test('continuous card paths have clearance, bounded speed and no pause at the turn', () => {
	const cards = [...product.matchAll(/\{x: (\d+), y: (\d+), w: (\d+), h: (\d+)\}/g)].map(([,x,y,w,h]) => ({x:+x,y:+y,w:+w,h:+h}));
	const [horizontal, vertical] = ranges('product-fragment');
	const curve = opening.match(/\.product-fragment \{[^}]*cubic-bezier\(([^)]+)\)/)[1].split(',').map(Number);
	const pose = p => {
		const x = ease((p-horizontal[0])/(horizontal[1]-horizontal[0]), curve);
		const y = ease((p-vertical[0])/(vertical[1]-vertical[0]), curve);
		return cards.map((c,i) => ({x: 4+(c.x-4)*x, y:24+i*17+(c.y-24-i*17)*y, w:92+(c.w-92)*x, h:(i===3?19:17)+(c.h-(i===3?19:17))*y}));
	};
	let maxSpeed = 0;
	for (let p = horizontal[0]; p <= vertical[1]; p += .01) {
		const current = pose(p), next = pose(p+.01);
		for (let i = 0; i < 4; i++) {
			for (let j = i+1; j < 4; j++) {
				const a = current[i], b = current[j];
				assert.ok(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x) < .001 || Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y) < .001, `cards ${i}/${j} intersect at ${p}`);
			}
			for (const edge of [c => c.x, c => c.x+c.w, c => c.y, c => c.y+c.h]) maxSpeed = Math.max(maxSpeed, Math.abs(edge(next[i])-edge(current[i]))/.01);
		}
	}
	assert.ok(maxSpeed < 20, `edge speed ${maxSpeed} exceeds the smooth score budget`);
	for (let p = vertical[0]; p <= horizontal[1]; p += .01) {
		const a = pose(p)[1], b = pose(p+.01)[1];
		assert.ok(Math.hypot(b.x-a.x,b.y-a.y) > .001, 'right-hand card must not stop during the turn');
	}
});

test('each existing fragment becomes one plan row, without duplicate paper or clipped actions', () => {
	assert.equal((product.match(/\{point.task\}/g) || []).length, 1);
	assert.match(product, /class="spec-copy"[\s\S]*\{point.spec.summary\}[\s\S]*class="product-task" data-story-motion>\{point.task\}/);
	assert.doesNotMatch(product, /class="product-plan"|product-plan-paper/);
	assert.doesNotMatch(opening, /\.product-task \{[^}]*(?:overflow: hidden|clip-path|;\s*height:)/);
	assert.match(product, /class="note-anchor"[^>]*><span class="task-number"[^>]*>\{i \+ 1\}/);
	assert.equal(at('plan-fragment-align', 100, 'left'), '18%');
	assert.equal(at('plan-fragment-align', 100, 'width'), '78%');
	assert.equal(at('plan-fragment-join', 100, 'top'), 'var(--plan-top)');
	assert.equal(at('plan-fragment-join', 100, 'height'), '22%');
	assert.match(product, /--plan-top: \$\{16 \+ i \* 22\}%/);
	assert.equal(at('plan-fragment-paper', 100, 'border-radius'), 'var(--plan-radius, 0)');
	assert.equal(at('spec-title', 100), '1', 'section headings remain as source labels');
	assert.equal((product.match(/href="\/brands\/openspec.svg"/g) || []).length, 1);
});

test('actions are fully readable before their source retires and move only after it has left', () => {
	const [reveal, place] = ranges('product-task');
	const [, retire] = ranges('spec-copy');
	assert.ok(reveal[1] <= retire[0]);
	assert.ok(retire[1] <= place[0]);
	assert.ok(ranges('product-fragment')[2][0] < reveal[0], 'make space before revealing more text');
	assert.match(opening, /\.product-fragment \{[^}]*animation-fill-mode: both, both, forwards, forwards, forwards/);
	assert.match(opening, /\.spec-title \{[^}]*animation-fill-mode: both, forwards/);
	assert.match(opening, /\.spec-copy \{[^}]*animation-fill-mode: both, forwards/);
	assert.equal(at('spec-letter-fan', 0, 'width'), '3.5cqw', 'eight original glyphs form the 28cqw wordmark');
});

function planGeometry() {
	const cards = [...product.matchAll(/\{x: (\d+), y: (\d+), w: (\d+), h: (\d+)\}/g)].map(([,x,y,w,h])=>({x:+x,y:+y,w:+w,h:+h}));
	const prepared = JSON.parse(product.match(/const preparedTops = (\[[^;]+\]);/)[1]);
	const series = name => product.match(new RegExp(`--${name}: \\$\\{([\\d.]+) \\+ i \\* ([\\d.]+)\\}%`)).slice(1).map(Number);
	const ordered = series('ordered-top'), joined = series('plan-top');
	const [, , order, align, join] = ranges('product-fragment');
	const curve = opening.match(/\.product-fragment \{[^}]*cubic-bezier\(([^)]+)\)/)[1].split(',').map(Number);
	const time = stop => order[0] + (order[1] - order[0]) * stop / 100;
	const preparationEnd = time(25), verticalStart = time(37.5), shrinkStart = time(81.25);
	const mix = (a,b,t) => a+(b-a)*t;
	const t = (p,a,b) => ease((p-a)/(b-a),curve);
	const preparedHeight = parseFloat(at('plan-fragment-order',25,'height'));
	const orderedHeight = parseFloat(at('plan-fragment-order',100,'height'));
	const finalHeight = parseFloat(at('plan-fragment-join',100,'height'));
	const finalX = parseFloat(at('plan-fragment-align',100,'left'));
	const finalWidth = parseFloat(at('plan-fragment-align',100,'width'));
	const pose = p => cards.map((c,i) => {
		let y = p < verticalStart ? mix(c.y,prepared[i],t(p,order[0],preparationEnd)) : mix(prepared[i],ordered[0]+i*ordered[1],t(p,verticalStart,order[1]));
		let h = p < shrinkStart ? mix(c.h,preparedHeight,t(p,order[0],preparationEnd)) : mix(preparedHeight,orderedHeight,t(p,shrinkStart,order[1]));
		if (p >= join[0]) { y=mix(ordered[0]+i*ordered[1],joined[0]+i*joined[1],t(p,...join)); h=mix(orderedHeight,finalHeight,t(p,...join)); }
		return {x:mix(c.x,finalX,t(p,...align)),y,w:mix(c.w,finalWidth,t(p,...align)),h};
	});
	return {pose, verticalStart, join};
}

test('OpenSpec-to-plan geometry has no intersections, abrupt jumps or stop at axis handoffs', () => {
	const {pose, verticalStart, join} = planGeometry();
	let maxSpeed=0;
	for(let p=48;p<=72;p+=.01){
		const current=pose(p), next=pose(p+.01);
		for(let i=0;i<4;i++){
			for(let j=i+1;j<4;j++){
				const a=current[i],b=current[j];
				assert.ok(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)<.001 || Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)<.001,`plan rows ${i}/${j} intersect at ${p}`);
			}
			for(const edge of [c=>c.x,c=>c.x+c.w,c=>c.y,c=>c.y+c.h]) maxSpeed=Math.max(maxSpeed,Math.abs(edge(next[i])-edge(current[i]))/.01);
			if(p>verticalStart && p<join[1]-.01) assert.ok(Math.hypot(next[i].x-current[i].x,next[i].y-current[i].y,next[i].w-current[i].w,next[i].h-current[i].h)>.000001,`row ${i} stops at ${p}`);
		}
	}
	assert.ok(maxSpeed<20,`plan edge speed ${maxSpeed} exceeds the opening's smoothness budget`);
	assert.deepEqual(pose(70),pose(72),'hold before the existing frontend handoff');
});

test('the eight original logo glyphs travel through gutters, never through cards or each other', () => {
	const {pose: cards} = planGeometry();
	const order = JSON.parse(product.match(/const letterOrder = (\[[^;]+\]);/)[1]);
	assert.deepEqual([...order].sort((a,b)=>a-b), [0,1,2,3,4,5,6,7]);
	assert.match(product, /viewBox=\{`\$\{i \* 80\} 0 80 80`\}/);
	assert.match(product, /<image class="spec-letter-ink" data-story-motion href="\/brands\/openspec.svg" width="640" height="80"/);
	const series = name => product.match(new RegExp(`--letter-${name}: \\$\\{([\\d.]+) \\+ i \\* ([\\d.]+)\\}%`)).slice(1).map(Number);
	const start = series('start'), end = series('end');
	const lanes = JSON.parse(product.match(/const letterLanes = (\[[^;]+\]);/)[1]);
	const slots = JSON.parse(product.match(/const letterSlots = (\[[^;]+\]);/)[1]);
	const rule = opening.match(/\.spec-letter \{[^}]*animation-range:[^}]*contain calc\(([\d.]+)% \+ var\(--letter-order\) \* ([\d.]+)%\) contain calc\(([\d.]+)% \+ var\(--letter-order\) \* ([\d.]+)%\)[^}]*cubic-bezier\(([^)]+)\)/);
	assert.ok(rule);
	const [, from, delay, to, endDelay, easing] = rule;
	const curve = easing.split(',').map(Number);
	const scores = ['spec-letter-fan','spec-letter-gather','spec-letter-flight'].map(name=>frames(opening,name));
	assert.ok(scores.flat().every(f => !('opacity' in f.style)), 'glyphs remain opaque throughout flight');
	function property(score, name, p, vars) {
		const stops = score.filter(f => name in f.style);
		const value = f => parseFloat(vars[f.style[name]] ?? f.style[name]);
		if (p <= stops[0].at) return value(stops[0]);
		for (let i=1;i<stops.length;i++) if (p<=stops[i].at) {
			const a=stops[i-1], b=stops[i];
			return value(a)+(value(b)-value(a))*ease((p-a.at)/(b.at-a.at),curve);
		}
		return value(stops.at(-1));
	}
	const [fan, gather] = ranges('spec-letter');
	const letters = p => order.map((rank,i) => {
		const flightStart=+from+rank*+delay, flightEnd=+to+rank*+endDelay;
		const t = (p-flightStart)/(flightEnd-flightStart)*100;
		const vars = {'var(--letter-start)':start[0]+i*start[1], 'var(--letter-end)':end[0]+i*end[1], 'var(--letter-lane)':lanes[i], 'var(--letter-slot)':slots[i]};
		const fanTime=(p-fan[0])/(fan[1]-fan[0])*100, gatherTime=(p-gather[0])/(gather[1]-gather[0])*100;
		const w=property(scores[0],'width',fanTime,vars);
		const x=p<flightStart?property(scores[1],'left',gatherTime,vars):property(scores[2],'left',t,vars);
		const y=p<flightStart?property(scores[0],'top',fanTime,vars):property(scores[2],'top',t,vars);
		// The official 80-unit cells have a 64-unit glyph (last C: 48), then whitespace.
		return {x,y,w:w*(i===7?.6:.8),h:w*1.4};
	});
	const intersects = (a,b) => Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>.001 && Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>.001;
	for (let p=48;p<=65;p+=.01) {
		const glyphs=letters(p), papers=cards(p);
		for (let i=0;i<8;i++) {
			for (let j=0;j<4;j++) assert.ok(!intersects(glyphs[i],papers[j]),`glyph ${i} touches card ${j} at ${p}`);
			for (let j=i+1;j<8;j++) assert.ok(!intersects(glyphs[i],glyphs[j]),`glyphs ${i}/${j} touch at ${p}`);

		}
	}
	assert.deepEqual(letters(65),letters(66),'wordmark is complete before the plan heading');
});

test('transition lighting is gated, reversible and quiet before the later stages', () => {
	for (const name of ['product-light-left','product-light-right']) {
		assert.equal(at(name,27),'0');
		assert.equal(at(name,70),'0');
		assert.equal(at(name,100),'0');
		assert.ok(frames(opening,name).every(f => Object.keys(f.style).every(k=>['opacity','transform'].includes(k))));
	}
	assert.match(opening, /\.scope-light::before,[^}]*animation-timeline: --product-story; animation-range: contain 0% contain 100%/);
	assert.doesNotMatch(opening, /animation-iteration-count:\s*infinite/);
});
