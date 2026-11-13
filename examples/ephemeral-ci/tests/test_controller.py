"""Offline lifecycle proof. No credentials, provider calls, VMs or product builds."""
import base64
import copy
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from clients import Cloud, GitHub, Refused, Storage
from controller import Controller, State, cloud_init, lock, validate
import worker


def config(root):
    c = json.loads((ROOT / 'config.example.json').read_text())
    c['enabled'], c['state_dir'] = True, str(root)
    c['github'].update(app_id='1', installation_id='2', repository='example/project', repository_id=3,
        reusable_sha='a' * 40, workflow_sha256={'.github/workflows/auto-ci.yml': 'b' * 64,
                                            '.github/workflows/auto-build.yml': 'c' * 64})
    c['cloud'].update(project_id=10, preset_id=20, os_id=30, availability_zone='test-1',
                      network_id='network-' + 'a' * 32, max_vm_monthly_rub='1000')
    c['s3']['bucket'] = 'example-ci-bucket'
    c['limits'].update(approved_until=datetime.fromtimestamp(time.time() + 86400, timezone.utc).isoformat(),
        ipv4_monthly_rub='100', storage_monthly_rub='79', egress_rub_per_gb='1')
    return c


class FakeGitHub:
    def __init__(self):
        self.info = {'repo': 'example/project', 'repo_id': 3, 'branch': 'dev', 'run_id': 100,
            'attempt': 1, 'job_id': 200, 'sha': 'd' * 40, 'label': 'auto-ci-100-1'}
        self.status, self.conclusion = 'queued', None
        self.offline = False
        self.registered = []
        self.cancelled = []

    def api(self, path, method='GET', data=None):
        if self.offline:
            raise Refused('GitHub unavailable in test')
        if path.endswith('registration-token'):
            return {'token': 'registration-for-test'}
        if method == 'DELETE':
            self.registered.clear()
            return {}
        return {'id': 3}

    def queued(self):
        return [self.info] if self.status == 'queued' else []

    def job(self, lease):
        if self.offline:
            raise Refused('GitHub unavailable in test')
        return {'status': self.status, 'conclusion': self.conclusion, 'labels': [lease['label']]}

    def runners(self, lease):
        if self.offline:
            raise Refused('GitHub unavailable in test')
        return self.registered.copy()

    def cancel(self, lease):
        if self.offline:
            raise Refused('GitHub unavailable in test')
        self.cancelled.append((lease['run_id'], lease['attempt']))


class FakeCloud:
    def __init__(self):
        self.servers, self.ips, self.deletes = [], [], []
        self.creates = 0
        self.lose_create_response = False

    def preflight(self, limits):
        return 100

    def api(self, path, method='GET', data=None):
        assert path == '/servers' and method == 'POST'
        assert data['network'] == {'id': 'network-' + 'a' * 32, 'floating_ip': 'create_ip'}
        self.creates += 1
        server = {k: data[k] for k in ('name', 'comment', 'project_id')}
        server['id'] = 500
        self.servers.append(server)
        self.ips.append({'id': '00000000-0000-4000-8000-000000000001', 'ip': '192.0.2.1',
                         'resource_id': 500, 'resource_type': 'server', 'availability_zone': 'test-1'})
        if self.lose_create_response:
            raise Refused('Simulated lost POST response')
        return {'server': copy.deepcopy(server)}

    def inventory(self):
        return copy.deepcopy(self.servers), copy.deepcopy(self.ips)

    def delete(self, path):
        self.deletes.append(path)
        if path.startswith('/servers/'):
            self.servers.clear()
            for ip in self.ips:
                ip['resource_id'], ip['resource_type'] = None, None
        else:
            self.ips = [ip for ip in self.ips if not path.endswith(ip['id'])]


class FakeStorage:
    def capacity(self):
        pass

    def uploads(self, lease, remaining):
        assert 0 < remaining <= 14400
        return {n: 'https://s3.twcstorage.ru/example/' + n for n in ('result.tar.gz', 'delivery.json')}

    def readback(self, lease, root):
        return {'bytes': 100, 'sha256': 'e' * 64}


