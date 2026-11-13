"""GitHub, Timeweb and S3 adapters. No implicit cloud-write retries."""
import base64
from decimal import Decimal
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request


class Refused(RuntimeError):
    pass


def require(value, message):
    if not value:
        raise Refused(message)


def money(value):
    require(not isinstance(value, bool), 'Invalid amount')
    result = Decimal(str(value))
    require(result.is_finite() and result >= 0, 'Invalid amount')
    return result


def secret(path):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, 'r') as stream:
        info = os.fstat(stream.fileno())
        require(stat.S_ISREG(info.st_mode) and info.st_uid == os.geteuid()
                and info.st_nlink == 1 and not info.st_mode & 0o077
                and 0 < info.st_size < 65536, 'Unsafe secret/config file')
        value = stream.read().strip()
    require(value, 'Empty secret/config file')
    return value


class ApiError(RuntimeError):
    def __init__(self, status):
        self.status = status
        super().__init__(f'API HTTP {status}')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise Refused('Unexpected API redirect')


def request(base, path, token, method='GET', data=None):
    require(path.startswith('/') and not path.startswith('//'), 'Invalid API path')
    req = urllib.request.Request(base + path,
        data=None if data is None else json.dumps(data).encode(), method=method,
        headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/json',
                 'Content-Type': 'application/json', 'User-Agent': 'ephemeral-ci-example/1'})
    try:
        with urllib.request.build_opener(NoRedirect).open(req, timeout=15) as response:
            raw = response.read(4_000_001)
            require(len(raw) <= 4_000_000, 'API response too large')
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        raise ApiError(error.code) from None
    except urllib.error.URLError:
        raise Refused('API transport unavailable') from None


class GitHub:
    def __init__(self, config):
        self.c = config
        self.token = None

    def api(self, path, method='GET', data=None):
        if self.token is None:
            secret(self.c['private_key'])
            encode = lambda v: base64.urlsafe_b64encode(json.dumps(v, separators=(',', ':')).encode()).rstrip(b'=')
            stamp = int(time.time())
            unsigned = encode({'alg': 'RS256', 'typ': 'JWT'}) + b'.' + encode({
                'iat': stamp - 60, 'exp': stamp + 540, 'iss': self.c['app_id']})
            signature = subprocess.run(['openssl', 'dgst', '-sha256', '-sign', self.c['private_key']],
                input=unsigned, capture_output=True, timeout=10, check=True).stdout
            jwt = (unsigned + b'.' + base64.urlsafe_b64encode(signature).rstrip(b'=')).decode()
            self.token = request('https://api.github.com',
                '/app/installations/' + self.c['installation_id'] + '/access_tokens', jwt, 'POST',
                {'repositories': [self.c['repository'].split('/')[1]]})['token']
        return request('https://api.github.com', path, self.token, method, data)

    def pages(self, path, key):
        result = []
        for page in range(1, 11):
            rows = self.api(path + ('&' if '?' in path else '?') + f'per_page=100&page={page}')[key]
            require(isinstance(rows, list), 'Incomplete GitHub listing')
            result.extend(rows)
            if len(rows) < 100:
                return result
        raise Refused('GitHub listing limit reached')

    def content(self, path, sha):
        v = self.api('/repos/' + self.c['repository'] + '/contents/' + path + '?ref=' + sha)
        require(v.get('type') == 'file' and v.get('encoding') == 'base64'
                and 0 < v.get('size', 0) <= 65536, 'Invalid workflow file')
        return base64.b64decode(v['content'].replace('\n', ''), validate=True)

    def queued(self):
        repo = self.c['repository']
        base = '/repos/' + repo + '/actions'
        found = []
        # Status-filtered searches can lag. Inspect the actual attempt's jobs.
        for r in self.pages(base + '/runs', 'workflow_runs'):
            if (r.get('path') != '.github/workflows/auto-ci.yml'
                    or r.get('head_branch') != self.c['branch']
                    or r.get('event') != 'push' or r.get('status') not in ('queued', 'in_progress')):
                continue
            run = self.api(base + '/runs/' + str(r['id']))
            require(all(type(run.get(k)) is int and run[k] > 0 for k in ('id', 'run_attempt')), 'Invalid run ID')
            if run['run_attempt'] != r['run_attempt'] or run['status'] == 'completed':
                continue
            require(run.get('repository', {}).get('id') == self.c['repository_id']
                    and run.get('head_repository', {}).get('id') == self.c['repository_id']
                    and run['repository']['full_name'] == repo, 'Repository identity differs')
            require(re.fullmatch('[a-f0-9]{40}', run['head_sha']), 'Invalid source SHA')
            jobs = self.pages(base + f"/runs/{run['id']}/attempts/{run['run_attempt']}/jobs", 'jobs')
            require(len(jobs) == 1, 'Workflow must contain exactly one job')
            job = jobs[0]
            require(type(job.get('id')) is int and job['id'] > 0, 'Invalid job ID')
            label = f"auto-ci-{run['id']}-{run['run_attempt']}"
            if job['status'] != 'queued':
                continue
            require(job.get('labels') == [label] and job.get('runner_id') in (None, 0)
                    and job.get('head_sha') == run['head_sha'] and job.get('run_id') == run['id'],
                    'Job identity differs')
            for path, digest in self.c['workflow_sha256'].items():
                require(hashlib.sha256(self.content(path, run['head_sha'])).hexdigest() == digest,
                        'Workflow changed; review and approve its checksum')
            pinned = self.content('.github/workflows/auto-build.yml', self.c['reusable_sha'])
            require(hashlib.sha256(pinned).hexdigest() == self.c['workflow_sha256']['.github/workflows/auto-build.yml'],
                    'Pinned reusable workflow differs')
            entry = self.content('.github/workflows/auto-ci.yml', run['head_sha']).decode()
            require(repo + '/.github/workflows/auto-build.yml@' + self.c['reusable_sha'] in entry,
                    'Reusable workflow pin differs')
            found.append({'repo': repo, 'repo_id': self.c['repository_id'], 'branch': self.c['branch'],
                'run_id': run['id'], 'attempt': run['run_attempt'], 'job_id': job['id'],
                'sha': run['head_sha'], 'label': label})
        return sorted(found, key=lambda v: v['job_id'])

    def job(self, lease):
        job = self.api(f"/repos/{lease['repo']}/actions/jobs/{lease['job_id']}")
        require(job.get('run_id') == lease['run_id'] and job.get('head_sha') == lease['sha'],
                'Recorded job identity differs')
        return job

    def cancel(self, lease):
        base = f"/repos/{lease['repo']}/actions/runs/{lease['run_id']}"
        run = self.api(base)
        # Never cancel a newer rerun that happens to have the same run ID.
        if run['run_attempt'] != lease['attempt'] or run['status'] == 'completed':
            return
        require(run['head_sha'] == lease['sha'] and run['head_branch'] == lease['branch']
                and run['path'] == '.github/workflows/auto-ci.yml', 'Cancel identity differs')
        self.api(base + '/cancel', 'POST')

    def runners(self, lease):
        rows = self.pages(f"/repos/{lease['repo']}/actions/runners", 'runners')
        own = [r for r in rows if r['name'] == lease['name']]
        require(len(own) <= 1, 'Duplicate runner name')
        for r in own:
            require(lease['label'] in [x['name'] for x in r['labels']], 'Runner label differs')
        return own


