#!/usr/bin/env python3
"""One-shot dispatcher, independent cleanup and S3 reader for one trusted repo."""
import argparse
import base64
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import re
import sqlite3
import subprocess
import sys
import time
import uuid

# Import only adjacent, administrator-owned modules, including under python -I.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from clients import Cloud, GitHub, Storage, Refused, money, require, secret


def validate(c):
    g, cloud, limits, s3 = (c[k] for k in ('github', 'cloud', 'limits', 's3'))
    require(type(c['enabled']) is bool and Path(c['state_dir']).is_absolute(), 'Invalid base config')
    require(re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', g['repository'])
            and 'YOUR_' not in g['repository'], 'Set your repository')
    require(g['branch'] == 'dev', 'This template admits only dev pushes')
    require(g['app_id'].isdigit() and g['installation_id'].isdigit(), 'Set GitHub App IDs')
    require(type(g['repository_id']) is int and g['repository_id'] > 0, 'Set repository ID')
    require(re.fullmatch('[a-f0-9]{40}', g['reusable_sha']), 'Set reusable commit SHA')
    require(set(g['workflow_sha256']) == {'.github/workflows/auto-ci.yml', '.github/workflows/auto-build.yml'}
            and all(re.fullmatch('[a-f0-9]{64}', d) for d in g['workflow_sha256'].values()), 'Set workflow hashes')
    for key in ('project_id', 'preset_id', 'os_id'):
        require(type(cloud[key]) is int and cloud[key] > 0, 'Set cloud IDs')
    require(re.fullmatch('[a-z0-9-]+', cloud['availability_zone']), 'Set availability zone')
    require(re.fullmatch(r'network-[a-f0-9]{32}', cloud['network_id']), 'Set dedicated CI network ID')
    require(re.fullmatch(r'\d+\.\d+\.\d+', c['runner']['version'])
            and re.fullmatch('[a-f0-9]{64}', c['runner']['sha256']), 'Invalid runner pin')
    require(s3['endpoint'] == 'https://s3.twcstorage.ru' and s3['region'] == 'ru-1'
            and re.fullmatch('[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]', s3['bucket']), 'Set Timeweb S3 bucket')
    require(type(s3['max_artifact_bytes']) is int and 0 < s3['max_artifact_bytes'] <= 2_000_000_000
            and s3['capacity_bytes'] > s3['max_artifact_bytes'], 'Invalid storage bounds')
    require(type(limits['lease_seconds']) is int and 1800 <= limits['lease_seconds'] <= 14400
            and 60 <= limits['cleanup_margin_seconds'] < limits['lease_seconds'], 'Invalid lease window')
    require(type(limits['max_leases_total']) is int and 1 <= limits['max_leases_total'] <= 100, 'Invalid lease count')
    for key in ('reserve_rub', 'budget_rub', 'minimum_balance_rub', 'ipv4_monthly_rub',
                'storage_monthly_rub', 'egress_rub_per_gb', 'cleanup_reserve_rub'):
        require(money(limits[key]) > 0, 'Fill every approved financial bound')
    until = datetime.fromisoformat(limits['approved_until'].replace('Z', '+00:00'))
    require(until.tzinfo is not None and time.time() < until.timestamp() <= time.time() + 7 * 86400,
            'Refresh the dated price approval, valid for at most seven days')
    return c