class LifecycleTest(unittest.TestCase):
    def setUp(self):
        self.network = patch.object(socket.socket, 'connect', side_effect=AssertionError('Network is forbidden in offline tests'))
        self.network.start()
        self.addCleanup(self.network.stop)
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.c, self.now = config(self.root), time.time()
        self.s = State(self.root)
        self.addCleanup(self.s.db.close)
        self.gh, self.cloud, self.storage = FakeGitHub(), FakeCloud(), FakeStorage()
        self.ctrl = Controller(self.c, self.s, self.gh, self.cloud, self.storage, lambda: self.now)

    def start(self):
        self.ctrl.cleanup()
        self.ctrl.dispatch()
        self.assertEqual(self.cloud.creates, 0)
        self.ctrl.cleanup()
        self.ctrl.dispatch()

    def close(self):
        self.ctrl.cleanup()  # VM deletion, IP identity captured first.
        self.ctrl.cleanup()  # IP and runner deletion.
        self.ctrl.cleanup()  # First complete absence.
        self.now += 30
        self.ctrl.cleanup()  # Second complete absence.

    def test_full_success_and_independent_readback(self):
        self.start()
        self.assertEqual(self.cloud.creates, 1)
        self.gh.status, self.gh.conclusion = 'completed', 'success'
        self.close()
        self.ctrl.readback()
        r = self.s.all()[0]
        self.assertTrue(r['closed'] and r['verified'])
        self.assertEqual(r['conclusion'], 'success')
        self.assertEqual(self.cloud.servers + self.cloud.ips, [])

    def test_failure_and_cancel_close_without_accepted_artifact(self):
        self.start()
        self.gh.status, self.gh.conclusion = 'completed', 'failure'
        self.close()
        self.ctrl.readback()
        self.assertTrue(self.s.all()[0]['closed'])
        self.assertIsNone(self.s.all()[0]['verified'])

    def test_no_create_without_recent_cleanup_and_durable_ack(self):
        with self.assertRaises(Refused):
            self.ctrl.dispatch()
        self.ctrl.cleanup()
        self.ctrl.dispatch()
        self.ctrl.dispatch()
        self.assertEqual(self.cloud.creates, 0)
        self.now += 61
        with self.assertRaises(Refused):
            self.ctrl.dispatch()

    def test_lost_post_response_is_reconciled_and_never_retried(self):
        self.cloud.lose_create_response = True
        with self.assertRaises(Refused):
            self.start()
        self.ctrl.dispatch()
        self.assertEqual(self.cloud.creates, 1)
        self.gh.status, self.gh.conclusion = 'completed', 'cancelled'
        self.close()
        self.assertTrue(self.s.all()[0]['closed'])

    def test_unknown_create_with_no_visible_vm_keeps_slot_and_budget(self):
        self.cloud.lose_create_response = True
        with self.assertRaises(Refused):
            self.start()
        self.cloud.servers.clear()
        self.now = self.s.all()[0]['cleanup_at'] + 1
        with self.assertRaises(Refused):
            self.ctrl.cleanup()
        self.assertFalse(self.s.all()[0]['closed'])
        self.assertEqual(self.cloud.creates, 1)

    def test_github_outage_does_not_stop_deadline_cloud_deletion(self):
        self.start()
        original = self.s.all()[0]['deadline']
        self.now = self.s.all()[0]['cleanup_at'] + 1
        self.gh.offline = True
        self.ctrl.cleanup()
        with self.assertRaises(Refused):
            self.ctrl.cleanup()
        self.assertEqual(self.cloud.servers + self.cloud.ips, [])
        self.assertEqual(self.s.all()[0]['deadline'], original)
        self.assertFalse(self.s.all()[0]['closed'])
        self.gh.offline = False
        self.close()
        self.assertTrue(self.s.all()[0]['closed'])

    def test_changed_vm_or_reassigned_ip_is_not_deleted(self):
        self.start()
        self.gh.status, self.gh.conclusion = 'completed', 'success'
        self.cloud.servers[0]['project_id'] = 999
        with self.assertRaises(Refused):
            self.ctrl.cleanup()
        self.assertEqual(self.cloud.deletes, [])
        self.cloud.servers[0]['project_id'] = 10
        self.ctrl.cleanup()
        self.cloud.ips[0]['resource_id'], self.cloud.ips[0]['resource_type'] = 999, 'server'
        with self.assertRaises(Refused):
            self.ctrl.cleanup()
        self.assertEqual(len(self.cloud.deletes), 1)

    def test_second_absence_is_spaced_and_restart_does_not_reset_clock(self):
        self.start()
        original = self.s.all()[0]['cleanup_at']
        self.gh.status, self.gh.conclusion = 'completed', 'success'
        for _ in range(4):
            self.ctrl.cleanup()
        self.assertFalse(self.s.all()[0]['closed'])
        reloaded = State(self.root)
        self.addCleanup(reloaded.db.close)
        self.ctrl.state = reloaded
        self.assertEqual(reloaded.all()[0]['cleanup_at'], original)
        self.now += 30
        self.ctrl.cleanup()
        self.assertTrue(reloaded.all()[0]['closed'])

    def test_recorded_ipv4_cannot_be_silently_replaced(self):
        self.start()
        self.ctrl.cleanup()
        self.cloud.ips[0]['ip'] = '192.0.2.2'
        with self.assertRaises(Refused):
            self.ctrl.cleanup()
        self.assertEqual(self.cloud.deletes, [])
        self.assertEqual(next(iter(self.s.all()[0]['ips'].values()))['ip'], '192.0.2.1')

    def test_reservations_are_not_refunded_and_duplicate_job_is_not_recreated(self):
        self.start()
        self.gh.status, self.gh.conclusion = 'completed', 'success'
        self.close()
        self.gh.status = 'queued'
        self.ctrl.dispatch()
        self.assertEqual(self.cloud.creates, 1)
        self.gh.info['job_id'] = 201
        with self.assertRaises(Refused):
            self.ctrl.dispatch()

    def test_disabled_dispatch_does_not_disable_cleanup(self):
        self.start()
        self.c['enabled'] = False
        self.ctrl.dispatch()
        self.gh.status, self.gh.conclusion = 'completed', 'cancelled'
        self.close()
        self.assertTrue(self.s.all()[0]['closed'])

    def test_cloud_init_has_no_provider_app_or_s3_long_lived_key(self):
        self.ctrl.cleanup()
        self.ctrl.dispatch()
        text = cloud_init(self.c, self.s.all()[0], 'short-registration', self.storage.uploads({}, 60))
        packet = json.loads(text.split('\n', 1)[1])
        self.assertFalse(packet['ssh_pwauth'])
        self.assertTrue(packet['disable_root'])
        self.assertIsNone(packet['users'][0]['sudo'])
        self.assertTrue(all(item.get('defer') is True for item in packet['write_files']))
        self.assertNotIn('private_key', text)
        self.assertNotIn('aws_secret_access_key', text)
        files = {x['path']: base64.b64decode(x['content']).decode() for x in packet['write_files']}
        self.assertEqual(files['/opt/ci/registration'], 'short-registration')
        self.assertIn('uploads', json.loads(files['/opt/ci/worker.json']))

    def test_incomplete_or_expired_config_cannot_admit(self):
        validate(self.c)
        self.c['limits']['approved_until'] = '2020-01-01T00:00:00Z'
        with self.assertRaises(Refused):
            validate(self.c)


