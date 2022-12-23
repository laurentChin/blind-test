const { Server } = require("socket.io");
const io = new Server(8888);

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

io.on("connection", socket => {
  socket.on("join", ({ sessionUuid, player }) => {
    if (!sessions.has(sessionUuid)) {
      sessions.set(sessionUuid, {
        currentChallenger: null,
        challengers: new Map(),
        colors: [...colors],
      });
    }

    const session = sessions.get(sessionUuid);
    if (player && player.name !== "" && !session.challengers.has(player.uuid)) {
      session.challengers.set(player.uuid, { ...player, score: 0 });
      session.colors.splice(
        session.colors.findIndex(color => color === player.color),
        1
      );
      io.to(sessionUuid).emit("availableColorsUpdate", session.colors);
    } else {
      socket.join(sessionUuid);
    }

    io.to(sessionUuid).emit(
      "challengersUpdate",
      Array.from(session.challengers.values())
    );
  });

  socket.on("joinWaitingRoom", (sessionUuid, ack) => {
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
    const session = sessions.get(sessionUuid);
    session.currentChallenger = playerUuid;
    io.to(sessionUuid).emit("lockChallenge", playerUuid);
  });

  socket.on("setScore", ({ sessionUuid, score, track }) => {
    const session = sessions.get(sessionUuid);
    const challenger = session.challengers.get(session.currentChallenger);
    session.currentChallenger = null;
    challenger.score = parseFloat(challenger.score) + parseFloat(score);
    io.to(sessionUuid).emit(
      "challengerRelease",
      Array.from(session.challengers.values())
    );

    io.to(sessionUuid).emit("challengeResult", { score, track });
  });

  socket.on("startNewChallenge", sessionUuid => {
    io.to(sessionUuid).emit("startNewChallenge");
  });
});
