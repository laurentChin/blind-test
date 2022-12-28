import React, { useContext, useEffect, useState } from "react";
import { v4 } from "uuid";

import { SpotifyContext } from "../../contexts/Spotify";
import { CreateOrSelectPlaylist } from "./steps/CreateOrSelectPlaylist";
import { STEPS } from "./constants";
import { ManageTracks } from "./steps/ManageTracks";
import { ManageSession } from "./steps/ManageSession";
import { StepsNavigation } from "./components/StepsNavigation";

const SESSION_UUID = v4();

const Master = () => {
  const spotifyContext = useContext(SpotifyContext);

  const [title, setTitle] = useState("New session");
  const [isAuthenticated, setIsAuthenticated] = useState(
    spotifyContext.isAuthenticated
  );

  const [playlistId, setPlaylistId] = useState(
    sessionStorage.getItem("playlistId") || ""
  );

  const [step, setStep] = useState(
    sessionStorage.getItem("step") || STEPS.CREATE_OR_SELECT_PLAYLIST
  );

  useEffect(() => {
    const [, code] =
      spotifyContext.SPOTIFY_CODE_PARAM.exec(window.location) || [];

    if (!isAuthenticated && !code) {
      window.location = spotifyContext.startTokenRequestUri;
    }

    if (code || spotifyContext.hasAuthExpired()) {
      spotifyContext.getAccessToken(code).then(() => {
        window.history.pushState(
          {},
          document.title,
          spotifyContext.redirectUri
        );
        setIsAuthenticated(true);
      });
    }
  }, [spotifyContext, isAuthenticated]);

  return (
    <div>
      <h2>{title}</h2>
      {step.name === STEPS.CREATE_OR_SELECT_PLAYLIST.name && (
        <CreateOrSelectPlaylist
          onSelectPlaylist={setPlaylistId}
          setStep={setStep}
          isAuthenticated={isAuthenticated}
          setTitle={setTitle}
        />
      )}
      {step.name === STEPS.MANAGE_TRACKS.name && (
        <ManageTracks playlistId={playlistId} />
      )}
      {step.name === STEPS.MANAGE_SESSION.name && (
        <ManageSession sessionUuid={SESSION_UUID} />
      )}
      <StepsNavigation currentStep={step} setStep={setStep} />
    </div>
  );
};

export { Master };
