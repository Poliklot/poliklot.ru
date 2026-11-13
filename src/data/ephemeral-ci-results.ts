// Editorial snapshot of the native lease journal, 12–13 November 2026.
// Anonymous IDs are not provider, repository or workflow identifiers.
// Seconds cover admission-to-closure, not compilation or invoiced hours.
export const ciLifecycles = [
	{id: 'L01', label: 'Android — подготовка', outcome: 'setup', seconds: 159.485341},
	{id: 'L02', label: 'Backend — подготовка', outcome: 'setup', seconds: 495.717807},
	{id: 'L03', label: 'Backend — отказ перед началом job', outcome: 'failure', seconds: 342.303524},
	{id: 'L04', label: 'Backend — первый успешный job', outcome: 'pass', seconds: 1175.855771},
	{id: 'L05', label: 'Android — ошибка форматирования', outcome: 'failure', seconds: 755.148072},
	{id: 'L06', label: 'Android — первый успешный job', outcome: 'pass', seconds: 2027.743685},
	{id: 'L07', label: 'Назначенная задача — отмена', outcome: 'cancelled', seconds: 451.162919},
	{id: 'L08', label: 'Backend — обычная dev-ветка', outcome: 'pass', seconds: 1159.360779},
	{id: 'L09', label: 'Android — обрыв доступа к Vault', outcome: 'failure', seconds: 2307.659865},
	{id: 'L10', label: 'Android — после исправления канала', outcome: 'pass', seconds: 2374.131029},
] as const;

export const ciOutcomeLabels = {
	setup: 'Причина не подтверждена', failure: 'Ошибка', pass: 'Успех', cancelled: 'Отмена',
} as const;

export const ciEconomics = {
	monthlyVmAndIpRub: 23560,
	empiricalHoursPerMonth: 732,
	monthlySharedControlRub: 2140,
	monthlyBucketRub: 79,
	safetyReserveRub: 819,
	actualIndividualBillRub: null,
	partialHourRuleConfirmed: false,
} as const;

export const ciTotalSeconds = ciLifecycles.reduce((sum, row) => sum + row.seconds, 0);
export const ciLatestPairSeconds = ciLifecycles
	.filter(({id}) => id === 'L08' || id === 'L10')
	.reduce((sum, row) => sum + row.seconds, 0);

export function ciModelRub(seconds: number) {
	return seconds / 3600 * ciEconomics.monthlyVmAndIpRub / ciEconomics.empiricalHoursPerMonth;
}

export function ciDuration(seconds: number) {
	const rounded = Math.round(seconds);
	return `${Math.floor(rounded / 60)} мин ${String(rounded % 60).padStart(2, '0')} с`;
}
