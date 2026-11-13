import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {parse as parseYaml} from 'yaml';
import {spawnSync} from 'node:child_process';
import {ciLifecycles, ciEconomics, ciTotalSeconds, ciLatestPairSeconds, ciModelRub, ciDuration} from '../src/data/ephemeral-ci-results.ts';
import {ciExamples} from '../src/data/ephemeral-ci-examples.ts';
import {publishedArticles} from '../src/data/articles.ts';

test('the November sample retains all ten leases, including failures and unknown setup outcomes', () => {
	assert.equal(ciLifecycles.length, 10);
	assert.equal(new Set(ciLifecycles.map(r => r.id)).size, 10);
	const counts = Object.fromEntries(['pass', 'failure', 'cancelled', 'setup'].map(outcome => [outcome, ciLifecycles.filter(r => r.outcome === outcome).length]));
	assert.deepEqual(counts, {pass: 4, failure: 3, cancelled: 1, setup: 2});
	assert.ok(ciLifecycles.every(r => Number.isFinite(r.seconds) && r.seconds > 0 && r.seconds < 2400));
	assert.ok(Math.abs(ciTotalSeconds - 11248.568792) < .000001);
	assert.ok(Math.abs(ciLatestPairSeconds - 3533.491808) < .000001);
});

test('model estimates are derived from lease time and remain separate from an unknown bill', () => {
	assert.equal(ciModelRub(ciTotalSeconds).toFixed(2), '100.57');
	assert.equal(ciModelRub(ciLatestPairSeconds).toFixed(2), '31.59');
	assert.equal(ciEconomics.actualIndividualBillRub, null);
	assert.equal(ciEconomics.partialHourRuleConfirmed, false);
	assert.equal(ciEconomics.safetyReserveRub, 819);
	assert.equal(ciDuration(ciLifecycles.at(-1).seconds), '39 мин 34 с');
	assert.equal(ciDuration(119.9), '2 мин 00 с');
});

test('the two parts keep their own metadata and reciprocal links', async () => {
	const first = publishedArticles.find(a => a.slug === 'ephemeral-github-actions');
	const second = publishedArticles.find(a => a.slug === 'ephemeral-github-actions-part-2');
	assert.equal(first.publishedAt, '2026-09-20');
	assert.equal(first.updatedAt, '2026-11-13');
	assert.equal(second.publishedAt, '2026-11-13');
	assert.notEqual(first.shareImage.src, second.shareImage.src);
	for (const [from, to] of [[first, second], [second, first]]) {
		const source = await readFile(new URL(`../src/pages/articles/${from.slug}.astro`, import.meta.url), 'utf8');
		assert.ok(source.includes(`href="/articles/${to.slug}/"`));
	}
});

test('public screenshot derivatives have fixed dimensions and no private metadata', async () => {
	for (const [name, width, height] of [
		['android-success', 1536, 530], ['android-steps', 1536, 682], ['backend-success', 1536, 530], ['android-failure', 1536, 705],
		['android-success-mobile', 640, 530], ['android-steps-mobile', 900, 682], ['backend-success-mobile', 640, 530], ['android-failure-mobile', 880, 705],
	]) {
		const bytes = await readFile(new URL(`../public/articles/ephemeral-github-actions-part-2/${name}.webp`, import.meta.url));
		const meta = await sharp(bytes).metadata();
		assert.equal(meta.format, 'webp');
		assert.equal(meta.width, width);
		assert.equal(meta.height, height);
		assert.ok(!meta.exif && !meta.xmp && !meta.iptc);
		assert.ok(bytes.length < 200_000);
	}
});

test('the practical part follows seven implementation steps instead of incident headlines', async () => {
	const source = await readFile(new URL('../src/pages/articles/ephemeral-github-actions-part-2.astro', import.meta.url), 'utf8');
	const steps = [...source.matchAll(/<h2>(\d)\. /g)].map(match => Number(match[1]));
	assert.deepEqual(steps, [1, 2, 3, 4, 5, 6, 7]);
	for (const anchor of ['architecture', 'github', 'runner', 'build', 'delivery', 'cleanup', 'verification']) {
		assert.ok(source.includes(`section id="${anchor}"`), anchor);
	}
	for (const key of Object.keys(ciExamples)) {
		assert.ok(source.includes(`code={ciExamples.${key}}`), key);
	}
	assert.doesNotMatch(source, /ephemeral-server-illustration|Android упал перед подписью|Кто удалит сервер\?|Два дня\. Десять аренд/);
	assert.match(source, /<details class="ci-detail">\s*<summary>Все десять аренд/);
});

test('the live demo screenshot keeps the complete captured frame without private metadata', async () => {
	const bytes = await readFile(new URL('../public/articles/ephemeral-github-actions-part-2/kit-live-success.jpg', import.meta.url));
	const meta = await sharp(bytes).metadata();
	assert.equal(meta.format, 'jpeg');
	assert.equal(meta.width, 1920);
	assert.equal(meta.height, 907);
	assert.ok(!meta.exif && !meta.xmp && !meta.iptc);
});

test('the downloadable workflows preserve routing, gating and permissions', async () => {
	const root = new URL('../examples/ephemeral-ci/repository/.github/workflows/', import.meta.url);
	const entry = parseYaml(await readFile(new URL('auto-ci.yml', root), 'utf8'));
	const route = parseYaml(await readFile(new URL('auto-build.yml', root), 'utf8'));
	assert.deepEqual(entry.on, {push: {branches: ['dev']}});
	assert.equal(entry.jobs.build.if, "${{ vars.CI_ENABLED == 'true' }}");
	assert.equal(entry.jobs.build.uses, 'YOUR_ORG/YOUR_REPO/.github/workflows/auto-build.yml@REUSABLE_SHA');
	assert.equal(entry.concurrency['cancel-in-progress'], true);
	assert.equal(route.on, 'workflow_call');
	assert.equal(route.jobs.build['runs-on'], 'auto-ci-${{ github.run_id }}-${{ github.run_attempt }}');
	assert.equal(route.jobs.build['timeout-minutes'], 60);
	assert.deepEqual(route.jobs.build.permissions, entry.permissions);
	assert.deepEqual(route.jobs.build.permissions, {contents: 'read'});
	assert.equal(route.jobs.build.steps[0].with['persist-credentials'], false);
	assert.match(route.jobs.build.steps[0].uses, /^actions\/checkout@[a-f0-9]{40}$/);
	assert.equal(route.jobs.build.steps.at(-1).run, 'python3 /opt/ci/worker.py publish out');
});

test('published shell excerpts parse without executing any build or registration', async () => {
	for (const key of ['androidChecks', 'androidBuild']) {
		const result = spawnSync('bash', ['-n'], {input: ciExamples[key], encoding: 'utf8'});
		assert.equal(result.status, 0, `${key}\n${result.stderr}`);
	}
	const bootstrap = await readFile(new URL('../examples/ephemeral-ci/bootstrap.py', import.meta.url), 'utf8');
	for (const flag of ['--ephemeral', '--disableupdate', '--no-default-labels', 'ACTIONS_RUNNER_INPUT_TOKEN']) assert.ok(bootstrap.includes(flag));
	assert.doesNotMatch(bootstrap, /'--token'/);
	const install = await readFile(new URL('../examples/ephemeral-ci/install.sh', import.meta.url), 'utf8');
	assert.equal(spawnSync('bash', ['-n'], {input: install, encoding: 'utf8'}).status, 0);
});
