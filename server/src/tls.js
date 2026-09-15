import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Reuses the client's mkcert certificate (see README) so the server can
// speak wss:// / https:// too — the client dev server runs on HTTPS, and
// browsers (Safari in particular) refuse a plain ws:// connection from an
// https:// page as mixed content.
export function resolveTlsCredentials() {
  const certDir = path.join(__dirname, "..", "..", "client", ".certs");
  const certPath = path.join(certDir, "localhost.pem");
  const keyPath = path.join(certDir, "localhost-key.pem");

  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    return null;
  }

  return { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
}
