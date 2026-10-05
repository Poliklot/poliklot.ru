import { useEffect, useRef, useState } from 'react';
import { calculateCiCosts, ciCostDefaults, ciCostLimits, isValidCiCostValue, type CiCostInputs } from '../lib/ci-costs';
import '../styles/ci-calculator.css';

const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const labels: Record<keyof CiCostInputs, string> = {
	buildsPerDay: 'Сборок в день', minutesPerBuild: 'Минут на сборку', workingDays: 'Рабочих дней',
	overheadMinutes: 'Подготовка и удаление, мин / запуск', billingStepMinutes: 'Шаг округления оплаты, мин',
	hourlyRate: 'Временный сервер, ₽ / час', monthlyRate: 'Постоянный сервер, ₽ / месяц',
};
const basicFields = ['buildsPerDay', 'minutesPerBuild', 'workingDays'] as const;
const tariffFields = ['overheadMinutes', 'billingStepMinutes', 'hourlyRate', 'monthlyRate'] as const;
const integer = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const RESULT_ANIMATION_MS = 320;
type CiResult = NonNullable<ReturnType<typeof calculateCiCosts>>;

function CostResults({ result, ready }: { result: CiResult; ready: boolean }) {
	const [shown, setShown] = useState(result);
	const shownRef = useRef(result);
	const [motionAllowed, setMotionAllowed] = useState(false);
	const [chartFailed, setChartFailed] = useState(false);
	const canvas = useRef<HTMLCanvasElement>(null);
	const chartRef = useRef<import('chart.js').Chart | null>(null);
	const latest = useRef({ result, motionAllowed });

	useEffect(() => {
		const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
		const update = () => setMotionAllowed(!preference.matches);
		update();
		preference.addEventListener('change', update);
		return () => preference.removeEventListener('change', update);
	}, []);

	useEffect(() => {
		const from = shownRef.current;
		const keys = Object.keys(result) as (keyof CiResult)[];
		if (keys.every((key) => from[key] === result[key])) return;
		if (!ready || !motionAllowed) { shownRef.current = result; setShown(result); return; }
		const start = performance.now();
		let frame = 0;
		const tick = (time: number) => {
			const progress = Math.max(0, Math.min(1, (time - start) / RESULT_ANIMATION_MS));
			const eased = 1 - (1 - progress) ** 3;
			const next = { ...result };
			for (const key of keys) next[key] = progress === 1 ? result[key] : from[key] + (result[key] - from[key]) * eased;
			shownRef.current = next;
			setShown(next);
			if (progress < 1) frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [result, ready, motionAllowed]);

	useEffect(() => {
		latest.current = { result, motionAllowed };
		const chart = chartRef.current;
		if (!chart) return;
		chart.data.datasets[0].data = [result.permanentCost, result.temporaryCost];
		chart.options.animation = motionAllowed ? { duration: RESULT_ANIMATION_MS, easing: 'easeOutCubic' } : false;
		if (!motionAllowed) chart.stop();
		chart.update(motionAllowed ? undefined : 'none');
	}, [result.permanentCost, result.temporaryCost, motionAllowed]);

	useEffect(() => {
		if (!ready || !canvas.current) return;
		let cancelled = false;
		import('chart.js').then(({ Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip }) => {
			if (cancelled || !canvas.current) return;
			Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);
			const { result, motionAllowed } = latest.current;
			const chart = new Chart(canvas.current, {
				type: 'bar',
				data: { labels: ['Постоянный', 'Временные'], datasets: [{ data: [result.permanentCost, result.temporaryCost], backgroundColor: ['#7c8798', '#1259c5'], borderRadius: 4, barThickness: 24 }] },
				options: {
					indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false,
					plugins: { tooltip: { callbacks: { label: (context) => money.format(Number(context.raw)) } } },
					scales: { x: { beginAtZero: true, ticks: { callback: (value) => `${number.format(Number(value))} ₽`, maxTicksLimit: 4 }, grid: { color: '#dce2ec' } }, y: { grid: { display: false } } },
				},
			});
			chart.options.animation = motionAllowed ? { duration: RESULT_ANIMATION_MS, easing: 'easeOutCubic' } : false;
			chartRef.current = chart;
			setChartFailed(false);
		}).catch(() => { if (!cancelled) setChartFailed(true); });
		return () => { cancelled = true; chartRef.current?.destroy(); chartRef.current = null; };
	}, [ready]);

	return <>
		<dl className="ci-calc-results" aria-hidden="true">
			<div><dt>{integer.format(shown.builds)} сборок</dt><dd>{number.format(shown.billedHours)} ч оплачиваемого времени</dd></div>
			<div><dt>Постоянный сервер</dt><dd>{money.format(shown.permanentCost)}</dd></div>
			<div><dt>Временные серверы</dt><dd>{money.format(shown.temporaryCost)}</dd></div>
			<div className="ci-calc-difference"><dt>{shown.difference >= 0 ? 'Временные дешевле на' : 'Временные дороже на'}</dt><dd>{money.format(Math.abs(shown.difference))}</dd></div>
		</dl>
		<p className="ci-calc-sr-only" role="status" aria-atomic="true">{integer.format(result.builds)} сборок, {number.format(result.billedHours)} ч оплачиваемого времени. Постоянный сервер: {money.format(result.permanentCost)}. Временные серверы: {money.format(result.temporaryCost)}. Временные {result.difference >= 0 ? 'дешевле' : 'дороже'} на {money.format(Math.abs(result.difference))}.</p>
		<div className="ci-calc-chart" aria-hidden="true"><canvas ref={canvas} /></div>
		{chartFailed && <p className="ci-calc-note" role="status">График не загрузился. Числовые результаты выше доступны.</p>}
		{result.buildHours > 720 && <p className="ci-calc-warning">Сборкам нужно больше 720 часов: один постоянный сервер может не вместить такую нагрузку. Его цена здесь не учитывает дополнительные машины.</p>}
	</>;
}

export default function CiCalculator() {
	const [values, setValues] = useState(() => Object.fromEntries(Object.entries(ciCostDefaults).map(([key, value]) => [key, String(value)])) as Record<keyof CiCostInputs, string>);
	const [ready, setReady] = useState(false);
	const input = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim() === '' ? NaN : Number(value)])) as unknown as CiCostInputs;
	const result = calculateCiCosts(input);

	useEffect(() => { setReady(true); }, []);

	function field(key: keyof CiCostInputs) {
		const limit = ciCostLimits[key];
		const valid = isValidCiCostValue(key, input[key]);
		return <div className="ci-calc-field" key={key}>
			<label htmlFor={`ci-calc-${key}`}>{labels[key]}</label>
			<input id={`ci-calc-${key}`} type="number" name={key} value={values[key]} min={limit.min} max={limit.max} step={limit.integer ? 1 : 'any'}
				aria-invalid={!valid} aria-describedby={!valid ? `ci-calc-${key}-error` : undefined}
				onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} />
			{!valid && <small className="ci-calc-field-error" id={`ci-calc-${key}-error`}>От {number.format(limit.min)} до {number.format(limit.max)}{limit.integer ? ', целое число' : ''}.</small>}
		</div>;
	}

	return <section className="ci-calculator" id="calculator" aria-labelledby="ci-calc-title" data-search-ignore>
		<h3 id="ci-calc-title">Посчитайте свою нагрузку</h3>
		<p className="ci-calc-intro">Сравните аренду одного постоянного сервера и отдельных машин для каждой сборки. Все расчёты — в вашем браузере.</p>
		<fieldset disabled={!ready}>
			<legend className="ci-calc-sr-only">Параметры сборок и аренды</legend>
			<div className="ci-calc-basic">{basicFields.map(field)}</div>
			<details className="ci-calc-tariffs">
				<summary>Тарифы, подготовка и округление</summary>
				<div className="ci-calc-advanced">{tariffFields.map(field)}</div>
				<p>Округление применяется к каждому запуску. Начальные тарифы — пример из статьи, не актуальная оферта провайдера.</p>
			</details>
		</fieldset>
		{!ready && <p className="ci-calc-note">Интерактивный расчёт загружается при просмотре этого блока. Без JavaScript доступна таблица примера выше.</p>}
		{result ? <CostResults result={result} ready={ready} /> : <p className="ci-calc-warning" role="status" id="ci-calc-validation">Заполните все поля числами в указанных пределах. Рабочих дней — от 1 до 31; количество сборок и дней — целое.</p>}
		<p className="ci-calc-note">По умолчанию добавлены 3 минуты на подготовку и удаление каждой машины: получается около 383 ₽, а не 333 ₽ без накладного времени. Хранение, IP, операции на машинах GitHub и обслуживание не включены. Сравнение предполагает одинаковую скорость сборок и достаточную мощность постоянного сервера.</p>
	</section>;
}
