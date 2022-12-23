const https = require('https');

exports.handler = (event, context, callback) => {
  const { CLIENT_ID, CLIENT_SECRET, SPOTIFY_TOKEN_ENDPOINT } = process.env;
  const { code,  refreshToken, redirectUri} = event.body ? JSON.parse(event.body) : event;
  const commonFormData = `redirect_uri=${redirectUri}&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`
  const postPayload = code ? `${commonFormData}&grant_type=authorization_code&code=${code}` : `${commonFormData}&grant_type=refresh_token&refresh_token=${refreshToken}`;

  const request = https.request(SPOTIFY_TOKEN_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded ", "Content-Length": postPayload.length }}, (response) => {
    let body = '';
    response.setEncoding('utf8');

    response.on('data', (chunk) => body += chunk);
    response.on('end', () => {
      // If we know it's JSON, parse it
      if (response.headers['content-type'] === 'application/json') {
        body = JSON.parse(body);
      }

      callback(null, body);
    });
  });
  request.on('error', callback);
  request.write(postPayload);
  request.end();
};
