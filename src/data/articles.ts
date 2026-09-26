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
		slug: 'ephemeral-github-actions',
		publishedAt: '2026-09-20',
		publishedLabel: '20 сентября 2026',
		updatedAt: '2026-09-26',
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
