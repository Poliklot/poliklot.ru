"""Exercise actual API admission and reader code with in-memory responses."""
import base64
import copy
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from clients import Cloud, GitHub, Refused, Storage
from test_controller import config
import worker


class AdmissionTest(unittest.TestCase):
    def setUp(self):
        self.c = config(Path('/unused'))['github']
        self.entry = (self.c['repository'] + '/.github/workflows/auto-build.yml@' + self.c['reusable_sha']).encode()
        self.build = b'approved reusable workflow'
        self.c['workflow_sha256'] = {'.github/workflows/auto-ci.yml': hashlib.sha256(self.entry).hexdigest(),
                                    '.github/workflows/auto-build.yml': hashlib.sha256(self.build).hexdigest()}
        self.run = {'id': 1, 'run_attempt': 1, 'head_sha': 'a' * 40, 'status': 'queued',
            'event': 'push', 'path': '.github/workflows/auto-ci.yml', 'head_branch': 'dev',
            'repository': {'id': 3, 'full_name': 'example/project'}, 'head_repository': {'id': 3}}
        self.job = {'id': 2, 'run_id': 1, 'head_sha': 'a' * 40, 'status': 'queued',
                    'runner_id': None, 'labels': ['auto-ci-1-1']}
        self.gh = GitHub(self.c)
        self.gh.pages = lambda path, key: [self.run] if key == 'workflow_runs' else [self.job]
        self.gh.api = lambda *args: copy.deepcopy(self.run)
        self.gh.content = lambda path, sha: self.entry if path.endswith('auto-ci.yml') else self.build

    def test_exact_queued_job_is_admitted(self):
        self.assertEqual(self.gh.queued()[0]['label'], 'auto-ci-1-1')

    def test_foreign_fork_wrong_label_and_changed_workflow_are_denied(self):
        self.run['head_repository']['id'] = 999
        with self.assertRaises(Refused):
            self.gh.queued()
        self.run['head_repository']['id'] = 3
        self.job['labels'] = ['self-hosted']
        with self.assertRaises(Refused):
            self.gh.queued()
        self.job['labels'] = ['auto-ci-1-1']
        self.entry += b' changed'
        with self.assertRaises(Refused):
            self.gh.queued()

    def test_untrusted_event_is_ignored_and_multiple_jobs_are_rejected(self):
        self.run['event'] = 'pull_request'
        self.assertEqual(self.gh.queued(), [])
        self.run['event'] = 'push'
        self.gh.pages = lambda path, key: [self.run] if key == 'workflow_runs' else [self.job, self.job]
        with self.assertRaises(Refused):
            self.gh.queued()

    def test_cancel_does_not_touch_newer_attempt(self):
        calls = []
        self.gh.api = lambda path, method='GET': calls.append((path, method)) or dict(self.run, run_attempt=2)
        self.gh.cancel({'repo': 'example/project', 'run_id': 1, 'attempt': 1})
        self.assertEqual([method for _, method in calls], ['GET'])

    def test_partial_cloud_inventory_is_not_accepted(self):
        cloud = Cloud({})
        cloud.api = lambda path: {'servers': [], 'meta': {'total': 2}}
        with self.assertRaises(Refused):
            cloud.inventory()


class NetworkTest(unittest.TestCase):
    def test_preflight_requires_the_selected_network_in_the_selected_zone(self):
        c = config(Path('/unused'))
        cloud = Cloud(c['cloud'])
        cloud.api = lambda path, **kw: ({'server_presets': [{'id': 20, 'price': 900}], 'meta': {'total': 1}}
            if path == '/presets/servers' else {'finances': {'currency': 'RUB', 'balance': 10000}})
        network = {'id': c['cloud']['network_id'], 'availability_zone': 'test-1'}
        with patch('clients.secret', return_value='test-token'), patch('clients.request', return_value={'vpc': network}) as get:
            self.assertGreater(cloud.preflight(c['limits']), 0)
            self.assertEqual(get.call_args.args[:2], ('https://api.timeweb.cloud/api/v2', '/vpcs/' + network['id']))
            network['availability_zone'] = 'another-zone'
            with self.assertRaises(Refused):
                cloud.preflight(c['limits'])


class S3Fixture:
    def __init__(self, lease):
        self.archive = b'actual saved build bytes'
        marker = {'schema': 1, 'complete': True, 'bytes': len(self.archive),
            'sha256': hashlib.sha256(self.archive).hexdigest(),
            'identity': {k: lease[k] for k in ('repo', 'run_id', 'attempt', 'job_id', 'sha')}}
        self.marker = json.dumps(marker).encode()
        self.gets, self.heads = [], 0
        self.change_after_read = False

    def head_object(self, **kwargs):
        self.heads += 1
        data = self.marker if kwargs['Key'].endswith('delivery.json') else self.archive
        tag = 'changed' if self.change_after_read and self.heads >= 3 else hashlib.md5(data).hexdigest()
        return {'ContentLength': len(data), 'ETag': '"' + tag + '"', 'VersionId': 'null'}

    def get_object(self, **kwargs):
        self.gets.append(kwargs)
        assert kwargs['IfMatch']
        return {'Body': io.BytesIO(self.marker if kwargs['Key'].endswith('delivery.json') else self.archive)}


class StorageTest(unittest.TestCase):
    def setUp(self):
        self.lease = {'name': 'ci-test', 'repo': 'example/project', 'run_id': 1, 'attempt': 1, 'job_id': 2,
            'sha': 'a' * 40, 'bucket': 'example-ci-bucket', 'prefix': 'ephemeral-ci/ci-test', 'max_bytes': 1000}
        self.fake = S3Fixture(self.lease)
        self.s3 = Storage({})
        self.s3.client = lambda: self.fake
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def test_actual_bytes_are_saved_without_extraction_and_null_version_is_supported(self):
        value = self.s3.readback(self.lease, self.root)
        self.assertEqual(value['bytes'], len(self.fake.archive))
        self.assertEqual((self.root / 'ci-test.tar.gz').read_bytes(), self.fake.archive)
        self.assertTrue(all('IfMatch' in x for x in self.fake.gets))

    def test_wrong_source_hash_size_or_changed_objects_are_rejected(self):
        original = self.fake.marker
        for key, value in [('sha256', 'b' * 64), ('bytes', 1), ('complete', False), ('identity', {})]:
            marker = json.loads(original)
            marker[key] = value
            self.fake.marker = json.dumps(marker).encode()
            with self.assertRaises(Refused):
                self.s3.readback(self.lease, self.root)
            self.assertFalse((self.root / 'ci-test.tar.gz').exists())
        self.fake.marker = original
        self.fake.heads, self.fake.change_after_read = 0, True
        with self.assertRaises(Refused):
            self.s3.readback(self.lease, self.root)
        self.assertFalse(list(self.root.glob('*.partial')))

    def test_worker_never_publishes_marker_after_failed_archive_upload(self):
        out = self.root / 'out'
        out.mkdir()
        (out / 'hello').write_text('build')
        c = dict(self.lease, uploads={'result.tar.gz': 'archive', 'delivery.json': 'marker'})
        with patch.object(worker, 'check'), patch.object(worker, 'upload', side_effect=RuntimeError('failed')) as send:
            with self.assertRaises(RuntimeError):
                worker.publish(c, out)
        self.assertEqual(send.call_count, 1)
        self.assertEqual(send.call_args[0][0], 'archive')


if __name__ == '__main__':
    unittest.main()
