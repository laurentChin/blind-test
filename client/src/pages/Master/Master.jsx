import React, { useEffect, useState } from "react";
import { v4 } from "uuid";

import { getSelectedProvider, useMusicProvider } from "../../contexts/MusicProvider";
import { ProviderSelect } from "./steps/ProviderSelect";
import { CreateOrSelectPlaylist } from "./steps/CreateOrSelectPlaylist";
import { STEPS } from "./constants";
import { ManageTracks } from "./steps/ManageTracks";
import { ManageSession } from "./steps/ManageSession";
import { StepsNavigation } from "./components/StepsNavigation";
import io from "socket.io-client";

const SESSION_UUID = v4();

let socket = io(process.env.REACT_APP_SOCKET_URI);

const Master = () => {
  const [provider, setProvider] = useState(getSelectedProvider());
  const musicProvider = useMusicProvider();

  const [title, setTitle] = useState("New session");
  const [isAuthenticated, setIsAuthenticated] = useState(
    musicProvider.isAuthenticated
  );

  const [playlistId, setPlaylistId] = useState(
    sessionStorage.getItem("playlistId") || ""
  );

  const [step, setStep] = useState(
    sessionStorage.getItem("step") || STEPS.CREATE_OR_SELECT_PLAYLIST
  );

  useEffect(() => {
    if (!provider) return;

    musicProvider.login().then(() => setIsAuthenticated(true));
  }, [provider, musicProvider]);

  if (!provider) {
    return <ProviderSelect setProvider={setProvider} />;
  }

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
        <ManageSession sessionUuid={SESSION_UUID} socket={socket}/>
      )}
      <StepsNavigation currentStep={step} setStep={setStep} />
    </div>
  );
};

export { Master };
