Revamp4 — Advanced Windows-like Start UI

This folder contains a more advanced, experimental re-creation of a Windows Start-like UI.

Files
- index.html — main demo page with groups, live tiles, app drawer, context menu, and settings pane.
- metro_revamp.css — styles for the revamp4 UI (responsive, animations, live tiles).
- metro_revamp.js — advanced JS: live tile simulation, app drawer population, drag/drop, keyboard navigation, context menu, settings wiring.

Revamp4 — File-tree viewer (retro 2000s redesign)

This folder now contains a retro-styled file-tree viewer that displays the project's file structure and updates automatically when the generator script runs.

Files
- index.html — the retro file-tree viewer (fetches /filetree.json periodically).
- metro_revamp.css — styles for the retro viewer.
- metro_revamp.js — client-side JS that fetches /filetree.json and renders the tree.


Generator (no third-party required)

I added a pure-Python generator that requires no third-party packages. It scans the repository and writes `filetree.json` to the project root.

Usage (Python only):

1. Generate once:

	python3 scripts/generate_filetree.py

2. Watch (polling):

	python3 scripts/generate_filetree.py --watch

The watch mode polls the filesystem every ~2.5s and rewrites `filetree.json` when it runs. This avoids third-party packages and works on any device with Python 3.

Alternative Node option (optional)

If you prefer Node-based tooling, the repo also contains `scripts/generate_filetree.js` and `package.json` with `npm run gen-tree` / `npm run watch-tree`. These are optional.

Serve and open viewer

	python3 -m http.server 8000
	http://localhost:8000/ui/metro/revamp4/index.html

Notes
- `filetree.json` is written to the repository root. The viewer polls `/filetree.json` every ~2.5s when auto-refresh is enabled.
- The original revamp4 demo has been moved to `ui/metro/revamp4/tests/` as a backup.

Dev server (optional, local only)

For a local experience that supports publishing guestbook entries and resetting the build, you can run the simple dev server included in `scripts/dev_server.py`.

Run:

	python3 scripts/dev_server.py 8000

This server will serve the repository root and provides these POST endpoints used by the viewer during local development:

- `POST /guestbook` — append a single entry (expects JSON `{name,msg}`)
- `POST /guestbook/upload` — overwrite `guestbook.json` with the provided JSON array (used for moderation/deletes)
- `POST /reset-build` — set `build=1` in `filetree.json`
- `POST /upload-filetree` — overwrite `filetree.json` with raw JSON body

Notes
- The dev server is intentionally minimal and unsecured — use it only in local development.
- If you don't run the dev server, the viewer will fall back to storing guestbook entries in your browser's `localStorage` and will show a 'local' badge next to those entries.

Commit / Tidy summary

This revamp4 branch includes the following user-facing improvements and quality tidy work:

- Retro file-tree viewer that polls `/filetree.json` and renders a collapsible tree.
- Pure-Python generator (`scripts/generate_filetree.py`) to create `filetree.json` without third-party installs.
- Optional local dev server (`scripts/dev_server.py`) providing guestbook and reset endpoints for development.
- UI improvements: search/filter, preview modal for text/images, copy-permalink, theme toggle (retro/modern), keyboard navigation, smooth collapse/expand animation, and guestbook moderation controls.
- Accessibility: ARIA roles/labels on toolbar and tree, keyboard focus handling in the preview modal, and focus outlines for keyboard users.

If you're happy with these changes, a suggested commit message is:

	feat(revamp4): add retro file-tree viewer, search, preview, theme toggle and dev server; improve guestbook sync and accessibility

You can create the commit locally with:

	git add ui/metro/revamp4 scripts/dev_server.py scripts/generate_filetree.py
	git commit -m "feat(revamp4): add retro file-tree viewer, search, preview, theme toggle and dev server; improve guestbook sync and accessibility"

Thanks — the viewer is now a nicer, more accessible local dev tool. If you want, I can prepare a PR or squash these changes into a single commit for you.

Automatically updating filetree.json on GitHub Pages

Because GitHub Pages only serves static files, you can't run the Python generator on the Pages host itself. The usual solution is to run the generator in CI and commit the generated `filetree.json` into the repository so Pages can serve it.

I've added a GitHub Actions workflow at `.github/workflows/generate-filetree.yml` that:

- Runs on pushes to `main`, on a schedule (every 6 hours), and on manual dispatch.
- Runs `python3 scripts/generate_filetree.py` inside the action, and if `filetree.json` changed it commits and pushes the updated file back to the repo.

How to use it:

1. Push your branch to GitHub (the action runs on `main` pushes — you can trigger manually via the Actions tab or modify the `on:` trigger to include your branch).
2. The workflow will regenerate `filetree.json` and push it if different. GitHub Pages will then serve the updated file automatically.

If you'd like, I can also:
- Modify the workflow to run on PR merges only, or to update a `gh-pages` branch instead of `main`.
- Add a workflow that regenerates `filetree.json` when a release is published, or when files in certain folders change.
