export interface ArticleSummary {
	slug: string;
	publishedAt: string;
	publishedLabel: string;
	updatedAt?: string;
	title: string;
	description: string;
	shareImage: {src: string; alt: string};
}

const articles: readonly ArticleSummary[] = [
	{
		slug: 'timeweb-developer-access',
		shareImage: {src: '/share/timeweb-developer-access-2026-11-v2.jpg', alt: 'Timeweb Cloud. Доступ разработчику. Настройка прав.'},
		publishedAt: '2026-11-04',
		publishedLabel: '4 ноября 2026',
		title: 'Как настроить доступ разработчика к проекту в Timeweb Cloud',
		description: 'Нужные права — управление проектом и поддержкой, финансы только для просмотра. Настройка пользователя со скриншотами и ограничение текущей панели Timeweb Cloud.',
	},
	{
		slug: 'tailscale-mac',
		shareImage: {src: '/share/tailscale-mac-2026-11-v1.jpg', alt: 'Tailscale. Ваш Mac — разработчик на связи. Удалённый доступ без передачи аккаунта.'},
		publishedAt: '2026-10-31',
		publishedLabel: '31 октября 2026',
		updatedAt: '2026-11-01',
		title: 'Как дать разработчику доступ к Mac через Tailscale',
		description: 'Пошаговая инструкция со скриншотами для владельца Mac. Установка Tailscale, доступ разработчику, удалённый вход, файлы, сон и проверка после перезагрузки. Без команд в терминале для владельца.',
	},
	{
		slug: 'yandex-metrika-handoff',
		shareImage: {src: '/share/yandex-metrika-handoff-2026-11-v1.jpg', alt: 'Яндекс Метрика. Создать счётчик. Передать код. Не пароль.'},
		publishedAt: '2026-10-05',
		publishedLabel: '5 октября 2026',
		updatedAt: '2026-10-06',
		title: 'Как создать Яндекс Метрику и передать её разработчикам',
		description: 'Шесть коротких шагов со скриншотами: создать счётчик Яндекс Метрики, передать код разработчикам и завершить создание. Без передачи пароля.',
	},
	{
		slug: 'ephemeral-github-actions',
		shareImage: {src: '/share/ephemeral-github-actions-2026-11-v1.jpg', alt: 'GitHub Actions. Платим за сборки, а не за простой. Временные серверы для CI.'},
		publishedAt: '2026-09-20',
		publishedLabel: '20 сентября 2026',
		updatedAt: '2026-10-06',
		title: 'GitHub Actions: платим за сборки, а не за простой',
		description: 'Временные серверы для GitHub Actions: оплата в рублях, понятный расчёт расходов и одна машина на сборку. Часть 1.',
	},
	{
		slug: 'mobile-app-testing',
		shareImage: {src: '/share/mobile-app-testing-2026-11-v1.jpg', alt: 'Google Play. От тестирования до публикации. 12 тестировщиков и 14 дней.'},
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
