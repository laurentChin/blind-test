import { registerSessionHandlers } from "./sessionHandlers.js";
import { registerPlayerHandlers } from "./playerHandlers.js";
import { registerChallengeHandlers } from "./challengeHandlers.js";
import { registerPlaybackHandlers } from "./playbackHandlers.js";

export function registerSocketHandlers(io, sessions, colors, verboseOutput) {
  io.on("connection", socket => {
    registerSessionHandlers(io, socket, sessions, colors, verboseOutput);
    registerPlayerHandlers(io, socket, sessions, verboseOutput);
    registerChallengeHandlers(io, socket, sessions, verboseOutput);
    registerPlaybackHandlers(io, socket, sessions);
  });
}
