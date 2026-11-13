#!/usr/bin/env python3
"""Render the caller workflow and print its hashes; no Git, cloud or account writes."""
import argparse
import hashlib
from pathlib import Path
import re

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--repository', required=True)
parser.add_argument('--reusable-sha', required=True)
args = parser.parse_args()
if not re.fullmatch('[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', args.repository):
    parser.error('Expected owner/repository')
if not re.fullmatch('[a-f0-9]{40}', args.reusable_sha):
    parser.error('Expected the full commit SHA containing auto-build.yml')
root = Path(__file__).resolve().parent / 'repository'
entry = root / '.github/workflows/auto-ci.yml'
text = entry.read_text()
if 'YOUR_ORG/YOUR_REPO' not in text or 'REUSABLE_SHA' not in text:
    parser.error('Caller already rendered; take a fresh copy of the kit to change the pin')
entry.write_text(text.replace('YOUR_ORG/YOUR_REPO', args.repository).replace('REUSABLE_SHA', args.reusable_sha))
for name in ('auto-ci.yml', 'auto-build.yml'):
    path = '.github/workflows/' + name
    print(path, hashlib.sha256((root / path).read_bytes()).hexdigest())
