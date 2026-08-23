import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ProviderSelect } from "../../components/ProviderSelect/ProviderSelect";
import { ModeSelect } from "./ModeSelect";
import { getSelectedProvider, useMusicProvider } from "../../contexts/MusicProvider";
import { useProviderAuth } from "../../hooks/useProviderAuth";

import "./CreateSession.css";

const CreateSession = () => {
  const navigate = useNavigate();
  const [provider, setProvider] = useState(getSelectedProvider());
  const musicProvider = useMusicProvider();
  const isAuthenticated = useProviderAuth(provider, musicProvider);

  const changeProvider = (newProvider) => {
    if (newProvider !== provider) {
      // Whatever playlist was picked belonged to the previous provider's
      // library — nothing downstream reuses it once the provider changes.
      sessionStorage.removeItem("playlistId");
    }

    setProvider(newProvider);
  };

  return (
    <div className="CreateSession">
      <h1>Create a session</h1>

      <section className="config-step">
        <h2>1. Choose where to pull tracks from and play them</h2>
        <p className="config-step-hint">
          A valid Spotify or Apple Music account is required.
        </p>
        <ProviderSelect
          provider={provider}
          setProvider={changeProvider}
          isAuthenticated={isAuthenticated}
        />
      </section>

      <section className="config-step" inert={!isAuthenticated}>
        <h2>2. Choose a game mode</h2>
        <ModeSelect onSelect={(mode) => navigate(`/create-session/${mode}`)} />
      </section>
    </div>
  );
};

export { CreateSession };
