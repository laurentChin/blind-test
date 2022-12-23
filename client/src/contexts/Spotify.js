import { createContext } from "react";

const SPOTIFY_CODE_PARAM = /\?code=(.+)/;

const redirectUri = `${window.location.origin}${window.location.pathname}`;

const scopes = [
  "user-modify-playback-state",
  "playlist-modify-private",
  "playlist-read-private",
  "playlist-modify-public",
  "streaming",
  "user-read-private",
  "user-read-email",
];

const startTokenRequestUri = `${
  process.env.REACT_APP_SPOTIFY_AUTHORIZE_ENDPOINT
}?client_id=${
  process.env.REACT_APP_SPOTIFY_CLIENT_ID
}&response_type=code&redirect_uri=${encodeURIComponent(
  redirectUri
)}&scope=${scopes.join(" ")}`;

let authTokenList =
  JSON.parse(sessionStorage.getItem("spotifyTokenList")) || {};

let authExpiry =
  JSON.parse(sessionStorage.getItem("spotifyAuthExpiry")) ||
  new Date().getTime();

let isAuthenticated = !!authTokenList && authExpiry > new Date().getTime();

let authorizationHeader = {
  Authorization: `Bearer ${authTokenList.accessToken}`,
};

let currentPlaylist = "";
let player = {};
let playerStateChangeCb = () => {};

async function getAccessToken(code) {
  const { access_token, refresh_token, expires_in } = await (
    await fetch(process.env.REACT_APP_SPOTIFY_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        redirectUri: encodeURIComponent(redirectUri),
        code: code,
        refreshToken: authTokenList.refreshToken,
      }),
    })
  ).json();

  sessionStorage.setItem(
    "spotifyTokenList",
    JSON.stringify({
      accessToken: access_token,
      refreshToken: refresh_token || authTokenList.refreshToken,
      expiresAt: new Date().getTime() + expires_in * 1000,
    })
  );

  authTokenList = JSON.parse(sessionStorage.getItem("spotifyTokenList"));
  isAuthenticated = true;
  authorizationHeader.Authorization = `Bearer ${access_token}`;

  return { access_token, refresh_token, expires_in };
}

async function getPlaylists() {
  const { items } = await (
    await fetch(`${process.env.REACT_APP_SPOTIFY_API_ENDPONT}/me/playlists`, {
      headers: {
        ...authorizationHeader,
      },
    })
  ).json();
  return items;
}

async function createPlaylist(sessionName) {
  const user = await (
    await fetch(`${process.env.REACT_APP_SPOTIFY_API_ENDPONT}/me`, {
      headers: { ...authorizationHeader },
    })
  ).json();

  const { id } = await (
    await fetch(
      `${process.env.REACT_APP_SPOTIFY_API_ENDPONT}/users/${user.id}/playlists`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authorizationHeader,
        },
        body: JSON.stringify({ name: sessionName, public: false }),
      }
    )
  ).json();

  return { id };
}

function setCurrentPlaylist(id) {
  currentPlaylist = id;
}

async function search(terms) {
  const { tracks } = await (
    await fetch(
      `${
        process.env.REACT_APP_SPOTIFY_API_ENDPONT
      }/search?q=${encodeURIComponent(terms)}&type=track`,
      {
        headers: { ...authorizationHeader },
      }
    )
  ).json();

  return tracks;
}

async function getTracks() {
  const { tracks } = await (
    await fetch(
      `${process.env.REACT_APP_SPOTIFY_API_ENDPONT}/playlists/${currentPlaylist}`,
      {
        headers: { ...authorizationHeader },
      }
    )
  ).json();

  return tracks.items.map(({ track }) => track);
}

async function addTrack(uri) {
  await (
    await fetch(
      `${process.env.REACT_APP_SPOTIFY_API_ENDPONT}/playlists/${currentPlaylist}/tracks`,
      {
        method: "POST",
        headers: { ...authorizationHeader },
        body: JSON.stringify({ uris: [uri] }),
      }
    )
  ).json();
}

async function removeTrack(uri) {
  await (
    await fetch(
      `${process.env.REACT_APP_SPOTIFY_API_ENDPONT}/playlists/${currentPlaylist}/tracks`,
      {
        method: "DELETE",
        headers: { ...authorizationHeader },
        body: JSON.stringify({ tracks: [{ uri }] }),
      }
    )
  ).json();
}

function setupPlayer(playerReadyCb) {
  player = new window.Spotify.Player({
    name: "Blind Test Spotify Player",
    getOAuthToken: (cb) => cb(authTokenList.accessToken),
  });

  player.addListener("player_state_changed", (state) => {
    playerStateChangeCb(state);
  });

  player.addListener("ready", ({ device_id }) => {
    playerReadyCb(device_id);
  });

  player.connect();

  return player;
}

function getPlayer() {
  return player;
}

function setPlayerStateChangeCb(cb) {
  playerStateChangeCb = cb;
}

async function startPlayer(deviceID) {
  await fetch(
    `${process.env.REACT_APP_SPOTIFY_API_ENDPONT}/me/player/play?device_id=${deviceID}`,
    {
      method: "PUT",
      headers: { ...authorizationHeader },
      body: JSON.stringify({
        context_uri: `spotify:playlist:${currentPlaylist}`,
      }),
    }
  );
}

const SpotifyContext = createContext({
  SPOTIFY_CODE_PARAM,
  redirectUri,
  startTokenRequestUri,
  isAuthenticated,
  hasAuthExpired: () => authExpiry < new Date().getTime(),
  getAccessToken,
  getPlaylists,
  createPlaylist,
  setCurrentPlaylist,
  getTracks,
  addTrack,
  removeTrack,
  search,
  setupPlayer,
  getPlayer,
  setPlayerStateChangeCb,
  startPlayer,
});

export { SpotifyContext };
