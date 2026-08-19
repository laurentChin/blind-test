export const handler = async (event) => {
  const { CLIENT_ID, CLIENT_SECRET, SPOTIFY_TOKEN_ENDPOINT } = process.env;
  const { code, refreshToken, redirectUri } = event.body ? JSON.parse(event.body) : event;

  const commonFormData = `redirect_uri=${redirectUri}&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`;
  const postPayload = code
    ? `${commonFormData}&grant_type=authorization_code&code=${code}`
    : `${commonFormData}&grant_type=refresh_token&refresh_token=${refreshToken}`;

  const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: postPayload,
  });

  const contentType = response.headers.get('content-type') || '';

  return contentType.includes('application/json') ? response.json() : response.text();
};
