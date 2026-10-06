# open-assets

Screenshots, icons, and marketing assets, made a breeze in your git repo.

## Before you push

Run `npm run check`. It runs, in the order CI runs them: build (no-op, no build
step defined) and the Jest test suite. Takes about 4 seconds. Assumes deps are
already installed (`npm install`).

If you change what CI runs, update check to match.
