import { createContext } from "react";

const SPOTIFY_CODE_PARAM = /\?code=(.+)/;
const SPOTIFY_PLAYER_SRC = "https://sdk.scdn.co/spotify-player.js";

// Always the app's root, whatever path the page was loaded on: Spotify only
// accepts the exact redirect URIs registered on its dashboard (see README),
// and the root is the one registered.
const redirectUri = `${window.location.origin}/`;

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

// A stored access token only means we *were* authenticated at some point —
// it says nothing about whether Spotify still honors it (revoked, expired
// past what a locally-computed expiry could track, ...). validateSession()
// below is the real check; this is only the fast-path signal that there's a
// token worth validating instead of redirecting straight to Spotify.
let isAuthenticated = !!authTokenList.accessToken;

let authorizationHeader = {
  Authorization: `Bearer ${authTokenList.accessToken}`,
};

let currentPlaylist = "";
let player = {};
let playerStateChangeCb = () => {};

function clearSession() {
  authTokenList = {};
  isAuthenticated = false;
  authorizationHeader = { Authorization: undefined };
  sessionStorage.removeItem("spotifyTokenList");
}

// Spotify access tokens only live an hour — shorter than a game can last. So
// every request first swaps a token about to expire for a new one, using the
// refresh token, instead of letting the session die mid-game.
const TOKEN_REFRESH_MARGIN = 60000;
let tokenRefresh = null;

// Shared by concurrent callers: Spotify may rotate the refresh token, so two
// refreshes racing with the same one could leave the loser logged out.
function refreshAccessToken() {
  if (!tokenRefresh) {
    tokenRefresh = getAccessToken().finally(() => {
      tokenRefresh = null;
    });
  }

  return tokenRefresh;
}

async function getFreshAccessToken() {
  const { refreshToken, expiresAt } = authTokenList;

  if (refreshToken && expiresAt - Date.now() < TOKEN_REFRESH_MARGIN) {
    // A refresh that couldn't reach the server leaves the current token in
    // place: it may still be good for the request at hand.
    await refreshAccessToken().catch(() => {});
  }

  return authTokenList.accessToken;
}

// A 401 despite the check above means the token died early (revoked, clock
// drift): refreshed once more before giving up.
async function authorizedFetch(path, options = {}) {
  const request = () =>
    fetch(`${process.env.REACT_APP_SPOTIFY_API_ENDPONT}${path}`, {
      ...options,
      headers: { ...options.headers, ...authorizationHeader },
    });

  await getFreshAccessToken();
  const response = await request();

  if (response.status !== 401 || !authTokenList.refreshToken) {
    return response;
  }

  await refreshAccessToken().catch(() => {});
  return isAuthenticated ? request() : response;
}

// The only reliable way to know a token still works: ask Spotify. A locally
// tracked expiry can't catch a token revoked early or a failed refresh that
// still got treated as a success (see getAccessToken below) — either would
// otherwise sail through as "authenticated" until the first real API call
// 401s deep inside some other screen.
async function validateSession() {
  const response = await authorizedFetch("/me");

  if (response.status === 401) {
    clearSession();
    return false;
  }

  return true;
}

// Since the July 2026 Web API changes, Development Mode quotas are counted
// per developer account and an exhausted one answers 429 with
// `reason: "QUOTA_EXCEEDED"`. Surfaced as an error carrying that reason
// rather than letting callers destructure an error body as if it were data.
async function apiFetch(path, options) {
  const response = await authorizedFetch(path, options);

  if (response.status === 429) {
    const { error } = await response.json().catch(() => ({}));
    throw Object.assign(new Error(error?.message || "Too many requests"), {
      status: 429,
      reason: error?.reason,
    });
  }

  return response;
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

  // A failed exchange (bad code, dead refresh token, upstream error) has no
  // access_token — treat that as "still not logged in" rather than marking
  // the session authenticated with an unusable "Bearer undefined" header.
  if (!access_token) {
    clearSession();
    return { access_token: undefined };
  }

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

async function login() {
  const [, code] = SPOTIFY_CODE_PARAM.exec(window.location) || [];

  if (code) {
    await getAccessToken(code);
    window.history.pushState({}, document.title, redirectUri);
  }

  if (isAuthenticated && (await validateSession())) {
    return true;
  }

  window.location = startTokenRequestUri;
  return new Promise(() => {});
}

async function getPlaylists() {
  const { items } = await (
    await apiFetch("/me/playlists")
  ).json();
  return items;
}

async function createPlaylist(sessionName) {
  const { id } = await (
    await apiFetch("/me/playlists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: sessionName, public: false }),
    })
  ).json();

  return { id };
}

