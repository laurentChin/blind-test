import * as dotenv from "dotenv";

dotenv.config();
import { createServer } from "http";
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

// Registered before socket.io attaches so Engine.IO preserves it as a
// fallback for any request that isn't one of its own (see its `attach`
// behavior) — that's how these plain HTTP routes and the socket.io
// handshake share the same port.
const httpServer = createServer(createHttpRequestListener());
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

const verboseOutput = process.env.VERBOSE;

io.on("connection", socket => {
  socket.on("createSession", ({ sessionUuid, mode, timerSeconds, cooldownSeconds }) => {
    sessions.set(sessionUuid, {
      currentChallenger: null,
      challengers: new Map(),
      colors: [...colors],
      mode: mode || "classic",
      excludedPlayers: new Set(),
      challengeTimerSeconds: timerSeconds ?? 5,
      challengeCooldownSeconds: cooldownSeconds ?? 2,
      cooldowns: new Map(),
      challengeTimeoutHandle: null,
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
      session.challengers.set(playerUuid, {
        ...player,
        score: 0,
        uuid: playerUuid,
      });
      session.colors.splice(
        session.colors.findIndex(
          color => color.background === player.color.background
        ),
        1
      );
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
    });

    io.to(sessionUuid).emit("challengersUpdate", challengers);

    if (verboseOutput) {
      logger.notice(
        `challengersUpdate has been emitted to session ${sessionUuid}`
      );

      console.table(Array.from(session.challengers.values()));
    }
  });

  socket.on("joinAfterRefresh", ({ sessionUuid }, callback) => {
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
    });
  });

  socket.on("challenge", ({ sessionUuid, playerUuid }, callback) => {
    if (verboseOutput) {
      logger.info(
        `challenge event received for session ${sessionUuid} and player ${playerUuid}`
      );
    }

    const session = sessions.get(sessionUuid);

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

    session.currentChallenger = playerUuid;
    io.to(sessionUuid).emit("lockChallenge", playerUuid);

    clearTimeout(session.challengeTimeoutHandle);
    session.challengeTimeoutHandle = setTimeout(() => {
      session.currentChallenger = null;
      session.cooldowns.set(
        playerUuid,
        Date.now() + session.challengeCooldownSeconds * 1000
      );
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

  socket.on("setScore", ({ sessionUuid, score, track }) => {
    if (verboseOutput) {
      logger.info(
        `setScore event received for session ${sessionUuid} with score ${score}`
      );
    }

    const session = sessions.get(sessionUuid);
    const challenger = session.challengers.get(session.currentChallenger);

    clearTimeout(session.challengeTimeoutHandle);
    session.currentChallenger = null;
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

    // No game master to manually cue the next round in this mode — a
    // successful self-reported score is the signal to move on. Clears
    // excludedPlayers directly (rather than relying on the startNewChallenge
    // handler below) since this emit is server-originated, not relayed from
    // a client's own startNewChallenge event.
    if (session.mode === "everybodyPlays") {
      session.excludedPlayers.clear();
      io.to(sessionUuid).emit("startNewChallenge");
    }
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
    io.to(sessionUuid).emit("trackReady", track);
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
  logger.notice(`Server listening on PORT ${process.env.PORT}`);
  logger.info(`CORS allowed for ${process.env.CLIENT_URL}`);
});
