#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
test "$(id -u)" = 0 || { echo 'Run on the dedicated Control server with sudo'; exit 1; }
. /etc/os-release
test "$ID" = ubuntu && test "$VERSION_ID" = 24.04 && test "$(uname -m)" = x86_64
test ! -e /opt/ephemeral-ci/controller.py || { echo 'Already installed; do not overwrite a running controller'; exit 1; }
test ! -e /etc/ephemeral-ci/config.json || { echo 'Existing config must be preserved'; exit 1; }
apt-get update
apt-get install -y python3 python3-venv openssl ca-certificates
install -d -m 755 /opt/ephemeral-ci
install -d -m 700 /etc/ephemeral-ci /var/lib/ephemeral-ci
install -m 644 controller.py clients.py worker.py bootstrap.py requirements.txt /opt/ephemeral-ci/
install -m 600 config.example.json /etc/ephemeral-ci/config.json
python3 -m venv /opt/ephemeral-ci/venv
/opt/ephemeral-ci/venv/bin/pip install --disable-pip-version-check -r /opt/ephemeral-ci/requirements.txt
install -m 644 systemd/* /etc/systemd/system/
systemctl daemon-reload
echo 'Installed. Fill /etc/ephemeral-ci/config.json and credential files. Timers have NOT been started.'
