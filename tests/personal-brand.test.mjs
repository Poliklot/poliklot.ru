import test from 'node:test';
import assert from 'node:assert/strict';
import {copy, person, profileUpdatedAt, TELEGRAM_URL} from '../src/data/site.ts';
import {projects} from '../src/data/projects.ts';

test('the personal identity keeps the full Russian name and the Poliklot alias', () => {
	assert.equal(person.fullName, `${person.familyName} ${person.givenName} ${person.additionalName}`);
	assert.equal(person.fullName, 'Майоров Игорь Олегович');
	assert.equal(person.alias, 'Poliklot');
	assert.match(profileUpdatedAt, /^\d{4}-\d{2}-\d{2}$/);
});

test('both languages use the owner-confirmed public Telegram contact', () => {
	assert.equal(TELEGRAM_URL, 'https://t.me/poliklot');
	for (const locale of ['ru', 'en']) {
		assert.match(copy[locale].contactText, /@poliklot/);
		assert.match(copy[locale].contactPrimary, /Telegram/);
	}
});

test('both languages present product ownership, projects and an AI team rather than a frontend job title', () => {
	for (const locale of ['ru', 'en']) {
		const t = copy[locale];
		assert.doesNotMatch(`${t.role} ${t.pageTitle} ${t.heroOverline} ${t.footer}`, /frontend lead|full.?stack/i);
		assert.match(t.aboutFullName, /Майоров Игорь Олегович/);
		assert.ok(t.projectsTitle && t.projectsLead && t.aboutText);
		assert.equal(t.agentItems.length, 4);
		assert.ok(t.humanItems.length > 0);
		assert.match(t.stats[1].note, /опыт руководства|leadership experience/);
	}
});

test('the project selection has unique identities, public destinations and copy in both languages', () => {
	assert.equal(new Set(projects.map(project => project.id)).size, projects.length);
	assert.ok(projects.length >= 3);
	for (const project of projects) {
		assert.match(project.id, /^[a-z0-9-]+$/);
		assert.equal(new URL(project.url).protocol, 'https:');
		for (const locale of ['ru', 'en']) {
			assert.ok(project.description[locale]);
		}
	}
	const spelling = projects.find(project => project.id === 'orfoproverka');
	assert.equal(spelling.url, 'https://orfoproverka.ru/', 'The product link must not point to the built landing repository');
});
