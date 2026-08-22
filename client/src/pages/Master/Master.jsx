import React, { useEffect, useRef, useState } from "react";
import { v4 } from "uuid";
import io from "socket.io-client";

import { getSelectedProvider, useMusicProvider } from "../../contexts/MusicProvider";
import { ConfigureSession } from "./ConfigureSession";
import { ManageSession } from "./steps/ManageSession";

const SESSION_UUID = v4();

let socket = io(process.env.REACT_APP_SOCKET_URI);

const Master = () => {
  const [provider, setProvider] = useState(getSelectedProvider());
  const musicProvider = useMusicProvider();

  const [title, setTitle] = useState("New session");
  const [isAuthenticated, setIsAuthenticated] = useState(
    musicProvider.isAuthenticated
  );
  const [isConfigured, setIsConfigured] = useState(false);
  const [tracks, setTracks] = useState([]);
  const isFirstProviderRender = useRef(true);

  const changeProvider = (newProvider) => {
    if (newProvider !== provider) {
      sessionStorage.removeItem("playlistId");
    }

    setProvider(newProvider);
  };

  useEffect(() => {
    if (!provider) return;

    // Skip on the very first mount so a page reload with an already
    // authenticated provider doesn't flash the steps back to locked — only a
    // genuine switch to a different provider should invalidate them.
    if (!isFirstProviderRender.current) {
      setIsAuthenticated(false);
    }
    isFirstProviderRender.current = false;

    musicProvider.login().then(() => setIsAuthenticated(true));
  }, [provider, musicProvider]);

  if (isConfigured) {
    return (
      <ManageSession sessionUuid={SESSION_UUID} socket={socket} tracks={tracks} />
    );
  }

  return (
    <div>
      <h1>{title}</h1>
      <ConfigureSession
        provider={provider}
        setProvider={changeProvider}
        isAuthenticated={isAuthenticated}
        setTitle={setTitle}
        onLaunch={(launchedTracks) => {
          setTracks(launchedTracks);
          setIsConfigured(true);
        }}
      />
    </div>
  );
};

export { Master };
