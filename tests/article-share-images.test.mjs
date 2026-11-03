import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import sharp from 'sharp';
import {publishedArticles} from '../src/data/articles.ts';

test('every article has its own versioned, accessible share image', async () => {
	const paths = publishedArticles.map(article => article.shareImage.src);
	assert.equal(new Set(paths).size, publishedArticles.length, 'Article covers must be unique');
	for (const {slug, shareImage} of publishedArticles) {
		assert.match(shareImage.src, new RegExp(`^/share/${slug}-\\d{4}-\\d{2}-v\\d+\\.jpg$`));
		assert.ok(shareImage.alt.length >= 20, `${slug} needs a meaningful image description`);
		const file = new URL(`../public${shareImage.src}`, import.meta.url);
		const metadata = await sharp(await readFile(file)).metadata();
		assert.equal(metadata.format, 'jpeg', slug);
		assert.equal(metadata.width, 1200, slug);
		assert.equal(metadata.height, 630, slug);
		assert.ok((await stat(file)).size < 350_000, `${slug} cover is too large`);
		assert.ok(!metadata.exif && !metadata.xmp && !metadata.iptc, `${slug} has unnecessary embedded metadata`);
		const source = new URL(`../src/assets/social${shareImage.src.replace(/\.jpg$/, '.svg')}`, import.meta.url);
		assert.ok((await stat(source)).size, `${slug} needs its vector source`);
	}
});
