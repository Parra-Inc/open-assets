#!/usr/bin/env bash
set -euo pipefail

# Release script for open-assets
# Usage: ./scripts/release.sh [patch|minor|major]
# Bumps version in package.json, commits, tags, and pushes.

BUMP="${1:-patch}"

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

# Ensure we're on main
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
  echo "Error: must be on main branch (currently on $BRANCH)"
  exit 1
fi

# Ensure working tree is clean
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree is not clean. Commit or stash changes first."
  exit 1
fi

# Ensure we're up to date with remote
git fetch origin main --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [[ "$LOCAL" != "$REMOTE" ]]; then
  echo "Error: local main is not up to date with origin/main. Pull first."
  exit 1
fi

# Read current version
CURRENT=$(node -p "require('./package.json').version")

# Compute next version
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
case "$BUMP" in
  major) NEXT="$((MAJOR + 1)).0.0" ;;
  minor) NEXT="${MAJOR}.$((MINOR + 1)).0" ;;
  patch) NEXT="${MAJOR}.${MINOR}.$((PATCH + 1))" ;;
esac

echo "Releasing v${NEXT} (was v${CURRENT})"
echo ""

# Bump version in package.json (no git ops from npm)
npm version "$NEXT" --no-git-tag-version --quiet

# Commit and tag
git add package.json
git commit -m "release: v${NEXT}"
git tag "v${NEXT}"

# Push commit and tag
git push origin main
git push origin "v${NEXT}"

echo ""
echo "Released v${NEXT}"
echo "GitHub Actions will publish to npm automatically."
