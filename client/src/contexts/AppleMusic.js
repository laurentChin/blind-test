import { createContext } from "react";

const MUSICKIT_SRC = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
const APPLE_MUSIC_APP_NAME = "Blind Test";
const APPLE_MUSIC_APP_BUILD = "1.0.0";
const APPLE_MUSIC_PLAYER_ID = "apple-music-player";

let developerToken =
  JSON.parse(sessionStorage.getItem("appleMusicDeveloperToken")) || {};

let isAuthenticated = false;
let isConfigured = false;
let musicKitLoadingPromise = null;
let storefrontId = "";
let currentPlaylist = "";
let player = {};
let playerStateChangeCb = () => {};

function loadMusicKit() {
  if (window.MusicKit) {
    return Promise.resolve();
  }

  if (!musicKitLoadingPromise) {
    musicKitLoadingPromise = new Promise((resolve) => {
      document.addEventListener("musickitloaded", resolve, { once: true });

      if (!document.querySelector(`[src="${MUSICKIT_SRC}"]`)) {
        const script = document.createElement("script");
        script.setAttribute("src", MUSICKIT_SRC);
        document.head.appendChild(script);
      }
    });
  }

  return musicKitLoadingPromise;
}

function hasDeveloperTokenExpired() {
  return (
    !developerToken.expiresAt || developerToken.expiresAt < new Date().getTime()
  );
}

async function getDeveloperToken() {
  if (developerToken.token && !hasDeveloperTokenExpired()) {
    return developerToken.token;
  }

  const { token, expiresIn } = await (
    await fetch(process.env.REACT_APP_APPLE_MUSIC_DEVELOPER_TOKEN_ENDPOINT)
  ).json();

  developerToken = {
    token,
    expiresAt: new Date().getTime() + expiresIn * 1000,
  };

  sessionStorage.setItem(
    "appleMusicDeveloperToken",
    JSON.stringify(developerToken)
  );

  return token;
}

async function ensureConfigured() {
  await loadMusicKit();

  if (!isConfigured) {
    const token = await getDeveloperToken();

    // MusicKit.configure() is async and resolves with the configured
    // instance, so getInstance() below isn't safe to call until it settles.
    await window.MusicKit.configure({
      developerToken: token,
      app: { name: APPLE_MUSIC_APP_NAME, build: APPLE_MUSIC_APP_BUILD },
    });

    isConfigured = true;
  }

  return window.MusicKit.getInstance();
}

async function login() {
  const music = await ensureConfigured();

  await music.authorize();

  isAuthenticated = true;
  storefrontId = music.storefrontId;
}

// authorize() opens a sign-in popup, which browsers only allow within a
// user-gesture window. Since ensureConfigured() involves several awaited
// steps (script load, developer token fetch, configure), calling it lazily
// from inside the click handler eats into that window and risks the popup
// being blocked. Warming it up ahead of time (e.g. while the provider-select
// menu is on screen) lets login() resolve near-instantly on click instead.
function preload() {
  return ensureConfigured().catch(() => {});
}

async function apiRequest(path, { method = "GET", body, params } = {}) {
  const music = await ensureConfigured();

  const { data: responseBody } = await music.api.music(path, params, {
    fetchOptions: body ? { method, body: JSON.stringify(body) } : { method },
  });

  return responseBody;
}

function toTrack({ id, attributes }) {
  return {
    id,
    uri: `apple-music:track:${id}`,
    name: attributes.name,
    artists: [{ name: attributes.artistName }],
    preview_url: attributes.previews?.[0]?.url,
  };
}

function toCatalogId(uri) {
  return uri.replace("apple-music:track:", "");
}

function removedTracksStorageKey() {
  return `appleMusicRemovedTracks:${currentPlaylist}`;
}

function getRemovedTrackUris() {
  return JSON.parse(sessionStorage.getItem(removedTracksStorageKey())) || [];
}

function setRemovedTrackUris(uris) {
  sessionStorage.setItem(removedTracksStorageKey(), JSON.stringify(uris));
}

async function getPlaylists() {
  const { data } = await apiRequest("/v1/me/library/playlists");
  return data.map(({ id, attributes }) => ({ id, name: attributes.name }));
}

async function createPlaylist(name) {
  const { data } = await apiRequest("/v1/me/library/playlists", {
    method: "POST",
    body: { attributes: { name } },
  });

  return { id: data[0].id };
}

function setCurrentPlaylist(id) {
  currentPlaylist = id;
}

async function search(terms) {
  const { results } = await apiRequest(`/v1/catalog/${storefrontId}/search`, {
    params: { term: terms, types: "songs" },
  });

  return { items: (results.songs?.data || []).map(toTrack) };
}

async function getTracks() {
  const { data } = await apiRequest(
    `/v1/me/library/playlists/${currentPlaylist}/tracks`
  );

  const removedUris = getRemovedTrackUris();

  return data.map(toTrack).filter((track) => !removedUris.includes(track.uri));
}

async function addTrack(uri) {
  await apiRequest(`/v1/me/library/playlists/${currentPlaylist}/tracks`, {
    method: "POST",
    body: { data: [{ id: toCatalogId(uri), type: "songs" }] },
  });

  setRemovedTrackUris(getRemovedTrackUris().filter((removed) => removed !== uri));
}

// The Apple Music API has no endpoint to delete a single track from a library
// playlist, so removal is only tracked locally (per playlist, in
// sessionStorage) and filtered out of getTracks() — the track itself stays in
// the real Apple Music library playlist.
async function removeTrack(uri) {
  const removedUris = getRemovedTrackUris();

  if (!removedUris.includes(uri)) {
    setRemovedTrackUris([...removedUris, uri]);
  }
}

function buildPlayerState(music) {
  const currentTrack = music.nowPlayingItem;
  const nextTrack = music.queue?.nextPlayableItem;

  return {
    paused: !music.isPlaying,
    track_window: {
      current_track: currentTrack
        ? { name: currentTrack.title, artists: [{ name: currentTrack.artistName }] }
        : {},
      next_tracks: [
        nextTrack
          ? { name: nextTrack.title, artists: [{ name: nextTrack.artistName }] }
          : {},
      ],
    },
  };
}

function setupPlayer(playerReadyCb) {
  return ensureConfigured().then((music) => {
    music.addEventListener("playbackStateDidChange", () =>
      playerStateChangeCb(buildPlayerState(music))
    );
    music.addEventListener("nowPlayingItemDidChange", () =>
      playerStateChangeCb(buildPlayerState(music))
    );

    player = {
      togglePlay: () => (music.isPlaying ? music.pause() : music.play()),
      nextTrack: () => music.skipToNextItem(),
      pause: () => music.pause(),
      resume: () => music.play(),
      getCurrentState: () => Promise.resolve(buildPlayerState(music)),
    };

    playerReadyCb(APPLE_MUSIC_PLAYER_ID);
  });
}

function getPlayer() {
  return player;
}

function setPlayerStateChangeCb(cb) {
  playerStateChangeCb = cb;
}

async function startPlayer() {
  const music = await ensureConfigured();

  await music.setQueue({ playlist: currentPlaylist });
  await music.play();
}

const AppleMusicContext = createContext({
  isAuthenticated,
  login,
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

export { AppleMusicContext, preload };
