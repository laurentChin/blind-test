#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION="blind-test-dev"

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is required for the side-by-side dev launcher. Install it with: brew install tmux" >&2
  exit 1
fi

tmux kill-session -t "$SESSION" 2>/dev/null || true

tmux new-session -d -s "$SESSION" -n dev -c "$ROOT_DIR/server" "bun run start:watch"
tmux split-window -h -t "$SESSION:dev" -c "$ROOT_DIR/client" "PORT=3001 yarn start"
tmux select-pane -t "$SESSION:dev.0"

exec tmux attach -t "$SESSION"
