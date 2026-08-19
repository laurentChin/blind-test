import { useContext } from "react";

import { SpotifyContext } from "./Spotify";
import { AppleMusicContext } from "./AppleMusic";

const MUSIC_PROVIDERS = {
  SPOTIFY: "spotify",
  APPLE_MUSIC: "appleMusic",
};

const MUSIC_PROVIDER_STORAGE_KEY = "musicProvider";

function getSelectedProvider() {
  return sessionStorage.getItem(MUSIC_PROVIDER_STORAGE_KEY) || "";
}

function setSelectedProvider(provider) {
  sessionStorage.setItem(MUSIC_PROVIDER_STORAGE_KEY, provider);
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
