import { useContext } from "react";

import { SpotifyContext } from "./Spotify";
import { AppleMusicContext } from "./AppleMusic";

const MUSIC_PROVIDERS = {
  SPOTIFY: "spotify",
  APPLE_MUSIC: "appleMusic",
};

const MUSIC_PROVIDER_STORAGE_KEY = "musicProvider";

// Only one provider is ever active, but each one's context module still
// warms up or persists its own credentials independently (Apple Music's
// preload in particular runs before any provider is chosen) — so switching
// providers can otherwise leave the previous one's token sitting unused in
// storage. Keyed here so selecting a provider can wipe the other one's.
const PROVIDER_STORAGE_KEYS = {
  [MUSIC_PROVIDERS.SPOTIFY]: ["spotifyTokenList"],
  [MUSIC_PROVIDERS.APPLE_MUSIC]: ["appleMusicDeveloperToken"],
};

function getSelectedProvider() {
  return sessionStorage.getItem(MUSIC_PROVIDER_STORAGE_KEY) || "";
}

function setSelectedProvider(provider) {
  sessionStorage.setItem(MUSIC_PROVIDER_STORAGE_KEY, provider);

  Object.entries(PROVIDER_STORAGE_KEYS)
    .filter(([id]) => id !== provider)
    .forEach(([, keys]) => keys.forEach((key) => sessionStorage.removeItem(key)));
}

function useMusicProvider() {
  const spotify = useContext(SpotifyContext);
  const appleMusic = useContext(AppleMusicContext);

  return getSelectedProvider() === MUSIC_PROVIDERS.APPLE_MUSIC
    ? appleMusic
    : spotify;
}

export {
  MUSIC_PROVIDERS,
  getSelectedProvider,
  setSelectedProvider,
  useMusicProvider,
};
