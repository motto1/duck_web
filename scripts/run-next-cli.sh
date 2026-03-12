#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SCRIPT_PATH="$ROOT_DIR/scripts/run-next.mjs"

if command -v cygpath >/dev/null 2>&1; then
  SCRIPT_PATH=$(cygpath -w "$SCRIPT_PATH")
fi

node "$SCRIPT_PATH" "$@"