class State:
    def __init__(self, root):
        self.root = Path(root)
        self.root.mkdir(parents=True, mode=0o700, exist_ok=True)
        require(not self.root.is_symlink() and self.root.stat().st_uid == os.geteuid()
                and not self.root.stat().st_mode & 0o077, 'State directory must be private')
        self.db = sqlite3.connect(self.root / 'state.sqlite3', timeout=5)
        self.db.execute('PRAGMA synchronous=FULL')
        self.db.executescript('''
            CREATE TABLE IF NOT EXISTS leases (
              name TEXT PRIMARY KEY, job_key TEXT UNIQUE NOT NULL,
              closed INTEGER NOT NULL DEFAULT 0, record TEXT NOT NULL);
            CREATE UNIQUE INDEX IF NOT EXISTS one_active_lease ON leases ((1)) WHERE closed=0;
            CREATE TABLE IF NOT EXISTS heartbeat (id INTEGER PRIMARY KEY CHECK(id=1), at REAL NOT NULL);
        ''')

    def all(self):
        return [json.loads(row[0]) for row in self.db.execute('SELECT record FROM leases ORDER BY rowid')]

    def save(self, lease):
        self.db.execute('UPDATE leases SET record=?,closed=? WHERE name=?',
            (json.dumps(lease, sort_keys=True), int(lease['closed']), lease['name']))
        self.db.commit()

    def reserve(self, job, c, stamp):
        limits = c['limits']
        self.db.execute('BEGIN IMMEDIATE')
        try:
            rows = self.all()
            require(not any(not x['closed'] for x in rows), 'An existing lease still owns the slot')
            require(len(rows) < limits['max_leases_total'], 'Maximum total leases reached')
            require(sum((money(x['reserve_rub']) for x in rows), money('0')) + money(limits['reserve_rub'])
                    <= money(limits['budget_rub']), 'Reservation budget exhausted')
            name = 'ci-' + uuid.uuid4().hex
            lease = dict(job, name=name, created=stamp, deadline=stamp + limits['lease_seconds'],
                cleanup_at=stamp + limits['lease_seconds'] - limits['cleanup_margin_seconds'],
                reserve_rub=limits['reserve_rub'], project_id=c['cloud']['project_id'],
                zone=c['cloud']['availability_zone'], server_id=None, ips={},
                phase='reserved', closed=False, conclusion=None, verified=None,
                bucket=c['s3']['bucket'], prefix='ephemeral-ci/' + name,
                max_bytes=c['s3']['max_artifact_bytes'], close_requested=False, absent_since=None)
            key = f"{job['repo']}:{job['job_id']}"
            self.db.execute('INSERT INTO leases VALUES(?,?,0,?)', (name, key, json.dumps(lease)))
            self.db.commit()
            return lease
        except Exception:
            self.db.rollback()
            raise

    def beat(self, stamp):
        self.db.execute('INSERT OR REPLACE INTO heartbeat VALUES(1,?)', (stamp,))
        self.db.commit()

    def cleanup_recent(self, stamp):
        row = self.db.execute('SELECT at FROM heartbeat WHERE id=1').fetchone()
        return row is not None and 0 <= stamp - row[0] <= 60


@contextmanager
def lock(root, wait=False):
    # Shared only for a bounded tick, never for the lifetime of the build.
    with (Path(root) / 'controller.lock').open('a') as stream:
        fcntl.flock(stream, fcntl.LOCK_EX | (0 if wait else fcntl.LOCK_NB))
        yield


def cloud_init(c, lease, registration, uploads):
    here = Path(__file__).resolve().parent
    worker = {k: lease[k] for k in ('repo', 'run_id', 'attempt', 'job_id', 'sha', 'branch', 'label', 'name', 'cleanup_at', 'max_bytes')}
    worker.update(uploads=uploads, runner=c['runner'])
    files = []
    for name, content, mode, owner in (
        ('worker.py', (here / 'worker.py').read_text(), '0555', 'root:root'),
        ('bootstrap.py', (here / 'bootstrap.py').read_text(), '0500', 'root:root'),
        ('worker.json', json.dumps(worker), '0640', 'root:ci-runner'),
        ('registration', registration, '0600', 'root:root'),
        ('pre-job.sh', '#!/bin/sh\nexec /usr/bin/python3 /opt/ci/worker.py check\n', '0555', 'root:root'),
    ):
        # ci-runner is created after the early write_files stage on Ubuntu.
        files.append({'path': '/opt/ci/' + name, 'owner': owner, 'permissions': mode, 'defer': True,
                      'encoding': 'b64', 'content': base64.b64encode(content.encode()).decode()})
    return '#cloud-config\n' + json.dumps({
        'ssh_pwauth': False, 'disable_root': True,
        'users': [{'name': 'ci-runner', 'shell': '/bin/bash', 'lock_passwd': True, 'sudo': None}],
        'package_update': True, 'packages': ['ca-certificates', 'curl', 'git', 'python3', 'nftables'],
        'write_files': files, 'runcmd': [['python3', '/opt/ci/bootstrap.py']],
    })


