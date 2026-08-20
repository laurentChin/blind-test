# Blind Test

A blind-test music game. See [client/README.md](client/README.md) and [server/README.md](server/README.md) for details on each part.

## Running client and server together

Requires [tmux](https://github.com/tmux/tmux) (`brew install tmux`).

```bash
yarn dev
```

Starts the server and client side by side in a tmux session (`blind-test-dev`), each in its own pane with its own logs and scroll:

- left pane: server (`server/`)
- right pane: client (`client/`), on port 3001

Detach without stopping anything with `Ctrl-b` then `d`. Reattach later from any terminal with:

```bash
yarn attach
```

If tmux isn't available, `yarn dev:interleaved` runs both the same way but streams their logs interleaved (prefixed `[server]`/`[client]`) in a single terminal instead of a split view.
