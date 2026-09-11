#!/usr/bin/env bash
# Install lockfile-pinned dependencies, retrying transient package-registry failures.

set -euo pipefail

attempt=1
max_attempts="${NPM_CI_MAX_ATTEMPTS:-3}"
retry_delay="${NPM_CI_RETRY_DELAY_SECONDS:-15}"

until npm ci; do
  if (( attempt >= max_attempts )); then
    echo "npm ci failed after $attempt attempts." >&2
    exit 1
  fi
  echo "npm ci failed (attempt $attempt/$max_attempts) — retrying in ${retry_delay}s..." >&2
  attempt=$((attempt + 1))
  sleep "$retry_delay"
done