function setCurrentPlaylist(id) {
  currentPlaylist = id;
}

// Development Mode apps (February 2026 Web API changes) cap search at 10
// results per page — exposed so callers paging through search() (e.g. the
// everybody-plays playlist generator) can compute offsets up front.
const SEARCH_PAGE_SIZE = 10;

async function search(terms, { limit, offset } = {}) {
  const { tracks } = await (
    await apiFetch(
      `/search?q=${encodeURIComponent(terms)}&type=track${
        limit ? `&limit=${Math.min(limit, SEARCH_PAGE_SIZE)}` : ""
      }${offset ? `&offset=${offset}` : ""}`
    )
  ).json();

  return tracks;
}

function quoteFilterValue(value) {
  return value.includes(" ") ? `"${value}"` : value;
}

// Turns a theme's criteria (see pages/EverybodyPlays/themes.js) into
// Spotify's field-filtered search syntax, so the search itself only matches
// on the relevant field instead of titles, artists and albums alike.
// Spotify ANDs every filter inside a single query, so alternatives (several
// genres, several album phrases) each get their own query.
function themeQueries({ text, years, genres = [], keywords = [], albumPhrases = [], soundtrack, terms }) {
  const yearFilter = years
    ? `year:${years[0] === years[1] ? years[0] : `${years[0]}-${years[1]}`}`
    : "";
  const genreFilters = genres.length
    ? genres.map((genre) => `genre:${quoteFilterValue(genre)}`)
    : [""];

  let subjects = [""];
  if (text) {
    subjects = [text];
  } else if (albumPhrases.length > 0) {
    subjects = albumPhrases.map((phrase) => `album:${quoteFilterValue(phrase)}`);
  } else if (keywords.length > 0) {
    subjects = keywords.flatMap((keyword) => [
      `album:${quoteFilterValue(keyword)}`,
      soundtrack ? `${keyword} soundtrack` : keyword,
    ]);
  }

  const queries = subjects.flatMap((subject) =>
    genreFilters.map((genreFilter) =>
      [subject, genreFilter, yearFilter].filter(Boolean).join(" ")
    )
  );

  return queries.some(Boolean) ? [...new Set(queries)] : [terms];
}

async function getTracks() {
  const { items } = await (
    await apiFetch(
      `/playlists/${currentPlaylist}`
    )
  ).json();

  // rawIndex is the track's position in the playlist as Spotify sees it —
  // needed by removeTrack below, since the same song can appear more than
  // once in a playlist and Spotify's delete-by-uri removes every occurrence
  // unless a specific position is also given.
  //
  // Spotify only returns `items` for playlists the user owns or collaborates
  // on — any other playlist comes back as metadata only.
  return (items?.items ?? []).map(({ item }, rawIndex) => ({
    ...item,
    rawIndex,
  }));
}

async function addTrack(uri) {
  await (
    await apiFetch(
      `/playlists/${currentPlaylist}/items`,
      {
        method: "POST",
        body: JSON.stringify({ uris: [uri] }),
      }
    )
  ).json();
}

// Targets the specific occurrence via `positions` rather than deleting by
// uri alone — Spotify's delete-by-uri removes every occurrence of that
// track from the playlist, which would take out every duplicate of a
// repeated song instead of just the one that was removed. `positions` isn't
// part of the documented /items body (it wasn't documented on /tracks
// either), but it's what keeps duplicates intact.
async function removeTrack({ uri, rawIndex }) {
  await (
    await apiFetch(
      `/playlists/${currentPlaylist}/items`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: [{ uri, positions: [rawIndex] }] }),
      }
    )
  ).json();
}

async function reorderTrack(fromIndex, toIndex) {
  await apiFetch(
    `/playlists/${currentPlaylist}/items`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        range_start: fromIndex,
        insert_before: toIndex > fromIndex ? toIndex + 1 : toIndex,
        range_length: 1,
      }),
    }
  );
}

