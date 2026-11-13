#!/usr/bin/env python3
"""Pre-job identity check and bounded archive publication; Python standard library."""
import hashlib
import http.client
import json
import os
from pathlib import Path
import sys
import tarfile
import tempfile
import time
from urllib.parse import urlsplit


def check(c, env=os.environ):
    expected = {'GITHUB_REPOSITORY': c['repo'], 'GITHUB_SHA': c['sha'],
        'GITHUB_RUN_ID': str(c['run_id']), 'GITHUB_RUN_ATTEMPT': str(c['attempt']),
        'GITHUB_REF': 'refs/heads/' + c['branch'], 'GITHUB_EVENT_NAME': 'push', 'GITHUB_JOB': 'build'}
    if any(env.get(k) != v for k, v in expected.items()) or time.time() >= c['cleanup_at']:
        raise RuntimeError('Job identity or original lease window differs')


def pack(folder, target, maximum):
    folder = Path(folder)
    if folder.is_symlink() or not folder.is_dir():
        raise RuntimeError('Expected a real output directory')
    files, total = [], 0
    for path in sorted(folder.rglob('*')):
        if path.is_symlink() or not (path.is_dir() or path.is_file()):
            raise RuntimeError('Output contains a link or special file')
        if path.is_file():
            total += path.stat().st_size
            files.append(path)
            if len(files) > 10000 or total > maximum:
                raise RuntimeError('Output exceeds configured bounds')
    if not files:
        raise RuntimeError('No build output')
    with tarfile.open(target, 'w:gz') as tar:
        for path in files:
            tar.add(path, arcname=path.relative_to(folder).as_posix(), recursive=False)
    size = target.stat().st_size
    if size > maximum:
        raise RuntimeError('Compressed archive exceeds configured bound')
    digest = hashlib.sha256()
    with target.open('rb') as data:
        for block in iter(lambda: data.read(1024 * 1024), b''):
            digest.update(block)
    return size, digest.hexdigest()


def upload(url, path):
    destination = urlsplit(url)
    if destination.scheme != 'https' or destination.hostname != 's3.twcstorage.ru' or destination.port not in (None, 443):
        raise RuntimeError('Unexpected upload endpoint')
    connection = http.client.HTTPSConnection(destination.hostname, timeout=60)
    try:
        connection.putrequest('PUT', destination.path + '?' + destination.query)
        connection.putheader('Content-Length', str(path.stat().st_size))
        connection.endheaders()
        with path.open('rb') as data:
            for block in iter(lambda: data.read(1024 * 1024), b''):
                connection.send(block)
        response = connection.getresponse()
        response.read(4096)
        if response.status not in (200, 201, 204):
            raise RuntimeError('S3 upload failed')
    finally:
        connection.close()


def publish(c, folder):
    check(c)
    with tempfile.TemporaryDirectory(prefix='ci-publish-') as temporary:
        root = Path(temporary)
        archive = root / 'result.tar.gz'
        size, digest = pack(folder, archive, c['max_bytes'])
        upload(c['uploads']['result.tar.gz'], archive)
        receipt = {'schema': 1, 'complete': True, 'bytes': size, 'sha256': digest,
            'identity': {k: c[k] for k in ('repo', 'run_id', 'attempt', 'job_id', 'sha')}}
        marker = root / 'delivery.json'
        marker.write_text(json.dumps(receipt, sort_keys=True))
        check(c)
        upload(c['uploads']['delivery.json'], marker)  # Always last, only after a complete archive.
    print('Package uploaded; independent readback is performed on Control')


if __name__ == '__main__':
    try:
        config = json.loads(Path('/opt/ci/worker.json').read_text())
        if sys.argv[1:] == ['check']:
            check(config)
        elif len(sys.argv) == 3 and sys.argv[1] == 'publish':
            publish(config, sys.argv[2])
        else:
            raise RuntimeError('Expected check or publish <output-directory>')
    except Exception:
        print('Worker check/publication failed; no complete delivery accepted', file=sys.stderr)
        sys.exit(1)
