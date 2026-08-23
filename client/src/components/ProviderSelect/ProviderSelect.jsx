import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { SiSpotify, SiApplemusic } from "react-icons/si";

import { MUSIC_PROVIDERS, setSelectedProvider } from "../../contexts/MusicProvider";
import { preload as preloadAppleMusic } from "../../contexts/AppleMusic";

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

const ProviderSelect = ({ provider, setProvider, isAuthenticated }) => {
  useEffect(() => {
    preloadAppleMusic();
  }, []);

  const toggleProvider = (id) => {
    if (provider === id && !isAuthenticated) {
      setSelectedProvider("");
      setProvider("");
      return;
    }

    setSelectedProvider(id);
    setProvider(id);
  };

  return (
    <div className="provider-grid">
      {PROVIDERS.map(({ id, testId, label, icon: Icon, color }) => (
        <button
          key={id}
          type="button"
          data-testid={testId}
          className="provider-tile"
          style={{ "--provider-color": color }}
          aria-pressed={provider === id}
          disabled={isAuthenticated && provider === id}
          onClick={() => toggleProvider(id)}
        >
          <Icon className="provider-icon" aria-hidden="true" />
          <span>{label}</span>
          {isAuthenticated && provider === id && (
            <span className="provider-status">Connected</span>
          )}
        </button>
      ))}
    </div>
  );
};

ProviderSelect.propTypes = {
  provider: PropTypes.string,
  setProvider: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.bool,
};

export { ProviderSelect };
