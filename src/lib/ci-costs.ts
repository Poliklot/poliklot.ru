export interface CiCostInputs {
	buildsPerDay: number;
	minutesPerBuild: number;
	workingDays: number;
	overheadMinutes: number;
	billingStepMinutes: number;
	hourlyRate: number;
	monthlyRate: number;
}

export const ciCostDefaults: CiCostInputs = {
	buildsPerDay: 20,
	minutesPerBuild: 20,
	workingDays: 20,
	overheadMinutes: 3,
	billingStepMinutes: 1,
	hourlyRate: 2.5,
	monthlyRate: 1800,
};

export const ciCostLimits = {
	buildsPerDay: { min: 0, max: 10000, integer: true },
	minutesPerBuild: { min: 1, max: 1440, integer: false },
	workingDays: { min: 1, max: 31, integer: true },
	overheadMinutes: { min: 0, max: 1440, integer: false },
	billingStepMinutes: { min: 1, max: 1440, integer: false },
	hourlyRate: { min: 0, max: 10000, integer: false },
	monthlyRate: { min: 0, max: 1000000, integer: false },
} satisfies Record<keyof CiCostInputs, { min: number; max: number; integer: boolean }>;

export function isValidCiCostValue(key: keyof CiCostInputs, value: number) {
	const { min, max, integer } = ciCostLimits[key];
	return Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value));
}

export function calculateCiCosts(input: CiCostInputs) {
	const { buildsPerDay, minutesPerBuild, workingDays, overheadMinutes, billingStepMinutes, hourlyRate, monthlyRate } = input;
	if ((Object.keys(ciCostLimits) as (keyof CiCostInputs)[]).some((key) => !isValidCiCostValue(key, input[key]))) {
		return null;
	}
	const builds = buildsPerDay * workingDays;
	const billedMinutesPerBuild = Math.ceil((minutesPerBuild + overheadMinutes) / billingStepMinutes) * billingStepMinutes;
	const buildHours = builds * minutesPerBuild / 60;
	const billedHours = builds * billedMinutesPerBuild / 60;
	const temporaryCost = billedHours * hourlyRate;
	return { builds, buildHours, billedHours, temporaryCost, permanentCost: monthlyRate, difference: monthlyRate - temporaryCost };
}
