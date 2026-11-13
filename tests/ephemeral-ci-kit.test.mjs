import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('the downloadable kit and checksums match every allowlisted source, including hidden workflows', () => {
	// Use the standard ZIP implementation, not a second archive parser in the site.
	const result = spawnSync('python3', ['-c', `
import hashlib, json, pathlib, zipfile
root = pathlib.Path.cwd()
source = root / 'examples/ephemeral-ci'
public = root / 'public/articles/ephemeral-github-actions-part-2/kit'
names = json.loads((source / 'files.json').read_text()) + ['files.json']
assert len(names) == len(set(names))
payload = {name: (source / name).read_bytes() for name in names}
payload['SHA256SUMS'] = ''.join(hashlib.sha256(data).hexdigest() + '  ' + name + '\\n'
    for name, data in sorted(payload.items())).encode()
archive = public / 'ephemeral-ci-kit-v1.zip'
with zipfile.ZipFile(archive) as package:
    assert package.testzip() is None
    assert sorted(package.namelist()) == sorted('ephemeral-ci/' + name for name in payload)
    for name, data in payload.items():
        assert package.read('ephemeral-ci/' + name) == data, name + ' in ZIP is stale'
        assert (public / name).read_bytes() == data, name + ' download is stale'
assert (public / (archive.name + '.sha256')).read_text() == hashlib.sha256(archive.read_bytes()).hexdigest() + '  ' + archive.name + '\\n'
expected = set(payload) | {archive.name, archive.name + '.sha256'}
assert {p.relative_to(public).as_posix() for p in public.rglob('*') if p.is_file()} == expected
config = json.loads(payload['config.example.json'])
assert config['enabled'] is False
assert config['github']['repository'] == 'YOUR_ORG/YOUR_REPO'
assert config['cloud']['project_id'] == 0
`], {cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8'});
	assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}\nRebuild with python3 scripts/package-ephemeral-ci.py`);
});
