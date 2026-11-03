import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';

// Check the shipped artifact, not just the valid source CSS/dev server.
const assets = new URL('../dist/_astro/', import.meta.url);
const files = readdirSync(assets).filter(name => name.endsWith('.css'));
assert.ok(files.length, 'Build the site before checking production CSS');
const css = files.map(name => readFileSync(new URL(name, assets), 'utf8')).join('\n');

for (const [, value] of css.matchAll(/(?:^|[;{])\s*animation\s*:\s*([^;{}]+)/g)) {
	assert.doesNotMatch(value, /(?:^|\s)--[\w-]+(?:\s|,|$)/,
		'CSS minification folded a named timeline into an unsupported animation shorthand');
}

for (const selector of [/\.product-glow$/, /\.fragment-paper::?before$/, /\.plan-dependencies\s*>\s*path$/]) {
	const rule = [...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)].find(([, selectors, declarations]) =>
		selectors.split(',').some(s => selector.test(s.trim())) && /animation-timeline\s*:/.test(declarations));
	assert.ok(rule, `Missing separate animation-timeline for ${selector}`);
	assert.match(rule[2], /animation-timeline\s*:\s*--product-story\s*(?:;|$)/);
}

console.log(`Production CSS checked: ${files.length} assets, named animation timelines preserved.`);
