export async function getAccessToken({ code, refreshToken, redirectUri }) {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_TOKEN_ENDPOINT } =
    process.env;

  const commonFormData = `redirect_uri=${redirectUri}&client_id=${SPOTIFY_CLIENT_ID}&client_secret=${SPOTIFY_CLIENT_SECRET}`;
  const postPayload = code
    ? `${commonFormData}&grant_type=authorization_code&code=${code}`
    : `${commonFormData}&grant_type=refresh_token&refresh_token=${refreshToken}`;

  const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: postPayload,
  });

  const contentType = response.headers.get("content-type") || "";

  return contentType.includes("application/json")
    ? response.json()
    : response.text();
}
