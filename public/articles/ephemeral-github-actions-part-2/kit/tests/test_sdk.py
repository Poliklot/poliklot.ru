"""Optional SDK contract test after installing requirements; all HTTP is stubbed."""
import importlib.util
import io
import json
import os
from pathlib import Path
import socket
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from clients import Storage
from test_boundaries import S3Fixture


@unittest.skipUnless(importlib.util.find_spec('boto3'), 'Install requirements.txt for the SDK contract check')
class SDKTest(unittest.TestCase):
    def test_real_sdk_presigns_exact_keys_and_reads_with_if_match(self):
        from botocore.stub import Stubber
        from botocore.response import StreamingBody
        with tempfile.TemporaryDirectory() as d, patch.object(socket.socket, 'connect', side_effect=AssertionError('No network')):
            root = Path(d)
            pair = root / 'credentials.json'
            pair.write_text(json.dumps({'aws_access_key_id': 'test-access', 'aws_secret_access_key': 'test-secret'}))
            pair.chmod(0o600)
            c = {'endpoint': 'https://s3.twcstorage.ru', 'region': 'ru-1', 'reader_file': str(pair), 'writer_file': str(pair)}
            storage = Storage(c)
            lease = {'name': 'ci-test', 'repo': 'example/project', 'run_id': 1, 'attempt': 1, 'job_id': 2,
                'sha': 'a' * 40, 'bucket': 'example-ci-bucket', 'prefix': 'ephemeral-ci/ci-test', 'max_bytes': 1000}
            for name, url in storage.uploads(lease, 60).items():
                parsed = urlsplit(url)
                self.assertEqual(parsed.hostname, 's3.twcstorage.ru')
                self.assertEqual(parsed.path, '/example-ci-bucket/ephemeral-ci/ci-test/' + name)
                self.assertEqual(parse_qs(parsed.query)['X-Amz-Expires'], ['60'])
            client = storage.client()
            storage.client = lambda: client
            fixture = S3Fixture(lease)
            params = lambda name: {'Bucket': lease['bucket'], 'Key': lease['prefix'] + '/' + name}
            marker = fixture.head_object(Key='delivery.json')
            archive = fixture.head_object(Key='result.tar.gz')
            with Stubber(client) as stub:
                stub.add_response('head_object', marker, params('delivery.json'))
                stub.add_response('get_object', {'Body': StreamingBody(io.BytesIO(fixture.marker), len(fixture.marker))},
                                  dict(params('delivery.json'), IfMatch=marker['ETag']))
                stub.add_response('head_object', archive, params('result.tar.gz'))
                stub.add_response('get_object', {'Body': StreamingBody(io.BytesIO(fixture.archive), len(fixture.archive))},
                                  dict(params('result.tar.gz'), IfMatch=archive['ETag']))
                stub.add_response('head_object', marker, params('delivery.json'))
                stub.add_response('head_object', archive, params('result.tar.gz'))
                result = storage.readback(lease, root / 'results')
                self.assertEqual(result['bytes'], len(fixture.archive))
                stub.assert_no_pending_responses()


if __name__ == '__main__':
    unittest.main()
