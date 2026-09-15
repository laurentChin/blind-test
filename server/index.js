import * as dotenv from "dotenv";

dotenv.config();
import { createServer } from "http";
import { createServer as createHttpsServer } from "https";
import { Server } from "socket.io";
import * as logger from "./src/logger.js";
import { generateSessionColors } from "./src/colors.js";
import { createHttpRequestListener } from "./src/httpRouter.js";
import { resolveTlsCredentials } from "./src/tls.js";
import { registerSocketHandlers } from "./src/socket/registerSocketHandlers.js";

const sessions = new Map();

// Generated once and reused as the template for every session's color pool
// (each session gets its own copy, see createSessionState) — each entry
// pairs a background with the text color (black or white) that reads best
// on it, computed from actual WCAG contrast rather than assumed.
const colors = generateSessionColors();

const verboseOutput = process.env.VERBOSE;

const tlsCredentials = resolveTlsCredentials();

// Registered before socket.io attaches so Engine.IO preserves it as a
// fallback for any request that isn't one of its own (see its `attach`
// behavior) — that's how these plain HTTP routes and the socket.io
// handshake share the same port.
const httpServer = tlsCredentials
  ? createHttpsServer(tlsCredentials, createHttpRequestListener())
  : createServer(createHttpRequestListener());

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

registerSocketHandlers(io, sessions, colors, verboseOutput);

httpServer.listen(process.env.PORT, () => {
  logger.notice(
    `Server listening on PORT ${process.env.PORT} (${
      tlsCredentials ? "https" : "http"
    })`
  );
  logger.info(`CORS allowed for ${process.env.CLIENT_URL}`);
});
