import * as dotenv from "dotenv";

dotenv.config();
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { createServer as createHttpsServer } from "https";
import { Server } from "socket.io";
import { v4 } from "uuid";
import * as logger from "./src/logger.js";
import { generateSessionColors } from "./src/colors.js";
import { createHttpRequestListener } from "./src/httpRouter.js";

const sessions = new Map();

// Generated once and reused as the template for every session's color pool
// (each session gets its own copy, see createSession below) — each entry
// pairs a background with the text color (black or white) that reads best
// on it, computed from actual WCAG contrast rather than assumed.
const colors = generateSessionColors();

// Reuses the client's mkcert certificate (see README) so the server can
// speak wss:// / https:// too — the client dev server runs on HTTPS, and
// browsers (Safari in particular) refuse a plain ws:// connection from an
// https:// page as mixed content.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certDir = path.join(__dirname, "..", "client", ".certs");
const certPath = path.join(certDir, "localhost.pem");
const keyPath = path.join(certDir, "localhost-key.pem");
const hasLocalCert = fs.existsSync(certPath) && fs.existsSync(keyPath);

// Registered before socket.io attaches so Engine.IO preserves it as a
// fallback for any request that isn't one of its own (see its `attach`
// behavior) — that's how these plain HTTP routes and the socket.io
// handshake share the same port.
const httpServer = hasLocalCert
  ? createHttpsServer(
      { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) },
      createHttpRequestListener()
    )
  : createServer(createHttpRequestListener());
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

const verboseOutput = process.env.VERBOSE;

