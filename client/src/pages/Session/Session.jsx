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

const getStoredMode = (uuid) => {
  if (sessionStorage.getItem("sessionUuid") !== uuid) {
    return "classic";
  }

  return sessionStorage.getItem("mode") || "classic";
};

const getStoredTimerSeconds = (uuid) => {
  if (sessionStorage.getItem("sessionUuid") !== uuid) {
    return 5;
  }

  return parseInt(sessionStorage.getItem("timerSeconds"), 10) || 5;
};

const getStoredCooldownSeconds = (uuid) => {
  if (sessionStorage.getItem("sessionUuid") !== uuid) {
    return 2;
  }

  return parseInt(sessionStorage.getItem("cooldownSeconds"), 10) || 2;
};

const getStoredAlmostPoints = (uuid) => {
  if (sessionStorage.getItem("sessionUuid") !== uuid) {
    return 0.5;
  }

  return parseFloat(sessionStorage.getItem("almostPoints")) || 0.5;
};

const getStoredFullPoints = (uuid) => {
  if (sessionStorage.getItem("sessionUuid") !== uuid) {
    return 1;
  }

  return parseFloat(sessionStorage.getItem("fullPoints")) || 1;
};

const Session = () => {
  const { uuid } = useParams();
  const [player, setPlayer] = useState(() => getStoredPlayer(uuid));
  const [mode, setMode] = useState(() => getStoredMode(uuid));
  const [timerSeconds, setTimerSeconds] = useState(() => getStoredTimerSeconds(uuid));
  const [cooldownSeconds, setCooldownSeconds] = useState(() => getStoredCooldownSeconds(uuid));
  const [almostPoints, setAlmostPoints] = useState(() => getStoredAlmostPoints(uuid));
  const [fullPoints, setFullPoints] = useState(() => getStoredFullPoints(uuid));
  const [inSession, setInSession] = useState(false);
  const [challengers, setChallengers] = useState([]);
  // The round in progress on the server (if any) at the moment a refresh
  // reconnects — null until joinAfterRefresh resolves, then applied once by
  // Play so a reconnecting player's UI matches reality instead of resetting
  // to "nothing is happening".
  const [restoredState, setRestoredState] = useState(null);

  useEffect(() => {
    if (sessionStorage.getItem("sessionUuid") !== uuid) {
      sessionStorage.removeItem("player");
      sessionStorage.removeItem("sessionUuid");
      sessionStorage.removeItem("mode");
      sessionStorage.removeItem("timerSeconds");
      sessionStorage.removeItem("cooldownSeconds");
      sessionStorage.removeItem("almostPoints");
      sessionStorage.removeItem("fullPoints");
      setPlayer({});
      setInSession(false);
    }
  }, [uuid]);

  useEffect(() => {
    if (player.uuid && !inSession) {
      socket.emit(
        "joinAfterRefresh",
        { sessionUuid: uuid, playerUuid: player.uuid },
        (response) => {
          setChallengers(response.challengers);
          if (response.mode) {
            setMode(response.mode);
            sessionStorage.setItem("mode", response.mode);
          }
          if (response.challengeTimerSeconds) {
            setTimerSeconds(response.challengeTimerSeconds);
            sessionStorage.setItem("timerSeconds", response.challengeTimerSeconds);
          }
          if (response.challengeCooldownSeconds !== undefined) {
            setCooldownSeconds(response.challengeCooldownSeconds);
            sessionStorage.setItem("cooldownSeconds", response.challengeCooldownSeconds);
          }
          if (response.almostPoints !== undefined) {
            setAlmostPoints(response.almostPoints);
            sessionStorage.setItem("almostPoints", response.almostPoints);
          }
          if (response.fullPoints !== undefined) {
            setFullPoints(response.fullPoints);
            sessionStorage.setItem("fullPoints", response.fullPoints);
          }
          setRestoredState({
            currentChallenger: response.currentChallenger,
            isExcluded: response.isExcluded,
            currentTrack: response.currentTrack,
            roundRevealed: response.roundRevealed,
            isPlaying: response.isPlaying,
          });
        }
      );
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
              setMode(response.mode || "classic");
              setTimerSeconds(response.challengeTimerSeconds || 5);
              setCooldownSeconds(response.challengeCooldownSeconds ?? 2);
              setAlmostPoints(response.almostPoints ?? 0.5);
              setFullPoints(response.fullPoints ?? 1);
              setInSession(true);
              setChallengers(response.challengers);
            }}
            socket={socket}
          />
        </>
      )}
      {player.uuid && (
        <Play
          mode={mode}
          sessionUuid={uuid}
          player={player}
          socket={socket}
          challengers={challengers}
          restoredState={restoredState}
          timerSeconds={timerSeconds}
          cooldownSeconds={cooldownSeconds}
          almostPoints={almostPoints}
          fullPoints={fullPoints}
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
