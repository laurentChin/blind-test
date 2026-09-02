import jwt from "jsonwebtoken";

const TOKEN_TTL_SECONDS = 15777000; // ~6 months, Apple's maximum for a developer token

export async function getDeveloperToken() {
  const { APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY } = process.env;

  // The .p8 PEM content is stored in the env with literal "\n" sequences
  // that need to be turned back into real newlines.
  const privateKey = APPLE_PRIVATE_KEY.replace(/\\n/g, "\n");

  const token = jwt.sign({}, privateKey, {
    algorithm: "ES256",
    issuer: APPLE_TEAM_ID,
    expiresIn: TOKEN_TTL_SECONDS,
    keyid: APPLE_KEY_ID,
  });

  return { token, expiresIn: TOKEN_TTL_SECONDS };
}
