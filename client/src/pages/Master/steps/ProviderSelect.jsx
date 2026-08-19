import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { SiSpotify, SiApplemusic } from "react-icons/si";

import { MUSIC_PROVIDERS, setSelectedProvider } from "../../../contexts/MusicProvider";
import { preload as preloadAppleMusic } from "../../../contexts/AppleMusic";

import "./ProviderSelect.css";

const PROVIDERS = [
  {
    id: MUSIC_PROVIDERS.SPOTIFY,
    testId: "select-spotify-btn",
    label: "Spotify",
    icon: SiSpotify,
    color: "#1ED760",
  },
  {
    id: MUSIC_PROVIDERS.APPLE_MUSIC,
    testId: "select-apple-music-btn",
    label: "Apple Music",
    icon: SiApplemusic,
    color: "#FA243C",
  },
];

const ProviderSelect = ({ setProvider }) => {
  useEffect(() => {
    preloadAppleMusic();
  }, []);

  const selectProvider = (provider) => {
    setSelectedProvider(provider);
    setProvider(provider);
  };

  return (
    <div className="Step Provider-Select">
      <p>Choose where to pull tracks from and play them.</p>
      <div className="provider-grid">
        {PROVIDERS.map(({ id, testId, label, icon: Icon, color }) => (
          <button
            key={id}
            data-testid={testId}
            className="provider-tile"
            onClick={() => selectProvider(id)}
          >
            <Icon className="provider-icon" style={{ color }} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

ProviderSelect.propTypes = {
  setProvider: PropTypes.func.isRequired,
};

export { ProviderSelect };
