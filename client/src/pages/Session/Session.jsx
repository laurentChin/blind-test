import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";

import "./Session.css";
import { JoinForm } from "./JoinForm";
import { Play } from "./Play";

const socket = io(process.env.REACT_APP_SOCKET_URI);

// The stored player only belongs to the session it was saved for — reusing
// it for a different session's uuid would rejoin with a stale identity the
// new session's server-side state knows nothing about.
const getStoredPlayer = (uuid) => {
  if (sessionStorage.getItem("sessionUuid") !== uuid) {
    return {};
  }

  return JSON.parse(sessionStorage.getItem("player")) || {};
};

const Session = () => {
  const { uuid } = useParams();
  const [player, setPlayer] = useState(() => getStoredPlayer(uuid));
  const [inSession, setInSession] = useState(false);
  const [challengers, setChallengers] = useState([]);

  useEffect(() => {
    if (sessionStorage.getItem("sessionUuid") !== uuid) {
      sessionStorage.removeItem("player");
      sessionStorage.removeItem("sessionUuid");
      setPlayer({});
      setInSession(false);
    }
  }, [uuid]);

  useEffect(() => {
    if (player.uuid && !inSession) {
      socket.emit("joinAfterRefresh", { sessionUuid: uuid }, (response) => {
        setChallengers(response.challengers);
      });
      setInSession(true);
    }
  }, [player, inSession, uuid]);

  return (
    <div className="Session">
      {!player.uuid && (
        <>
          <h1 className="visually-hidden">Join the session</h1>
          <JoinForm
            sessionUuid={uuid}
            onJoin={(response) => {
              setPlayer(response.player);
              setInSession(true);
              setChallengers(response.challengers);
            }}
            socket={socket}
          />
        </>
      )}
      {player.uuid && (
        <Play
          sessionUuid={uuid}
          player={player}
          socket={socket}
          challengers={challengers}
          onLeave={() => {
            setPlayer({});
            setInSession(false);
          }}
        />
      )}
    </div>
  );
};

export { Session };