class Cloud:
    def __init__(self, config):
        self.c = config

    def api(self, path, method='GET', data=None, finance=False):
        require(not finance or (method == 'GET' and path == '/account/finances'), 'Finance is GET-only')
        key = 'finance_token_file' if finance else 'token_file'
        return request('https://api.timeweb.cloud/api/v1', path, secret(self.c[key]), method, data)

    def inventory(self):
        servers = []
        for offset in range(0, 1000, 100):
            page = self.api(f'/servers?limit=100&offset={offset}')
            rows, total = page['servers'], page['meta']['total']
            require(type(total) is int and total <= 1000 and len(rows) <= 100, 'Incomplete server inventory')
            servers.extend(rows)
            if len(servers) == total:
                break
            require(rows and len(servers) < total, 'Invalid inventory continuation')
        else:
            raise Refused('Server inventory too large')
        response = self.api('/floating-ips')
        ips = response['ips']
        require(response['meta']['total'] == len(ips) <= 1000, 'Incomplete IP inventory')
        require(len({s['id'] for s in servers}) == len(servers)
                and len({i['id'] for i in ips}) == len(ips), 'Duplicate inventory identity')
        return servers, ips

    def preflight(self, limits):
        network = request('https://api.timeweb.cloud/api/v2', '/vpcs/' + self.c['network_id'],
                          secret(self.c['token_file']))['vpc']
        require(network['id'] == self.c['network_id']
                and network['availability_zone'] == self.c['availability_zone'],
                'CI network or availability zone differs')
        response = self.api('/presets/servers')
        rows = response['server_presets']
        require(response['meta']['total'] == len(rows), 'Incomplete tariff inventory')
        presets = [x for x in rows if x['id'] == self.c['preset_id']]
        require(len(presets) == 1, 'Unknown preset')
        price = money(presets[0]['price'])
        require(0 < price <= money(self.c['max_vm_monthly_rub']), 'VM tariff exceeds approved ceiling')
        f = self.api('/account/finances', finance=True)['finances']
        require(f['currency'] in ('RUB', 'RUR'), 'Expected RUB account')
        require(money(f['balance']) >= money(limits['minimum_balance_rub']) + money(limits['reserve_rub']),
                'Balance below admission floor')
        hours = Decimal(limits['lease_seconds']) / 3600
        estimate = ((price + money(limits['ipv4_monthly_rub'])) * hours / (28 * 24)
                    + money(limits['storage_monthly_rub']) + money(limits['cleanup_reserve_rub']))
        return estimate

    def delete(self, path):
        try:
            self.api(path, 'DELETE')
        except ApiError as error:
            if error.status != 404:
                raise


