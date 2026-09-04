import { createContext } from "react";

const SPOTIFY_CODE_PARAM = /\?code=(.+)/;
const SPOTIFY_PLAYER_SRC = "https://sdk.scdn.co/spotify-player.js";

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

function hasAuthExpired() {
  return authExpiry < new Date().getTime();
}

async function getAccessToken(code) {
  const { access_token, refresh_token, expires_in } = await (
    await fetch(process.env.REACT_APP_SPOTIFY_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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

function login() {
  const [, code] = SPOTIFY_CODE_PARAM.exec(window.location) || [];

  if (!isAuthenticated && !code) {
    window.location = startTokenRequestUri;
    return new Promise(() => {});
  }

  if (code || hasAuthExpired()) {
    return getAccessToken(code).then(() => {
      window.history.pushState({}, document.title, redirectUri);
    });
  }

  return Promise.resolve();
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

async function search(terms, { limit, offset } = {}) {
  const { tracks } = await (
    await fetch(
      `${
        process.env.REACT_APP_SPOTIFY_API_ENDPONT
      }/search?q=${encodeURIComponent(terms)}&type=track${
        // Spotify's search caps limit at 50 — clamped here so callers (e.g.
        // the everybody-plays playlist generator) can ask for a bigger page
        // without worrying about each provider's own ceiling.
        limit ? `&limit=${Math.min(limit, 50)}` : ""
      }${offset ? `&offset=${offset}` : ""}`,
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

  // rawIndex is the track's position in the playlist as Spotify sees it —
  // needed by removeTrack below, since the same song can appear more than
  // once in a playlist and Spotify's delete-by-uri removes every occurrence
  // unless a specific position is also given.
  return tracks.items.map(({ track }, rawIndex) => ({ ...track, rawIndex }));
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

// Targets the specific occurrence via `positions` rather than deleting by
// uri alone — Spotify's delete-by-uri removes every occurrence of that
// track from the playlist, which would take out every duplicate of a
// repeated song instead of just the one that was removed.
async function removeTrack({ uri, rawIndex }) {
  await (
    await fetch(
      `${process.env.REACT_APP_SPOTIFY_API_ENDPONT}/playlists/${currentPlaylist}/tracks`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...authorizationHeader,
        },
        body: JSON.stringify({ tracks: [{ uri, positions: [rawIndex] }] }),
      }
    )
  ).json();
}

async function reorderTrack(fromIndex, toIndex) {
  await fetch(
    `${process.env.REACT_APP_SPOTIFY_API_ENDPONT}/playlists/${currentPlaylist}/tracks`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authorizationHeader,
      },
      body: JSON.stringify({
        range_start: fromIndex,
        insert_before: toIndex > fromIndex ? toIndex + 1 : toIndex,
        range_length: 1,
      }),
    }
  );
}

function setupPlayer(playerReadyCb) {
  window.onSpotifyWebPlaybackSDKReady = () => {
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
  };

  if (window.Spotify) {
    window.onSpotifyWebPlaybackSDKReady();
    return;
  }

  if (!document.querySelector(`[src="${SPOTIFY_PLAYER_SRC}"]`)) {
    const script = document.createElement("script");
    script.setAttribute("src", SPOTIFY_PLAYER_SRC);
    document.head.appendChild(script);
  }
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
  isAuthenticated,
  login,
  getPlaylists,
  createPlaylist,
  setCurrentPlaylist,
  getTracks,
  addTrack,
  removeTrack,
  reorderTrack,
  search,
  setupPlayer,
  getPlayer,
  setPlayerStateChangeCb,
  startPlayer,
});

export { SpotifyContext };
