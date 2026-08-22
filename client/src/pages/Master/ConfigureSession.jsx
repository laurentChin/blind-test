import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

import { ProviderSelect } from "./steps/ProviderSelect";
import { CreateOrSelectPlaylist } from "./steps/CreateOrSelectPlaylist";
import { ManageTracks } from "./steps/ManageTracks";

import "./ConfigureSession.css";

const MIN_TRACKS = 5;

const ConfigureSession = ({
  provider,
  setProvider,
  isAuthenticated,
  setTitle,
  onLaunch,
}) => {
  const [playlistId, setPlaylistId] = useState("");
  const [tracks, setTracks] = useState([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const isFirstProviderRender = useRef(true);
  const isFirstPlaylistRender = useRef(true);

  useEffect(() => {
    if (isFirstProviderRender.current) {
      isFirstProviderRender.current = false;
      return;
    }

    // Changing provider invalidates whatever was chosen downstream: the
    // playlist and tracks belonged to the previous provider's library.
    setPlaylistId("");
    setTracks([]);
  }, [provider]);

  useEffect(() => {
    if (isFirstPlaylistRender.current) {
      isFirstPlaylistRender.current = false;
      return;
    }

    // Changing playlist invalidates the tracks step: the list belonged to
    // the previous playlist. ManageTracks refetches for the new playlistId
    // and reports the fresh tracks back via onTracksChange once ready.
    setTracks([]);
  }, [playlistId]);

  const isProviderValidated = isAuthenticated;
  const isPlaylistValidated = !!playlistId;
  const isTracksStepReady = isPlaylistValidated && !isLoadingTracks;
  const isTracksValidated = tracks.length >= MIN_TRACKS;

  return (
    <div className="ConfigureSession">
      <section className="config-step">
        <h2>1. Choose where to pull tracks from and play them</h2>
        <ProviderSelect
          provider={provider}
          setProvider={setProvider}
          isAuthenticated={isAuthenticated}
        />
      </section>

      <section className="config-step" inert={!isProviderValidated}>
        <h2>2. Choose a playlist</h2>
        <CreateOrSelectPlaylist
          key={provider}
          isAuthenticated={isAuthenticated}
          onSelectPlaylist={setPlaylistId}
          setTitle={setTitle}
        />
      </section>

      <section className="config-step" inert={!isTracksStepReady}>
        <h2>3. Manage the tracks</h2>
        <p className="config-step-hint">
          At least {MIN_TRACKS} tracks are required to launch the session.
        </p>
        <ManageTracks
          key={provider}
          playlistId={playlistId}
          onTracksChange={setTracks}
          onLoadingChange={setIsLoadingTracks}
        />
      </section>

      {isTracksValidated && (
        <button
          type="button"
          className="btn btn-positive launch-button"
          onClick={() => onLaunch(tracks)}
        >
          Launch the session
        </button>
      )}
    </div>
  );
};

ConfigureSession.propTypes = {
  provider: PropTypes.string,
  setProvider: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.bool,
  setTitle: PropTypes.func.isRequired,
  onLaunch: PropTypes.func.isRequired,
};

export { ConfigureSession };
