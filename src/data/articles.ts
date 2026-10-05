export interface ArticleSummary {
	slug: string;
	publishedAt: string;
	publishedLabel: string;
	updatedAt?: string;
	title: string;
	description: string;
}

const articles: readonly ArticleSummary[] = [
	{
		slug: 'yandex-metrika-handoff',
		publishedAt: '2026-10-05',
		publishedLabel: '5 октября 2026',
		updatedAt: '2026-10-06',
		title: 'Как создать Яндекс Метрику и передать её разработчикам',
		description: 'Пять коротких шагов со скриншотами: создать счётчик Яндекс Метрики и передать код разработчикам. Без передачи пароля.',
	},
	{
		slug: 'ephemeral-github-actions',
		publishedAt: '2026-09-20',
		publishedLabel: '20 сентября 2026',
		updatedAt: '2026-10-06',
		title: 'GitHub Actions: платим за сборки, а не за простой',
		description: 'Временные серверы для GitHub Actions: оплата в рублях, понятный расчёт расходов и одна машина на сборку. Часть 1.',
	},
	{
		slug: 'mobile-app-testing',
		publishedAt: '2026-09-08',
		publishedLabel: '8 сентября 2026',
		title: 'Как пройти обязательное тестирование в Google Play',
		description: '12 тестировщиков, 14 дней непрерывного участия, ежедневный план и заявка на публикацию.',
	},
];

export const publishedArticles = [...articles].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
export const homepageArticles = publishedArticles.slice(0, 10);

export const articlesUpdatedAt = publishedArticles.reduce((latest, article) => {
	const modifiedAt = article.updatedAt ?? article.publishedAt;
	return modifiedAt > latest ? modifiedAt : latest;
}, '2026-09-09');
