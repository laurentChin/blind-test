import React, { useState } from "react";
import { v4 } from "uuid";
import io from "socket.io-client";
import { Navigate } from "react-router-dom";

import { getSelectedProvider, useMusicProvider } from "../../contexts/MusicProvider";
import { useProviderAuth } from "../../hooks/useProviderAuth";
import { ConfigureSession } from "./ConfigureSession";
import { ManageSession } from "./steps/ManageSession";

const SESSION_UUID = v4();

let socket = io(process.env.REACT_APP_SOCKET_URI);

const Master = () => {
  const provider = getSelectedProvider();
  const musicProvider = useMusicProvider();
  const isAuthenticated = useProviderAuth(provider, musicProvider);

  const [title, setTitle] = useState("New session");
  const [isConfigured, setIsConfigured] = useState(false);
  const [tracks, setTracks] = useState([]);

  // Provider choice now happens on the shared /create-session gate — a
  // session creator who lands here directly (bookmarked link, back/forward)
  // hasn't made that choice yet.
  if (!provider) {
    return <Navigate to="/create-session" replace />;
  }

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
