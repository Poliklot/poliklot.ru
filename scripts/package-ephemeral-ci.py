"""Deterministic public kit from an explicit allowlist, never a runtime directory."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'examples/ephemeral-ci'
DEST = ROOT / 'public/articles/ephemeral-github-actions-part-2/kit'
files = json.loads((SOURCE / 'files.json').read_text()) + ['files.json']
config = json.loads((SOURCE / 'config.example.json').read_text())
assert config['enabled'] is False and config['cloud']['project_id'] == 0
assert config['github']['repository'] == 'YOUR_ORG/YOUR_REPO'
payload = {}
for name in files:
    path = Path(name)
    assert not path.is_absolute() and '..' not in path.parts and not (SOURCE / path).is_symlink()
    assert path.suffix not in ('.pem', '.key', '.token', '.sqlite3')
    payload[name] = (SOURCE / path).read_bytes()
checksums = ''.join(hashlib.sha256(data).hexdigest() + '  ' + name + '\n' for name, data in sorted(payload.items()))
payload['SHA256SUMS'] = checksums.encode()
DEST.mkdir(parents=True, exist_ok=True)
for name, data in payload.items():
    target = DEST / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
archive = DEST / 'ephemeral-ci-kit-v1.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as out:
    for name, data in sorted(payload.items()):
        info = zipfile.ZipInfo('ephemeral-ci/' + name, date_time=(2026, 11, 13, 0, 0, 0))
        info.external_attr = (0o100644 << 16)
        info.compress_type = zipfile.ZIP_DEFLATED
        out.writestr(info, data)
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(DEST / (archive.name + '.sha256')).write_text(digest + '  ' + archive.name + '\n')
print(f'{archive.name} — {len(payload)} files, {archive.stat().st_size} bytes, SHA-256 {digest}')
