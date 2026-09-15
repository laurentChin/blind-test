import * as logger from "../logger.js";
import {
  resolvePlayerUuid,
  registerChallenger,
  removeChallenger,
  resolveJoinedPlayerColor,
} from "../players/players.js";

export function registerPlayerHandlers(io, socket, sessions, verboseOutput) {
  socket.on("join", ({ sessionUuid, player }, callback) => {
    if (verboseOutput) {
      logger.info(`join event received for session ${sessionUuid}`);
    }

    const session = sessions.get(sessionUuid);
    const playerUuid = resolvePlayerUuid(player);

    if (player.name !== "") {
      const challenger = registerChallenger(session, playerUuid, player);

      if (!challenger) {
        callback({ error: "colorTaken", colors: session.colors });
        return;
      }

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
        color: resolveJoinedPlayerColor(session, player),
      },
      challengers,
      sessionUuid,
      mode: session.mode,
      challengeTimerSeconds: session.challengeTimerSeconds,
      challengeCooldownSeconds: session.challengeCooldownSeconds,
      almostPoints: session.almostPoints,
      fullPoints: session.fullPoints,
      totalTracks: session.totalTracks,
      playedCount: session.playedCount,
    });

    io.to(sessionUuid).emit("challengersUpdate", challengers);

    if (verboseOutput) {
      logger.notice(
        `challengersUpdate has been emitted to session ${sessionUuid}`
      );

      console.table(Array.from(session.challengers.values()));
    }
  });

  socket.on("leave", ({ playerUuid, sessionUuid }, callback) => {
    if (verboseOutput) {
      logger.info(
        `disconnect event received for player ${playerUuid} on session ${sessionUuid}`
      );
    }

    const session = sessions.get(sessionUuid);
    const removed = session && removeChallenger(session, playerUuid);
    if (!removed) return;

    io.to(sessionUuid).emit(
      "challengersUpdate",
      Array.from(session.challengers.values())
    );
    io.to(sessionUuid).emit("availableColorsUpdate", session.colors);

    callback();
  });
}
