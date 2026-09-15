import * as logger from "../logger.js";
import {
  canChallenge,
  lockChallenge,
  releaseChallengeAfterTimeout,
  applyScore,
  markWrongAnswer as markSessionWrongAnswer,
  clearChallenge as clearSessionChallenge,
  startNewChallenge as startSessionNewChallenge,
} from "../challenges/challenge.js";

export function registerChallengeHandlers(io, socket, sessions, verboseOutput) {
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
    if (!session || !canChallenge(session, playerUuid)) {
      if (callback) {
        callback({ rejected: true });
      }
      return;
    }

    lockChallenge(session, playerUuid);
    io.to(sessionUuid).emit("lockChallenge", playerUuid);

    clearTimeout(session.challengeTimeoutHandle);
    session.challengeTimeoutHandle = setTimeout(() => {
      releaseChallengeAfterTimeout(session, playerUuid);

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

    const challengerUuid = playerUuid ?? session.currentChallenger;
    if (!session.challengers.has(challengerUuid)) return;

    clearTimeout(session.challengeTimeoutHandle);
    const challenger = applyScore(session, challengerUuid, score);

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
    markSessionWrongAnswer(session, playerUuid);

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

  socket.on("clearChallenge", ({ sessionUuid }) => {
    if (verboseOutput) {
      logger.info(`clearChallenge event received for session ${sessionUuid}`);
    }

    const session = sessions.get(sessionUuid);
    clearTimeout(session.challengeTimeoutHandle);
    clearSessionChallenge(session);

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
      startSessionNewChallenge(session);
    }

    io.to(sessionUuid).emit("startNewChallenge");

    if (verboseOutput) {
      logger.notice(
        `startNewChallenge event has been emitted to session ${sessionUuid}`
      );
    }
  });
}
