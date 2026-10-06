import * as logger from "../logger.js";
import {
  resolvePlayerUuid,
  registerChallenger,
  removeChallenger,
  resolveJoinedPlayerColor,
} from "../players/players.js";
import { SESSION_NOT_FOUND } from "../constants.js";

export function registerPlayerHandlers(io, socket, sessions, verboseOutput) {
  socket.on("join", ({ sessionUuid, player }, callback) => {
    if (verboseOutput) {
      logger.info(`join event received for session ${sessionUuid}`);
    }

    const session = sessions.get(sessionUuid);

    // The session can be closed (or lost to a server restart) while a player
    // is still sitting on the join form — reject rather than crash the whole
    // process on the first session access below.
    if (!session) {
      callback({ error: SESSION_NOT_FOUND });
      return;
    }

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

    // Stop relaying this session's events to a socket that outlives the
    // page it left from (the client navigates back home without reloading).
    socket.leave(sessionUuid);

    if (removed) {
      io.to(sessionUuid).emit(
        "challengersUpdate",
        Array.from(session.challengers.values())
      );
      io.to(sessionUuid).emit("availableColorsUpdate", session.colors);
    }

    // Acked even when there was nothing left to remove (session already
    // gone, player already removed) — the client is leaving either way and
    // waits on this to go back home.
    if (callback) {
      callback();
    }
  });
}
