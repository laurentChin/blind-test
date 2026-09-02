import * as logger from "./logger.js";
import { getAccessToken as getSpotifyAccessToken } from "./musicProviders/spotify.js";
import { getDeveloperToken as getAppleMusicDeveloperToken } from "./musicProviders/appleMusic.js";

function withCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.CLIENT_URL);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
    });
    req.on("end", () => resolve(data ? JSON.parse(data) : {}));
    req.on("error", reject);
  });
}

// Handles the two music-provider token endpoints that used to live as
// standalone AWS Lambdas (see the removed `lambdas/` directory) — now plain
// routes on this same HTTP server, ahead of socket.io's own request
// listener (see index.js).
export function createHttpRequestListener() {
  return async (req, res) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    withCors(res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (req.method === "GET" && pathname === "/apple-music/developer-token") {
        sendJson(res, 200, await getAppleMusicDeveloperToken());
        return;
      }

      if (req.method === "POST" && pathname === "/spotify/access-token") {
        const body = await readJsonBody(req);
        sendJson(res, 200, await getSpotifyAccessToken(body));
        return;
      }
    } catch (err) {
      logger.error(`request to ${pathname} failed: ${err.message}`);
      sendJson(res, 502, { error: "Upstream music provider request failed" });
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  };
}
