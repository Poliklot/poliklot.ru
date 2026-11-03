import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publishedArticles} from '../src/data/articles.ts';

// Check the static HTML crawlers receive, not client-side state or source strings.
for (const article of publishedArticles) {
	const html = await readFile(new URL(`../dist/articles/${article.slug}/index.html`, import.meta.url), 'utf8');
	const tags = [...html.matchAll(/<meta\b[^>]*>/g)].map(([tag]) => tag);
	function meta(name) {
		const matches = tags.filter(tag => tag.includes(`property="${name}"`) || tag.includes(`name="${name}"`));
		assert.equal(matches.length, 1, `${article.slug}: expected one ${name}`);
		return matches[0].match(/\bcontent="([^"]*)"/)?.[1];
	}
	const canonical = meta('og:url');
	const expectedImage = new URL(article.shareImage.src, canonical).href;
	assert.ok(canonical.startsWith('https://'), `${article.slug}: canonical must use HTTPS`);
	assert.equal(meta('og:type'), 'article');
	assert.equal(meta('og:image'), expectedImage);
	assert.equal(meta('twitter:image'), expectedImage);
	assert.equal(meta('twitter:card'), 'summary_large_image');
	assert.equal(meta('og:image:type'), 'image/jpeg');
	assert.equal(meta('og:image:width'), '1200');
	assert.equal(meta('og:image:height'), '630');
	assert.ok(meta('og:image:alt'), `${article.slug}: missing alt`);
	assert.equal(meta('twitter:image:alt'), meta('og:image:alt'));
	const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
		.flatMap(([, json]) => JSON.parse(json));
	assert.equal(schemas.find(schema => schema['@type'] === 'TechArticle')?.image, expectedImage);
	const source = await readFile(new URL(`../public${article.shareImage.src}`, import.meta.url));
	const built = await readFile(new URL(`../dist${article.shareImage.src}`, import.meta.url));
	assert.deepEqual(built, source, `${article.slug}: the cover must be present in the published build`);
}

console.log(`Article sharing checked: ${publishedArticles.length} unique covers, Open Graph, large cards and structured data.`);
