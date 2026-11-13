"""A complete, dependency-free first build. Replace it with your project later."""
import os
from pathlib import Path
import unittest


def render():
    return '<!doctype html><html lang="ru"><meta charset="utf-8"><title>CI</title><h1>Сборка готова</h1></html>\n'


class TestBuild(unittest.TestCase):
    def test_output(self):
        self.assertIn('Сборка готова', render())
        # A committed file lets the reader reproduce the failure path.
        self.assertFalse(Path('FAIL_DEMO').exists(), 'Intentional test failure')


if __name__ == '__main__':
    out = Path('out')
    out.mkdir(exist_ok=True)
    (out / 'index.html').write_text(render(), encoding='utf-8')
    (out / 'source.txt').write_text(os.environ['GITHUB_SHA'] + '\n')
