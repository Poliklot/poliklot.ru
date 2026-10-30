import type {Locale} from './site';

// One marketplace brief feeds discovery, the four OpenSpec artifacts and tasks.
export const productStory = {
	ru: {
		brief: {label: 'Задача', lines: ['Реализовать', 'кабинет заказчика', 'на бирже']},
		points: [
			{key: 'goal', seed: 'Цель', question: 'Зачем заказчику кабинет?', requirement: 'Вести заказ от заявки до результата.', spec: {title: 'Предложение', artifact: 'proposal.md', summary: 'Единое место для работы с заказом.'}, task: 'Показать заказы и их статусы'},
			{key: 'behavior', seed: 'Сценарий', question: 'Как выбрать исполнителя?', requirement: 'Сравнить отклики и выбрать подходящий.', spec: {title: 'Требования', artifact: 'specs/', summary: 'Заказ, отклики, выбор, приёмка.'}, task: 'Добавить выбор исполнителя'},
			{key: 'data', seed: 'Доступ', question: 'Кто видит материалы?', requirement: 'Заказчик и выбранный исполнитель.', spec: {title: 'Техническое решение', artifact: 'design.md', summary: 'Роли и доступ проверяет сервер.'}, task: 'Разграничить доступ к материалам'},
			{key: 'quality', seed: 'Готовность', question: 'Когда заказ завершён?', requirement: 'После приёмки результата заказчиком.', spec: {title: 'Задачи', artifact: 'tasks.md', summary: 'Собрать сценарий и проверить приёмку.'}, task: 'Проверить приёмку заказа'},
		],
		phases: [
			{title: 'Осмысливаю', description: 'Задача — реализовать кабинет заказчика на бирже услуг.'},
			{title: 'Фиксирую', description: 'OpenSpec: предложение, требования, решение и задачи.'},
			{title: 'Планирую', description: 'Вывожу из требований задачи и порядок работы.'},
			{title: 'Строю', description: 'Связываю интерфейс, логику и данные в продукт.'},
		],
	},
	en: {
		brief: {label: 'The task', lines: ['Build a client portal', 'for a freelance', 'marketplace']},
		points: [
			{key: 'goal', seed: 'Purpose', question: 'Why does the client need a portal?', requirement: 'Manage a job from brief to delivery.', spec: {title: 'Proposal', artifact: 'proposal.md', summary: 'One place to manage each job.'}, task: 'Show jobs and their status'},
			{key: 'behavior', seed: 'Workflow', question: 'How is a freelancer selected?', requirement: 'Compare proposals and choose one.', spec: {title: 'Requirements', artifact: 'specs/', summary: 'Post, compare, select and approve.'}, task: 'Add freelancer selection'},
			{key: 'data', seed: 'Access', question: 'Who can access the job files?', requirement: 'The client and selected freelancer.', spec: {title: 'Technical design', artifact: 'design.md', summary: 'The server enforces role-based access.'}, task: 'Restrict access to job files'},
			{key: 'quality', seed: 'Readiness', question: 'When is the job complete?', requirement: 'When the client accepts the result.', spec: {title: 'Tasks', artifact: 'tasks.md', summary: 'Build the flow and test acceptance.'}, task: 'Test delivery acceptance'},
		],
		phases: [
			{title: 'Understand', description: 'The task: build a client portal for a freelance marketplace.'},
			{title: 'Specify', description: 'OpenSpec: proposal, requirements, design and tasks.'},
			{title: 'Plan', description: 'Derive tasks and their order from the requirements.'},
			{title: 'Build', description: 'Connect the interface, logic and data into a product.'},
		],
	},
} satisfies Record<Locale, {
	brief: {label: string; lines: string[]};
	points: {key: string; seed: string; question: string; requirement: string; spec: {title: string; artifact: string; summary: string}; task: string}[];
	phases: {title: string; description: string}[];
}>;
