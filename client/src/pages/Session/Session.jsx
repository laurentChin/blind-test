import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";

import "./Session.css";
import { JoinForm } from "./JoinForm";
import { Play } from "./Play";

const socket = io(process.env.REACT_APP_SOCKET_URI);

const Session = () => {
  const { uuid } = useParams();
  const [player, setPlayer] = useState(
    JSON.parse(sessionStorage.getItem("player")) || {}
  );
  const [inSession, setInSession] = useState(false);
  const [challengers, setChallengers] = useState([]);

  useEffect(() => {
    if (player.uuid && !inSession) {
      socket.emit("joinAfterRefresh", { sessionUuid: uuid }, (response) => {
        setChallengers(response.challengers);
      });
      setInSession(true);
    }
  }, [player, inSession]);

  return (
    <div className="Session">
      {!player.uuid && (
        <JoinForm
          sessionUuid={uuid}
          onJoin={(response) => {
            setPlayer(response.player);
            setInSession(true);
            setChallengers(response.challengers);
          }}
          socket={socket}
        />
      )}
      {player.uuid && (
        <Play
          sessionUuid={uuid}
          player={player}
          socket={socket}
          challengers={challengers}
        />
      )}
    </div>
  );
};

export { Session };
