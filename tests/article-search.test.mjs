import test from 'node:test';
import assert from 'node:assert/strict';
import { searchArticles } from '../src/lib/article-search.ts';
import { publishedArticles } from '../src/data/articles.ts';

const articles = publishedArticles.map((article) => ({
	url: `/articles/${article.slug}/`, title: article.title, description: article.description,
	body: article.slug === 'ephemeral-github-actions' ? 'Одноразовый runner. Kubernetes и Flutter.' : '',
}));

test('empty queries restore all articles', () => {
	assert.deepEqual(searchArticles(articles, '   '), articles.map((article) => article.url));
});

test('Russian names, spelling variations and е/ё work', () => {
	for (const query of ['МЕТРИКА', '  яндекс   счетчик ', 'счетик']) {
		assert.deepEqual(searchArticles(articles, query), ['/articles/yandex-metrika-handoff/'], query);
	}
});

test('full text is searchable, with all words required across fields', () => {
	assert.deepEqual(searchArticles(articles, 'Kubernetes'), ['/articles/ephemeral-github-actions/']);
	assert.deepEqual(searchArticles(articles, 'github flutter'), ['/articles/ephemeral-github-actions/']);
	assert.deepEqual(searchArticles(articles, 'Kubernetes Яндекс'), []);
	assert.deepEqual(searchArticles(articles, 'zzzznonexistentzzzz'), []);
});