io.on("connection", socket => {
  socket.on("createSession", ({ sessionUuid, mode, timerSeconds, cooldownSeconds, almostPoints, fullPoints }) => {
    sessions.set(sessionUuid, {
      currentChallenger: null,
      challengers: new Map(),
      colors: [...colors],
      mode: mode || "classic",
      excludedPlayers: new Set(),
      challengeTimerSeconds: timerSeconds ?? 5,
      challengeCooldownSeconds: cooldownSeconds ?? 2,
      almostPoints: almostPoints ?? 0.5,
      fullPoints: fullPoints ?? 1,
      cooldowns: new Map(),
      challengeTimeoutHandle: null,
      currentTrack: null,
      // Real playback state, reported by whichever client actually drives
      // the Spotify/Apple Music player — see the playbackStateChanged
      // handler below. Not inferred from trackReady/challenge state, which
      // only says a track is cued, not that it's actually being played.
      isPlaying: false,
      // everybodyPlays only: a correct answer was just broadcast to the
      // whole room (see setScore below) and the host hasn't cued the next
      // track yet — lets a reconnecting player know to show that same
      // reveal screen instead of the interactive challenge button.
      roundRevealed: false,
    });

    socket.join(sessionUuid);
  });

  socket.on("join", ({ sessionUuid, player }, callback) => {
    if (verboseOutput) {
      logger.info(`join event received for session ${sessionUuid}`);
    }

    const session = sessions.get(sessionUuid);
    const playerUuid = player.teamUuid !== "" ? player.teamUuid : v4();

    if (player.name !== "") {
      const colorIndex = session.colors.findIndex(
        color => color.background === player.color.background
      );

      if (colorIndex === -1) {
        callback({ error: "colorTaken", colors: session.colors });
        return;
      }

      session.colors.splice(colorIndex, 1);
      session.challengers.set(playerUuid, {
        ...player,
        score: 0,
        uuid: playerUuid,
      });
      io.to(sessionUuid).emit("availableColorsUpdate", session.colors);
      if (verboseOutput) {
        logger.notice(
          `availableColorsUpdate has been emitted to session ${sessionUuid}`
        );
      }
    }

    const challengers = Array.from(session.challengers.values());
    callback({
      player: {
        uuid: playerUuid,
        color:
          player && player.teamUuid !== ""
            ? session.challengers.get(player.teamUuid).color
            : player.color,
      },
      challengers,
      sessionUuid,
      mode: session.mode,
      challengeTimerSeconds: session.challengeTimerSeconds,
      challengeCooldownSeconds: session.challengeCooldownSeconds,
      almostPoints: session.almostPoints,
      fullPoints: session.fullPoints,
    });

    io.to(sessionUuid).emit("challengersUpdate", challengers);

    if (verboseOutput) {
      logger.notice(
        `challengersUpdate has been emitted to session ${sessionUuid}`
      );

      console.table(Array.from(session.challengers.values()));
    }
  });

  socket.on("joinAfterRefresh", ({ sessionUuid, playerUuid }, callback) => {
    if (verboseOutput) {
      logger.info(`joinAfterRefresh event received for session ${sessionUuid}`);
    }

    const session = sessions.get(sessionUuid);
    if (session) {
      socket.join(sessionUuid);
      if (callback) {
        callback({
          challengers: Array.from(session.challengers.values()),
          mode: session.mode,
          challengeTimerSeconds: session.challengeTimerSeconds,
          challengeCooldownSeconds: session.challengeCooldownSeconds,
          almostPoints: session.almostPoints,
          fullPoints: session.fullPoints,
          // The round in progress (if any) — without this, a client that
          // reconnects mid-round has no way to know a challenge is locked,
          // that it already tried and failed this track, or what the
          // current track even is, and ends up permanently out of step
          // with the game until the next track starts.
          currentChallenger: session.currentChallenger,
          isExcluded: session.excludedPlayers.has(playerUuid),
          currentTrack: session.currentTrack,
          roundRevealed: session.roundRevealed,
          isPlaying: session.isPlaying,
        });
      }
    }
  });

  socket.on("joinWaitingRoom", (sessionUuid, ack) => {
    if (verboseOutput) {
      logger.info(`joinWaitingRoom event received for session ${sessionUuid}`);
    }

    socket.join(sessionUuid);
    const session = sessions.get(sessionUuid);
    ack({
      challengers: session ? Array.from(session.challengers.values()) : [],
      colors: [
        ...(session && session.colors.length > 0 ? session.colors : colors),
      ],
      mode: session ? session.mode : "classic",
      challengeTimerSeconds: session ? session.challengeTimerSeconds : 5,
      challengeCooldownSeconds: session ? session.challengeCooldownSeconds : 2,
      almostPoints: session ? session.almostPoints : 0.5,
      fullPoints: session ? session.fullPoints : 1,
    });
  });

  socket.on("challenge", ({ sessionUuid, playerUuid }, callback) => {
    if (verboseOutput) {
      logger.info(
        `challenge event received for session ${sessionUuid} and player ${playerUuid}`
      );
    }

    const session = sessions.get(sessionUuid);

    // The session can be gone from memory (e.g. a server restart) while a
    // client still holds a stale sessionUuid from before it — reject rather
    // than crash the whole process on the next line.
    if (!session) {
      if (callback) {
        callback({ rejected: true });
      }
      return;
    }

    const cooldownUntil = session.cooldowns.get(playerUuid);
    if (cooldownUntil && cooldownUntil > Date.now()) {
      if (callback) {
        callback({ rejected: true });
      }
      return;
    }

    if (session.mode === "everybodyPlays" && session.excludedPlayers.has(playerUuid)) {
      if (callback) {
        callback({ rejected: true });
      }
      return;
    }

    // Someone else already holds the lock — without this, a client whose
    // local state is out of sync with the server (e.g. it reconnected
    // before catching up on the current round) could steal an in-progress
    // challenge from under the player who's actually answering.
    if (session.currentChallenger && session.currentChallenger !== playerUuid) {
      if (callback) {
        callback({ rejected: true });
      }
      return;
    }

    session.currentChallenger = playerUuid;
    io.to(sessionUuid).emit("lockChallenge", playerUuid);

    clearTimeout(session.challengeTimeoutHandle);
    session.challengeTimeoutHandle = setTimeout(() => {
      // Classic mode only: the timer running out there means the challenger
      // failed to answer, and the cooldown rate-limits re-buzzing. In
      // everybodyPlays, the timer running out is the normal trigger for the
      // auto-revealed answer screen — not a failure — so no cooldown should
      // outlive the round and block this player's next, genuinely new,
      // buzz-in once the track changes. currentChallenger is left set too:
      // this player still owns the round until they self-score (see setScore
      // / markWrongAnswer below), which is what lets a mid-reveal refresh
      // restore the right screen instead of a fresh, unlocked one.
      if (session.mode !== "everybodyPlays") {
        session.currentChallenger = null;
        session.cooldowns.set(
          playerUuid,
          Date.now() + session.challengeCooldownSeconds * 1000
        );
      }

      io.to(sessionUuid).emit("challengeTimedOut", playerUuid);

      if (verboseOutput) {
        logger.notice(
          `challengeTimedOut event has been emitted to session ${sessionUuid} for player ${playerUuid}`
        );
      }
    }, session.challengeTimerSeconds * 1000);

    if (callback) {
      callback({ rejected: false });
    }
  });

  socket.on("setScore", ({ sessionUuid, playerUuid, score, track }) => {
    if (verboseOutput) {
      logger.info(
        `setScore event received for session ${sessionUuid} with score ${score}`
      );
    }

    const session = sessions.get(sessionUuid);
    if (!session) return;

    // Classic mode's master scores while the challenge is still locked, so
    // session.currentChallenger is still valid there and playerUuid isn't
    // sent. everybodyPlays scores after its own timer already expired, and a
    // player could in theory have reconnected in between — relying on
    // session.currentChallenger there would trust a value the client can't
    // fully vouch for, so it identifies the challenger explicitly instead.
    const challengerUuid = playerUuid ?? session.currentChallenger;
    const challenger = session.challengers.get(challengerUuid);
    if (!challenger) return;

    clearTimeout(session.challengeTimeoutHandle);
    session.currentChallenger = null;
    if (session.mode === "everybodyPlays") {
      session.roundRevealed = true;
    }
    challenger.score = parseFloat(challenger.score) + parseFloat(score);

    if (verboseOutput) {
      logger.notice(
        `challenger ${challenger.name} will be update with score ${challenger.score}`
      );
    }

    io.to(sessionUuid).emit(
      "challengerRelease",
      Array.from(session.challengers.values())
    );

    if (verboseOutput) {
      logger.notice(
        `challengerRelease event has been emitted to session ${sessionUuid}`
      );
    }

    io.to(sessionUuid).emit("challengeResult", { score, track });

    if (verboseOutput) {
      logger.notice(
        `challengeResult event has been emitted to session ${sessionUuid} with score ${score}`
      );
    }

    // A correct answer no longer auto-advances the track: challengeResult
    // above puts everyone on the answer-reveal screen (see Play.jsx), and in
    // everybodyPlays mode only the host can move on from there, via the
    // startNewChallenge handler below (which clears excludedPlayers itself).
  });

  // A player self-reports a wrong answer: unlike setScore above, this never
  // advances the track — everyone else still gets a shot at the same song.
  // Only relevant to "everybodyPlays" sessions, where there's no game master
  // to judge the answer instead.
  socket.on("markWrongAnswer", ({ sessionUuid, playerUuid }) => {
    if (verboseOutput) {
      logger.info(
        `markWrongAnswer event received for session ${sessionUuid} and player ${playerUuid}`
      );
    }

    const session = sessions.get(sessionUuid);
    clearTimeout(session.challengeTimeoutHandle);
    session.excludedPlayers.add(playerUuid);
    session.currentChallenger = null;

    io.to(sessionUuid).emit(
      "challengerRelease",
      Array.from(session.challengers.values())
    );

    if (verboseOutput) {
      logger.notice(
        `challengerRelease event has been emitted to session ${sessionUuid} (wrong answer)`
      );
    }
  });

  // Relayed as-is: only the session's playback-hosting client knows the
  // newly-current track (it's the one driving the Spotify/Apple Music
  // player), so it broadcasts it here for every player's screen to privately
  // cache ahead of that player's own "reveal" action.
  socket.on("trackReady", ({ sessionUuid, track }) => {
    const session = sessions.get(sessionUuid);
    if (session) {
      session.currentTrack = track;
      session.roundRevealed = false;
    }

    io.to(sessionUuid).emit("trackReady", track);
  });

  // Relayed as-is, same reasoning as trackReady above: only the client
  // driving actual playback knows whether it's really playing or paused, so
  // it reports every change here for every player's screen.
  socket.on("playbackStateChanged", ({ sessionUuid, isPlaying }) => {
    const session = sessions.get(sessionUuid);
    if (session) {
      session.isPlaying = isPlaying;
    }

    io.to(sessionUuid).emit("playbackStateChanged", isPlaying);
  });

  socket.on("clearChallenge", ({ sessionUuid }) => {
    if (verboseOutput) {
      logger.info(`clearChallenge event received for session ${sessionUuid}`);
    }

    const session = sessions.get(sessionUuid);
    clearTimeout(session.challengeTimeoutHandle);
    session.currentChallenger = null;

    io.to(sessionUuid).emit(
      "challengerRelease",
      Array.from(session.challengers.values())
    );

    if (verboseOutput) {
      logger.notice(
        `challengerRelease event has been emitted to session ${sessionUuid} (manual clear)`
      );
    }
  });

  socket.on("startNewChallenge", sessionUuid => {
    if (verboseOutput) {
      logger.info(`startNewChallenge received for session ${sessionUuid}`);
    }

    const session = sessions.get(sessionUuid);
    if (session) {
      session.excludedPlayers.clear();
      session.currentChallenger = null;
      session.roundRevealed = false;
    }

    io.to(sessionUuid).emit("startNewChallenge");

    if (verboseOutput) {
      logger.notice(
        `startNewChallenge event has been emitted to session ${sessionUuid}`
      );
    }
  });

  socket.on("leave", ({ playerUuid, sessionUuid }, callback) => {
    if (verboseOutput) {
      logger.info(
        `disconnect event received for player ${playerUuid} on session ${sessionUuid}`
      );
    }

    const session = sessions.get(sessionUuid);
    if (session && session.challengers.has(playerUuid)) {
      session.colors.push(session.challengers.get(playerUuid).color);
      session.challengers.delete(playerUuid);
      sessions.set(sessionUuid, session);

      io.to(sessionUuid).emit(
        "challengersUpdate",
        Array.from(session.challengers.values())
      );
      io.to(sessionUuid).emit("availableColorsUpdate", session.colors);

      callback();
    }
  });

  socket.on("closeSession", ({ sessionUuid }) => {
    if (sessions.has(sessionUuid)) {
      if (verboseOutput) {
        logger.info(
          `session ${sessionUuid} will be closed the following players will be disconnected`
        );

        console.table(
          Array.from(sessions.get(sessionUuid).challengers.values())
        );
      }

      clearTimeout(sessions.get(sessionUuid).challengeTimeoutHandle);
      sessions.delete(sessionUuid);
      io.to(sessionUuid).emit("sessionClosedByMaster");
      socket.leave(sessionUuid);
    }
  });
});

httpServer.listen(process.env.PORT, () => {
  logger.notice(
    `Server listening on PORT ${process.env.PORT} (${
      hasLocalCert ? "https" : "http"
    })`
  );
  logger.info(`CORS allowed for ${process.env.CLIENT_URL}`);
});