// The ways the Web Playback SDK can fail to ever report a "ready" device —
// without these the host just waits on controls that never show up.
const PLAYER_ERROR_MESSAGES = {
  initialization_error: "This browser can't run the Spotify player.",
  authentication_error:
    "Spotify rejected the player's connection — try connecting again.",
  account_error: "A Spotify Premium account is required to play tracks.",
};
const PLAYER_CONNECTION_ERROR_MESSAGE = "The Spotify player couldn't connect.";
// The SDK can also accept the connection and then simply never report a
// device, without any error event — so silence itself has to count as one.
const PLAYER_READY_TIMEOUT = 15000;
const PLAYER_TIMEOUT_MESSAGE =
  "The Spotify player isn't responding — reload the page to try again.";

let playerReadyCb = () => {};
let playerErrorCb = () => {};
let playerReadyTimeout;

function createPlayer() {
  player = new window.Spotify.Player({
    name: "Blind Test Spotify Player",
    getOAuthToken: (cb) => getFreshAccessToken().then(cb),
  });

  player.addListener("player_state_changed", (state) => {
    playerStateChangeCb(state);
  });

  player.addListener("ready", ({ device_id }) => {
    clearTimeout(playerReadyTimeout);
    playerReadyCb(device_id);
  });

  Object.entries(PLAYER_ERROR_MESSAGES).forEach(([type, userMessage]) => {
    player.addListener(type, ({ message }) => {
      clearTimeout(playerReadyTimeout);
      console.error(`Spotify player ${type}: ${message}`);
      playerErrorCb(userMessage);
    });
  });
}

// Every Spotify.Player of a page talks to the single iframe the SDK loaded,
// and that iframe only reports a device to the first one: a second instance
// connects fine but never gets "ready" (nor any error). So the page keeps one
// player for its whole life, and a host screen mounted again (a new session
// after going back home, without a reload) drops and reopens its connection
// instead — which makes the SDK report the device again.
function setupPlayer(readyCb, errorCb = () => {}) {
  playerReadyCb = readyCb;
  playerErrorCb = errorCb;

  window.onSpotifyWebPlaybackSDKReady = () => {
    if (player.connect) {
      player.disconnect();
    } else {
      createPlayer();
    }

    clearTimeout(playerReadyTimeout);
    playerReadyTimeout = setTimeout(
      () => playerErrorCb(PLAYER_TIMEOUT_MESSAGE),
      PLAYER_READY_TIMEOUT
    );

    // Resolves `false` (rather than firing one of the events above) when
    // the SDK couldn't even reach Spotify.
    Promise.resolve(player.connect()).then((connected) => {
      if (connected === false) {
        clearTimeout(playerReadyTimeout);
        playerErrorCb(PLAYER_CONNECTION_ERROR_MESSAGE);
      }
    });
  };

  if (window.Spotify) {
    window.onSpotifyWebPlaybackSDKReady();
    return;
  }

  if (!document.querySelector(`[src="${SPOTIFY_PLAYER_SRC}"]`)) {
    const script = document.createElement("script");
    script.setAttribute("src", SPOTIFY_PLAYER_SRC);
    script.addEventListener("error", () =>
      playerErrorCb(PLAYER_CONNECTION_ERROR_MESSAGE)
    );
    document.head.appendChild(script);
  }
}

function getPlayer() {
  return player;
}

function setPlayerStateChangeCb(cb) {
  playerStateChangeCb = cb;
}

// trackUris lets a caller play an ad-hoc list of tracks straight from the
// Web API's own queue instead of a saved playlist (see everybody-plays'
// ConfigureEverybodyPlaysSession) — player.nextTrack() and the SDK's natural
// end-of-track auto-advance work the same either way, since both become a
// real queue on Spotify's side.
async function startPlayer(deviceID, trackUris) {
  await apiFetch(
    `/me/player/play?device_id=${deviceID}`,
    {
      method: "PUT",
      body: JSON.stringify(
        trackUris?.length
          ? { uris: trackUris }
          : { context_uri: `spotify:playlist:${currentPlaylist}` }
      ),
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
  searchPageSize: SEARCH_PAGE_SIZE,
  themeQueries,
  setupPlayer,
  getPlayer,
  setPlayerStateChangeCb,
  startPlayer,
});

export { SpotifyContext };
