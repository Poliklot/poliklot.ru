#!/usr/bin/env python3
"""Runs once through cloud-init on Ubuntu 24.04 x86_64, never on Control."""
import hashlib
import json
import os
from pathlib import Path
import pwd
import subprocess
import tarfile
import time
import urllib.request


def run(args, **kwargs):
    subprocess.run(args, check=True, timeout=600, **kwargs)


def main():
    os.umask(0o077)
    c = json.loads(Path('/opt/ci/worker.json').read_text())
    # All inbound connections are closed. The runner needs outbound HTTPS only.
    rules = '''table inet ci {
      chain input { type filter hook input priority 0; policy drop;
        iifname "lo" accept
        ct state established,related accept
        udp sport 67 udp dport 68 accept
        udp sport 547 udp dport 546 accept
        meta l4proto ipv6-icmp accept
      }
      chain forward { type filter hook forward priority 0; policy drop; }
      chain output { type filter hook output priority 0; policy accept; }
    }'''
    Path('/etc/nftables.conf').write_text(rules)
    run(['nft', '-f', '/etc/nftables.conf'])
    run(['systemctl', 'enable', 'nftables'])
    root = Path('/opt/actions-runner')
    root.mkdir(mode=0o755)
    version = c['runner']['version']
    url = f'https://github.com/actions/runner/releases/download/v{version}/actions-runner-linux-x64-{version}.tar.gz'
    archive = Path('/opt/ci/runner.tar.gz')
    digest, total = hashlib.sha256(), 0
    with urllib.request.urlopen(url, timeout=60) as response, archive.open('wb') as output:
        while block := response.read(1024 * 1024):
            total += len(block)
            if total > 300_000_000:
                raise RuntimeError('Runner archive too large')
            output.write(block)
            digest.update(block)
    if digest.hexdigest() != c['runner']['sha256']:
        raise RuntimeError('Runner checksum differs')
    with tarfile.open(archive) as tar:
        tar.extractall(root, filter='data')
    archive.unlink()
    run([str(root / 'bin/installdependencies.sh')])
    user = pwd.getpwnam('ci-runner')
    for parent, dirs, files in os.walk(root):
        os.chown(parent, user.pw_uid, user.pw_gid)
        for item in dirs + files:
            os.chown(Path(parent) / item, user.pw_uid, user.pw_gid, follow_symlinks=False)
    remaining = int(c['cleanup_at'] - time.time())
    if remaining < 300:
        raise RuntimeError('Original lease window already exhausted')
    token_file = Path('/opt/ci/registration')
    env = dict(os.environ, ACTIONS_RUNNER_INPUT_TOKEN=token_file.read_text().strip())
    try:
        # Capture registration output rather than writing possible credentials to cloud-init logs.
        run(['runuser', '-u', 'ci-runner', '--', './config.sh', '--unattended', '--ephemeral',
            '--disableupdate', '--no-default-labels', '--url', 'https://github.com/' + c['repo'],
            '--name', c['name'], '--labels', c['label'], '--work', '_work'],
            cwd=root, env=env, capture_output=True)
    finally:
        env.pop('ACTIONS_RUNNER_INPUT_TOKEN', None)
        token_file.unlink(missing_ok=True)
    remaining = int(c['cleanup_at'] - time.time())
    if remaining < 60:
        raise RuntimeError('No time left to start the job')
    unit = f'''[Unit]
Description=One-job GitHub runner
After=network-online.target
[Service]
Type=simple
User=ci-runner
Group=ci-runner
WorkingDirectory=/opt/actions-runner
Environment=ACTIONS_RUNNER_HOOK_JOB_STARTED=/opt/ci/pre-job.sh
ExecStart=/opt/actions-runner/run.sh
RuntimeMaxSec={remaining}
TimeoutStopSec=30
KillMode=control-group
Restart=no
UMask=0077
LimitCORE=0
NoNewPrivileges=yes
'''
    Path('/etc/systemd/system/ci-runner.service').write_text(unit)
    run(['systemctl', 'daemon-reload'])
    run(['systemctl', 'start', 'ci-runner.service'])


if __name__ == '__main__':
    main()
