import Fuse from 'fuse.js';

export interface SearchArticle {
	url: string;
	title: string;
	description: string;
	body?: string;
}

const normalize = (value: string) => value.normalize('NFKC').toLowerCase().replaceAll('ё', 'е');

export function searchArticles(articles: readonly SearchArticle[], query: string): string[] {
	const terms = normalize(query).match(/[\p{L}\p{N}]+/gu) ?? [];
	if (!terms.length) return articles.map((article) => article.url);
	const index = new Fuse(articles.map((article) => ({
		url: article.url,
		title: normalize(article.title),
		description: normalize(article.description),
		body: normalize(article.body ?? ''),
	})), { keys: ['title', 'description', 'body'], threshold: .2, ignoreLocation: true, ignoreFieldNorm: true, useTokenSearch: true, tokenMatch: 'all' });
	return index.search(terms.join(' '))
		.map(({ item }) => item.url);
}
