import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {copy, person, TELEGRAM_URL} from '../src/data/site.ts';
import {projects} from '../src/data/projects.ts';
import {publishedArticles} from '../src/data/articles.ts';

function schemas(html) {
	return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
		.flatMap(([, json]) => JSON.parse(json));
}

for (const locale of ['ru', 'en']) {
	const html = await readFile(new URL(`../dist/${locale === 'ru' ? '' : 'en/'}index.html`, import.meta.url), 'utf8');
	const graph = schemas(html);
	const people = graph.filter(entry => entry['@type'] === 'Person');
	assert.equal(people.length, 1, `${locale}: one person, not parallel identities`);
	assert.equal(people[0]['@id'], 'https://poliklot.ru/#igor-poliklot');
	assert.equal(people[0].name, person.fullName);
	assert.equal(people[0].description, copy[locale].lead);
	assert.equal(people[0].additionalName, person.additionalName);
	assert.ok(people[0].alternateName.includes(person.alias));
	assert.ok(people[0].sameAs.includes(TELEGRAM_URL));
	assert.ok(html.includes(`href="${TELEGRAM_URL}"`), `${locale}: visible Telegram contact link`);
	assert.ok(!people[0].image, 'The brand logo is not a portrait of the person');
	assert.equal(graph.find(entry => entry['@type'] === 'ProfilePage').mainEntity['@id'], people[0]['@id']);
	assert.ok(html.includes(`<title>${copy[locale].pageTitle}</title>`));
	assert.ok(html.indexOf('id="scope"') < html.indexOf('id="ai-team"'), `${locale}: preserve the original opening sequence`);
	assert.ok(html.indexOf('id="experience"') < html.indexOf('id="projects"'), `${locale}: the compact project selection follows the original story`);
	assert.ok(!html.includes('class="agent-roles"'), `${locale}: do not duplicate the existing agent responsibilities`);
	const visibleText = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
	assert.ok(visibleText.includes(person.fullName), `${locale}: visible full name, not only metadata`);
	for (const id of ['projects', 'ai-team', 'about', 'contact', 'scope', 'velocity', 'stack', 'experience']) {
		assert.ok(html.includes(`id="${id}"`), `${locale}: missing section ${id}`);
	}
	for (const project of projects) {
		assert.ok(html.includes(`id="project-${project.id}"`));
		assert.ok(html.includes(`href="${project.url}"`));
	}
	assert.ok(html.includes('https://poliklot.ru/og-poliklot-2026-11.jpg'));
}

for (const article of publishedArticles) {
	const html = await readFile(new URL(`../dist/articles/${article.slug}/index.html`, import.meta.url), 'utf8');
	const graph = schemas(html);
	assert.equal(graph.find(entry => entry['@type'] === 'Person').description, copy.ru.lead, 'An article topic must not become the author biography');
	assert.equal(graph.find(entry => entry['@type'] === 'TechArticle').author['@id'], 'https://poliklot.ru/#igor-poliklot');
	assert.ok(html.includes('href="/#about"'), `${article.slug}: visible author link`);
}

const cover = await readFile(new URL('../public/og-poliklot-2026-11.jpg', import.meta.url));
assert.deepEqual(await readFile(new URL('../dist/og-poliklot-2026-11.jpg', import.meta.url)), cover);
console.log(`Personal brand checked: RU/EN identity, ${projects.length} projects, AI team, author links and social cover.`);
