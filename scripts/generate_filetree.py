#!/usr/bin/env python3
"""
generate_filetree.py

Lightweight file-tree generator that writes filetree.json at the repository root.
No third-party dependencies required. Supports a simple --watch mode which polls
the filesystem every N seconds and rewrites the JSON when changes are detected.

Usage:
  python3 scripts/generate_filetree.py        # generate once
  python3 scripts/generate_filetree.py --watch  # poll and update every 2.5s
"""
import os
import sys
import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'filetree.json'
EXCLUDE = {'.git', 'node_modules', OUT.name}

def should_skip(name):
    return name in EXCLUDE

def walk_dir(p: Path):
    node = {
        'name': p.name if p != ROOT else '.',
        'path': str(p.relative_to(ROOT)),
        'type': 'directory',
        'children': []
    }
    try:
        with os.scandir(p) as it:
            entries = list(it)
    except PermissionError:
        return node
    for ent in sorted(entries, key=lambda e: (not e.is_dir(), e.name.lower())):
        if should_skip(ent.name):
            continue
        full = p / ent.name
        if ent.is_dir(follow_symlinks=False):
            node['children'].append(walk_dir(full))
        elif ent.is_file(follow_symlinks=False):
            try:
                st = full.stat()
                node['children'].append({
                    'name': ent.name,
                    'path': str(full.relative_to(ROOT)),
                    'type': 'file',
                    'size': st.st_size,
                    'mtime': int(st.st_mtime * 1000)
                })
            except Exception:
                # skip unreadable files
                pass
    return node

def write_tree():
    tree = walk_dir(ROOT)
    # determine incremental build number (start at 1)
    new_build = 1
    try:
        if OUT.exists():
            prev = json.loads(OUT.read_text(encoding='utf-8'))
            prev_build = prev.get('build') if isinstance(prev, dict) else None
            if isinstance(prev_build, int):
                new_build = prev_build + 1
    except Exception:
        new_build = 1
    # add a build marker so viewers can display a build number and time
    tree['build'] = new_build
    tree['buildTime'] = int(time.time() * 1000)
    try:
        OUT.write_text(json.dumps(tree, indent=2), encoding='utf-8')
        print('Wrote', OUT)
    except Exception as e:
        print('Failed to write', OUT, e)

def watch(poll=2.5):
    last = None
    try:
        while True:
            write_tree()
            time.sleep(poll)
    except KeyboardInterrupt:
        print('\nStopping watch.')

def main():
    args = sys.argv[1:]
    if '--watch' in args:
        print('Generating and watching for changes (polling mode, no third-party deps).')
        watch()
    else:
        write_tree()

if __name__ == '__main__':
    main()
