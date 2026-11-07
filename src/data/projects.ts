// A small public selection; project links lead to the product or its repository.
export const projects = [
	{
		id: 'orfoproverka',
		name: 'ОрфоПроверка',
		description: {ru: 'Проверка русского текста прямо на сайтах.', en: 'Russian spell checking directly on websites.'},
		url: 'https://orfoproverka.ru/',
	},
	{
		id: 'dfc-bridge',
		name: 'DFC Bridge',
		description: {ru: 'Дизайн-контракт и Figma-помощник.', en: 'A design-handoff contract and Figma companion.'},
		url: 'https://poliklot.github.io/dfc-bridge/',
	},
	{
		id: 'bitrix-agent-skill',
		name: 'Bitrix Agent Skill',
		description: {ru: 'База знаний для ИИ-агентов в проектах Битрикс.', en: 'Engineering knowledge for AI agents in Bitrix projects.'},
		url: 'https://github.com/Poliklot/bitrix-agent-skill',
	},
	{
		id: 'hbs-master',
		name: 'HBS Master',
		description: {ru: 'Навигация и подсказки Handlebars в VS Code.', en: 'Handlebars navigation and completion in VS Code.'},
		url: 'https://github.com/Poliklot/hbs-master',
	},
	{
		id: 'macos-actions-runner-kit',
		name: 'macOS Actions Runner Kit',
		description: {ru: 'GitHub Actions runners на своём Mac для доверенных задач.', en: 'GitHub Actions runners on your Mac for trusted workloads.'},
		url: 'https://github.com/Poliklot/macos-actions-runner-kit',
	},
] as const;
