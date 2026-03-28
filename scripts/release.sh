#!/usr/bin/env bash
set -euo pipefail

# Release script for open-assets
# Bumps version in package.json, commits, tags, and pushes.

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

# Compute next versions
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
NEXT_PATCH="${MAJOR}.${MINOR}.$((PATCH + 1))"
NEXT_MINOR="${MAJOR}.$((MINOR + 1)).0"
NEXT_MAJOR="$((MAJOR + 1)).0.0"

# Show current version and options
echo ""
echo "Current published version: v${CURRENT}"
echo ""
echo "Select release type:"
echo ""

OPTIONS=("patch  → v${NEXT_PATCH}" "minor  → v${NEXT_MINOR}" "major  → v${NEXT_MAJOR}")
VERSIONS=("$NEXT_PATCH" "$NEXT_MINOR" "$NEXT_MAJOR")
SELECTED=0

# Read arrow keys and render menu
render_menu() {
  # Move cursor up to overwrite previous menu
  if [[ $1 -eq 1 ]]; then
    printf "\033[3A"
  fi
  for i in 0 1 2; do
    if [[ $i -eq $SELECTED ]]; then
      echo "  ▸ ${OPTIONS[$i]}"
    else
      echo "    ${OPTIONS[$i]}"
    fi
  done
}

# Initial render
render_menu 0

# Interactive selection
while true; do
  # Read a single keypress
  IFS= read -rsn1 key
  if [[ "$key" == $'\x1b' ]]; then
    read -rsn2 rest
    key+="$rest"
  fi

  case "$key" in
    $'\x1b[A') # Up arrow
      if [[ $SELECTED -gt 0 ]]; then
        SELECTED=$((SELECTED - 1))
      fi
      render_menu 1
      ;;
    $'\x1b[B') # Down arrow
      if [[ $SELECTED -lt 2 ]]; then
        SELECTED=$((SELECTED + 1))
      fi
      render_menu 1
      ;;
    '') # Enter
      break
      ;;
  esac
done

NEXT="${VERSIONS[$SELECTED]}"

echo ""
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
