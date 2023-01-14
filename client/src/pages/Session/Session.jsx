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

  useEffect(() => {
    if (player.uuid && !inSession) {
      socket.emit("join", { sessionUuid: uuid }, (response) => {
        setPlayer(response.player);
      });
      setInSession(true);
    }
  }, [player, inSession]);

  // console.log({ player });

  return (
    <div className="Session">
      {!player.uuid && (
        <JoinForm
          sessionUuid={uuid}
          onJoin={(p) => {
            setPlayer(p);
            setInSession(true);
          }}
          socket={socket}
        />
      )}
      {player.uuid && (
        <Play sessionUuid={uuid} player={player} socket={socket} />
      )}
    </div>
  );
};

export { Session };