class Controller:
    def __init__(self, c, state, github, cloud, storage, clock=time.time):
        self.c, self.state, self.gh, self.cloud, self.s3, self.clock = c, state, github, cloud, storage, clock

    def preflight(self):
        validate(self.c)
        require(self.c['s3']['reader_file'] != self.c['s3']['writer_file'], 'Separate S3 credentials required')
        estimate = self.cloud.preflight(self.c['limits'])
        # Two reads' worth of egress, plus a fixed, dated storage/IPv4 allowance.
        estimate += money(self.c['limits']['egress_rub_per_gb']) * self.c['s3']['max_artifact_bytes'] * 2 / 1_000_000_000
        require(estimate <= money(self.c['limits']['reserve_rub']), 'Full estimate exceeds lease reserve')
        self.s3.capacity()
        repo = self.gh.api('/repos/' + self.c['github']['repository'])
        require(repo['id'] == self.c['github']['repository_id'], 'Repository ID differs')

    def dispatch(self):
        if not self.c['enabled'] or (self.state.root / 'STOP').exists():
            return
        now = self.clock()
        active = [x for x in self.state.all() if not x['closed']]
        require(self.state.cleanup_recent(now), 'Cleanup heartbeat is stale')
        if not active:
            self.preflight()
            used = {(x['repo'], x['job_id']) for x in self.state.all()}
            jobs = [x for x in self.gh.queued() if (x['repo'], x['job_id']) not in used]
            if jobs:
                self.state.reserve(jobs[0], self.c, now)
            return
        lease = active[0]
        if lease['phase'] != 'acknowledged' or lease['close_requested']:
            return
        self.preflight()
        require(now < lease['cleanup_at'] - 300, 'Insufficient remaining lease time')
        job = self.gh.job(lease)
        if job['status'] != 'queued':
            lease['close_requested'] = True
            self.state.save(lease)
            return
        require(job.get('labels') == [lease['label']], 'Queued job label changed')
        registration = self.gh.api(f"/repos/{lease['repo']}/actions/runners/registration-token", 'POST')['token']
        now = self.clock()
        require(self.state.cleanup_recent(now) and now < lease['cleanup_at'] - 300,
                'Cleanup heartbeat or remaining lease expired during preflight')
        uploads = self.s3.uploads(lease, int(lease['cleanup_at'] - now))
        body = {'name': lease['name'], 'hostname': lease['name'],
            'comment': 'ephemeral-ci ' + lease['name'], 'project_id': lease['project_id'],
            'availability_zone': lease['zone'], 'preset_id': self.c['cloud']['preset_id'],
            'os_id': self.c['cloud']['os_id'], 'is_root_password_required': True,
            'is_ddos_guard': False,
            'network': {'id': self.c['cloud']['network_id'], 'floating_ip': 'create_ip'},
            'cloud_init': cloud_init(self.c, lease, registration, uploads)}
        # Commit before the only paid POST. No retry can cross this transition.
        lease['phase'] = 'create_sent'
        self.state.save(lease)
        server = self.cloud.api('/servers', 'POST', body)['server']
        self.owned(lease, server)
        lease.update(server_id=server['id'], phase='running')
        self.state.save(lease)

    @staticmethod
    def owned(lease, server):
        require(type(server.get('id')) is int and server['id'] > 0 and server.get('name') == lease['name']
                and server.get('comment') == 'ephemeral-ci ' + lease['name']
                and server.get('project_id') == lease['project_id']
                and (lease['server_id'] is None or server['id'] == lease['server_id']),
                'Cloud resource identity differs; no deletion')

    def cleanup(self):
        now = self.clock()
        self.state.beat(now)
        for lease in [x for x in self.state.all() if not x['closed']]:
            if lease['phase'] in ('reserved', 'acknowledged'):
                if lease['close_requested'] or now >= lease['cleanup_at']:
                    lease.update(closed=True, phase='closed', conclusion='not_started')
                else:
                    lease['phase'] = 'acknowledged'
                self.state.save(lease)
                continue
            servers, ips = self.cloud.inventory()
            candidates = [s for s in servers if s['name'] == lease['name'] or s['id'] == lease['server_id']]
            require(len(candidates) <= 1, 'Ambiguous resource identity')
            if candidates:
                server = candidates[0]
                self.owned(lease, server)
                lease['server_id'] = server['id']
                attached = [ip for ip in ips if str(ip.get('resource_id')) == str(server['id'])
                            and ip.get('resource_type') == 'server']
                require(len(attached) <= 1, 'Unexpected additional IP; no deletion')
                for ip in attached:
                    require(str(uuid.UUID(str(ip['id']))) == str(ip['id']), 'Invalid IPv4 resource ID')
                    require(ip.get('ip') and ip.get('availability_zone') == lease['zone'], 'IP identity incomplete')
                    identity = {str(ip['id']): {'ip': ip['ip'], 'zone': ip['availability_zone']}}
                    require(not lease['ips'] or lease['ips'] == identity, 'Recorded IPv4 identity changed')
                    lease['ips'] = identity
                self.state.save(lease)  # Capture IP identity before deleting its VM.
            try:
                job = self.gh.job(lease)
                if job['status'] == 'completed':
                    lease['conclusion'] = job.get('conclusion')
                    lease['close_requested'] = True
            except Exception:
                # A GitHub outage must not prevent deadline-driven cloud cleanup.
                pass
            closing = lease['close_requested'] or now >= lease['cleanup_at']
            if not closing:
                self.state.save(lease)
                continue
            lease['phase'] = 'closing'
            self.state.save(lease)
            if lease['server_id'] is None:
                # A lost POST response is not proof that nothing was created.
                raise Refused('Create result remains uncertain; no new POST or automatic release')
            if candidates:
                require(lease['ips'], 'Wait for IPv4 identity before removing the VM')
                self.cloud.delete('/servers/' + str(lease['server_id']))
                lease['absent_since'] = None
                self.state.save(lease)
                return
            current = {str(ip['id']): ip for ip in ips}
            remaining_ips = False
            require(lease['ips'], 'Missing recorded IPv4 identity')
            for key, identity in lease['ips'].items():
                ip = current.get(key)
                if ip is None:
                    continue
                require(ip['ip'] == identity['ip'] and ip['availability_zone'] == identity['zone']
                        and (ip['resource_id'] is None or
                             (str(ip['resource_id']) == str(lease['server_id']) and ip['resource_type'] == 'server')),
                        'Recorded IP has been reassigned; no deletion')
                self.cloud.delete('/floating-ips/' + key)
                remaining_ips = True
            try:
                self.gh.cancel(lease)
                runners = self.gh.runners(lease)
                for runner in runners:
                    self.gh.api(f"/repos/{lease['repo']}/actions/runners/{runner['id']}", 'DELETE')
            except Exception:
                lease['absent_since'] = None
                self.state.save(lease)
                raise
            if remaining_ips or runners:
                lease['absent_since'] = None
            elif lease['absent_since'] is None:
                lease['absent_since'] = now
            elif now - lease['absent_since'] >= 30:
                lease.update(closed=True, phase='closed')
            self.state.save(lease)

    def readback(self):
        for lease in self.state.all():
            if lease['verified'] or lease['phase'] in ('reserved', 'acknowledged'):
                continue
            job = self.gh.job(lease)
            if job['status'] != 'completed' or job.get('conclusion') != 'success':
                continue
            lease['verified'] = self.s3.readback(lease, self.state.root / 'results')
            lease['conclusion'] = 'success'
            self.state.save(lease)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['catalog', 'check', 'dispatch', 'cleanup', 'readback', 'status', 'stop', 'resume'])
    parser.add_argument('--config', default='/etc/ephemeral-ci/config.json')
    args = parser.parse_args()
    os.umask(0o077)
    c = json.loads(secret(args.config))
    state = State(c['state_dir'])
    gh, cloud, storage = GitHub(c['github']), Cloud(c['cloud']), Storage(c['s3'])
    control = Controller(c, state, gh, cloud, storage)
    # Timers may skip a busy tick; an operator command must actually run.
    with lock(state.root, wait=args.command not in ('dispatch', 'cleanup', 'readback')):
        if args.command == 'catalog':
            repo = gh.api('/repos/' + c['github']['repository'])
            print(json.dumps({'repository_id': repo['id'], 'presets': cloud.api('/presets/servers'),
                             'operating_systems': cloud.api('/os/servers')}, ensure_ascii=False, indent=2))
        elif args.command == 'check':
            control.preflight()
            print('CHECK_OK — configuration, identity, balance, tariff and storage; no VPS created')
        elif args.command == 'stop':
            (state.root / 'STOP').touch(mode=0o600)
            for lease in state.all():
                if not lease['closed']:
                    lease['close_requested'] = True
                    state.save(lease)
            print('New admissions stopped; cleanup remains enabled')
        elif args.command == 'resume':
            validate(c)
            require(not any(not x['closed'] for x in state.all()), 'Close existing leases before resuming')
            (state.root / 'STOP').unlink(missing_ok=True)
        elif args.command == 'status':
            print(json.dumps([{
                'name': x['name'], 'phase': x['phase'], 'run_id': x['run_id'], 'attempt': x['attempt'],
                'conclusion': x['conclusion'], 'closed': x['closed'], 'readback': bool(x['verified']),
                'accepted': x['closed'] and bool(x['verified']) and x['conclusion'] == 'success',
                'cleanup_overdue': not x['closed'] and time.time() > x['deadline'],
                'deadline_utc': datetime.fromtimestamp(x['deadline'], timezone.utc).isoformat(),
            } for x in state.all()], indent=2))
        else:
            if args.command == 'dispatch' and c['enabled']:
                for operation in ('is-active', 'is-enabled'):
                    result = subprocess.run(['systemctl', operation, '--quiet', 'ephemeral-ci-cleanup.timer'],
                                            capture_output=True, timeout=5)
                    require(result.returncode == 0, 'Cleanup timer must be active and enabled')
            getattr(control, args.command)()


if __name__ == '__main__':
    try:
        main()
    except BlockingIOError:
        sys.exit(0)  # Another bounded tick owns the lock; the next timer retries.
    except Exception as error:
        # Do not leak SDK response bodies, tokens, signed URLs or private keys.
        print(str(error) if isinstance(error, Refused) else type(error).__name__, file=sys.stderr)
        sys.exit(1)