class OperatorTest(unittest.TestCase):
    def test_status_waits_for_busy_tick_instead_of_succeeding_with_no_output(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            settings = root / 'config.json'
            settings.write_text(json.dumps(config(root)))
            settings.chmod(0o600)
            with lock(root):
                process = subprocess.Popen([sys.executable, str(ROOT / 'controller.py'),
                    'status', '--config', str(settings)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                try:
                    time.sleep(0.2)
                    self.assertIsNone(process.poll())
                except BaseException:
                    process.kill()
                    process.communicate()
                    raise
            output, error = process.communicate(timeout=5)
            self.assertEqual((process.returncode, output.strip(), error), (0, '[]', ''))


class WorkerTest(unittest.TestCase):
    def test_pre_job_rejects_wrong_source_and_foreign_attempt(self):
        c = {'repo': 'example/project', 'sha': 'a' * 40, 'run_id': 1, 'attempt': 1,
             'branch': 'dev', 'cleanup_at': time.time() + 60}
        env = {'GITHUB_REPOSITORY': c['repo'], 'GITHUB_SHA': c['sha'], 'GITHUB_RUN_ID': '1',
               'GITHUB_RUN_ATTEMPT': '1', 'GITHUB_REF': 'refs/heads/dev', 'GITHUB_EVENT_NAME': 'push', 'GITHUB_JOB': 'build'}
        worker.check(c, env)
        for key, value in [('GITHUB_SHA', 'b' * 40), ('GITHUB_RUN_ATTEMPT', '2'), ('GITHUB_EVENT_NAME', 'pull_request')]:
            with self.assertRaises(RuntimeError):
                worker.check(c, dict(env, **{key: value}))

    def test_archive_rejects_symlinks_and_enforces_size(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            out = root / 'out'
            out.mkdir()
            (out / 'file').write_text('hello')
            size, digest = worker.pack(out, root / 'result.tgz', 1000)
            self.assertGreater(size, 0)
            self.assertEqual(len(digest), 64)
            with self.assertRaises(RuntimeError):
                worker.pack(out, root / 'result.tgz', 2)
            (out / 'link').symlink_to(root)
            with self.assertRaises(RuntimeError):
                worker.pack(out, root / 'result.tgz', 1000)


if __name__ == '__main__':
    unittest.main()
