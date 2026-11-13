import names from '../../examples/ephemeral-ci/files.json';

// Source snippets and the downloadable kit share the same explicit source allowlist.
const source = import.meta.glob<string>([
	'../../examples/ephemeral-ci/README.md',
	'../../examples/ephemeral-ci/config.example.json',
	'../../examples/ephemeral-ci/requirements.txt',
	'../../examples/ephemeral-ci/install.sh',
	'../../examples/ephemeral-ci/prepare.py',
	'../../examples/ephemeral-ci/controller.py',
	'../../examples/ephemeral-ci/clients.py',
	'../../examples/ephemeral-ci/bootstrap.py',
	'../../examples/ephemeral-ci/worker.py',
	'../../examples/ephemeral-ci/systemd/ephemeral-ci@.service',
	'../../examples/ephemeral-ci/systemd/ephemeral-ci-dispatch.timer',
	'../../examples/ephemeral-ci/systemd/ephemeral-ci-cleanup.timer',
	'../../examples/ephemeral-ci/systemd/ephemeral-ci-readback.timer',
	'../../examples/ephemeral-ci/repository/.github/workflows/auto-ci.yml',
	'../../examples/ephemeral-ci/repository/.github/workflows/auto-build.yml',
	'../../examples/ephemeral-ci/repository/demo.py',
	'../../examples/ephemeral-ci/tests/test_controller.py',
	'../../examples/ephemeral-ci/tests/test_boundaries.py',
	'../../examples/ephemeral-ci/tests/test_sdk.py',
// Hidden .github paths are intentional; every path above is an exact filename.
], {query: '?raw', import: 'default', eager: true, exhaustive: true});
export const ciKitRoot = '/articles/ephemeral-github-actions-part-2/kit';
export const ciKitFiles = names.map(name => {
	const content = source['../../examples/ephemeral-ci/' + name];
	if (content === undefined) throw new Error('Missing CI kit source — ' + name);
	return {name, content};
});
export function ciKitFile(name: string) {
	const file = ciKitFiles.find(file => file.name === name);
	if (!file) throw new Error('Missing CI kit source — ' + name);
	return file.content;
}
