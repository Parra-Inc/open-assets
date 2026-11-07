# Drift fixture

A tiny localized project with a committed `assets.lock`, used by this repo's
CI to exercise the shared drift workflow (`.github/workflows/drift.yml`).
`exports/` is gitignored, as in most projects, so `check` runs against the
lock alone. Regenerate the lock with `node ../../bin/open-assets.mjs render .`
after changing anything here.
