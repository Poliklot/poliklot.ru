export interface ArticleSummary {
	slug: string;
	publishedAt: string;
	publishedLabel: string;
	title: string;
	description: string;
}

const articles: readonly ArticleSummary[] = [
	{
		slug: 'ephemeral-github-actions',
		publishedAt: '2026-09-20',
		publishedLabel: '20 сентября 2026',
		title: 'Self-hosted GitHub Actions без постоянно работающих серверов',
		description: 'Ephemeral runners на Timeweb Cloud: VM поднимается для одной job и удаляется после выполнения.',
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
