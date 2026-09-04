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

// authorize() resolving doesn't guarantee the session actually works against
// the API (e.g. a subscription-less Apple ID can authorize but every catalog
// request still fails) — a cheap authenticated request confirms it before
// the caller is told login succeeded, mirroring Spotify's validateSession.
async function validateSession() {
  try {
    await apiRequest("/v1/me/library/playlists", { params: { limit: 1 } });
    return true;
  } catch {
    return false;
  }
}

async function login() {
  const music = await ensureConfigured();

  await music.authorize();
  storefrontId = music.storefrontId;

  isAuthenticated = await validateSession();

  return isAuthenticated;
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

// rawIndex is the track's position in Apple's own tracks response, before
// any local reordering/removal is applied — unlike id/uri, it stays unique
// per playlist *entry* even when the same song appears more than once, so
// it's what local removal/order tracking below key on (a Map keyed by id or
// uri would collapse duplicate entries onto a single one).
function toTrack({ id, attributes }, rawIndex) {
  return {
    id,
    uri: `apple-music:track:${id}`,
    rawIndex,
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

function getRemovedTrackIndices() {
  return JSON.parse(sessionStorage.getItem(removedTracksStorageKey())) || [];
}

function setRemovedTrackIndices(indices) {
  sessionStorage.setItem(removedTracksStorageKey(), JSON.stringify(indices));
}

function trackOrderStorageKey() {
  return `appleMusicTrackOrder:${currentPlaylist}`;
}

function getTrackOrderIndices() {
  return JSON.parse(sessionStorage.getItem(trackOrderStorageKey())) || [];
}

function setTrackOrderIndices(indices) {
  sessionStorage.setItem(trackOrderStorageKey(), JSON.stringify(indices));
}

function applyTrackOrder(tracks) {
  const order = getTrackOrderIndices();

  if (order.length === 0) {
    return tracks;
  }

  const byRawIndex = new Map(tracks.map((track) => [track.rawIndex, track]));
  const ordered = order.map((rawIndex) => byRawIndex.get(rawIndex)).filter(Boolean);
  const remaining = tracks.filter((track) => !order.includes(track.rawIndex));

  return [...ordered, ...remaining];
}

async function getPlaylists() {
  const { data } = await apiRequest("/v1/me/library/playlists");
  // A playlist deleted from the native Apple Music app can linger in this
  // listing for a while with its attributes stripped out (no name) before
  // it's fully removed on Apple's side — filter those out rather than
  // showing blank entries.
  return data
    .filter(({ attributes }) => attributes?.name)
    .map(({ id, attributes }) => ({ id, name: attributes.name }));
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

async function search(terms, { limit, offset } = {}) {
  const { results } = await apiRequest(`/v1/catalog/${storefrontId}/search`, {
    params: {
      term: terms,
      types: "songs",
      // Apple's catalog search rejects a limit above 25 with a 400 — clamped
      // here so callers (e.g. the everybody-plays playlist generator) can
      // ask for a bigger page without worrying about each provider's own
      // ceiling.
      ...(limit ? { limit: Math.min(limit, 25) } : {}),
      ...(offset ? { offset } : {}),
    },
  });

  return { items: (results.songs?.data || []).map(toTrack) };
}

async function getTracks() {
  // A playlist with no tracks yet has nothing to expose on its tracks
  // relationship: the request can either reject outright, or resolve
  // without a usable `data` array — treat either case as "no tracks yet"
  // instead of throwing and leaving the caller's loading state stuck.
  const response = await apiRequest(
    `/v1/me/library/playlists/${currentPlaylist}/tracks`
  ).catch(() => ({}));
  const data = response.data || [];

  const removedIndices = getRemovedTrackIndices();
  const tracks = data
    .map((item, rawIndex) => toTrack(item, rawIndex))
    .filter((track) => !removedIndices.includes(track.rawIndex));

  return applyTrackOrder(tracks);
}

async function addTrack(uri) {
  await apiRequest(`/v1/me/library/playlists/${currentPlaylist}/tracks`, {
    method: "POST",
    body: { data: [{ id: toCatalogId(uri), type: "songs" }] },
  });
}

// The Apple Music API has no endpoint to delete a single track from a library
// playlist, so removal is only tracked locally (per playlist, in
// sessionStorage) and filtered out of getTracks() — the track itself stays in
// the real Apple Music library playlist. Tracked by rawIndex rather than
// uri/id: the same song can appear more than once in a playlist, and every
// occurrence shares the same catalog id, so a uri-keyed removal would hide
// every occurrence instead of just the one that was removed.
async function removeTrack(track) {
  const removedIndices = getRemovedTrackIndices();

  if (!removedIndices.includes(track.rawIndex)) {
    setRemovedTrackIndices([...removedIndices, track.rawIndex]);
  }
}

// The Apple Music API also has no endpoint to reorder a library playlist's
// tracks, so — like removeTrack above — the order is only tracked locally
// (per playlist, in sessionStorage) and applied on top of getTracks(). This
// means the order shown in the app can drift from Apple Music's own queue
// when actually playing the playlist during a session. Tracked by rawIndex
// for the same duplicate-song reason as removal above.
async function reorderTrack(fromIndex, toIndex) {
  const tracks = await getTracks();
  const reordered = [...tracks];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);

  setTrackOrderIndices(reordered.map((track) => track.rawIndex));
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

  // Loads the queue without playing it — the initial "current/next track"
  // display doesn't depend on this (the caller seeds it from its own
  // already-fetched track list instead), so there's no need to briefly
  // start and immediately pause playback just to populate it.
  await music.setQueue({ playlist: currentPlaylist });
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
  reorderTrack,
  search,
  setupPlayer,
  getPlayer,
  setPlayerStateChangeCb,
  startPlayer,
});

export { AppleMusicContext, preload };
