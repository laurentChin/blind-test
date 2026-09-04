# Blind Test

A real-time, multiplayer blind-test music game. A host builds a playlist from Spotify or Apple Music, players join from their phones over a shared session code, and buzz in to answer.

- **Classic mode**: a game master plays tracks on a shared board, judges answers, and awards points manually.
- **Everybody-plays mode**: no game master — a host configures a themed playlist up front, and players self-report right/wrong answers as the game runs on autopilot, with a configurable buzz timer and cooldown between attempts.

## Project structure

```
client/   React app (Rsbuild) — session creation, board/host views, player view
server/   Bun/socket.io server — game state (in-memory) + music-provider token endpoints
```

The server has no database: all session/game state lives in memory and is lost on restart.

## Prerequisites

- Node.js 22 (client and root tooling)
- [Bun](https://bun.sh/) 1.x (server runtime, package manager, and test runner)
- [Yarn](https://yarnpkg.com/) (client and root tooling)
- [tmux](https://github.com/tmux/tmux) for the side-by-side dev launcher (`brew install tmux`) — optional, see [Running both together](#running-both-together)
- [mkcert](https://github.com/FiloSottile/mkcert) for a locally-trusted HTTPS cert on the client dev server — optional, see [Client setup](#client-setup)

## Setup

### Server setup

```bash
cd server
bun install
```

Create `server/.env`:

| Variable | Purpose |
| --- | --- |
| `PORT` | Port the server listens on (`5001` in local dev, matching the client's `REACT_APP_SOCKET_URI` below) |
| `CLIENT_URL` | Origin allowed by CORS for socket.io and the HTTP endpoints (the client's dev URL, e.g. `https://localhost:3001`) |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Spotify app credentials, used to exchange auth codes/refresh tokens |
| `SPOTIFY_TOKEN_ENDPOINT` | Spotify's OAuth token endpoint |
| `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` | Apple Developer credentials used to sign MusicKit developer tokens (`APPLE_PRIVATE_KEY` is the `.p8` key content, with newlines escaped as `\n`) |

### Client setup

```bash
cd client
yarn install
```

Create `client/.env`:

| Variable | Purpose |
| --- | --- |
| `REACT_APP_SOCKET_URI` | URL of the server's socket.io endpoint, e.g. `http://localhost:5001` |
| `REACT_APP_URL` | Public URL of the client itself, used to build the QR-code join link, e.g. `https://localhost:3001` |
| `REACT_APP_SPOTIFY_CLIENT_ID` | Spotify app client ID |
| `REACT_APP_SPOTIFY_AUTHORIZE_ENDPOINT` / `REACT_APP_SPOTIFY_TOKEN_ENDPOINT` / `REACT_APP_SPOTIFY_API_ENDPONT` | Spotify OAuth authorize/token endpoints and Web API base URL |
| `REACT_APP_APPLE_MUSIC_DEVELOPER_TOKEN_ENDPOINT` | The server's endpoint for fetching a MusicKit developer token |
| `REACT_APP_GIPHY_API_KEY` | Giphy API key, used for result-screen GIFs |

The client's dev server ([Rsbuild](https://rsbuild.dev/)) runs over HTTPS, self-signed by default (browsers will warn). To use a locally-trusted certificate instead:

```bash
brew install mkcert
mkcert -install
mkdir -p client/.certs
mkcert -cert-file client/.certs/localhost.pem -key-file client/.certs/localhost-key.pem localhost 127.0.0.1 ::1
```

`client/.certs` is gitignored; the dev server picks up the certificate automatically when present.

## Running in development

The client and server ports are cross-referenced in each other's `.env` (`CLIENT_URL` / `REACT_APP_SOCKET_URI` / `REACT_APP_URL`), so run them on the ports above (server `5001`, client `3001`) unless you update both sides together.

### Running both together

```bash
yarn dev
```

Starts server and client side by side in a tmux session (`blind-test-dev`), each in its own pane with its own logs and scroll. Detach without stopping anything with `Ctrl-b` then `d`; reattach later with `yarn attach`.

If tmux isn't available, run them interleaved in a single terminal instead:

```bash
yarn dev:interleaved
```

### Running one side at a time

```bash
# server, with auto-restart on change
cd server && bun run start:watch

# client
cd client && PORT=3001 yarn start
```

Server-side changes need a manual restart to take effect (`start:watch` uses Bun's `--watch`; there is no hot patching of a running game). Restarting the server drops any live session, since state is in-memory only.

## Testing & linting

```bash
cd client && yarn test    # Jest + Testing Library
cd client && yarn lint    # ESLint
cd server && bun test      # Bun's built-in test runner
cd server && bunx eslint . # ESLint (no npm script wired up yet)
```

Client and server tests both run in CI on every pull request (`.github/workflows/test-client.yaml`, `.github/workflows/test-server.yaml`).

Commit messages are linted against [Conventional Commits](https://www.conventionalcommits.org/) on every pull request (`.github/workflows/commitlint.yaml`, via `commitlint.config.js` + a `commit-msg` Husky hook).

## Building for production

```bash
cd client && yarn build   # outputs client/build
```

The server runs as a plain Bun process (`bun index.js`) or via its Docker image (`server/Dockerfile`, `oven/bun:1-alpine`, `bun install --frozen-lockfile --production`).

## Deployment

Two independent GitHub Actions pipelines run on every push to `master`, each scoped to its own path:

- **`deploy-client.yaml`** (`client/**`): runs client tests → builds with Rsbuild on the runner → uploads the build as a workflow artifact → rsyncs it over SSH into a new timestamped release directory → flips a `current` symlink to activate it.
- **`deploy-server.yaml`** (`server/**`): builds a Docker image → pushes it to `ghcr.io/laurentchin/blind-test-server` (tagged `latest` and by commit SHA) → SSHes in, pulls the image, writes `.env` from repo/environment variables, and replaces the running container.

Both deploy over SSH to the same host, authenticated via `secrets.DEPLOY_SSH_HOST` / `DEPLOY_SSH_USER` / `DEPLOY_SSH_KEY`. The app is live at https://app.bt.laurentjanet.fr.

## License

[MIT](LICENSE) © Laurent Janet
