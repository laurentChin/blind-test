import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginBasicSsl } from "@rsbuild/plugin-basic-ssl";

const { publicVars } = loadEnv({ prefixes: ["REACT_APP_"] });

// Locally-trusted certificate generated with `mkcert` (see README), so the
// dev server doesn't trigger a browser security warning. Falls back to the
// self-signed pluginBasicSsl certificate when it hasn't been generated.
const certDir = path.join(import.meta.dirname, ".certs");
const certPath = path.join(certDir, "localhost.pem");
const keyPath = path.join(certDir, "localhost-key.pem");
const hasLocalCert = fs.existsSync(certPath) && fs.existsSync(keyPath);

export default defineConfig({
  plugins: [pluginReact(), ...(hasLocalCert ? [] : [pluginBasicSsl()])],
  server: {
    port: Number(process.env.PORT) || 3000,
    // Without this, the dev server only binds the IPv6 loopback ([::1]) on
    // some setups — "localhost" resolves there and works, but 127.0.0.1
    // (which Spotify's OAuth now requires instead of "localhost", see
    // README) can't connect at all.
    host: "0.0.0.0",
    https: hasLocalCert
      ? { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }
      : undefined,
  },
  html: {
    template: "./public/index.html",
  },
  source: {
    define: publicVars,
  },
  output: {
    distPath: {
      root: "build",
    },
  },
});
