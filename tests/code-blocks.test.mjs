import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRenderer} from 'astro-expressive-code';
import config from '../ec.config.mjs';

const renderer = await createRenderer(config);
const page = await readFile(new URL('../src/pages/articles/ephemeral-github-actions-part-2.astro', import.meta.url), 'utf8');

function findAll(node, tagName) {
	return [
		...(node.type === 'element' && node.tagName === tagName ? [node] : []),
		...(node.children ?? []).flatMap(child => findAll(child, tagName)),
	];
}

async function copyButton(code, language, title, frame = 'code') {
	const {renderedGroupAst} = await renderer.ec.render({code, language, props: {title, frame}});
	const buttons = findAll(renderedGroupAst, 'button');
	assert.equal(buttons.length, 1);
	assert.equal(buttons[0].properties.title, 'Копировать код');
	assert.equal(buttons[0].properties.dataCopied, 'Скопировано!');
	return buttons[0].properties.dataCode.replace(/\u007f/g, '\n');
}

test('native copy preserves shell comments, indentation, blank lines and special characters', async () => {
	const code = '# install.sh\n#!/usr/bin/env bash\n\n# После enabled=true\nprintf \'%s\\n\' "<demo> & $HOME"\n\ttrue';
	assert.equal(config.tabWidth, 0, 'Astro must not replace tabs before rendering');
	assert.equal(await copyButton(code, 'bash', 'На Control', 'terminal'), code);
});

test('every full source shown in the article is copied without captions or omitted lines', async () => {
	const names = [
		...new Set([...page.matchAll(/ciKitFile\('([^']+)'\)/g)].map(match => match[1])),
		...JSON.parse(await readFile(new URL('../examples/ephemeral-ci/files.json', import.meta.url), 'utf8'))
			.filter(name => name.startsWith('systemd/')),
	];
	const languages = {py: 'python', sh: 'bash', json: 'json', yml: 'yaml', service: 'ini', timer: 'ini', txt: 'text'};
	assert.equal(names.length, 15);
	for (const name of names) {
		const code = await readFile(new URL(`../examples/ephemeral-ci/${name}`, import.meta.url), 'utf8');
		// Expressive Code omits the final newline; all source lines must remain intact.
		assert.equal(await copyButton(code, languages[name.split('.').at(-1)], name), code.trimEnd(), name);
	}
});

test('the article uses the native Code component and integration, without a second clipboard implementation', async () => {
	const astro = await readFile(new URL('../astro.config.mjs', import.meta.url), 'utf8');
	assert.match(astro, /integrations: \[expressiveCode\(\), react\(\)\]/);
	assert.match(page, /import \{Code\} from 'astro-expressive-code\/components'/);
	assert.equal([...page.matchAll(/<Code /g)].length, 24);
	assert.doesNotMatch(page, /astro:components|navigator\.clipboard|execCommand|theme="github-light"/);
});
