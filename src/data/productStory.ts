import type {Locale} from './site';

type PlanAction = {step: string; title: string; detail: string};

// One marketplace brief feeds discovery, the four OpenSpec artifacts and tasks.
export const productStory = {
	ru: {
		brief: {label: 'Задача', lines: ['Реализовать', 'кабинет заказчика', 'на бирже']},
		points: [
			{key: 'goal', seed: 'Цель', question: 'Зачем заказчику кабинет?', requirement: 'Вести заказ от заявки до результата.', spec: {title: 'Предложение', artifact: 'proposal.md', summary: 'Единое место для работы с заказом.'}, task: {step: '1', title: 'Согласовать контракт', detail: 'Статусы, роли и формат данных'}},
			{key: 'behavior', seed: 'Сценарий', question: 'Как выбрать исполнителя?', requirement: 'Сравнить отклики и выбрать подходящий.', spec: {title: 'Требования', artifact: 'specs/', summary: 'Заказ, отклики, выбор, приёмка.'}, task: {step: '2б', title: 'Собрать кабинет', detail: 'Экраны на моках API'}},
			{key: 'data', seed: 'Доступ', question: 'Кто видит материалы?', requirement: 'Заказчик и выбранный исполнитель.', spec: {title: 'Техническое решение', artifact: 'design.md', summary: 'Роли и доступ проверяет сервер.'}, task: {step: '2а', title: 'Реализовать API', detail: 'Заказы, отклики, доступ'}},
			{key: 'quality', seed: 'Готовность', question: 'Когда заказ завершён?', requirement: 'После приёмки результата заказчиком.', spec: {title: 'Задачи', artifact: 'tasks.md', summary: 'Собрать сценарий и проверить приёмку.'}, task: {step: '3', title: 'Связать интерфейс и API', detail: 'Заказ от заявки до приёмки'}},
		],
		plan: {parallel: 'Можно параллельно', joined: 'После обеих веток', followups: [
			{step: '4', title: 'Проверить сценарий', detail: 'Роли, ошибки и приёмка'},
			{step: '5', title: 'Выпустить продукт', detail: 'Сборка, логи и метрики'},
		]},
		phases: [
			{title: 'Осмысливаю', description: 'Задача — реализовать кабинет заказчика на бирже услуг.'},
			{title: 'Фиксирую', description: 'OpenSpec: предложение, требования, решение и задачи.'},
			{title: 'Планирую', description: 'Сначала контракт. Затем API и кабинет параллельно. После — интеграция, проверка и выпуск.'},
			{title: 'Строю', description: 'Связываю интерфейс, логику и данные в продукт.'},
		],
	},
	en: {
		brief: {label: 'The task', lines: ['Build a client portal', 'for a freelance', 'marketplace']},
		points: [
			{key: 'goal', seed: 'Purpose', question: 'Why does the client need a portal?', requirement: 'Manage a job from brief to delivery.', spec: {title: 'Proposal', artifact: 'proposal.md', summary: 'One place to manage each job.'}, task: {step: '1', title: 'Agree on the contract', detail: 'States, roles and data formats'}},
			{key: 'behavior', seed: 'Workflow', question: 'How is a freelancer selected?', requirement: 'Compare proposals and choose one.', spec: {title: 'Requirements', artifact: 'specs/', summary: 'Post, compare, select and approve.'}, task: {step: '2b', title: 'Build the portal', detail: 'Screens using API mocks'}},
			{key: 'data', seed: 'Access', question: 'Who can access the job files?', requirement: 'The client and selected freelancer.', spec: {title: 'Technical design', artifact: 'design.md', summary: 'The server enforces role-based access.'}, task: {step: '2a', title: 'Implement the API', detail: 'Jobs, proposals and access'}},
			{key: 'quality', seed: 'Readiness', question: 'When is the job complete?', requirement: 'When the client accepts the result.', spec: {title: 'Tasks', artifact: 'tasks.md', summary: 'Build the flow and test acceptance.'}, task: {step: '3', title: 'Connect UI and API', detail: 'From job brief to acceptance'}},
		],
		plan: {parallel: 'Work in parallel', joined: 'After both branches', followups: [
			{step: '4', title: 'Test the full workflow', detail: 'Roles, errors and acceptance'},
			{step: '5', title: 'Ship the product', detail: 'Build, logs and metrics'},
		]},
		phases: [
			{title: 'Understand', description: 'The task: build a client portal for a freelance marketplace.'},
			{title: 'Specify', description: 'OpenSpec: proposal, requirements, design and tasks.'},
			{title: 'Plan', description: 'Contract first. Then API and portal in parallel. Next: integration, testing and release.'},
			{title: 'Build', description: 'Connect the interface, logic and data into a product.'},
		],
	},
} satisfies Record<Locale, {
	brief: {label: string; lines: string[]};
	points: {key: string; seed: string; question: string; requirement: string; spec: {title: string; artifact: string; summary: string}; task: PlanAction}[];
	plan: {parallel: string; joined: string; followups: PlanAction[]};
	phases: {title: string; description: string}[];
}>;
