import * as logger from "../logger.js";
import { createSessionState } from "../sessions/session.js";
import {
  GAME_MODE,
  DEFAULT_CHALLENGE_TIMER_SECONDS,
  DEFAULT_CHALLENGE_COOLDOWN_SECONDS,
  DEFAULT_ALMOST_POINTS,
  DEFAULT_FULL_POINTS,
} from "../constants.js";

export function registerSessionHandlers(
  io,
  socket,
  sessions,
  colors,
  verboseOutput
) {
  socket.on(
    "createSession",
    ({
      sessionUuid,
      mode,
      timerSeconds,
      cooldownSeconds,
      almostPoints,
      fullPoints,
      totalTracks,
    }) => {
      sessions.set(
        sessionUuid,
        createSessionState(
          {
            mode,
            timerSeconds,
            cooldownSeconds,
            almostPoints,
            fullPoints,
            totalTracks,
          },
          colors
        )
      );

      socket.join(sessionUuid);
    }
  );

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
      mode: session ? session.mode : GAME_MODE.CLASSIC,
      challengeTimerSeconds: session
        ? session.challengeTimerSeconds
        : DEFAULT_CHALLENGE_TIMER_SECONDS,
      challengeCooldownSeconds: session
        ? session.challengeCooldownSeconds
        : DEFAULT_CHALLENGE_COOLDOWN_SECONDS,
      almostPoints: session ? session.almostPoints : DEFAULT_ALMOST_POINTS,
      fullPoints: session ? session.fullPoints : DEFAULT_FULL_POINTS,
    });
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
          totalTracks: session.totalTracks,
          playedCount: session.playedCount,
        });
      }
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
}
