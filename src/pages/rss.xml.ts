import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { publishedArticles } from '../data/articles';

export function GET({ site }: APIContext) {
	if (!site) throw new Error('RSS requires the canonical site URL in astro.config.');
	return rss({
		title: 'Материалы — Игорь / Poliklot',
		description: 'Практические инструкции о разработке, тестировании и выпуске цифровых продуктов.',
		site,
		items: publishedArticles.map((article) => ({
			title: article.title,
			description: article.description,
			link: `/articles/${article.slug}/`,
			pubDate: new Date(`${article.publishedAt}T00:00:00+03:00`),
		})),
		customData: '<language>ru</language>',
	});
}
