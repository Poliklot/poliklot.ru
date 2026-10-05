import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCiCosts, ciCostDefaults } from '../src/lib/ci-costs.ts';

test('article example: 400 builds, with and without preparation', () => {
	const base = calculateCiCosts({ ...ciCostDefaults, overheadMinutes: 0 });
	assert.equal(base.builds, 400);
	assert.ok(Math.abs(base.temporaryCost - 333.3333333333) < 0.00001);
	const prepared = calculateCiCosts(ciCostDefaults);
	assert.ok(Math.abs(prepared.temporaryCost - 383.3333333333) < 0.00001);
	assert.equal(prepared.permanentCost, 1800);
});

test('rounding happens on each server, not on the monthly total', () => {
	const result = calculateCiCosts({ ...ciCostDefaults, billingStepMinutes: 60 });
	assert.equal(result.billedHours, 400);
	assert.equal(result.temporaryCost, 1000);
});

test('zero builds and expensive temporary servers remain meaningful', () => {
	assert.equal(calculateCiCosts({ ...ciCostDefaults, buildsPerDay: 0 }).temporaryCost, 0);
	assert.ok(calculateCiCosts({ ...ciCostDefaults, hourlyRate: 100 }).difference < 0);
});

test('invalid, non-finite and out-of-range inputs are rejected', () => {
	for (const [key, value] of [['workingDays', 0], ['workingDays', 32], ['workingDays', 1.5], ['buildsPerDay', -1], ['buildsPerDay', 10001], ['billingStepMinutes', 0], ['hourlyRate', NaN], ['monthlyRate', Infinity]]) {
		assert.equal(calculateCiCosts({ ...ciCostDefaults, [key]: value }), null);
	}
});
