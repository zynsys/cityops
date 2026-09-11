#!/usr/bin/env bash
# Verify an application health endpoint, retrying to allow for App Service cold starts.

set -euo pipefail

url="${1:?Usage: smoke-test.sh <url> [max-attempts] [retry-delay-seconds]}"
max_attempts="${2:-10}"
retry_delay="${3:-6}"

for ((attempt = 1; attempt <= max_attempts; attempt++)); do
  # curl writes 000 itself on connection failure; the fallback covers a curl that emits nothing.
  status="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 15 "$url")" || status='000'
  echo "Attempt $attempt/$max_attempts: $url -> HTTP $status"
  if [[ "$status" == "200" ]]; then
    echo "Smoke test passed."
    exit 0
  fi
  if (( attempt < max_attempts )); then
    sleep "$retry_delay"
  fi
done

echo "Smoke test failed: $url never returned 200 after $max_attempts attempts." >&2
exit 1
