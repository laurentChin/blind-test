import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import io from "socket.io-client";

import "./Session.css";
import { JoinForm } from "./JoinForm";
import { Play } from "./Play";
import { useToast } from "../../components/Toast/Toast";

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

const clearStoredSession = () => {
  sessionStorage.removeItem("player");
  sessionStorage.removeItem("sessionUuid");
  sessionStorage.removeItem("mode");
  sessionStorage.removeItem("timerSeconds");
  sessionStorage.removeItem("cooldownSeconds");
  sessionStorage.removeItem("almostPoints");
  sessionStorage.removeItem("fullPoints");
};

// Why the player is sent back home, when it isn't their own doing — leaving
// on purpose needs no explanation.
const SESSION_END_MESSAGES = {
  closed: "The session has been closed.",
  lost: "This session no longer exists.",
};

const Session = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const [player, setPlayer] = useState(() => getStoredPlayer(uuid));
  const [mode, setMode] = useState(() => getStoredMode(uuid));
  const [timerSeconds, setTimerSeconds] = useState(() => getStoredTimerSeconds(uuid));
  const [cooldownSeconds, setCooldownSeconds] = useState(() => getStoredCooldownSeconds(uuid));
  const [almostPoints, setAlmostPoints] = useState(() => getStoredAlmostPoints(uuid));
  const [fullPoints, setFullPoints] = useState(() => getStoredFullPoints(uuid));
  const [inSession, setInSession] = useState(false);
  const [challengers, setChallengers] = useState([]);
  const [totalTracks, setTotalTracks] = useState();
  const [playedCount, setPlayedCount] = useState();
  // The round in progress on the server (if any) at the moment a refresh
  // reconnects — null until joinAfterRefresh resolves, then applied once by
  // Play so a reconnecting player's UI matches reality instead of resetting
  // to "nothing is happening".
  const [restoredState, setRestoredState] = useState(null);

  useEffect(() => {
    if (sessionStorage.getItem("sessionUuid") !== uuid) {
      clearStoredSession();
      setPlayer({});
      setInSession(false);
    }
  }, [uuid]);

  // Wherever the player stood (join form or game), there is nothing left to
  // do on this page once they left the session, it got closed, or it turns
  // out not to exist anymore. Replaces the history entry so "back" doesn't
  // land on the dead session again.
  const goHome = useCallback(
    (reason) => {
      clearStoredSession();
      if (SESSION_END_MESSAGES[reason]) {
        showToast(SESSION_END_MESSAGES[reason]);
      }
      navigate("/", { replace: true });
    },
    [navigate, showToast]
  );

  useEffect(() => {
    if (player.uuid && !inSession) {
      socket.emit(
        "joinAfterRefresh",
        { sessionUuid: uuid, playerUuid: player.uuid },
        (response) => {
          if (response.error) {
            goHome("lost");
            return;
          }

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
          setTotalTracks(response.totalTracks);
          setPlayedCount(response.playedCount);
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
  }, [player, inSession, uuid, goHome]);

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
              setTotalTracks(response.totalTracks);
              setPlayedCount(response.playedCount);
              setInSession(true);
              setChallengers(response.challengers);
            }}
            onSessionUnavailable={goHome}
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
          totalTracks={totalTracks}
          playedCount={playedCount}
          timerSeconds={timerSeconds}
          cooldownSeconds={cooldownSeconds}
          almostPoints={almostPoints}
          fullPoints={fullPoints}
          onLeave={goHome}
        />
      )}
    </div>
  );
};

export { Session };
