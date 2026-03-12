#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SCRIPT_PATH="$ROOT_DIR/scripts/run-next.mjs"

if command -v cygpath >/dev/null 2>&1; then
  SCRIPT_PATH=$(cygpath -w "$SCRIPT_PATH")
fi

if [ "${1:-}" = "build" ]; then
  if [ -n "${NODE_OPTIONS:-}" ]; then
    export NODE_OPTIONS="--max-old-space-size=4096 ${NODE_OPTIONS}"
  else
    export NODE_OPTIONS="--max-old-space-size=4096"
  fi
fi

node "$SCRIPT_PATH" "$@"
