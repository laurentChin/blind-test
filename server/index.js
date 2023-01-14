import * as dotenv from "dotenv";

dotenv.config();
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 } from "uuid";
import * as logger from "./src/logger.js";

const sessions = new Map();

const colors = [
  "255, 183, 195", // #ffb7c3
  "230, 25, 75", // #e6194B
  "245, 130, 49", // #f58231
  "252, 245, 199", // #fcf5c7
  "255, 225, 25", // #ffe119
  "191, 239, 69", // #bfef45
  "22, 219, 101", // #16db65
  "60, 180, 75", // #3cb44b
  "66, 212, 244", // #42d4f4
  "48, 99, 142", // #30638e
  "67, 99, 216", // #4363d8
  "145, 30, 180", // #911eb4
  "230, 190, 255", // #e6beff
  "240, 50, 230", // #f032e6
  "226, 199, 170", // #e2c7aa
  "197, 195, 198", // #c5c3c6
  "147, 94, 56", // #935e38
];

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

const verboseOutput = process.env.VERBOSE;

io.on("connection", socket => {
  socket.on("join", ({ sessionUuid, player }, callback) => {
    if (verboseOutput) {
      logger.info(`join event received for session ${sessionUuid}`);
    }

    if (!sessions.has(sessionUuid)) {
      sessions.set(sessionUuid, {
        currentChallenger: null,
        challengers: new Map(),
        colors: [...colors],
      });
    }

    const session = sessions.get(sessionUuid);
    const playerUuid =
      player && player.teamUuid !== "" ? player.teamUuid : v4();

    if (player?.teamUuid === "" && player?.name) {
      session.challengers.set(playerUuid, {
        ...player,
        score: 0,
        uuid: playerUuid,
      });
      session.colors.splice(
        session.colors.findIndex(color => color === player.color),
        1
      );
      io.to(sessionUuid).emit("availableColorsUpdate", session.colors);
      if (verboseOutput) {
        logger.notice(
          `availableColorsUpdate has been emitted to session ${sessionUuid}`
        );
      }
    }

    if (!player) {
      socket.join(sessionUuid);
    }

    if (callback) {
      callback({
        player: {
          uuid: playerUuid,
          color:
            player && player.teamUuid !== ""
              ? session.challengers.get(playerUuid).color
              : player.color,
        },
        sessionUuid,
      });
    }

    io.to(sessionUuid).emit(
      "challengersUpdate",
      Array.from(session.challengers.values())
    );

    if (verboseOutput) {
      logger.notice(
        `challengersUpdate has been emitted to session ${sessionUuid}`
      );

      console.table(Array.from(session.challengers.values()));
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
    });
  });

  socket.on("challenge", ({ sessionUuid, playerUuid }) => {
    if (verboseOutput) {
      logger.info(
        `challenge event received for session ${sessionUuid} and player ${playerUuid}`
      );
    }

    const session = sessions.get(sessionUuid);
    session.currentChallenger = playerUuid;
    io.to(sessionUuid).emit("lockChallenge", playerUuid);
  });

  socket.on("setScore", ({ sessionUuid, score, track }) => {
    if (verboseOutput) {
      logger.info(
        `setScore event received for session ${sessionUuid} with score ${score}`
      );
    }

    const session = sessions.get(sessionUuid);
    const challenger = session.challengers.get(session.currentChallenger);

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
  });

  socket.on("startNewChallenge", sessionUuid => {
    if (verboseOutput) {
      logger.info(`startNewChallenge received for session ${sessionUuid}`);
    }

    io.to(sessionUuid).emit("startNewChallenge");

    if (verboseOutput) {
      logger.notice(
        `startNewChallenge event has been emitted to session ${sessionUuid}`
      );
    }
  });
});

httpServer.listen(process.env.PORT, () => {
  logger.notice(`Server listening on PORT ${process.env.PORT}`);
  logger.info(`CORS allowed for ${process.env.CLIENT_URL}`);
});