class Storage:
    def __init__(self, config):
        self.c = config

    def client(self, writer=False):
        import boto3
        from botocore.config import Config
        pair = json.loads(secret(self.c['writer_file' if writer else 'reader_file']))
        require(set(pair) == {'aws_access_key_id', 'aws_secret_access_key'}, 'Invalid S3 credential keys')
        return boto3.client('s3', endpoint_url=self.c['endpoint'], region_name=self.c['region'], **pair,
            config=Config(signature_version='s3v4', connect_timeout=10, read_timeout=30,
                retries={'total_max_attempts': 1}, s3={'addressing_style': 'path'}))

    def capacity(self):
        reader = json.loads(secret(self.c['reader_file']))
        writer = json.loads(secret(self.c['writer_file']))
        require(reader['aws_access_key_id'] != writer['aws_access_key_id'], 'Reader and writer must be different S3 users')
        client = self.client()
        total = 0
        for number, page in enumerate(client.get_paginator('list_object_versions').paginate(Bucket=self.c['bucket'])):
            require(number < 100, 'Storage inventory too large')
            total += sum(x['Size'] for x in page.get('Versions', []))
            require(total + self.c['max_artifact_bytes'] + 65536 <= self.c['capacity_bytes'],
                    'Insufficient storage capacity')

    def uploads(self, lease, remaining):
        client = self.client(writer=True)
        return {name: client.generate_presigned_url('put_object',
            Params={'Bucket': lease['bucket'], 'Key': lease['prefix'] + '/' + name},
            ExpiresIn=remaining, HttpMethod='PUT') for name in ('result.tar.gz', 'delivery.json')}

    def readback(self, lease, root):
        client = self.client()
        bucket, prefix = lease['bucket'], lease['prefix']
        head = lambda name: client.head_object(Bucket=bucket, Key=prefix + '/' + name)
        same = lambda a, b: all(a.get(k) == b.get(k) for k in ('ETag', 'ContentLength', 'VersionId'))
        marker = head('delivery.json')
        require(0 < marker['ContentLength'] <= 65536, 'Invalid delivery size')
        response = client.get_object(Bucket=bucket, Key=prefix + '/delivery.json', IfMatch=marker['ETag'])
        try:
            value = json.loads(response['Body'].read(65537))
        finally:
            response['Body'].close()
        require(value.get('identity') == {k: lease[k] for k in ('repo', 'run_id', 'attempt', 'job_id', 'sha')}
                and value.get('schema') == 1 and value.get('complete') is True, 'Delivery identity differs')
        require(type(value.get('bytes')) is int and 0 < value['bytes'] <= lease['max_bytes']
                and re.fullmatch('[a-f0-9]{64}', value.get('sha256', '')), 'Invalid artifact bounds')
        archive = head('result.tar.gz')
        require(archive['ContentLength'] == value['bytes'], 'Artifact size differs')
        root.mkdir(mode=0o700, parents=True, exist_ok=True)
        temporary = root / (lease['name'] + '.partial')
        response = client.get_object(Bucket=bucket, Key=prefix + '/result.tar.gz', IfMatch=archive['ETag'])
        digest, size = hashlib.sha256(), 0
        try:
            with temporary.open('wb') as output:
                os.chmod(temporary, 0o600)
                while block := response['Body'].read(1024 * 1024):
                    size += len(block)
                    require(size <= value['bytes'], 'Artifact exceeded declared size')
                    output.write(block)
                    digest.update(block)
                output.flush()
                os.fsync(output.fileno())
            require(size == value['bytes'] and digest.hexdigest() == value['sha256'], 'Artifact hash differs')
            require(same(marker, head('delivery.json')) and same(archive, head('result.tar.gz')),
                    'Objects changed during readback')
            os.replace(temporary, root / (lease['name'] + '.tar.gz'))
        finally:
            response['Body'].close()
            temporary.unlink(missing_ok=True)
        # Never extract or execute an artifact on Control.
        return {'sha256': value['sha256'], 'bytes': size, 'checked_at': time.time()}
